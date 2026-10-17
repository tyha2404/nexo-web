import { useEffect, useState, type RefObject } from 'react';

// Keep in step with the mobile shell's CSS, including landscape phones.
const MOBILE_QUERY =
  '(max-width: 768px), (pointer: coarse) and (orientation: landscape) and (max-width: 1024px) and (max-height: 500px)';

export function useMobileChatViewport(open: boolean, ref: RefObject<HTMLDivElement | null>) {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setMobile(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!open || !mobile || !ref.current) return;
    const element = ref.current;
    const viewport = window.visualViewport;
    const update = () => {
      const visibleHeight = viewport?.height ?? window.innerHeight;
      const height = Math.min(visibleHeight, window.innerHeight * 0.85);
      const top = (viewport?.offsetTop ?? 0) + visibleHeight - height;
      element.style.setProperty('--chat-visible-height', `${height}px`);
      element.style.setProperty('--chat-visible-top', `${top}px`);
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      element.style.removeProperty('--chat-visible-height');
      element.style.removeProperty('--chat-visible-top');
    };
  }, [open, mobile, ref]);

  return mobile;
}
