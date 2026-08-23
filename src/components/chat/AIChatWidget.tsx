import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import moment from 'moment';
import {
  authService,
  chatService,
  type ChatMessage,
  type ChatSession,
  type ActionCard,
} from '../../services/api';
import type { User } from '../../commons/types';
import './AIChatWidget.css';

const QUICK_PROMPTS = [
  { text: 'Tổng quan tài chính tháng này của tôi', icon: '📊' },
  { text: 'Tôi vừa chi 45k ăn sáng bánh mì', icon: '💸' },
  { text: 'Kiểm tra tình hình hạn mức các ngân sách', icon: '🎯' },
  { text: 'Xem danh sách và số dư các ví tài khoản', icon: '💳' },
  { text: 'Phân tích cơ cấu chi tiêu tháng này', icon: '📈' },
  { text: 'Lịch sử 5 giao dịch gần đây nhất', icon: '📋' },
];

interface AIChatWidgetProps {
  user?: User | null;
}

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ user: initialUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolTitle, setActiveToolTitle] = useState<string | null>(null);
  const [showSessionsList, setShowSessionsList] = useState(false);

  useEffect(() => {
    if (initialUser) {
      setCurrentUser(initialUser);
    } else {
      authService
        .whoami()
        .then(setCurrentUser)
        .catch(() => {});
    }
  }, [initialUser]);

  const getUserInitial = () => {
    if (currentUser?.username && currentUser.username.trim().length > 0) {
      return currentUser.username.trim()[0].toUpperCase();
    }
    return 'U';
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Click outside to close chat window
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        chatWindowRef.current &&
        !chatWindowRef.current.contains(target) &&
        fabRef.current &&
        !fabRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const sessionData = await chatService.getSessionMessages(sessionId);
      setCurrentSessionId(sessionData.id);
      setMessages(sessionData.messages || []);
      setShowSessionsList(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeToolTitle]);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
      // Scroll to bottom when opening chat
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleNewChat = () => {
    setCurrentSessionId(undefined);
    setMessages([]);
    setShowSessionsList(false);
    setActiveToolTitle(null);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await chatService.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện không?')) {
      try {
        await chatService.clearSessions();
        setSessions([]);
        handleNewChat();
      } catch (err) {
        console.error('Failed to clear sessions:', err);
      }
    }
  };

  const handleRetry = (modelMsgIdx: number) => {
    // Find preceding user prompt
    let promptToRetry = '';
    for (let i = modelMsgIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        promptToRetry = messages[i].content;
        break;
      }
    }
    if (promptToRetry) {
      handleSendMessage(promptToRetry);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isLoading) return;

    setInput('');
    setIsLoading(true);
    setActiveToolTitle(null);

    // 1. Add user message and model placeholder, sanitizing any prior empty model messages
    const userMsg: ChatMessage = {
      role: 'user',
      content: messageText,
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const modelMsg: ChatMessage = {
      role: 'model',
      content: '',
      status: 'STREAMING',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const sanitized = prev.map((m) => {
        if (m.role === 'model' && !m.content) {
          return {
            ...m,
            content: '⚠️ Phiên trò chuyện này đã bị gián đoạn.',
            status: 'ERROR' as const,
          };
        }
        return m;
      });
      return [...sanitized, userMsg, modelMsg];
    });

    let accumulatedContent = '';
    let latestActionCard: ActionCard | undefined = undefined;

    await chatService.sendStreamMessage(
      {
        sessionId: currentSessionId,
        message: messageText,
      },
      (event) => {
        if (event.type === 'session_info' && event.sessionId) {
          setCurrentSessionId(event.sessionId);
        } else if (event.type === 'tool_start') {
          setActiveToolTitle(event.toolTitle || 'Đang xử lý...');
        } else if (event.type === 'tool_done') {
          setActiveToolTitle(null);
        } else if (event.type === 'action_card' && event.actionCard) {
          latestActionCard = event.actionCard;
          // Notify other components if transaction was created
          if (event.actionCard.actionType === 'TRANSACTION_CREATED') {
            window.dispatchEvent(new CustomEvent('transaction-created'));
            window.dispatchEvent(new CustomEvent('transactions-changed'));
          }
        } else if (event.type === 'text_delta' && event.delta) {
          accumulatedContent += event.delta;
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'model') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                id: event.messageId || updated[lastIdx].id,
                content: accumulatedContent,
                status: 'STREAMING',
                actionCard: latestActionCard,
              };
            }
            return updated;
          });
        } else if (event.type === 'error') {
          const errDetail = event.errorMessage || 'Lỗi xử lý';
          accumulatedContent = accumulatedContent
            ? `${accumulatedContent}\n\n⚠️ ${errDetail}`
            : `⚠️ ${errDetail}`;
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'model') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                id: event.messageId || updated[lastIdx].id,
                content: accumulatedContent,
                status: 'ERROR',
              };
            }
            return updated;
          });
        }
      },
      () => {
        setIsLoading(false);
        setActiveToolTitle(null);
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'model') {
            if (!updated[lastIdx].content) {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: '⚠️ Không nhận được phản hồi từ AI hoặc phiên xử lý đã kết thúc.',
                status: 'ERROR',
              };
            } else if (updated[lastIdx].status !== 'ERROR') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                status: 'SUCCESS',
              };
            }
          }
          return updated;
        });
        loadSessions();
      },
      (err) => {
        setIsLoading(false);
        setActiveToolTitle(null);
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'model') {
            const currentContent = updated[lastIdx].content;
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: currentContent
                ? `${currentContent}\n\n⚠️ Có lỗi kết nối: ${err.message}`
                : `⚠️ Có lỗi kết nối: ${err.message}`,
              status: 'ERROR',
            };
          }
          return updated;
        });
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper function to render text with Markdown styling (bold, lists, headings)
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      let trimmedLine = line;
      let isBullet = false;

      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        isBullet = true;
        trimmedLine = trimmedLine.slice(2);
      }

      // Process bold **text**
      const parts = trimmedLine.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.startsWith('# ')) {
        const titleParts = line
          .slice(2)
          .split(/(\*\*.*?\*\*)/g)
          .map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
            }
            return part;
          });
        return (
          <h3 key={lineIdx} style={{ margin: '8px 0 4px 0', fontSize: '15px' }}>
            {titleParts}
          </h3>
        );
      }
      if (line.startsWith('## ') || line.startsWith('### ')) {
        const hParts = line
          .replace(/^#{2,3}\s+/, '')
          .split(/(\*\*.*?\*\*)/g)
          .map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
            }
            return part;
          });
        return (
          <h4 key={lineIdx} style={{ margin: '6px 0 3px 0', fontSize: '13px' }}>
            {hParts}
          </h4>
        );
      }
      if (isBullet) {
        return (
          <li key={lineIdx} style={{ marginLeft: '16px', listStyleType: 'disc' }}>
            {formattedParts}
          </li>
        );
      }

      return (
        <p key={lineIdx} style={{ margin: line === '' ? '4px 0' : '2px 0' }}>
          {formattedParts}
        </p>
      );
    });
  };

  return createPortal(
    <>
      {/* Floating Action Button */}
      <button
        ref={fabRef}
        className={`nexo-chat-widget-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Nexo AI"
        title="Trợ lý Nexo AI"
      >
        {isOpen ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div ref={chatWindowRef} className="nexo-chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v4" />
                  <path d="m19.07 4.93-2.83 2.83" />
                  <path d="M20 12h-4" />
                  <path d="m16.24 16.24 2.83 2.83" />
                  <path d="M12 18v4" />
                  <path d="m4.93 19.07 2.83-2.83" />
                  <path d="M4 12h4" />
                  <path d="m7.76 7.76-2.83-2.83" />
                </svg>
              </div>
              <div className="chat-header-title">
                <h3>Nexo AI</h3>
                <div className="chat-status-indicator">
                  <span className="online-dot" />
                  <span>Online</span>
                </div>
              </div>
            </div>

            <div className="chat-header-actions">
              <button className="chat-icon-btn" onClick={handleNewChat} title="Tạo đoạn chat mới">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              <button
                className={`chat-icon-btn ${showSessionsList ? 'active' : ''}`}
                onClick={() => setShowSessionsList(!showSessionsList)}
                title="Lịch sử trò chuyện"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>

              <button className="chat-icon-btn" onClick={() => setIsOpen(false)} title="Đóng">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Body with Chat Area & Right Sidebar */}
          <div className="chat-body-layout">
            <div className="chat-main-column">
              {/* Messages Area */}
              <div className="chat-messages-container">
                {messages.length === 0 ? (
                  <div className="chat-empty-state">
                    <div className="empty-icon">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                    </div>
                    <h4>Xin chào! Tôi là Nexo AI Copilot</h4>
                    <p>
                      Tôi có thể giúp bạn tự động ghi nhận thu chi, tra cứu tổng quan tài chính,
                      kiểm tra ngân sách, ví tiền và phân tích chi tiêu ngay tức thì.
                    </p>

                    <div className="quick-prompts-grid">
                      {QUICK_PROMPTS.map((prompt, idx) => (
                        <button
                          key={idx}
                          className="quick-prompt-btn"
                          onClick={() => handleSendMessage(prompt.text)}
                        >
                          <span>{prompt.icon}</span>
                          <span>{prompt.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isCurrentTurnLoading = isLoading && idx === messages.length - 1;
                    return (
                      <div key={idx} className={`chat-message-row ${msg.role}`}>
                        <div
                          className={`message-avatar ${msg.role === 'user' ? 'user-avatar' : 'model-avatar'}`}
                        >
                          {msg.role === 'user' ? getUserInitial() : 'AI'}
                        </div>
                        <div
                          className={`message-bubble ${msg.role === 'model' && !msg.content ? 'thinking-bubble' : ''} ${isCurrentTurnLoading && msg.role === 'model' ? 'is-streaming' : ''} ${msg.status === 'ERROR' ? 'status-error' : ''}`}
                        >
                          {msg.role === 'model' && !msg.content ? (
                            isCurrentTurnLoading ? (
                              <div className="typing-dots">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                              </div>
                            ) : (
                              <p style={{ color: '#ef4444', margin: 0 }}>
                                ⚠️ Không nhận được phản hồi từ máy chủ.
                              </p>
                            )
                          ) : (
                            <>
                              {renderFormattedText(msg.content)}
                              {isCurrentTurnLoading && <span className="streaming-cursor" />}
                            </>
                          )}

                          {/* Action Card if present */}
                          {msg.actionCard && (
                            <div className={`chat-action-card ${msg.actionCard.actionType}`}>
                              <div className="action-card-header">
                                <span>
                                  {msg.actionCard.actionType === 'TRANSACTION_CREATED' && '✅ '}
                                  {msg.actionCard.actionType === 'BUDGET_ALERT' && '⚠️ '}
                                  {msg.actionCard.actionType === 'KNOWLEDGE_SOURCE' && '📖 '}
                                  {msg.actionCard.actionType === 'FINANCIAL_SUMMARY' && '📊 '}
                                </span>
                                <span>{msg.actionCard.title}</span>
                              </div>
                              <div className="action-card-desc">{msg.actionCard.description}</div>
                            </div>
                          )}

                          {/* Retry button for error state */}
                          {msg.role === 'model' && msg.status === 'ERROR' && !isLoading && (
                            <div>
                              <button className="chat-retry-btn" onClick={() => handleRetry(idx)}>
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                </svg>
                                Thử lại
                              </button>
                            </div>
                          )}

                          {/* Only display timestamp when message has content / finished loading */}
                          {!(msg.role === 'model' && !msg.content) && msg.createdAt && (
                            <span className="message-time">
                              {moment(msg.createdAt).format('HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Active Tool Execution Indicator */}
                {activeToolTitle && (
                  <div className="tool-status-badge">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ animation: 'spin 1.5s linear infinite' }}
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span>{activeToolTitle}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <div className="chat-input-container">
                <textarea
                  ref={textareaRef}
                  className="chat-input-textarea"
                  placeholder="Nhập yêu cầu (ví dụ: Vừa chi 50k ăn trưa, Tổng quan tài chính tháng này...)"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Auto-resize height
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button
                  className="chat-send-btn"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || isLoading}
                  aria-label="Send message"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Blur overlay backdrop over main chat when history sidebar is open */}
            {showSessionsList && (
              <div
                className="chat-sessions-overlay-backdrop"
                onClick={() => setShowSessionsList(false)}
                title="Nhấn để đóng lịch sử"
              />
            )}

            {/* Right Sidebar for Chat Sessions */}
            {showSessionsList && (
              <div className="chat-sessions-sidebar">
                <div className="sessions-sidebar-header">
                  <div className="sessions-sidebar-title">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    <span>Lịch sử chat</span>
                  </div>
                  <button
                    className="sessions-close-btn"
                    onClick={() => setShowSessionsList(false)}
                    title="Đóng danh sách lịch sử"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="sessions-sidebar-actions">
                  <button className="sessions-new-btn" onClick={handleNewChat}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Đoạn chat mới</span>
                  </button>
                  {sessions.length > 0 && (
                    <button
                      className="sessions-clear-btn"
                      onClick={handleClearAll}
                      title="Xóa tất cả lịch sử"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                {sessions.length === 0 ? (
                  <div className="sessions-empty">
                    <p>Chưa có lịch sử trò chuyện.</p>
                  </div>
                ) : (
                  <div className="sessions-list-items">
                    {sessions.map((sess) => {
                      const isSelected = sess.id === currentSessionId;
                      return (
                        <div
                          key={sess.id}
                          className={`session-item-row ${isSelected ? 'selected' : ''}`}
                          onClick={() => loadSessionMessages(sess.id)}
                        >
                          <div className="session-item-title">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={isSelected ? '#a5b4fc' : '#94a3b8'}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span title={sess.title}>{sess.title}</span>
                          </div>
                          <div className="session-item-actions">
                            <button
                              className="session-delete-btn"
                              onClick={(e) => handleDeleteSession(e, sess.id)}
                              title="Xóa đoạn chat này"
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
};
