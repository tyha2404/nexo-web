import { useEffect } from 'react';

/** Fields that bring up the on-screen keyboard. */
export const KEYBOARD_FIELD =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]):not([type="button"]):not([type="submit"]):not([readonly]):not([inputmode="none"]), textarea:not([readonly]), [contenteditable="true"]';

// iOS keyboard + accessory bar is ~300px+; browser chrome changes stay well below this.
const KEYBOARD_MIN_HEIGHT = 150;

/**
 * Marks <html data-keyboard="open"> while the on-screen keyboard covers the page, and keeps
 * --keyboard-viewport-top / --keyboard-height in sync with the visual viewport. iOS never
 * resizes the layout viewport for the keyboard, so `position: fixed; bottom: 0` UI (bottom nav,
 * toasts) would otherwise sit behind it or float over the form. Use the `keyboard:` variant.
 */
export function useVirtualKeyboard() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const covered = window.innerHeight - viewport.height - viewport.offsetTop;
        const typing = document.activeElement?.matches(KEYBOARD_FIELD) ?? false;
        const open = typing && covered > KEYBOARD_MIN_HEIGHT;
        if (open) root.dataset.keyboard = 'open';
        else delete root.dataset.keyboard;
        root.style.setProperty('--keyboard-viewport-top', `${viewport.offsetTop}px`);
        root.style.setProperty('--keyboard-height', `${open ? Math.max(0, covered) : 0}px`);
      });
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      delete root.dataset.keyboard;
      root.style.removeProperty('--keyboard-viewport-top');
      root.style.removeProperty('--keyboard-height');
    };
  }, []);
}
