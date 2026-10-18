import { useEffect, useMemo, useRef, useState, type MouseEvent, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '../../commons/types';
import { useMobileChatViewport } from '../../hooks';
import { authService } from '../../services';
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

// `nexo-chat-window` stays on the element as a test hook.
const CHAT_WINDOW =
  'fixed! bottom-[82px]! right-[24px]! min-w-[380px] max-w-[calc(100vw-32px)] min-h-[460px] max-h-[calc(100vh-100px)] flex flex-col overflow-hidden z-[99995]! bg-[#131d2e] border border-[rgba(255,255,255,0.12)] rounded-xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-[24px] animate-[chatSlideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] light:bg-white light:border-[#e2e8f0] light:shadow-[0_20px_40px_rgba(0,0,0,0.15)] ' +
  'mobile:left-0! mobile:right-0! mobile:w-full! mobile:min-w-full! mobile:max-w-full! mobile:top-[var(--chat-visible-top,15dvh)]! mobile:bottom-auto! mobile:h-[var(--chat-visible-height,85dvh)]! mobile:min-h-0! mobile:max-h-[var(--chat-visible-height,85dvh)]! mobile:pl-[env(safe-area-inset-left,0px)] mobile:pr-[env(safe-area-inset-right,0px)] mobile:pb-[env(safe-area-inset-bottom,0px)] mobile:rounded-t-xl! mobile:rounded-b-none! mobile:border-x-0! mobile:border-b-0! mobile:shadow-[0_-10px_30px_rgba(0,0,0,0.55)]! mobile:animate-[chatMobileSheetSlideUp_0.35s_cubic-bezier(0.16,1,0.3,1)_forwards]!';

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

  const isMobile = useMobileChatViewport(isOpen, chatWindowRef);

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
      if (!isMobile && chatWindowRef.current && !chatWindowRef.current.contains(target)) {
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
  }, [isOpen, isMobile]);

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
          className="fixed! inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-[8px] z-[99990]! animate-[aiBackdropFadeIn_0.25s_cubic-bezier(0.16,1,0.3,1)_forwards] light:bg-[rgba(15,23,42,0.4)]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          title="Nhấn để đóng chat"
        />
      )}

      {/* Chat Window / Drawer / Bottom Sheet */}
      {isOpen && (
        <div
          ref={chatWindowRef}
          className={`nexo-chat-window ${CHAT_WINDOW} ${isResizing ? 'select-none animate-none! transition-none!' : ''}`}
          style={{
            ...(!isMobile
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
            className="group/drag hidden mobile:flex! w-full pt-[10px] pb-[6px] justify-center items-center cursor-grab touch-none select-none bg-[#0f172a] border-b border-[rgba(255,255,255,0.04)] light:bg-[#f8fafc] light:border-[#e2e8f0]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => setIsOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Kéo xuống hoặc nhấn để đóng"
          >
            <div className="w-[38px] h-[4.5px] rounded-full bg-[rgba(255,255,255,0.25)] transition-all duration-200 ease-[ease] light:bg-[#cbd5e1] group-active/drag:w-[44px] group-active/drag:bg-[rgba(255,255,255,0.5)]" />
          </div>

          {/* Desktop Top-Left Resize Handle */}
          <div
            className={`absolute top-0 left-0 w-[22px] h-[22px] pt-[3px] pl-[3px] cursor-nwse-resize z-30 flex items-center justify-center transition-all duration-200 ease-[ease] hover:text-primary hover:bg-[rgba(99,102,241,0.2)] hover:rounded-br-[8px] mobile:hidden! ${isResizing ? 'text-primary bg-[rgba(99,102,241,0.2)] rounded-br-[8px]' : 'text-[rgba(255,255,255,0.25)]'}`}
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
          <div className="flex flex-1 min-h-0 relative overflow-hidden">
            <div className="flex flex-col flex-1 w-full min-w-0 min-h-0">
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
                className="absolute inset-0 bg-[rgba(15,23,42,0.45)] backdrop-blur-[4px] z-[15] cursor-pointer animate-[chatFadeInOverlay_0.2s_ease] light:bg-[rgba(15,23,42,0.2)]"
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
