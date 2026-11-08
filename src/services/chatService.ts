import { authFetch, request } from './client';

export interface ActionCard {
  actionType: string;
  title: string;
  description: string;
  data?: unknown;
}

export type MessageStatus = 'PENDING' | 'STREAMING' | 'SUCCESS' | 'ERROR';

export interface ChatStreamEvent {
  type:
    'session_info' | 'tool_start' | 'tool_done' | 'action_card' | 'text_delta' | 'error' | 'done';
  sessionId?: string;
  messageId?: string;
  status?: MessageStatus;
  toolTitle?: string;
  actionCard?: ActionCard;
  delta?: string;
  errorMessage?: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model' | 'assistant';
  content: string;
  status?: MessageStatus;
  actionCard?: ActionCard;
  createdAt: string;
}

export interface ChatSessionResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export type ChatSession = ChatSessionResponse;

export const chatService = {
  async listSessions(): Promise<ChatSessionResponse[]> {
    return request<ChatSessionResponse[]>('/chat/sessions');
  },

  async getSessionMessages(sessionId: string): Promise<ChatSessionResponse> {
    return request<ChatSessionResponse>(`/chat/sessions/${sessionId}`);
  },

  async deleteSession(sessionId: string): Promise<void> {
    await request(`/chat/sessions/${sessionId}`, { method: 'DELETE' });
  },

  async clearSessions(): Promise<void> {
    await request('/chat/clear', { method: 'POST' });
  },

  async sendStreamMessage(
    req: { sessionId?: string; message: string },
    onEvent: (event: ChatStreamEvent) => void,
    onComplete: () => void,
    onError: (err: Error) => void
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 180000); // 180 seconds client timeout (3 minutes)

    try {
      // authFetch renews an expired access token (and retries once on 401).
      const response = await authFetch('/chat/stream', {
        method: 'POST',
        headers: { Accept: 'text/event-stream' },
        body: JSON.stringify(req),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Server error (${response.status})`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by browser/environment');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (!dataStr) continue;
            try {
              const event: ChatStreamEvent = JSON.parse(dataStr);
              onEvent(event);
            } catch (err) {
              console.warn('Failed to parse SSE line:', dataStr, err);
            }
          }
        }
      }

      if (buffer.trim().startsWith('data: ')) {
        try {
          const event: ChatStreamEvent = JSON.parse(buffer.trim().slice(6));
          onEvent(event);
        } catch {
          // ignore
        }
      }

      clearTimeout(timeoutId);
      onComplete();
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        onError(new Error('Yêu cầu tới AI đã quá thời gian chờ (Timeout). Vui lòng thử lại.'));
      } else {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  },
};
