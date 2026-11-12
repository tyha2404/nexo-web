import { authFetch, hasStoredToken, readApiError, request } from './client';

/** A card the AI attaches to a reply; `data` depends on `actionType` (see components/chat/types). */
export interface ActionCard {
  actionType: string;
  title: string;
  description: string;
  data?: unknown;
}

type MessageStatus = 'PENDING' | 'STREAMING' | 'SUCCESS' | 'ERROR';

export interface ChatStreamEvent {
  type:
    'session_info' | 'tool_start' | 'tool_done' | 'action_card' | 'text_delta' | 'error' | 'done';
  sessionId?: string;
  messageId?: string;
  status?: MessageStatus;
  toolName?: string;
  toolTitle?: string;
  actionCard?: ActionCard;
  delta?: string;
  errorMessage?: string;
}

/** Stored roles (model.ChatRole in the API). */
export type ChatRole = 'user' | 'model' | 'system';

export interface ChatMessage {
  id?: string;
  role: ChatRole;
  content: string;
  status?: MessageStatus;
  /** Cards of this reply, in the order the tools ran. */
  actionCards?: ActionCard[];
  createdAt: string;
}

/** A message as GET /chat/sessions/{id} returns it: the cards are a JSON string. */
interface ChatMessageDto {
  id: string;
  sessionId?: string;
  role: ChatRole;
  content: string;
  status?: MessageStatus;
  toolCalls?: string;
  toolResults?: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

/** Result of POST /chat/actions/{id}/confirm and /cancel. */
export interface ChatActionResult {
  actionId: string;
  status: 'CONFIRMED' | 'CANCELLED';
  toolName: string;
  /** Card of the executed action (e.g. TRANSACTION_CREATED), only on confirm. */
  actionCard?: ActionCard;
  /** The created/updated entity, only on confirm. */
  result?: unknown;
}

/** The action cards stored with a message (`toolResults`, a JSON array), or []. */
export function parseToolResults(raw?: string | null): ActionCard[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (card): card is ActionCard =>
            !!card && typeof (card as ActionCard).actionType === 'string'
        )
      : [];
  } catch {
    return [];
  }
}

const toChatMessage = ({ toolResults, ...msg }: ChatMessageDto): ChatMessage => {
  const actionCards = parseToolResults(toolResults);
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    status: msg.status,
    createdAt: msg.createdAt,
    ...(actionCards.length ? { actionCards } : {}),
  };
};

export const chatService = {
  async listSessions(): Promise<ChatSession[]> {
    return request<ChatSession[]>('/chat/sessions');
  },

  async getSessionMessages(sessionId: string): Promise<ChatSession> {
    const session = await request<Omit<ChatSession, 'messages'> & { messages?: ChatMessageDto[] }>(
      `/chat/sessions/${sessionId}`
    );
    return { ...session, messages: session.messages?.map(toChatMessage) };
  },

  async deleteSession(sessionId: string): Promise<void> {
    await request(`/chat/sessions/${sessionId}`, { method: 'DELETE' });
  },

  async clearSessions(): Promise<void> {
    await request('/chat/clear', { method: 'POST' });
  },

  /** Executes an AI write proposal (PENDING_CONFIRMATION card, data.actionId). */
  async confirmAction(actionId: string): Promise<ChatActionResult> {
    return request<ChatActionResult>(`/chat/actions/${actionId}/confirm`, { method: 'POST' });
  },

  /** Discards an AI write proposal; nothing is written. */
  async cancelAction(actionId: string): Promise<ChatActionResult> {
    return request<ChatActionResult>(`/chat/actions/${actionId}/cancel`, { method: 'POST' });
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

    const path = '/chat/stream';
    const hadToken = hasStoredToken();
    try {
      // authFetch renews an expired access token (and retries once on 401).
      const response = await authFetch(path, {
        method: 'POST',
        headers: { Accept: 'text/event-stream' },
        body: JSON.stringify(req),
        signal: controller.signal,
      });

      // Same message (and 401 → auth-expired) as request().
      if (!response.ok) throw await readApiError(response, { path, hadToken });

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
