import moment from 'moment';
import { useRef, useState } from 'react';
import {
  ApiError,
  chatService,
  type ActionCard,
  type ChatMessage,
  type ChatSession,
} from '../../services';
import { dataEventsAfterConfirm } from './actionEvents';
import { ACTION_TYPES, isCardOfType, type PendingActionData } from './types';

/** Replace the trailing model message (the one being streamed) with `patch(last)`. */
const patchLastModelMessage = (
  messages: ChatMessage[],
  patch: (last: ChatMessage) => ChatMessage
): ChatMessage[] => {
  const updated = [...messages];
  const lastIdx = updated.length - 1;
  if (lastIdx >= 0 && updated[lastIdx].role === 'model') updated[lastIdx] = patch(updated[lastIdx]);
  return updated;
};

/** Messages with the data of the proposal `actionId` merged with `patch`. */
const patchProposal = (
  messages: ChatMessage[],
  actionId: string,
  patch: Partial<PendingActionData>
): ChatMessage[] =>
  messages.map((msg) =>
    msg.actionCards?.some(
      (card) =>
        isCardOfType(card, ACTION_TYPES.PENDING_CONFIRMATION) && card.data.actionId === actionId
    )
      ? {
          ...msg,
          actionCards: msg.actionCards.map((card) =>
            isCardOfType(card, ACTION_TYPES.PENDING_CONFIRMATION) && card.data.actionId === actionId
              ? { ...card, data: { ...card.data, ...patch } }
              : card
          ),
        }
      : msg
  );

/** Client-side state of a proposal card while/after the user acts on it. */
export interface ProposalUiState {
  busy?: 'confirm' | 'cancel';
  /** Why the last confirm/cancel failed; the proposal can be tried again. */
  error?: string;
  /** The server already confirmed or cancelled it (409), e.g. from another device. */
  handled?: boolean;
}

export interface UseChatConversationOptions {
  /** Called after a session's messages were loaded (e.g. to close the list and scroll). */
  onSessionLoaded?: () => void;
}

/** Chat sessions, messages, SSE streaming and action-card handlers for the AI widget. */
export function useChatConversation({ onSessionLoaded }: UseChatConversationOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolTitle, setActiveToolTitle] = useState<string | null>(null);
  // Keyed by actionId (unique per proposal); cleared with the conversation anyway.
  const [proposalUi, setProposalUi] = useState<Record<string, ProposalUiState>>({});
  // Synchronous guard against a double tap before the busy state renders.
  const inFlight = useRef(new Set<string>());

  const setUi = (actionId: string, state: ProposalUiState) =>
    setProposalUi((prev) => ({ ...prev, [actionId]: state }));

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const sessionData = await chatService.getSessionMessages(sessionId);
      setCurrentSessionId(sessionData.id);
      setMessages(sessionData.messages || []);
      setProposalUi({});
      onSessionLoaded?.();
    } catch (err) {
      console.error('Failed to load session messages:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const sessList = await chatService.listSessions();
      setSessions(sessList);
      if (sessList.length > 0 && !currentSessionId) {
        loadSessionMessages(sessList[0].id);
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    }
  };

  const resetConversation = () => {
    setCurrentSessionId(undefined);
    setMessages([]);
    setProposalUi({});
    setActiveToolTitle(null);
    setInput('');
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await chatService.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      return currentSessionId === sessionId;
    } catch (err) {
      console.error('Failed to delete chat session:', err);
      return false;
    }
  };

  const clearSessions = async () => {
    try {
      await chatService.clearSessions();
      setSessions([]);
      return true;
    } catch (err) {
      console.error('Failed to clear sessions:', err);
      return false;
    }
  };

  /** Confirm or cancel an AI write proposal (a PENDING_CONFIRMATION card) on the server. */
  const resolveProposal = async (card: ActionCard, decision: 'confirm' | 'cancel') => {
    if (!isCardOfType(card, ACTION_TYPES.PENDING_CONFIRMATION)) return;
    const proposal = card.data;
    const { actionId } = proposal;
    if (!actionId || inFlight.current.has(actionId)) return;
    inFlight.current.add(actionId);
    setUi(actionId, { busy: decision });
    try {
      if (decision === 'confirm') {
        const result = await chatService.confirmAction(actionId);
        setMessages((prev) =>
          patchProposal(prev, actionId, { status: 'CONFIRMED', resultCard: result.actionCard })
        );
        for (const name of dataEventsAfterConfirm(proposal, result.actionCard)) {
          window.dispatchEvent(new Event(name));
        }
      } else {
        await chatService.cancelAction(actionId);
        setMessages((prev) => patchProposal(prev, actionId, { status: 'CANCELLED' }));
      }
      setUi(actionId, {});
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 404 || status === 410) {
        // Expired, or lost when the server restarted: it can no longer run.
        setMessages((prev) => patchProposal(prev, actionId, { status: 'EXPIRED' }));
        setUi(actionId, {});
      } else if (status === 409) {
        setUi(actionId, { handled: true });
      } else {
        // 422 (e.g. insufficient balance) / 5xx: the proposal stays pending, so it can be retried.
        setUi(actionId, {
          error:
            err instanceof ApiError && err.message
              ? err.message
              : 'Không kết nối được máy chủ, vui lòng thử lại.',
        });
      }
    } finally {
      inFlight.current.delete(actionId);
    }
  };

  const confirmAction = (card: ActionCard) => resolveProposal(card, 'confirm');
  const cancelAction = (card: ActionCard) => resolveProposal(card, 'cancel');

  const sendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isLoading) return;

    setInput('');
    setIsLoading(true);
    setActiveToolTitle(null);

    const userMsg: ChatMessage = {
      role: 'user',
      content: messageText,
      status: 'SUCCESS',
      createdAt: moment().toISOString(),
    };
    const modelMsg: ChatMessage = {
      role: 'model',
      content: '',
      status: 'STREAMING',
      createdAt: moment().toISOString(),
    };

    setMessages((prev) => {
      const sanitized = prev.map((m) =>
        m.role === 'model' && !m.content
          ? { ...m, content: '⚠️ Phiên trò chuyện này đã bị gián đoạn.', status: 'ERROR' as const }
          : m
      );
      return [...sanitized, userMsg, modelMsg];
    });

    let accumulatedContent = '';

    await chatService.sendStreamMessage(
      { sessionId: currentSessionId, message: messageText },
      (event) => {
        if (event.type === 'session_info' && event.sessionId) {
          setCurrentSessionId(event.sessionId);
        } else if (event.type === 'tool_start') {
          setActiveToolTitle(event.toolTitle || 'Đang xử lý...');
        } else if (event.type === 'tool_done') {
          setActiveToolTitle(null);
        } else if (event.type === 'action_card' && event.actionCard) {
          // Writes arrive only as proposals (PENDING_CONFIRMATION): nothing changed yet, so
          // no data event here; confirmAction dispatches them once the server ran the action.
          const card = event.actionCard;
          setMessages((prev) =>
            patchLastModelMessage(prev, (last) => ({
              ...last,
              id: event.messageId || last.id,
              actionCards: [...(last.actionCards ?? []), card],
            }))
          );
        } else if (event.type === 'text_delta' && event.delta) {
          accumulatedContent += event.delta;
          setMessages((prev) =>
            patchLastModelMessage(prev, (last) => ({
              ...last,
              id: event.messageId || last.id,
              content: accumulatedContent,
              status: 'STREAMING',
            }))
          );
        } else if (event.type === 'error') {
          const errDetail = event.errorMessage || 'Lỗi xử lý';
          accumulatedContent = accumulatedContent
            ? `${accumulatedContent}\n\n⚠️ ${errDetail}`
            : `⚠️ ${errDetail}`;
          setMessages((prev) =>
            patchLastModelMessage(prev, (last) => ({
              ...last,
              id: event.messageId || last.id,
              content: accumulatedContent,
              status: 'ERROR',
            }))
          );
        }
      },
      () => {
        setIsLoading(false);
        setActiveToolTitle(null);
        setMessages((prev) =>
          patchLastModelMessage(prev, (last) => {
            if (!last.content) {
              return {
                ...last,
                content: '⚠️ Không nhận được phản hồi từ AI hoặc phiên xử lý đã kết thúc.',
                status: 'ERROR',
              };
            }
            return last.status !== 'ERROR' ? { ...last, status: 'SUCCESS' } : last;
          })
        );
        loadSessions();
      },
      (err) => {
        setIsLoading(false);
        setActiveToolTitle(null);
        setMessages((prev) =>
          patchLastModelMessage(prev, (last) => ({
            ...last,
            content: last.content
              ? `${last.content}\n\n⚠️ Có lỗi kết nối: ${err.message}`
              : `⚠️ Có lỗi kết nối: ${err.message}`,
            status: 'ERROR',
          }))
        );
      }
    );
  };

  const retry = (modelMsgIdx: number) => {
    for (let i = modelMsgIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        if (messages[i].content) sendMessage(messages[i].content);
        return;
      }
    }
  };

  return {
    messages,
    sessions,
    currentSessionId,
    input,
    setInput,
    isLoading,
    activeToolTitle,
    proposalUi,
    loadSessions,
    loadSessionMessages,
    resetConversation,
    deleteSession,
    clearSessions,
    confirmAction,
    cancelAction,
    sendMessage,
    retry,
  };
}
