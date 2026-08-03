import { MongoClient, Db, Collection, Binary } from 'mongodb';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

export type UserDoc = {
  _id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type ChatbotDoc = {
  _id: string;
  userId: string;
  name: string;
  description: string;
  systemPrompt: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContextSourceDoc = {
  _id: string;
  chatbotId: string;
  type: 'file' | 'link' | 'text';
  name: string;
  content: string;
  url?: string;
  mimeType?: string;
  /** Exactly one living knowledge source per chatbot; updated on each feed. */
  role?: 'living';
  createdAt: string;
  updatedAt?: string;
};

export type ContextChunkDoc = {
  _id: string;
  sourceId: string;
  chatbotId: string;
  content: string;
  chunkIndex: number;
};

export type ChatSessionDoc = {
  _id: string;
  chatbotId: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageDoc = {
  _id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: unknown;
  guardrail?: unknown;
  createdAt: string;
};

/** Downloadable files (admin-uploaded); chat can share tokenized download links. */
export type LibraryFileDoc = {
  _id: string;
  chatbotId: string;
  title: string;
  description: string;
  originalName: string;
  mimeType: string;
  size: number;
  downloadToken: string;
  /** Raw bytes (max ~8MB per file). */
  data: Binary;
  createdAt: string;
};

type Collections = {
  users: Collection<UserDoc>;
  chatbots: Collection<ChatbotDoc>;
  contextSources: Collection<ContextSourceDoc>;
  contextChunks: Collection<ContextChunkDoc>;
  chatSessions: Collection<ChatSessionDoc>;
  chatMessages: Collection<ChatMessageDoc>;
  libraryFiles: Collection<LibraryFileDoc>;
};

const globalForMongo = globalThis as unknown as {
  __contextchatMongo?: {
    client: MongoClient;
    db: Db;
    ready: Promise<void>;
  };
};

async function seedIfEmpty(cols: Collections) {
  const count = await cols.users.countDocuments({}, { limit: 1 });
  if (count > 0) return;

  const now = new Date().toISOString();
  const userId = uuid();
  const chatbotId = uuid();
  const sourceId = uuid();
  const sessionId = uuid();
  const passwordHash = bcrypt.hashSync('password123', 10);

  const sampleContent = `# Acme Cloud Docs

## What is Acme Cloud?
Acme Cloud is a simple project management platform for small teams. It helps you track tasks, deadlines, and team workload in one place.

## Pricing
- Free plan: up to 3 members, 1 workspace
- Pro plan: $12 per member / month, unlimited workspaces
- Business plan: $24 per member / month, includes SSO and audit logs

## Getting started
1. Create an account at https://acme.example.com/signup
2. Invite teammates from Settings > Members
3. Create your first project board

## Support hours
Live chat support is available Monday to Friday, 9am–6pm UTC.
Email support: support@acme.example.com
Urgent issues on Business plan get a response within 2 hours.

## Refund policy
You can request a refund within 14 days of purchase if you have used fewer than 10 task actions.
`;

  const parts = sampleContent
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);

  await cols.users.insertOne({
    _id: userId,
    email: 'demo@example.com',
    passwordHash,
    createdAt: now,
  });

  await cols.chatbots.insertOne({
    _id: chatbotId,
    userId,
    name: 'Athena',
    description: 'Answers questions using the sample Acme product docs.',
    systemPrompt:
      'You are Athena. Answer helpfully and naturally, like a human support agent. Stick to what you know about this product or topic. If you are unsure, say so briefly — do not invent details.',
    published: true,
    createdAt: now,
    updatedAt: now,
  });

  await cols.contextSources.insertOne({
    _id: sourceId,
    chatbotId,
    type: 'text',
    name: 'acme-docs.md',
    content: sampleContent,
    mimeType: 'text/markdown',
    createdAt: now,
  });

  if (parts.length) {
    await cols.contextChunks.insertMany(
      parts.map((content, chunkIndex) => ({
        _id: uuid(),
        sourceId,
        chatbotId,
        content,
        chunkIndex,
      })),
    );
  }

  await cols.chatSessions.insertOne({
    _id: sessionId,
    chatbotId,
    createdAt: now,
    updatedAt: now,
  });

  await cols.chatMessages.insertOne({
    _id: uuid(),
    sessionId,
    role: 'assistant',
    content:
      "Hi! I'm Athena. I can answer questions about Acme Cloud using the uploaded docs. What would you like to know?",
    createdAt: now,
  });

  console.log(
    'Seeded demo user demo@example.com / password123 with Athena',
  );
}

async function ensureIndexes(cols: Collections) {
  await Promise.all([
    cols.users.createIndex({ email: 1 }, { unique: true }),
    cols.chatbots.createIndex({ userId: 1 }),
    cols.contextSources.createIndex({ chatbotId: 1 }),
    cols.contextChunks.createIndex({ sourceId: 1 }),
    cols.contextChunks.createIndex({ chatbotId: 1 }),
    cols.chatSessions.createIndex({ chatbotId: 1 }),
    cols.chatMessages.createIndex({ sessionId: 1 }),
    cols.libraryFiles.createIndex({ chatbotId: 1 }),
    cols.libraryFiles.createIndex({ downloadToken: 1 }, { unique: true }),
  ]);
}

function collections(db: Db): Collections {
  return {
    users: db.collection<UserDoc>('users'),
    chatbots: db.collection<ChatbotDoc>('chatbots'),
    contextSources: db.collection<ContextSourceDoc>('context_sources'),
    contextChunks: db.collection<ContextChunkDoc>('context_chunks'),
    chatSessions: db.collection<ChatSessionDoc>('chat_sessions'),
    chatMessages: db.collection<ChatMessageDoc>('chat_messages'),
    libraryFiles: db.collection<LibraryFileDoc>('library_files'),
  };
}

async function connect(): Promise<Collections> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error(
        'MONGODB_URI is not set. Add it in Vercel → Project Settings → Environment Variables.',
      );
    }
  }
  const connectionUri = uri || 'mongodb://127.0.0.1:27017/contextchat';

  if (!globalForMongo.__contextchatMongo) {
    const client = new MongoClient(connectionUri);
    const ready = (async () => {
      await client.connect();
      const db = client.db();
      const cols = collections(db);
      await ensureIndexes(cols);
      await seedIfEmpty(cols);
      console.log(
        `MongoDB ready (${connectionUri.replace(/\/\/.*@/, '//***@')})`,
      );
    })().catch((err) => {
      delete globalForMongo.__contextchatMongo;
      throw err;
    });

    globalForMongo.__contextchatMongo = {
      client,
      db: client.db(),
      ready,
    };
  }

  await globalForMongo.__contextchatMongo.ready;
  return collections(globalForMongo.__contextchatMongo.client.db());
}

/** Connected MongoDB collections (cached across hot reloads). */
export async function getDb(): Promise<Collections> {
  return connect();
}

/** Cascade-delete a chatbot and all related data. */
export async function deleteChatbotCascade(chatbotId: string) {
  const db = await getDb();
  const sessions = await db.chatSessions
    .find({ chatbotId }, { projection: { _id: 1 } })
    .toArray();
  const sessionIds = sessions.map((s) => s._id);
  const sources = await db.contextSources
    .find({ chatbotId }, { projection: { _id: 1 } })
    .toArray();
  const sourceIds = sources.map((s) => s._id);

  if (sessionIds.length) {
    await db.chatMessages.deleteMany({ sessionId: { $in: sessionIds } });
  }
  await db.chatSessions.deleteMany({ chatbotId });
  if (sourceIds.length) {
    await db.contextChunks.deleteMany({ sourceId: { $in: sourceIds } });
  }
  await db.contextSources.deleteMany({ chatbotId });
  await db.libraryFiles.deleteMany({ chatbotId });
  await db.chatbots.deleteOne({ _id: chatbotId });
}
