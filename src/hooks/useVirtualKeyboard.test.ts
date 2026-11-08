import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVirtualKeyboard } from './useVirtualKeyboard';

class FakeViewport extends EventTarget {
  height = window.innerHeight;
  offsetTop = 0;
}

let viewport: FakeViewport;
const root = document.documentElement;
const resize = (height: number) => {
  viewport.height = height;
  viewport.dispatchEvent(new Event('resize'));
};

beforeEach(() => {
  viewport = new FakeViewport();
  vi.stubGlobal('visualViewport', viewport);
  // Run animation frames synchronously.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
});
afterEach(cleanup);

describe('useVirtualKeyboard', () => {
  it('marks the keyboard open only while a text field is focused and the viewport shrank', () => {
    const input = document.createElement('input');
    document.body.append(input);
    renderHook(() => useVirtualKeyboard());

    resize(window.innerHeight - 320); // keyboard up but nothing focused (e.g. rotation)
    expect(root.dataset.keyboard).toBeUndefined();

    input.focus();
    resize(window.innerHeight - 320);
    expect(root.dataset.keyboard).toBe('open');
    expect(root.style.getPropertyValue('--keyboard-height')).toBe('320px');

    resize(window.innerHeight - 80); // browser chrome change, not a keyboard
    expect(root.dataset.keyboard).toBeUndefined();
    expect(root.style.getPropertyValue('--keyboard-height')).toBe('0px');
    input.remove();
  });

  it('ignores fields that never show a keyboard', () => {
    const checkbox = Object.assign(document.createElement('input'), { type: 'checkbox' });
    document.body.append(checkbox);
    renderHook(() => useVirtualKeyboard());
    checkbox.focus();
    resize(window.innerHeight - 320);
    expect(root.dataset.keyboard).toBeUndefined();
    checkbox.remove();
  });

  it('cleans up on unmount', () => {
    const input = document.createElement('input');
    document.body.append(input);
    const { unmount } = renderHook(() => useVirtualKeyboard());
    input.focus();
    resize(window.innerHeight - 320);

    unmount();

    expect(root.dataset.keyboard).toBeUndefined();
    expect(root.style.getPropertyValue('--keyboard-height')).toBe('');
    input.remove();
  });
});
