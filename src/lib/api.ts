import { getStoredToken } from '@/lib/token';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function request<T>(
  path: string,
  init?: RequestInit & { token?: string | null; auth?: boolean },
): Promise<T> {
  const headers = new Headers(init?.headers || {});

  if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const auth = init?.auth !== false;
  const token = init?.token ?? (auth ? getStoredToken() : null);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.message
        ? Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message
        : message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export type AuthUser = {
  id: string;
  email: string;
  createdAt?: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
};

export type Chatbot = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  sourceCount: number;
  chunkCount: number;
};

export type ContextSource = {
  id: string;
  chatbotId: string;
  type: 'file' | 'link' | 'text';
  name: string;
  url?: string;
  mimeType?: string;
  createdAt: string;
  charCount: number;
  chunkCount: number;
  preview: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sources?: { sourceId: string; sourceName: string; excerpt: string }[];
  guardrail?: {
    blocked: boolean;
    code?: string;
  };
};

export type ChatSession = {
  id: string;
  chatbotId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export const api = {
  register: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false,
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false,
    }),
  me: (token?: string) =>
    request<AuthUser>('/api/auth/me', { token: token ?? undefined }),

  listChatbots: () => request<Chatbot[]>('/api/chatbots'),
  getChatbot: (id: string) => request<Chatbot>(`/api/chatbots/${id}`),
  createChatbot: (body: {
    name: string;
    description?: string;
    systemPrompt?: string;
  }) =>
    request<Chatbot>('/api/chatbots', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteChatbot: (id: string) =>
    request<{ ok: boolean }>(`/api/chatbots/${id}`, { method: 'DELETE' }),
  updateChatbot: (
    id: string,
    body: {
      name?: string;
      description?: string;
      systemPrompt?: string;
      published?: boolean;
    },
  ) =>
    request<Chatbot>(`/api/chatbots/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  listContext: (chatbotId: string) =>
    request<ContextSource[]>(`/api/chatbots/${chatbotId}/context`),
  addContextFile: (chatbotId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<ContextSource>(`/api/chatbots/${chatbotId}/context/file`, {
      method: 'POST',
      body: form,
    });
  },
  addContextLink: (chatbotId: string, url: string, name?: string) =>
    request<ContextSource>(`/api/chatbots/${chatbotId}/context/link`, {
      method: 'POST',
      body: JSON.stringify({ url, name }),
    }),
  addContextText: (chatbotId: string, name: string, content: string) =>
    request<ContextSource>(`/api/chatbots/${chatbotId}/context/text`, {
      method: 'POST',
      body: JSON.stringify({ name, content }),
    }),
  removeContext: (chatbotId: string, sourceId: string) =>
    request<{ ok: boolean }>(
      `/api/chatbots/${chatbotId}/context/${sourceId}`,
      { method: 'DELETE' },
    ),

  listSessions: (chatbotId: string) =>
    request<
      {
        id: string;
        chatbotId: string;
        createdAt: string;
        updatedAt: string;
        messageCount: number;
        preview: string;
      }[]
    >(`/api/chatbots/${chatbotId}/sessions`),
  createSession: (chatbotId: string) =>
    request<ChatSession>(`/api/chatbots/${chatbotId}/sessions`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  getSession: (chatbotId: string, sessionId: string) =>
    request<ChatSession>(`/api/chatbots/${chatbotId}/sessions/${sessionId}`),
  sendMessage: (chatbotId: string, sessionId: string, content: string) =>
    request<{
      userMessage: ChatMessage;
      assistantMessage: ChatMessage;
      session: ChatSession;
    }>(`/api/chatbots/${chatbotId}/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  /** Public embed APIs (no auth). Each createPublicSession call starts fresh. */
  getPublicBot: (id: string) =>
    request<{ id: string; name: string; description: string }>(
      `/api/public/bots/${id}`,
      { auth: false },
    ),
  createPublicSession: (chatbotId: string) =>
    request<ChatSession>(`/api/public/bots/${chatbotId}/sessions`, {
      method: 'POST',
      body: JSON.stringify({}),
      auth: false,
    }),
  sendPublicMessage: (
    chatbotId: string,
    sessionId: string,
    content: string,
  ) =>
    request<{
      userMessage: ChatMessage;
      assistantMessage: ChatMessage;
      session: ChatSession;
    }>(`/api/public/bots/${chatbotId}/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
      auth: false,
    }),
};
