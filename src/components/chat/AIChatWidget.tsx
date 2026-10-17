import { useEffect, useMemo, useRef, useState, type MouseEvent, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '../../commons/types';
import { authService } from '../../services';
import './AIChatWidget.css';
import { ChatHeader } from './ChatHeader';
import { ResizeIcon } from './ChatIcons';
import { autoResizeTextarea, ChatInputBar, ChatQuickChipsBar } from './ChatInputBar';
import { ChatMessageList } from './ChatMessageList';
import { ChatSessionsSidebar } from './ChatSessionsSidebar';
import { ChatToolsDrawer } from './ChatToolsDrawer';
import { ALL_CATEGORY, getDynamicQuickPrompts } from './toolsCatalog';
import { useChatConversation } from './useChatConversation';
import { useChatResize } from './useChatResize';
import { useSpeechRecognition } from './useSpeechRecognition';

interface AIChatWidgetProps {
  user?: User | null;
  initiallyOpen?: boolean;
}

interface OpenAIChatDetail {
  prompt?: string;
  autoSend?: boolean;
}

const DRAG_DISMISS_THRESHOLD = 90;

export function AIChatWidget({ user: initialUser, initiallyOpen = false }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser || null);
  const [showSessionsList, setShowSessionsList] = useState(false);
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);

  // Mobile touch drag-to-dismiss states
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  const chat = useChatConversation({
    onSessionLoaded: () => {
      setShowSessionsList(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    },
  });
  const { messages, activeToolTitle, setInput, sendMessage } = chat;

  const { isListening, voiceSupported, toggleVoiceInput } = useSpeechRecognition((transcript) =>
    setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
  );
  const { chatDimensions, isResizing, startResizing } = useChatResize();

  const dynamicQuickPrompts = useMemo(() => getDynamicQuickPrompts(), []);

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

  const userInitial = currentUser?.username?.trim()
    ? currentUser.username.trim()[0].toUpperCase()
    : 'U';

  const sendMessageRef = useRef(sendMessage);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  });

  // Listen to open-ai-chat custom event triggered by header button or external action
  useEffect(() => {
    const handleOpenAIChat = (e: Event) => {
      const { prompt, autoSend } = (e as CustomEvent<OpenAIChatDetail | undefined>).detail ?? {};

      if (prompt) {
        setIsOpen(true);
        if (autoSend) {
          sendMessageRef.current(prompt);
        } else {
          setInput(prompt);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              autoResizeTextarea(textareaRef.current);
            }
          }, 100);
        }
      } else {
        setIsOpen((prev) => !prev);
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
      }
    };

    window.addEventListener('open-ai-chat', handleOpenAIChat);
    return () => {
      window.removeEventListener('open-ai-chat', handleOpenAIChat);
    };
  }, [setInput]);

  // Click outside & Escape key to close chat window on desktop
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
      const target = e.target as Node;
      if (
        window.innerWidth > 768 &&
        chatWindowRef.current &&
        !chatWindowRef.current.contains(target)
      ) {
        const isHeaderAiBtn = (target as HTMLElement).closest?.('.header-ai-btn');
        if (!isHeaderAiBtn) {
          setIsOpen(false);
        }
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeToolTitle]);

  const loadSessionsRef = useRef(chat.loadSessions);
  useEffect(() => {
    loadSessionsRef.current = chat.loadSessions;
  });
  useEffect(() => {
    if (isOpen) {
      loadSessionsRef.current();
      // Scroll to bottom when opening chat
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, [isOpen]);

  const handleNewChat = () => {
    chat.resetConversation();
    setShowSessionsList(false);
    setShowToolsDrawer(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleDeleteSession = async (e: MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (await chat.deleteSession(sessionId)) handleNewChat();
  };

  const handleClearAll = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện không?')) {
      if (await chat.clearSessions()) handleNewChat();
    }
  };

  // Mobile Touch Gestures for Drag-to-Dismiss
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStartY === null) return;
    const diff = e.touches[0].clientY - touchStartY;
    if (diff > 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (dragOffset > DRAG_DISMISS_THRESHOLD) {
      setIsOpen(false);
    }
    setTouchStartY(null);
    setDragOffset(0);
  };

  return createPortal(
    <>
      {/* Backdrop Overlay with Blur Effect */}
      {isOpen && (
        <div
          className="ai-backdrop"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          title="Nhấn để đóng chat"
        />
      )}

      {/* Chat Window / Drawer / Bottom Sheet */}
      {isOpen && (
        <div
          ref={chatWindowRef}
          className={`nexo-chat-window ${isResizing ? 'resizing' : ''}`}
          style={{
            ...(window.innerWidth > 768
              ? {
                  width: `${chatDimensions.width}px`,
                  height: `${chatDimensions.height}px`,
                }
              : {
                  transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
                  transition: dragOffset > 0 ? 'none' : undefined,
                }),
          }}
        >
          {/* Top Mobile Drag Handle Bar */}
          <div
            className="chat-mobile-drag-bar"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Kéo xuống hoặc nhấn để đóng"
          >
            <div className="chat-drag-indicator" />
          </div>

          {/* Desktop Top-Left Resize Handle */}
          <div
            className="chat-resize-handle-nw"
            onMouseDown={startResizing}
            title="Kéo để thay đổi kích thước khung chat"
          >
            <ResizeIcon />
          </div>

          <ChatHeader
            showToolsDrawer={showToolsDrawer}
            showSessionsList={showSessionsList}
            onNewChat={handleNewChat}
            onToggleTools={() => {
              setShowToolsDrawer(!showToolsDrawer);
              if (showSessionsList) setShowSessionsList(false);
            }}
            onToggleSessions={() => {
              setShowSessionsList(!showSessionsList);
              if (showToolsDrawer) setShowToolsDrawer(false);
            }}
            onClose={() => setIsOpen(false)}
          />

          {/* Main Body with Chat Area & Right Sidebar */}
          <div className="chat-body-layout">
            <div className="chat-main-column">
              <ChatMessageList
                messages={messages}
                isLoading={chat.isLoading}
                activeToolTitle={activeToolTitle}
                userInitial={userInitial}
                quickPrompts={dynamicQuickPrompts}
                actionFeedback={chat.actionFeedback}
                endRef={messagesEndRef}
                onSend={(text) => sendMessage(text)}
                onRetry={chat.retry}
                onConfirmAction={chat.confirmTransaction}
                onCancelAction={chat.cancelAction}
                onUndoAction={chat.undoTransaction}
              />

              {/* Horizontal Quick Chips Bar (Above Input) */}
              {messages.length > 0 && <ChatQuickChipsBar onSend={(text) => sendMessage(text)} />}

              <ChatInputBar
                value={chat.input}
                onChange={setInput}
                onSend={() => sendMessage()}
                isLoading={chat.isLoading}
                textareaRef={textareaRef}
                voiceSupported={voiceSupported}
                isListening={isListening}
                onToggleVoice={toggleVoiceInput}
              />
            </div>

            {/* Blur overlay backdrop over main chat when history sidebar or tools drawer is open */}
            {(showSessionsList || showToolsDrawer) && (
              <div
                className="chat-sessions-overlay-backdrop"
                onClick={() => {
                  setShowSessionsList(false);
                  setShowToolsDrawer(false);
                }}
                title="Nhấn để đóng bảng điều khiển"
              />
            )}

            {showToolsDrawer && (
              <ChatToolsDrawer
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onClose={() => setShowToolsDrawer(false)}
                onRunPrompt={(prompt) => {
                  setShowToolsDrawer(false);
                  sendMessage(prompt);
                }}
              />
            )}

            {showSessionsList && (
              <ChatSessionsSidebar
                sessions={chat.sessions}
                currentSessionId={chat.currentSessionId}
                onClose={() => setShowSessionsList(false)}
                onNewChat={handleNewChat}
                onClearAll={handleClearAll}
                onSelect={chat.loadSessionMessages}
                onDelete={handleDeleteSession}
              />
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
