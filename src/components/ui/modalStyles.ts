/**
 * Modal system (formerly .modal-backdrop / .modal-content / .modal-header ... in components.css).
 *
 * Every modal is portalled to <body> and laid out from the CSS variables that
 * hooks/useModal.ts keeps in sync with the visual viewport (iOS keyboard):
 * --modal-viewport-top / --modal-viewport-bottom / --modal-viewport-height.
 *
 * Three shapes:
 * - MODAL_FORM_SHELL_PANEL: header + scrolling MODAL_FORM_BODY + fixed MODAL_SHELL_FOOTER.
 * - MODAL_PANEL: the whole card scrolls (sticky header, sticky footer).
 * - CONFIRM_PANEL: small centered card, also on phones.
 * Form modals fill the screen on phones (`mobile:`); the confirm dialog does not.
 *
 * Plain marker classes (modal-backdrop, app-modal-backdrop, modal-content, modal-header,
 * modal-form-body, button-group, close-btn, confirm-modal-content) stay for tests and
 * styles/vendor.css (42px inputs inside .modal-content).
 */
import { cx } from './styles';

// Class strings are written out in full (no interpolation) so Tailwind's scanner sees them.

/* ---------- Backdrop ---------- */

const BACKDROP_BASE = cx(
  'modal-backdrop app-modal-backdrop',
  'fixed inset-0 z-[999999] box-border flex h-auto w-auto items-center justify-center overflow-x-hidden overflow-y-auto [-webkit-overflow-scrolling:touch]',
  'bg-[rgba(11,15,25,0.75)] backdrop-blur-[10px]',
  'pt-[calc(var(--modal-viewport-top,0px)+max(12px,env(safe-area-inset-top,0px)))] pr-[max(12px,env(safe-area-inset-right,0px))] pb-[calc(var(--modal-viewport-bottom,0px)+max(12px,env(safe-area-inset-bottom,0px)))] pl-[max(12px,env(safe-area-inset-left,0px))]',
  // Form controls never overflow the dialog; native date inputs get a 44px tap target.
  '[&_form]:min-w-0 [&_form]:max-w-full',
  '[&_:is(input,textarea,select)]:min-w-0 [&_:is(input,textarea,select)]:max-w-full',
  "[&_input:is([type='date'],[type='month'],[type='datetime-local'])]:w-full [&_input:is([type='date'],[type='month'],[type='datetime-local'])]:min-h-11! [&_input:is([type='date'],[type='month'],[type='datetime-local'])]:text-[16px]!"
);

/** Backdrop of a form modal: on phones the panel fills the visual viewport edge to edge. */
export const MODAL_BACKDROP = cx(
  BACKDROP_BASE,
  'mobile:items-stretch mobile:pt-[var(--modal-viewport-top,0px)] mobile:pr-0 mobile:pb-[var(--modal-viewport-bottom,0px)] mobile:pl-0'
);

/** Backdrop of the confirm dialog: stays a centered card on phones. */
export const CONFIRM_BACKDROP = BACKDROP_BASE;

/* ---------- Panel ---------- */

const PANEL_BASE = cx(
  'modal-content mx-auto my-0 box-border flex w-full flex-col',
  'max-h-[calc(var(--modal-viewport-height,100dvh)-max(12px,env(safe-area-inset-top,0px))-max(12px,env(safe-area-inset-bottom,0px)))]',
  'rounded-lg border border-line bg-card shadow-app-lg outline-none [overflow-wrap:anywhere]',
  'animate-scale-in motion-safe:animate-[nexo-dialog-enter_220ms_var(--motion-ease)]'
);

/**
 * Phones: the form modal becomes a full-screen sheet. It only fades in: the card's
 * translate/scale entrance would push a full-height sheet (and its footer) past the
 * bottom of the viewport while it runs.
 */
const PANEL_PHONE =
  'mobile:m-0 mobile:size-full mobile:max-h-full mobile:max-w-full mobile:rounded-none mobile:border-none mobile:motion-safe:animate-[fadeIn_220ms_var(--motion-ease)]';

const PANEL_SCROLL =
  'overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]';

/** Whole-card scrolling modal (Debts, Receipt). */
export const MODAL_PANEL = cx(
  PANEL_BASE,
  PANEL_SCROLL,
  PANEL_PHONE,
  'max-w-[500px] p-7 max-[600px]:px-4 mobile:pt-[max(1.25rem,env(safe-area-inset-top,0px))] mobile:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]'
);

/** Header / scrolling body / footer modal: the panel itself never scrolls. */
export const MODAL_FORM_SHELL_PANEL = cx(
  PANEL_BASE,
  PANEL_PHONE,
  'max-w-[500px] overflow-hidden overscroll-contain p-0',
  '[&>form]:flex [&>form]:min-h-0 [&>form]:flex-col [&>form]:overflow-hidden'
);

export const CONFIRM_PANEL = cx(
  PANEL_BASE,
  PANEL_SCROLL,
  'confirm-modal-content max-w-[420px] p-6 max-[600px]:rounded-md'
);

/* ---------- Header ---------- */

const HEADER_BASE =
  'modal-header z-20 flex items-center justify-between gap-3 border-b border-line bg-card backdrop-blur-[12px] [&_h3]:m-0 [&_h3]:text-[1.25rem] [&_h3]:font-bold [&_h3]:tracking-[-0.01em] [&_h3]:text-main';

/** Sticky header of a scrolling panel; bleeds over the panel padding. */
export const MODAL_HEADER = cx(
  HEADER_BASE,
  'sticky -top-7 -mx-7 -mt-7 mb-5 px-7 pt-5 pb-3',
  'max-[600px]:-top-5 max-[600px]:-mx-4 max-[600px]:-mt-5 max-[600px]:px-4 max-[600px]:pt-4'
);

export const MODAL_SHELL_HEADER = cx(
  HEADER_BASE,
  'static m-0 shrink-0 px-4 py-3 mobile:pt-[max(12px,env(safe-area-inset-top,0px))]'
);

export const MODAL_CLOSE_BTN =
  'close-btn inline-flex size-[38px] min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0 text-[1.5rem] leading-none text-muted transition-all duration-200 ease-[ease] hover:bg-hover hover:text-main';

/* ---------- Body & footer ---------- */

export const MODAL_FORM_BODY =
  'modal-form-body min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain p-4';

/** Footer of a scrolling panel: sticks to the bottom while the card scrolls. */
export const MODAL_FOOTER = 'button-group sticky -bottom-px z-[2] mt-4 flex gap-3 bg-card py-3';

/** Footer of a form shell: always visible below the scrolling body. */
export const MODAL_SHELL_FOOTER =
  'button-group static z-[2] m-0 flex shrink-0 gap-3 border-t border-line bg-card px-4 pt-3 pb-2 mobile:pb-[max(8px,env(safe-area-inset-bottom,0px))]';

/* ---------- Confirm dialog ---------- */

const CONFIRM_ICON_BADGE = 'flex size-10 shrink-0 items-center justify-center rounded-md';
export const CONFIRM_ICON_DANGER = cx(
  CONFIRM_ICON_BADGE,
  'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
);
export const CONFIRM_ICON_WARNING = cx(
  CONFIRM_ICON_BADGE,
  'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
);

/* ---------- PWA / loading toast ---------- */

export const PWA_TOAST =
  'pwa-toast fixed right-6 bottom-6 z-[99990] flex max-w-[min(420px,calc(100vw-24px))] flex-col gap-3 rounded-md border border-line bg-card p-4 shadow-app-lg backdrop-blur-[12px] mobile:right-3 mobile:bottom-[calc(76px+env(safe-area-inset-bottom))] mobile:left-3';
