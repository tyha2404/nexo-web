import { useEffect, useRef, useState, type MouseEvent } from 'react';

const MIN_WIDTH = 380;
const MIN_HEIGHT = 460;

/** Desktop drag-to-resize of the chat window from its top-left corner, persisted in localStorage. */
export function useChatResize() {
  const [chatDimensions, setChatDimensions] = useState<{ width: number; height: number }>(() => {
    if (typeof window !== 'undefined') {
      const savedW = localStorage.getItem('nexo_chat_width');
      const savedH = localStorage.getItem('nexo_chat_height');
      return {
        width: savedW ? Math.min(Math.max(parseInt(savedW), 380), window.innerWidth - 32) : 460,
        height: savedH ? Math.min(Math.max(parseInt(savedH), 480), window.innerHeight - 100) : 640,
      };
    }
    return { width: 460, height: 640 };
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
      const maxWidth = window.innerWidth - 48;
      const maxHeight = window.innerHeight - 100;
      setChatDimensions({
        width: Math.min(Math.max(resizeStartRef.current.startW + deltaX, MIN_WIDTH), maxWidth),
        height: Math.min(Math.max(resizeStartRef.current.startH + deltaY, MIN_HEIGHT), maxHeight),
      });
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('nexo_chat_width', chatDimensions.width.toString());
        localStorage.setItem('nexo_chat_height', chatDimensions.height.toString());
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
