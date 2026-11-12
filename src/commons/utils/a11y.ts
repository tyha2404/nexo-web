import type { KeyboardEvent } from 'react';

/**
 * Props that make a clickable non-button element (a card that is laid out as a div) usable
 * from the keyboard and by screen readers: role="button", focusable, Enter/Space activate.
 */
export const clickableProps = (onActivate: () => void) => ({
  role: 'button' as const,
  tabIndex: 0,
  onClick: onActivate,
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  },
});
