import { useEffect, useRef, useState, type MouseEvent } from 'react';

// Same bounds as the chat window's CSS (min-w/max-w/min-h/max-h in AIChatWidget).
const MIN_WIDTH = 380;
const MIN_HEIGHT = 460;
const DEFAULT_WIDTH = 460;
const DEFAULT_HEIGHT = 640;
const WIDTH_KEY = 'nexo_chat_width';
const HEIGHT_KEY = 'nexo_chat_height';

const clampWidth = (width: number) => Math.min(Math.max(width, MIN_WIDTH), window.innerWidth - 32);
const clampHeight = (height: number) =>
  Math.min(Math.max(height, MIN_HEIGHT), window.innerHeight - 100);

/** A saved size, or null when storage is unavailable or holds no number. */
const readSaved = (key: string): number | null => {
  try {
    const value = parseInt(localStorage.getItem(key) ?? '', 10);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

/** Desktop drag-to-resize of the chat window from its top-left corner, persisted in localStorage. */
export function useChatResize() {
  const [chatDimensions, setChatDimensions] = useState<{ width: number; height: number }>(() => {
    if (typeof window === 'undefined') return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    const savedW = readSaved(WIDTH_KEY);
    const savedH = readSaved(HEIGHT_KEY);
    return {
      width: savedW !== null ? clampWidth(savedW) : DEFAULT_WIDTH,
      height: savedH !== null ? clampHeight(savedH) : DEFAULT_HEIGHT,
    };
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const startResizing = (e: MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: chatDimensions.width,
      startH: chatDimensions.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isResizing || !resizeStartRef.current) return;
      const deltaX = resizeStartRef.current.startX - e.clientX;
      const deltaY = resizeStartRef.current.startY - e.clientY;
      setChatDimensions({
        width: clampWidth(resizeStartRef.current.startW + deltaX),
        height: clampHeight(resizeStartRef.current.startH + deltaY),
      });
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        try {
          localStorage.setItem(WIDTH_KEY, chatDimensions.width.toString());
          localStorage.setItem(HEIGHT_KEY, chatDimensions.height.toString());
        } catch {
          /* storage unavailable: the size lasts for this session only */
        }
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, chatDimensions]);

  return { chatDimensions, isResizing, startResizing };
}
