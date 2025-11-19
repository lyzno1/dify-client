import { AppConfig } from '@/lib/store/app-store';

export interface Conversation {
  id: string;
  name: string;
  inputs: Record<string, any>;
  status: 'normal' | 'blocking' | 'paused';
  created_at: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  query: string;
  answer: string;
  created_at: number;
  feedback: null | any;
  retriever_resources: any[];
}

export interface ChatMessageRequest {
  query: string;
  inputs: Record<string, any>;
  response_mode: 'streaming' | 'blocking';
  user: string;
  conversation_id?: string;
  files?: any[];
}

async function difyRequest(app: AppConfig, endpoint: string, options?: RequestInit) {
  const url = `${app.baseUrl}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${app.apiKey}`,
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Dify API Error: ${response.status} ${response.statusText}`);
  }

  return response;
}

export const difyApi = {
  getConversations: async (app: AppConfig, userId: string, lastId?: string, limit = 20) => {
    const params = new URLSearchParams({
      user: userId,
      limit: limit.toString(),
    });
    if (lastId) params.append('last_id', lastId);
    
    const res = await difyRequest(app, `/conversations?${params.toString()}`);
    return res.json() as Promise<{ data: Conversation[]; has_more: boolean; limit: number }>;
  },

  getMessages: async (app: AppConfig, conversationId: string, userId: string, firstId?: string, limit = 20) => {
    const params = new URLSearchParams({
      conversation_id: conversationId,
      user: userId,
      limit: limit.toString(),
    });
    if (firstId) params.append('first_id', firstId);

    const res = await difyRequest(app, `/messages?${params.toString()}`);
    return res.json() as Promise<{ data: Message[]; has_more: boolean; limit: number }>;
  },

  sendMessage: async (app: AppConfig, payload: ChatMessageRequest) => {
    return difyRequest(app, '/chat-messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteConversation: async (app: AppConfig, conversationId: string, userId: string) => {
    return difyRequest(app, `/conversations/${conversationId}`, {
      method: 'DELETE',
      body: JSON.stringify({ user: userId }),
    });
  },

  renameConversation: async (app: AppConfig, conversationId: string, userId: string, name: string) => {
    return difyRequest(app, `/conversations/${conversationId}/name`, {
      method: 'POST',
      body: JSON.stringify({ name, user: userId }),
    });
  },
};
