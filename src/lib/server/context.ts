import { v4 as uuid } from 'uuid';
import { chatbotsService } from './chatbots';
import { ContextSourceDoc, getDb } from './db';
import { DocumentParserService } from './document-parser';
import { AppError } from './errors';
import { guardrailsService } from './guardrails';
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

    return Promise.all(rows.map((s) => this.toSourceDto(s)));
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
      createdAt: now,
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

    return {
      id: sourceId,
      chatbotId: input.chatbotId,
      type: input.type,
      name: input.name,
      url: input.url,
      mimeType: input.mimeType,
      createdAt: now,
      charCount: input.content.length,
      chunkCount: chunks.length,
      preview: input.content.slice(0, 180),
    };
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
      createdAt: s.createdAt,
      charCount: s.content.length,
      chunkCount,
      preview: s.content.slice(0, 180),
    };
  }
}

export const contextService = new ContextService();
