import moment from 'moment';
import { useState } from 'react';
import { TransactionType } from '../../commons/constants';
import { getErrorMessage } from '../../commons/utils';
import {
  chatService,
  transactionService,
  type ActionCard,
  type ChatMessage,
  type ChatSession,
} from '../../services';
import type { ActionCardData } from './types';

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
  const [actionFeedback, setActionFeedback] = useState<Record<number, string>>({});

  const setFeedback = (msgIdx: number, text: string) =>
    setActionFeedback((prev) => ({ ...prev, [msgIdx]: text }));

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const sessionData = await chatService.getSessionMessages(sessionId);
      setCurrentSessionId(sessionData.id);
      setMessages(sessionData.messages || []);
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

  // Confirm transaction proposed by Action Card
  const confirmTransaction = async (cardData: ActionCardData | undefined, msgIdx: number) => {
    try {
      if (cardData) {
        await transactionService.create({
          amount: Number(cardData.amount) || 0,
          type: cardData.type || TransactionType.EXPENSE,
          categoryId: cardData.categoryId || cardData.category_id || '',
          walletId: cardData.walletId || cardData.wallet_id,
          transactionDate: cardData.date
            ? moment(cardData.date).format('YYYY-MM-DD')
            : moment().format('YYYY-MM-DD'),
          description: cardData.note || cardData.description || '',
        });
        setFeedback(msgIdx, 'Đã xác nhận và ghi chép giao dịch thành công!');
        window.dispatchEvent(new CustomEvent('transaction-created'));
        window.dispatchEvent(new CustomEvent('transactions-changed'));
      }
    } catch (err) {
      console.error('Failed to confirm transaction:', err);
      setFeedback(msgIdx, `Lỗi ghi chép: ${getErrorMessage(err, 'Không thể tạo giao dịch')}`);
    }
  };

  const cancelAction = (msgIdx: number) => setFeedback(msgIdx, 'Đã hủy thao tác này.');

  // Undo transaction created by Action Card
  const undoTransaction = async (cardData: ActionCardData | undefined, msgIdx: number) => {
    const transactionId = cardData?.id || cardData?.transactionId || cardData?.transaction_id;
    if (!transactionId) {
      setFeedback(msgIdx, 'Đã hoàn tác thao tác.');
      return;
    }
    try {
      await transactionService.delete(transactionId);
      setFeedback(msgIdx, 'Đã hoàn tác và xóa giao dịch thành công.');
      window.dispatchEvent(new CustomEvent('transaction-deleted'));
      window.dispatchEvent(new CustomEvent('transactions-changed'));
    } catch (err) {
      console.error('Failed to undo transaction:', err);
      setFeedback(msgIdx, 'Lỗi khi hoàn tác giao dịch.');
    }
  };

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
    let latestActionCard: ActionCard | undefined = undefined;

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
          latestActionCard = event.actionCard;
          if (event.actionCard.actionType === 'TRANSACTION_CREATED') {
            window.dispatchEvent(new CustomEvent('transaction-created'));
            window.dispatchEvent(new CustomEvent('transactions-changed'));
            if ((event.actionCard.data as ActionCardData | undefined)?.isNewCategoryCreated) {
              window.dispatchEvent(new CustomEvent('categories-changed'));
            }
          } else if (event.actionCard.actionType === 'CATEGORY_CREATED') {
            window.dispatchEvent(new CustomEvent('categories-changed'));
          }
        } else if (event.type === 'text_delta' && event.delta) {
          accumulatedContent += event.delta;
          const actionCard = latestActionCard;
          setMessages((prev) =>
            patchLastModelMessage(prev, (last) => ({
              ...last,
              id: event.messageId || last.id,
              content: accumulatedContent,
              status: 'STREAMING',
              actionCard,
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
    actionFeedback,
    loadSessions,
    loadSessionMessages,
    resetConversation,
    deleteSession,
    clearSessions,
    confirmTransaction,
    cancelAction,
    undoTransaction,
    sendMessage,
    retry,
  };
}
