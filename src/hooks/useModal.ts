import { useEffect, useRef } from 'react';

// Use the visual viewport for the iOS keyboard; dvh alone tracks browser chrome.
export function useModal(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (dialog) dialog.dataset.modalLayer = 'true';
    const previousFocus = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const previousStyle = document.body.getAttribute('style');
    Object.assign(document.body.style, {
      position: 'fixed',
      top: `-${scrollY}px`,
      width: '100%',
      overflow: 'hidden',
    });
    const rootStyle = document.documentElement.style;
    const previousViewportHeight = rootStyle.getPropertyValue('--modal-viewport-height');
    const previousViewportTop = rootStyle.getPropertyValue('--modal-viewport-top');
    const viewport = window.visualViewport;
    const resize = () => {
      document.documentElement.style.setProperty(
        '--modal-viewport-height',
        `${viewport?.height ?? window.innerHeight}px`
      );
      document.documentElement.style.setProperty(
        '--modal-viewport-top',
        `${viewport?.offsetTop ?? 0}px`
      );
    };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    const keydown = (event: KeyboardEvent) => {
      const layers = document.querySelectorAll('[data-modal-layer="true"]');
      if (layers.length && layers[layers.length - 1] !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
        ) ?? []
      ).filter((el) => el.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      if (dialog) delete dialog.dataset.modalLayer;
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      document.removeEventListener('keydown', keydown);
      if (previousViewportHeight)
        rootStyle.setProperty('--modal-viewport-height', previousViewportHeight);
      else rootStyle.removeProperty('--modal-viewport-height');
      if (previousViewportTop) rootStyle.setProperty('--modal-viewport-top', previousViewportTop);
      else rootStyle.removeProperty('--modal-viewport-top');
      if (previousStyle === null) document.body.removeAttribute('style');
      else document.body.setAttribute('style', previousStyle);
      window.scrollTo(0, scrollY);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open]);
  return dialogRef;
}
