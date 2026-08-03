import { Binary } from 'mongodb';
import { v4 as uuid } from 'uuid';
import { chatbotsService } from './chatbots';
import { getDb, LibraryFileDoc } from './db';
import { AppError } from './errors';
import { guardrailsService } from './guardrails';
import { ragService } from './rag';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export type LibraryFileMeta = {
  id: string;
  chatbotId: string;
  title: string;
  description: string;
  originalName: string;
  mimeType: string;
  size: number;
  downloadToken: string;
  downloadUrl: string;
  createdAt: string;
};

function publicOrigin(baseUrl?: string): string {
  const fromArg = baseUrl?.trim().replace(/\/$/, '');
  if (fromArg) return fromArg;
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (env) return env;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return '';
}

export function libraryDownloadPath(token: string): string {
  return `/api/d/${token}`;
}

export function libraryDownloadUrl(token: string, baseUrl?: string): string {
  const origin = publicOrigin(baseUrl);
  const path = libraryDownloadPath(token);
  return origin ? `${origin}${path}` : path;
}

function toMeta(doc: LibraryFileDoc, baseUrl?: string): LibraryFileMeta {
  return {
    id: doc._id,
    chatbotId: doc.chatbotId,
    title: doc.title,
    description: doc.description,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    size: doc.size,
    downloadToken: doc.downloadToken,
    downloadUrl: libraryDownloadUrl(doc.downloadToken, baseUrl),
    createdAt: doc.createdAt,
  };
}

export class LibraryFilesService {
  async list(userId: string, chatbotId: string, baseUrl?: string) {
    await chatbotsService.assertOwned(userId, chatbotId);
    const db = await getDb();
    const rows = await db.libraryFiles
      .find(
        { chatbotId },
        { projection: { data: 0 } },
      )
      .sort({ createdAt: -1 })
      .toArray();

    return rows.map((row) => toMeta(row as LibraryFileDoc, baseUrl));
  }

  async listForChat(chatbotId: string, baseUrl?: string) {
    const db = await getDb();
    const rows = await db.libraryFiles
      .find({ chatbotId }, { projection: { data: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return rows.map((row) => toMeta(row as LibraryFileDoc, baseUrl));
  }

  async upload(
    userId: string,
    chatbotId: string,
    input: {
      title: string;
      description: string;
      buffer: Buffer;
      originalName: string;
      mimeType: string;
    },
    baseUrl?: string,
  ) {
    await chatbotsService.assertOwned(userId, chatbotId);

    const title = input.title.trim();
    const description = input.description.trim();
    if (!title) throw new AppError(400, 'Title is required');
    if (!description) throw new AppError(400, 'Description is required');
    if (!input.buffer?.length) throw new AppError(400, 'File is required');
    if (input.buffer.length > MAX_FILE_BYTES) {
      throw new AppError(400, 'File must be 8MB or smaller');
    }

    const check = guardrailsService.checkContextContent(
      `${title}\n${description}`,
    );
    if (!check.allowed) throw new AppError(400, check.message);

    const now = new Date().toISOString();
    const id = uuid();
    const downloadToken = uuid().replace(/-/g, '');

    const doc: LibraryFileDoc = {
      _id: id,
      chatbotId,
      title: guardrailsService.sanitizeForStorage(title),
      description: guardrailsService.sanitizeForStorage(description),
      originalName: input.originalName || 'file',
      mimeType: input.mimeType || 'application/octet-stream',
      size: input.buffer.length,
      downloadToken,
      data: new Binary(input.buffer),
      createdAt: now,
    };

    const db = await getDb();
    await db.libraryFiles.insertOne(doc);
    return toMeta(doc, baseUrl);
  }

  async remove(userId: string, chatbotId: string, fileId: string) {
    await chatbotsService.assertOwned(userId, chatbotId);
    const db = await getDb();
    const result = await db.libraryFiles.deleteOne({
      _id: fileId,
      chatbotId,
    });
    if (result.deletedCount === 0) throw new AppError(404, 'File not found');
    return { ok: true };
  }

  async getByDownloadToken(token: string) {
    const db = await getDb();
    const doc = await db.libraryFiles.findOne({ downloadToken: token });
    if (!doc) throw new AppError(404, 'File not found');
    return doc;
  }

  /** Rank files by title/description overlap with the user question. */
  matchForQuestion(
    question: string,
    files: LibraryFileMeta[],
    limit = 5,
  ): LibraryFileMeta[] {
    if (!files.length) return [];

    const scored = files
      .map((file) => {
        const hay = `${file.title}\n${file.description}\n${file.originalName}`;
        const score = ragService.score(question, hay);
        return { file, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length) {
      return scored.slice(0, limit).map((row) => row.file);
    }

    // Soft fallback: if the question looks like a file/download ask, include a few
    if (
      /\b(download|file|document|contract|pdf|attachment|link)\b/i.test(question)
    ) {
      return files.slice(0, Math.min(3, limit));
    }

    return [];
  }

  /** Context notes the model may use (includes download URLs). */
  toContextPassages(files: LibraryFileMeta[]): string[] {
    return files.map(
      (f) =>
        `Downloadable file\nTitle: ${f.title}\nDescription: ${f.description}\nOriginal filename: ${f.originalName}\nDownload link (share this exact URL when the customer asks for the file): ${f.downloadUrl}\nMarkdown download link: [${f.title}](${f.downloadUrl})`,
    );
  }
}

export const libraryFilesService = new LibraryFilesService();
