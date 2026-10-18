import { useLayoutEffect, useRef, useState, type HTMLAttributes } from 'react';
import { cx } from './styles';

type IndicatorBounds = { x: number; y: number; width: number; height: number };
interface SlidingTabsProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'pill' | 'underline' | 'navigation' | 'icon';
  as?: 'div' | 'nav';
}

/** One persistent indicator moves between selected items without remounting tabs. */
export function SlidingTabs({
  children,
  className,
  variant = 'pill',
  as: Tag = 'div',
  ...props
}: SlidingTabsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<IndicatorBounds | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const selected = root.querySelector<HTMLElement>(
        '[aria-selected="true"], [aria-current="page"], [aria-pressed="true"]'
      );
      const target =
        variant === 'icon' ? (selected?.firstElementChild as HTMLElement | null) : selected;
      if (!target || !root.getClientRects().length) return;
      // Layout offsets ignore entrance/press transforms on ancestors and buttons.
      let x = 0;
      let y = 0;
      let node: HTMLElement | null = target;
      while (node && node !== root) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      const next = {
        x,
        y: variant === 'underline' ? y + target.offsetHeight - 2 : y,
        width: target.offsetWidth,
        height: variant === 'underline' ? 2 : target.offsetHeight,
      };
      setBounds((previous) =>
        previous &&
        Object.keys(next).every(
          (key) => previous[key as keyof IndicatorBounds] === next[key as keyof IndicatorBounds]
        )
          ? previous
          : next
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root.querySelectorAll('button').forEach((button) => observer.observe(button));
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [children, variant]);

  return (
    <Tag
      ref={rootRef}
      className={cx(
        !className?.includes('fixed') && 'relative',
        'isolate [&>button]:relative [&>button]:z-10',
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        data-tab-indicator=""
        className={cx(
          'pointer-events-none absolute top-0 left-0 z-0 motion-reduce:transition-none',
          ready && 'transition-[transform,width,height] duration-300 ease-(--motion-ease)',
          variant === 'underline'
            ? 'rounded-full bg-primary'
            : variant === 'pill'
              ? 'rounded-sm bg-(--primary-gradient) shadow-[0_2px_8px_var(--primary-glow)]'
              : 'rounded-md bg-primary-glow',
          variant === 'navigation' &&
            'border border-[rgba(99,102,241,0.3)] shadow-[0_0_14px_var(--primary-glow)]'
        )}
        style={{
          visibility: bounds ? 'visible' : 'hidden',
          width: bounds?.width ?? 0,
          height: bounds?.height ?? 0,
          transform: `translate3d(${bounds?.x ?? 0}px, ${bounds?.y ?? 0}px, 0)`,
        }}
      />
      {children}
    </Tag>
  );
}
