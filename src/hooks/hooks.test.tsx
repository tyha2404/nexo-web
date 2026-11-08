import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDataEvents } from './useDataEvents';
import { useModal } from './useModal';

afterEach(cleanup);

describe('useDataEvents', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces a burst of events into one call', () => {
    const onChange = vi.fn();
    renderHook(() => useDataEvents(['transactions-changed', 'wallets-changed'], onChange, 150));

    window.dispatchEvent(new Event('transactions-changed'));
    window.dispatchEvent(new Event('wallets-changed'));
    window.dispatchEvent(new Event('transactions-changed'));
    vi.advanceTimersByTime(149);
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledOnce();

    window.dispatchEvent(new Event('debts-changed')); // not subscribed
    vi.advanceTimersByTime(500);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('calls the latest callback without resubscribing', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useDataEvents(['x-changed'], cb), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });
    window.dispatchEvent(new Event('x-changed'));
    vi.advanceTimersByTime(150);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('stops listening and drops a pending call on unmount', () => {
    const onChange = vi.fn();
    const { unmount } = renderHook(() => useDataEvents(['x-changed'], onChange));
    window.dispatchEvent(new Event('x-changed'));
    unmount();
    vi.advanceTimersByTime(1000);
    window.dispatchEvent(new Event('x-changed'));
    vi.advanceTimersByTime(1000);
    expect(onChange).not.toHaveBeenCalled();
  });
});

function Dialog({
  open,
  onClose,
  label = 'dialog',
}: {
  open: boolean;
  onClose: () => void;
  label?: string;
}) {
  const ref = useModal(open, onClose);
  if (!open) return null;
  return (
    <div ref={ref} role="dialog" aria-label={label} tabIndex={-1}>
      <input aria-label={`${label} amount`} enterKeyHint="next" />
      <input aria-label={`${label} note`} enterKeyHint="next" />
      <button type="submit">{`${label} save`}</button>
    </div>
  );
}

describe('useModal', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    document.body.removeAttribute('style');
    // jsdom has no layout: report every element as rendered.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      {},
    ] as unknown as DOMRectList);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
  });
  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('only the topmost of stacked dialogs handles Escape', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <>
        <Dialog open onClose={outer} label="outer" />
        <Dialog open onClose={inner} label="inner" />
      </>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(inner).toHaveBeenCalledOnce();
    expect(outer).not.toHaveBeenCalled();
  });

  it('locks page scroll and sets viewport variables while open, then restores everything', () => {
    document.body.style.overflow = 'auto';
    const { rerender } = render(<Dialog open onClose={() => undefined} />);

    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.getPropertyValue('--modal-viewport-height')).toBe(
      `${window.innerHeight}px`
    );
    expect(screen.getByRole('dialog').dataset.modalLayer).toBe('true');

    rerender(<Dialog open={false} onClose={() => undefined} />);

    expect(document.body.style.overflow).toBe('auto');
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.documentElement.style.getPropertyValue('--modal-viewport-height')).toBe('');
  });

  it('returns focus to the element that opened it', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const { rerender } = render(<Dialog open onClose={() => undefined} />);
    screen.getByLabelText('dialog note').focus();

    rerender(<Dialog open={false} onClose={() => undefined} />);

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('traps Tab focus inside the dialog', () => {
    render(<Dialog open onClose={() => undefined} />);
    const first = screen.getByLabelText('dialog amount');
    const last = screen.getByRole('button', { name: 'dialog save' });

    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('on touch keyboards, return moves to the next field and hides the keyboard on the last', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)' }));
    render(<Dialog open onClose={() => undefined} />);
    const amount = screen.getByLabelText('dialog amount');
    const note = screen.getByLabelText('dialog note');

    amount.focus();
    fireEvent.keyDown(amount, { key: 'Enter' });
    expect(document.activeElement).toBe(note);

    fireEvent.keyDown(note, { key: 'Enter' });
    expect(document.activeElement).not.toBe(note);
  });

  it('leaves return alone on desktop and while composing (Vietnamese IME)', () => {
    render(<Dialog open onClose={() => undefined} />);
    const amount = screen.getByLabelText('dialog amount');
    amount.focus();
    fireEvent.keyDown(amount, { key: 'Enter' });
    expect(document.activeElement).toBe(amount);

    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)' }));
    fireEvent.keyDown(amount, { key: 'Enter', isComposing: true });
    expect(document.activeElement).toBe(amount);
  });

  it('a touch on empty space inside the dialog hides the keyboard', () => {
    render(<Dialog open onClose={() => undefined} />);
    const amount = screen.getByLabelText('dialog amount');
    amount.focus();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'dialog save' }), {
      pointerType: 'touch',
    });
    expect(document.activeElement).toBe(amount); // tapping a control keeps it

    act(() => {
      fireEvent.pointerDown(screen.getByRole('dialog'), { pointerType: 'touch' });
    });
    expect(document.activeElement).not.toBe(amount);
  });

  // AddTransactionModal closing while its DatePickerField sheet is still open:
  // React runs the outer cleanup first.
  it('closing a dialog with a nested dialog still open unlocks page scroll', () => {
    function Form({ open }: { open: boolean }) {
      const ref = useModal(open, () => undefined);
      if (!open) return null;
      return (
        <div ref={ref} role="dialog" aria-label="form">
          <Dialog open onClose={() => undefined} label="confirm" />
        </div>
      );
    }
    const { rerender } = render(<Form open />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<Form open={false} />);

    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('the status bar follows the topmost full-screen sheet and is restored in any close order', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = 'rgb(24, 24, 24)';
    document.head.append(meta);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    // Both dialogs reach the top edge, each with its own opaque background.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);
    // jsdom has no hit testing: the point under the status bar is the newest dialog.
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        return dialogs[dialogs.length - 1] ?? null;
      },
    });
    const colors: Record<string, string> = { form: 'rgb(1, 1, 1)', picker: 'rgb(2, 2, 2)' };
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (el) =>
        ({
          backgroundColor:
            colors[(el as HTMLElement).getAttribute('aria-label') ?? ''] ?? 'rgba(0, 0, 0, 0)',
        }) as CSSStyleDeclaration
    );

    function Sheets({ form, picker }: { form: boolean; picker: boolean }) {
      return (
        <>
          <Dialog open={form} onClose={() => undefined} label="form" />
          <Dialog open={picker} onClose={() => undefined} label="picker" />
        </>
      );
    }

    // Close the inner one first (normal order).
    const { rerender, unmount } = render(<Sheets form picker={false} />);
    expect(meta.content).toBe('rgb(1, 1, 1)');
    rerender(<Sheets form picker />);
    expect(meta.content).toBe('rgb(2, 2, 2)');
    rerender(<Sheets form picker={false} />);
    expect(meta.content).toBe('rgb(1, 1, 1)');
    rerender(<Sheets form={false} picker={false} />);
    expect(meta.content).toBe('rgb(24, 24, 24)');

    // Close the outer one first.
    rerender(<Sheets form picker={false} />);
    rerender(<Sheets form picker />);
    rerender(<Sheets form={false} picker />);
    expect(meta.content).toBe('rgb(2, 2, 2)');
    rerender(<Sheets form={false} picker={false} />);
    expect(meta.content).toBe('rgb(24, 24, 24)');
    expect(document.body.style.overflow).toBe('');
    unmount();
    meta.remove();
    delete (document as { elementFromPoint?: unknown }).elementFromPoint;
  });
});
