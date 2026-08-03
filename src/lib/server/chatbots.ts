import { v4 as uuid } from 'uuid';
import { ChatbotDoc, deleteChatbotCascade, getDb } from './db';
import { AppError } from './errors';

export class ChatbotsService {
  async findAll(userId: string) {
    const db = await getDb();
    const rows = await db.chatbots
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return Promise.all(rows.map((row) => this.withStats(row)));
  }

  async findOne(userId: string, id: string) {
    return this.withStats(await this.requireOwned(userId, id));
  }

  /** Public metadata for embed (published bots only) */
  async getPublicBot(id: string) {
    const db = await getDb();
    const bot = await db.chatbots.findOne(
      { _id: id },
      { projection: { name: 1, description: 1, published: 1 } },
    );

    if (!bot || !bot.published) {
      throw new AppError(404, 'Embedded chatbot not found or not published');
    }

    return {
      id: bot._id,
      name: bot.name,
      description: bot.description,
    };
  }

  async assertPublished(chatbotId: string) {
    await this.getPublicBot(chatbotId);
  }

  async create(
    userId: string,
    dto: { name: string; description?: string; systemPrompt?: string },
  ) {
    const now = new Date().toISOString();
    const id = uuid();
    const systemPrompt =
      dto.systemPrompt?.trim() ||
      'You are Athena. Answer helpfully and naturally, like a human support agent. Stick to what you know about this product or topic. If you are unsure, say so briefly — do not invent details.';

    const db = await getDb();
    await db.chatbots.insertOne({
      _id: id,
      userId,
      name: dto.name.trim(),
      description: (dto.description || '').trim(),
      systemPrompt,
      published: false,
      createdAt: now,
      updatedAt: now,
    });

    return this.findOne(userId, id);
  }

  async update(
    userId: string,
    id: string,
    dto: {
      name?: string;
      description?: string;
      systemPrompt?: string;
      published?: boolean;
    },
  ) {
    const bot = await this.requireOwned(userId, id);
    const name = dto.name !== undefined ? dto.name.trim() : bot.name;
    const description =
      dto.description !== undefined ? dto.description.trim() : bot.description;
    const systemPrompt =
      dto.systemPrompt !== undefined
        ? dto.systemPrompt.trim()
        : bot.systemPrompt;
    const published =
      dto.published !== undefined ? dto.published : bot.published;
    const updatedAt = new Date().toISOString();

    const db = await getDb();
    await db.chatbots.updateOne(
      { _id: id, userId },
      {
        $set: {
          name,
          description,
          systemPrompt,
          published,
          updatedAt,
        },
      },
    );

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.requireOwned(userId, id);
    await deleteChatbotCascade(id);
    return { ok: true };
  }

  async assertOwned(userId: string, chatbotId: string) {
    await this.requireOwned(userId, chatbotId);
  }

  async getSystemPrompt(chatbotId: string): Promise<string> {
    const db = await getDb();
    const bot = await db.chatbots.findOne(
      { _id: chatbotId },
      { projection: { systemPrompt: 1 } },
    );
    return bot?.systemPrompt?.trim() || '';
  }

  private async requireOwned(userId: string, id: string) {
    const db = await getDb();
    const bot = await db.chatbots.findOne({ _id: id, userId });
    if (!bot) throw new AppError(404, 'Chatbot not found');
    return bot;
  }

  private async withStats(bot: ChatbotDoc) {
    const db = await getDb();
    const [sourceCount, chunkCount] = await Promise.all([
      db.contextSources.countDocuments({ chatbotId: bot._id }),
      db.contextChunks.countDocuments({ chatbotId: bot._id }),
    ]);

    return {
      id: bot._id,
      name: bot.name,
      description: bot.description,
      systemPrompt: bot.systemPrompt,
      published: Boolean(bot.published),
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt,
      sourceCount,
      chunkCount,
    };
  }
}

export const chatbotsService = new ChatbotsService();
