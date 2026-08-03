import { v4 as uuid } from 'uuid';
import { chatbotsService } from './chatbots';
import { ContextSourceDoc, getDb } from './db';
import { DocumentParserService } from './document-parser';
import { AppError } from './errors';
import { guardrailsService } from './guardrails';
import { LIVING_KNOWLEDGE_NAME } from './living-knowledge';
import { ragService } from './rag';

const parser = new DocumentParserService();

export class ContextService {
  async list(userId: string, chatbotId: string) {
    await chatbotsService.assertOwned(userId, chatbotId);
    const db = await getDb();

    const rows = await db.contextSources
      .find({ chatbotId })
      .sort({ createdAt: -1 })
      .toArray();

    // Living knowledge first, then newest
    rows.sort((a, b) => {
      if (a.role === 'living' && b.role !== 'living') return -1;
      if (b.role === 'living' && a.role !== 'living') return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });

    return Promise.all(rows.map((s) => this.toSourceDto(s)));
  }

  /**
   * Append knowledge into the chatbot's single Living Knowledge source.
   * Creates the source on first feed; always re-chunks after update.
   */
  async feedLivingKnowledge(
    userId: string,
    chatbotId: string,
    knowledge: string,
  ) {
    await chatbotsService.assertOwned(userId, chatbotId);
    const entry = knowledge.trim();
    if (!entry) throw new AppError(400, 'Knowledge content is required');

    this.assertSafeContext(entry);

    const sanitized = guardrailsService.sanitizeForStorage(entry);
    const stamp = new Date().toISOString();
    const block = `## ${stamp}\n\n${sanitized}`;

    const db = await getDb();
    const existing = await db.contextSources.findOne({
      chatbotId,
      role: 'living',
    });

    if (!existing) {
      return this.persistSource({
        chatbotId,
        type: 'text',
        name: LIVING_KNOWLEDGE_NAME,
        content: `# Living Knowledge\n\nFacts taught to this bot in chat or Sources.\n\n${block}\n`,
        mimeType: 'text/markdown',
        role: 'living',
      });
    }

    const nextContent = `${existing.content.trimEnd()}\n\n${block}\n`;
    this.assertSafeContext(nextContent);

    const chunks = ragService.chunkText(nextContent);
    await db.contextChunks.deleteMany({ sourceId: existing._id });
    if (chunks.length) {
      await db.contextChunks.insertMany(
        chunks.map((content, chunkIndex) => ({
          _id: uuid(),
          sourceId: existing._id,
          chatbotId,
          content,
          chunkIndex,
        })),
      );
    }

    await db.contextSources.updateOne(
      { _id: existing._id },
      {
        $set: {
          content: nextContent,
          name: LIVING_KNOWLEDGE_NAME,
          mimeType: 'text/markdown',
          updatedAt: stamp,
        },
      },
    );

    const updated = await db.contextSources.findOne({ _id: existing._id });
    if (!updated) throw new AppError(500, 'Failed to update living knowledge');
    return this.toSourceDto(updated);
  }

  async addFile(
    userId: string,
    chatbotId: string,
    file?: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    await chatbotsService.assertOwned(userId, chatbotId);
    if (!file) throw new AppError(400, 'File is required');

    const content = await parser.extractFromFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    this.assertSafeContext(content);

    return this.persistSource({
      chatbotId,
      type: 'file',
      name: file.originalname,
      content: guardrailsService.sanitizeForStorage(content),
      mimeType: file.mimetype,
    });
  }

  async addLink(
    userId: string,
    chatbotId: string,
    dto: { url: string; name?: string },
  ) {
    await chatbotsService.assertOwned(userId, chatbotId);
    const extracted = await parser.extractFromUrl(dto.url);
    this.assertSafeContext(extracted.content);

    return this.persistSource({
      chatbotId,
      type: 'link',
      name: dto.name?.trim() || extracted.title,
      content: guardrailsService.sanitizeForStorage(extracted.content),
      url: dto.url,
      mimeType: 'text/html',
    });
  }

  async addText(
    userId: string,
    chatbotId: string,
    dto: { name: string; content: string },
  ) {
    await chatbotsService.assertOwned(userId, chatbotId);
    this.assertSafeContext(dto.content);

    return this.persistSource({
      chatbotId,
      type: 'text',
      name: dto.name.trim(),
      content: guardrailsService.sanitizeForStorage(dto.content),
      mimeType: 'text/plain',
    });
  }

  async getOne(userId: string, chatbotId: string, sourceId: string) {
    await chatbotsService.assertOwned(userId, chatbotId);
    const db = await getDb();
    const source = await db.contextSources.findOne({
      _id: sourceId,
      chatbotId,
    });
    if (!source) throw new AppError(404, 'Source not found');

    const dto = await this.toSourceDto(source);
    return { ...dto, content: source.content };
  }

  async remove(userId: string, chatbotId: string, sourceId: string) {
    await chatbotsService.assertOwned(userId, chatbotId);
    const db = await getDb();

    const result = await db.contextSources.deleteOne({
      _id: sourceId,
      chatbotId,
    });
    if (result.deletedCount === 0) throw new AppError(404, 'Source not found');

    await db.contextChunks.deleteMany({ sourceId });
    return { ok: true };
  }

  private assertSafeContext(content: string) {
    const check = guardrailsService.checkContextContent(content);
    if (!check.allowed) {
      throw new AppError(400, check.message);
    }
  }

  private async persistSource(input: {
    chatbotId: string;
    type: 'file' | 'link' | 'text';
    name: string;
    content: string;
    url?: string;
    mimeType?: string;
    role?: 'living';
  }) {
    const sourceId = uuid();
    const now = new Date().toISOString();
    const chunks = ragService.chunkText(input.content);
    const db = await getDb();

    await db.contextSources.insertOne({
      _id: sourceId,
      chatbotId: input.chatbotId,
      type: input.type,
      name: input.name,
      content: input.content,
      url: input.url,
      mimeType: input.mimeType,
      role: input.role,
      createdAt: now,
      updatedAt: input.role === 'living' ? now : undefined,
    });

    if (chunks.length) {
      await db.contextChunks.insertMany(
        chunks.map((content, chunkIndex) => ({
          _id: uuid(),
          sourceId,
          chatbotId: input.chatbotId,
          content,
          chunkIndex,
        })),
      );
    }

    return this.toSourceDto({
      _id: sourceId,
      chatbotId: input.chatbotId,
      type: input.type,
      name: input.name,
      content: input.content,
      url: input.url,
      mimeType: input.mimeType,
      role: input.role,
      createdAt: now,
      updatedAt: input.role === 'living' ? now : undefined,
    });
  }

  private async toSourceDto(s: ContextSourceDoc) {
    const db = await getDb();
    const chunkCount = await db.contextChunks.countDocuments({
      sourceId: s._id,
    });

    return {
      id: s._id,
      chatbotId: s.chatbotId,
      type: s.type,
      name: s.name,
      url: s.url,
      mimeType: s.mimeType,
      living: s.role === 'living',
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      charCount: s.content.length,
      chunkCount,
      preview: s.content.slice(0, 180),
    };
  }
}

export const contextService = new ContextService();
