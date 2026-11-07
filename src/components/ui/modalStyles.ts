/**
 * Modal system (formerly .modal-backdrop / .modal-content / .modal-header ... in components.css).
 *
 * Every modal is portalled to <body> and laid out from the CSS variables that
 * hooks/useModal.ts keeps in sync with the visual viewport (iOS keyboard):
 * --modal-viewport-top / --modal-viewport-bottom / --modal-viewport-height, plus
 * --modal-screen-gap: how far an iOS home-screen app's fixed layer stops short of the screen
 * bottom (see useModal), which the phone backdrop is stretched by.
 *
 * Three shapes:
 * - MODAL_FORM_SHELL_PANEL: header + scrolling MODAL_FORM_BODY + fixed MODAL_SHELL_FOOTER.
 * - MODAL_PANEL: the whole card scrolls (sticky header, sticky footer).
 * - CONFIRM_PANEL: small centered card, also on phones.
 * Form modals fill the screen on phones (`mobile:`); the confirm dialog does not.
 *
 * Plain marker classes (modal-backdrop, app-modal-backdrop, modal-content, modal-header,
 * modal-form-body, button-group, close-btn, confirm-modal-content) stay for tests and
 * styles/vendor.css (shared control height inside .modal-content).
 */
import { cx } from './styles';
import { MOTION_FADE } from './motionStyles';

// Class strings are written out in full (no interpolation) so Tailwind's scanner sees them.

/* ---------- Backdrop ---------- */

const BACKDROP_BASE = cx(
  'modal-backdrop app-modal-backdrop',
  MOTION_FADE,
  'fixed inset-0 z-[999999] box-border flex h-auto w-auto items-center justify-center overflow-x-hidden overflow-y-auto [-webkit-overflow-scrolling:touch]',
  'bg-[rgba(0,0,0,0.4)] light:bg-[rgba(0,0,0,0.2)]',
  'pt-[calc(var(--modal-viewport-top,0px)+max(12px,env(safe-area-inset-top,0px)))] pr-[max(12px,env(safe-area-inset-right,0px))] pb-[calc(var(--modal-viewport-bottom,0px)+max(12px,env(safe-area-inset-bottom,0px)))] pl-[max(12px,env(safe-area-inset-left,0px))]',
  // Form controls never overflow the dialog; native date inputs get a 44px tap target.
  '[&_form]:min-w-0 [&_form]:max-w-full',
  '[&_:is(input,textarea,select)]:min-w-0 [&_:is(input,textarea,select)]:max-w-full',
  "[&_input:is([type='date'],[type='month'],[type='datetime-local'])]:w-full [&_input:is([type='date'],[type='month'],[type='datetime-local'])]:min-h-10! [&_input:is([type='date'],[type='month'],[type='datetime-local'])]:text-[16px]!"
);

/**
 * Backdrop of a form modal: on phones the panel fills the visual viewport edge to edge, down
 * to the real screen bottom (stretched past the short fixed layer of an iOS home-screen app).
 */
export const MODAL_BACKDROP = cx(
  BACKDROP_BASE,
  'mobile:items-stretch mobile:pt-[var(--modal-viewport-top,0px)] mobile:pr-0 mobile:pb-[var(--modal-viewport-bottom,0px)] mobile:pl-0',
  'mobile:bottom-[calc(-1*var(--modal-screen-gap,0px))]'
);

/** Backdrop of the confirm dialog: stays a centered card on phones. */
export const CONFIRM_BACKDROP = BACKDROP_BASE;

/* ---------- Panel ---------- */

const PANEL_BASE = cx(
  'modal-content mx-auto my-0 box-border flex w-full flex-col',
  'max-h-[calc(var(--modal-viewport-height,100dvh)-max(12px,env(safe-area-inset-top,0px))-max(12px,env(safe-area-inset-bottom,0px)))]',
  'rounded-lg border border-line bg-widget shadow-app-lg outline-none [overflow-wrap:anywhere]',
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
  'max-w-[500px] p-5 max-[600px]:px-4 mobile:pt-[max(1.25rem,env(safe-area-inset-top,0px))] mobile:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]'
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
  'confirm-modal-content max-w-[420px] p-5'
);

/* ---------- Header ---------- */

const HEADER_BASE =
  'modal-header z-20 flex items-center justify-between gap-3 border-b border-line bg-widget [&_h3]:m-0 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-main mobile:[&_h3]:text-[16px]';

/** Sticky header of a scrolling panel; bleeds over the panel padding. */
export const MODAL_HEADER = cx(
  HEADER_BASE,
  'sticky -top-5 -mx-5 -mt-5 mb-4 px-5 pt-4 pb-3',
  'max-[600px]:-top-5 max-[600px]:-mx-4 max-[600px]:-mt-5 max-[600px]:px-4 max-[600px]:pt-4'
);

export const MODAL_SHELL_HEADER = cx(
  HEADER_BASE,
  'static m-0 shrink-0 px-4 py-3 mobile:pt-[max(12px,env(safe-area-inset-top,0px))]'
);

export const MODAL_CLOSE_BTN =
  'close-btn inline-flex size-[22px] min-h-[22px] min-w-[22px] cursor-pointer items-center justify-center rounded-[5px] border-none bg-transparent p-0 leading-none text-main transition-colors duration-100 ease-out hover:bg-hover [&_svg]:size-4 mobile:size-9 mobile:min-h-9 mobile:min-w-9';

/* ---------- Body & footer ---------- */

export const MODAL_FORM_BODY =
  'modal-form-body min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain p-4';

/** Footer of a scrolling panel: sticks to the bottom while the card scrolls. */
export const MODAL_FOOTER =
  'button-group sticky -bottom-px z-[2] mt-4 flex justify-end gap-2 bg-widget py-3';

/** Footer of a form shell: always visible below the scrolling body. */
export const MODAL_SHELL_FOOTER =
  'button-group static z-[2] m-0 flex shrink-0 justify-end gap-2 border-t border-line bg-widget px-4 py-3 mobile:pb-[max(12px,env(safe-area-inset-bottom,0px))]';

/* ---------- Confirm dialog ---------- */

const CONFIRM_ICON_BADGE = 'flex size-10 shrink-0 items-center justify-center rounded-md';
export const CONFIRM_ICON_DANGER = cx(
  CONFIRM_ICON_BADGE,
  'bg-[color-mix(in_srgb,var(--expense)_15%,transparent)] text-[var(--expense)]'
);
export const CONFIRM_ICON_WARNING = cx(
  CONFIRM_ICON_BADGE,
  'bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)]'
);

/* ---------- PWA / loading toast ---------- */

export const PWA_TOAST =
  'pwa-toast fixed right-6 bottom-8 z-[99990] flex max-w-[min(420px,calc(100vw-24px))] flex-col gap-3 rounded-md border border-line bg-widget p-4 shadow-app-lg mobile:right-3 mobile:bottom-[calc(76px+env(safe-area-inset-bottom))] mobile:left-3';
