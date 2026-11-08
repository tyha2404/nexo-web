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

/**
 * Background of the dialog surface along the top edge of the screen (right under the iOS
 * status bar), or null when the dialog doesn't reach it (a centered card).
 */
function topEdgeColor(dialog: HTMLElement): string | null {
  if (dialog.getBoundingClientRect().top > 1) return null;
  for (
    let node = document.elementFromPoint(window.innerWidth / 2, 1);
    node && dialog.contains(node);
    node = node.parentElement
  ) {
    const bg = getComputedStyle(node).backgroundColor;
    if (bg.startsWith('rgb(')) return bg; // opaque; rgba(...) is see-through
  }
  return null;
}

/**
 * Page state shared by every open dialog. Dialogs can stack (a date picker sheet inside a
 * form) and close in any order (closing the form unmounts both, outer cleanup first), so the
 * page state is saved when the first dialog opens and restored when the last one closes,
 * never per dialog.
 */
interface ModalLayer {
  /** The dialog's colour under the status bar, once measured (null: doesn't reach it). */
  sheetColor: string | null;
}
const VIEWPORT_VARS = [
  '--modal-viewport-height',
  '--modal-viewport-top',
  '--modal-viewport-bottom',
] as const;
const openLayers: ModalLayer[] = [];
let savedPage: {
  htmlOverflow: string;
  bodyOverflow: string;
  themeColor: string | null;
  vars: Record<string, string>;
} | null = null;

const themeMeta = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

/** Status bar colour: the topmost full-screen sheet's, else the page's own. */
function applyThemeColor() {
  const meta = themeMeta();
  if (!meta || !savedPage) return;
  const top = [...openLayers].reverse().find((layer) => layer.sheetColor);
  const color = top?.sheetColor ?? savedPage.themeColor;
  if (color !== null && meta.content !== color) meta.content = color;
}

function pushLayer(layer: ModalLayer) {
  if (openLayers.length === 0) {
    const html = document.documentElement;
    savedPage = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: document.body.style.overflow,
      themeColor: themeMeta()?.content ?? null,
      vars: Object.fromEntries(VIEWPORT_VARS.map((v) => [v, html.style.getPropertyValue(v)])),
    };
    // Scroll lock: overflow hidden on <html> and <body> (honoured for touch since iOS 16).
    // Not `body { position: fixed }`: that leaves the page with no scrollable height, and an
    // iOS home-screen app then ends the viewport one status-bar height (59px) short of the
    // screen, so full-screen sheets stopped above a blank strip.
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  openLayers.push(layer);
}

function popLayer(layer: ModalLayer) {
  const index = openLayers.indexOf(layer);
  if (index >= 0) openLayers.splice(index, 1);
  if (openLayers.length > 0 || !savedPage) {
    applyThemeColor();
    return;
  }
  const html = document.documentElement;
  html.style.overflow = savedPage.htmlOverflow;
  document.body.style.overflow = savedPage.bodyOverflow;
  for (const v of VIEWPORT_VARS) {
    if (savedPage.vars[v]) html.style.setProperty(v, savedPage.vars[v]);
    else html.style.removeProperty(v);
  }
  const meta = themeMeta();
  if (meta && savedPage.themeColor !== null) meta.content = savedPage.themeColor;
  savedPage = null;
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
    const layer: ModalLayer = { sheetColor: null };
    pushLayer(layer);
    const rootStyle = document.documentElement.style;
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
    // A full-screen sheet paints the status bar (theme-color) in its own top colour, so the
    // two read as one surface; the page's title-bar colour comes back on close.
    const frame = requestAnimationFrame(() => {
      if (!dialogRef.current?.contains(document.activeElement))
        dialogRef.current?.focus({ preventScroll: true });
      layer.sheetColor = dialog ? topEdgeColor(dialog) : null;
      applyThemeColor();
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
      popLayer(layer);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [open]);
  return dialogRef;
}
