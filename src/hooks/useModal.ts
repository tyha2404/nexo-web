import { useEffect, useRef } from 'react';
import { isTouchDevice } from '../commons/utils';
import { KEYBOARD_FIELD } from './useVirtualKeyboard';

/** Nearest scrolling ancestor of `el` inside `dialog` (the form body, or the panel itself). */
function scrollParent(el: HTMLElement, dialog: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight)
      return node;
    if (node === dialog) break;
  }
  return null;
}

/**
 * Scrolls the focused field (with its label) into the part of the dialog the keyboard leaves
 * visible, clear of a sticky header/footer. Scrolls only the dialog's own scroller, never the
 * page, so the body lock and the visual-viewport sizing stay intact.
 */
function revealField(field: HTMLElement, dialog: HTMLElement) {
  const scroller = scrollParent(field, dialog);
  if (!scroller) return;
  const target = (field.closest('.react-select__control') as HTMLElement | null) ?? field;
  const label = field.id ? dialog.querySelector<HTMLElement>(`label[for="${field.id}"]`) : null;
  const rect = target.getBoundingClientRect();
  const top = Math.min(rect.top, label?.getBoundingClientRect().top ?? rect.top);
  const box = scroller.getBoundingClientRect();
  let visibleTop = box.top;
  let visibleBottom = Math.min(box.bottom, window.visualViewport?.height ?? box.bottom);
  for (const bar of scroller.querySelectorAll<HTMLElement>('.modal-header, .button-group')) {
    if (getComputedStyle(bar).position !== 'sticky') continue;
    const barRect = bar.getBoundingClientRect();
    if (bar.classList.contains('modal-header')) visibleTop = Math.max(visibleTop, barRect.bottom);
    else visibleBottom = Math.min(visibleBottom, barRect.top);
  }
  const gap = 12;
  let delta = 0;
  if (rect.bottom > visibleBottom - gap) delta = rect.bottom - visibleBottom + gap;
  if (top - delta < visibleTop + gap) delta = top - visibleTop - gap;
  if (Math.abs(delta) > 1) scroller.scrollBy({ top: delta, behavior: 'smooth' });
}

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
    const previousViewportBottom = rootStyle.getPropertyValue('--modal-viewport-bottom');
    const viewport = window.visualViewport;
    const resize = () => {
      rootStyle.setProperty(
        '--modal-viewport-bottom',
        `${Math.max(0, window.innerHeight - (viewport?.height ?? window.innerHeight) - (viewport?.offsetTop ?? 0))}px`
      );
      document.documentElement.style.setProperty(
        '--modal-viewport-height',
        `${viewport?.height ?? window.innerHeight}px`
      );
      document.documentElement.style.setProperty(
        '--modal-viewport-top',
        `${viewport?.offsetTop ?? 0}px`
      );
      scheduleReveal(60);
    };
    // Keep the focused field above the keyboard: on focus, and again once the keyboard has
    // finished animating in (the visual viewport resize lands ~250ms later on iOS).
    let revealTimer = 0;
    const scheduleReveal = (delay: number) => {
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        if (dialog && active?.matches(KEYBOARD_FIELD) && dialog.contains(active))
          revealField(active, dialog);
      }, delay);
    };
    const focusin = () => scheduleReveal(300);
    // A tap on empty space hides the keyboard (iOS keeps it up until another field or Done).
    const pointerdown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      const active = document.activeElement as HTMLElement | null;
      if (!active?.matches(KEYBOARD_FIELD) || !dialog?.contains(active)) return;
      const target = event.target as Element;
      if (
        target.closest(
          'input, textarea, select, button, a, label, [role="option"], [role="listbox"], [role="tab"], .react-select__control, [contenteditable="true"]'
        )
      )
        return;
      active.blur();
    };
    dialog?.addEventListener('focusin', focusin);
    dialog?.addEventListener('pointerdown', pointerdown);
    resize();
    window.addEventListener('resize', resize);
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    // Focus the dialog for Escape/Tab handling, unless a field inside already took focus
    // (autoFocus): stealing it would close the keyboard the user just opened.
    const frame = requestAnimationFrame(() => {
      if (!dialogRef.current?.contains(document.activeElement))
        dialogRef.current?.focus({ preventScroll: true });
    });
    const keydown = (event: KeyboardEvent) => {
      const layers = document.querySelectorAll('[data-modal-layer="true"]');
      if (layers.length && layers[layers.length - 1] !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      // Touch keyboards: return on an `enterKeyHint="next"` field moves to the next text field (dropdowns are
      // skipped: they open their own menu); on the last one it just hides the keyboard.
      const field = event.target as HTMLElement;
      if (
        event.key === 'Enter' &&
        !event.isComposing &&
        isTouchDevice() &&
        field.getAttribute('enterkeyhint') === 'next' &&
        dialog?.contains(field)
      ) {
        event.preventDefault();
        const fields = Array.from(dialog.querySelectorAll<HTMLElement>(KEYBOARD_FIELD)).filter(
          (el) =>
            !el.closest('.react-select__control') &&
            !(el as HTMLInputElement).disabled &&
            el.getClientRects().length > 0
        );
        const next = fields[fields.indexOf(field) + 1];
        if (next) next.focus();
        else field.blur();
        return;
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
      window.clearTimeout(revealTimer);
      dialog?.removeEventListener('focusin', focusin);
      dialog?.removeEventListener('pointerdown', pointerdown);
      window.removeEventListener('resize', resize);
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      document.removeEventListener('keydown', keydown);
      if (previousViewportBottom)
        rootStyle.setProperty('--modal-viewport-bottom', previousViewportBottom);
      else rootStyle.removeProperty('--modal-viewport-bottom');
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
