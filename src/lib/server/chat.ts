import { v4 as uuid } from 'uuid';
import { ASSISTANT_GREETING } from '@/lib/assistant';
import { chatbotsService } from './chatbots';
import { ChatMessageDoc, getDb } from './db';
import { AppError } from './errors';
import { generateGroundedAnswer, isGroqConfigured } from './groq';
import { guardrailsService } from './guardrails';
import { ragService } from './rag';

type MessageSource = {
  sourceId: string;
  sourceName: string;
  excerpt: string;
};

type GuardrailMeta = {
  blocked: boolean;
  code?: string;
};

export class ChatService {
  async listSessions(userId: string, chatbotId: string) {
    await chatbotsService.assertOwned(userId, chatbotId);
    const db = await getDb();

    const sessions = await db.chatSessions
      .find({ chatbotId })
      .sort({ updatedAt: -1 })
      .toArray();

    return Promise.all(
      sessions.map(async (s) => {
        const [messageCount, lastUser, first] = await Promise.all([
          db.chatMessages.countDocuments({ sessionId: s._id }),
          db.chatMessages.findOne(
            { sessionId: s._id, role: 'user' },
            { sort: { createdAt: -1 }, projection: { content: 1 } },
          ),
          db.chatMessages.findOne(
            { sessionId: s._id },
            { sort: { createdAt: 1 }, projection: { content: 1 } },
          ),
        ]);

        return {
          id: s._id,
          chatbotId: s.chatbotId,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          messageCount,
          preview: lastUser?.content || first?.content || '',
        };
      }),
    );
  }

  async getSession(userId: string, chatbotId: string, sessionId: string) {
    await chatbotsService.assertOwned(userId, chatbotId);
    return this.loadSession(chatbotId, sessionId);
  }

  async createSession(
    userId: string,
    chatbotId: string,
    dto: { greeting?: string } = {},
  ) {
    await chatbotsService.assertOwned(userId, chatbotId);
    return this.createSessionForBot(chatbotId, dto);
  }

  async sendMessage(
    userId: string,
    chatbotId: string,
    sessionId: string,
    dto: { content: string },
  ) {
    await chatbotsService.assertOwned(userId, chatbotId);
    return this.sendMessageForBot(chatbotId, sessionId, dto);
  }

  /** Public embed: always creates a brand-new session */
  async createPublicSession(
    chatbotId: string,
    dto: { greeting?: string } = {},
  ) {
    await chatbotsService.assertPublished(chatbotId);
    return this.createSessionForBot(chatbotId, {
      greeting: dto.greeting?.trim() || ASSISTANT_GREETING,
    });
  }

  async sendPublicMessage(
    chatbotId: string,
    sessionId: string,
    dto: { content: string },
  ) {
    await chatbotsService.assertPublished(chatbotId);
    return this.sendMessageForBot(chatbotId, sessionId, dto);
  }

  async getPublicSession(chatbotId: string, sessionId: string) {
    await chatbotsService.assertPublished(chatbotId);
    return this.loadSession(chatbotId, sessionId);
  }

  private async createSessionForBot(
    chatbotId: string,
    dto: { greeting?: string } = {},
  ) {
    const now = new Date().toISOString();
    const sessionId = uuid();
    const messageId = uuid();
    const greeting = dto.greeting?.trim() || ASSISTANT_GREETING;

    const db = await getDb();
    await db.chatSessions.insertOne({
      _id: sessionId,
      chatbotId,
      createdAt: now,
      updatedAt: now,
    });
    await db.chatMessages.insertOne({
      _id: messageId,
      sessionId,
      role: 'assistant',
      content: greeting,
      createdAt: now,
    });

    return this.loadSession(chatbotId, sessionId);
  }

  private async sendMessageForBot(
    chatbotId: string,
    sessionId: string,
    dto: { content: string },
  ) {
    await this.loadSession(chatbotId, sessionId);
    const content = guardrailsService.sanitizeForStorage(dto.content);
    const now = new Date().toISOString();

    const userMessage = await this.insertMessage({
      sessionId,
      role: 'user',
      content,
      createdAt: now,
    });

    const inputCheck = guardrailsService.checkUserInput(content);
    if (!inputCheck.allowed) {
      const assistantMessage = await this.insertMessage({
        sessionId,
        role: 'assistant',
        content: inputCheck.message,
        createdAt: new Date().toISOString(),
        sources: [],
        guardrail: { blocked: true, code: inputCheck.code },
      });
      await this.touchSession(sessionId, assistantMessage.createdAt);
      return {
        userMessage,
        assistantMessage,
        session: await this.loadSession(chatbotId, sessionId),
      };
    }

    const db = await getDb();
    const chunkDocs = await db.contextChunks
      .find({ chatbotId }, { projection: { sourceId: 1, content: 1 } })
      .toArray();
    const chunks = chunkDocs.map((c) => ({
      id: c._id,
      sourceId: c.sourceId,
      content: c.content,
    }));

    if (chunks.length === 0) {
      const assistantMessage = await this.insertMessage({
        sessionId,
        role: 'assistant',
        content:
          'I’m not set up with any info yet. Please check back later.',
        createdAt: new Date().toISOString(),
        sources: [],
        guardrail: { blocked: true, code: 'ungrounded' },
      });
      await this.touchSession(sessionId, assistantMessage.createdAt);
      return {
        userMessage,
        assistantMessage,
        session: await this.loadSession(chatbotId, sessionId),
      };
    }

    const retrieved = ragService.retrieve(content, chunks, 8, 0.2);
    const retrievedContents = retrieved.map((r) => r.content);

    let draftAnswer: string;
    try {
      if (isGroqConfigured() && retrieved.length > 0) {
        const groq = await generateGroundedAnswer({
          question: content,
          contextPassages: retrievedContents,
          systemPrompt: await chatbotsService.getSystemPrompt(chatbotId),
        });
        draftAnswer = groq.answer;
      } else {
        draftAnswer = ragService.answerFromContext(content, retrieved).answer;
      }
    } catch (err) {
      console.error(
        '[groq]',
        err instanceof Error ? err.message : 'Groq generation failed',
      );
      draftAnswer = ragService.answerFromContext(content, retrieved).answer;
    }

    const outputCheck = guardrailsService.checkGeneratedAnswer(
      draftAnswer,
      retrievedContents,
      { requireGrounding: true },
    );

    if (!outputCheck.allowed) {
      const assistantMessage = await this.insertMessage({
        sessionId,
        role: 'assistant',
        content: outputCheck.message,
        createdAt: new Date().toISOString(),
        sources: [],
        guardrail: { blocked: true, code: outputCheck.code },
      });
      await this.touchSession(sessionId, assistantMessage.createdAt);
      return {
        userMessage,
        assistantMessage,
        session: await this.loadSession(chatbotId, sessionId),
      };
    }

    const assistantMessage = await this.insertMessage({
      sessionId,
      role: 'assistant',
      content: outputCheck.sanitizedAnswer || draftAnswer,
      createdAt: new Date().toISOString(),
      sources: [],
      guardrail: { blocked: false },
    });

    await this.touchSession(sessionId, assistantMessage.createdAt);

    return {
      userMessage,
      assistantMessage,
      session: await this.loadSession(chatbotId, sessionId),
    };
  }

  private async loadSession(chatbotId: string, sessionId: string) {
    const db = await getDb();

    const session = await db.chatSessions.findOne({
      _id: sessionId,
      chatbotId,
    });
    if (!session) throw new AppError(404, 'Session not found');

    const messages = await db.chatMessages
      .find({ sessionId })
      .sort({ createdAt: 1 })
      .toArray();

    return {
      id: session._id,
      chatbotId: session.chatbotId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: messages.map((m) => this.mapMessage(m)),
    };
  }

  private async insertMessage(input: {
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
    sources?: MessageSource[];
    guardrail?: GuardrailMeta;
  }) {
    const id = uuid();
    const db = await getDb();
    await db.chatMessages.insertOne({
      _id: id,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      sources: input.sources,
      guardrail: input.guardrail,
      createdAt: input.createdAt,
    });

    return {
      id,
      role: input.role,
      content: input.content,
      createdAt: input.createdAt,
      sources: input.sources,
      guardrail: input.guardrail,
    };
  }

  private async touchSession(sessionId: string, updatedAt: string) {
    const db = await getDb();
    await db.chatSessions.updateOne({ _id: sessionId }, { $set: { updatedAt } });
  }

  private mapMessage(m: ChatMessageDoc) {
    return {
      id: m._id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
      sources: (m.sources as MessageSource[] | undefined) || undefined,
      guardrail: (m.guardrail as GuardrailMeta | undefined) || undefined,
    };
  }
}

export const chatService = new ChatService();
