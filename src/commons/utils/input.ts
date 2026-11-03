import type { InputHTMLAttributes, KeyboardEvent } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Touch-first device (phone / tablet): on-screen keyboard, no hover. */
export const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

/**
 * Prop bundles for the on-screen keyboard (iOS / Android). Spread them on an <input>:
 * `<input {...MONEY_INPUT_PROPS} value=… />`. useModal turns return on an
 * `enterKeyHint="next"` field into "focus the next field".
 */

/** Amounts in đồng: digit keypad, no autofill / QuickType suggestions. */
export const MONEY_INPUT_PROPS = {
  type: 'text',
  inputMode: 'numeric',
  autoComplete: 'off',
  autoCorrect: 'off',
  enterKeyHint: 'next',
} satisfies InputProps;

/** Free text followed by more fields: return moves on. */
export const TEXT_NEXT_INPUT_PROPS = {
  type: 'text',
  autoComplete: 'off',
  autoCapitalize: 'sentences',
  enterKeyHint: 'next',
} satisfies InputProps;

/** Last text field of a form: return ("Xong") submits it. */
export const TEXT_DONE_INPUT_PROPS = {
  type: 'text',
  autoComplete: 'off',
  autoCapitalize: 'sentences',
  enterKeyHint: 'done',
} satisfies InputProps;

/** List search: results filter as you type, so return just hides the keyboard. */
export const SEARCH_INPUT_PROPS = {
  type: 'text',
  inputMode: 'search',
  enterKeyHint: 'search',
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'none',
  spellCheck: false,
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  },
} satisfies InputProps;
