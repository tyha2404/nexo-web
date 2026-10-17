import { useEffect, useRef } from 'react';

/**
 * Run `onChange` (debounced) when any of the given window events fire, e.g.
 * 'debts-changed' from a local save, a Supabase realtime echo or an app resume.
 */
export function useDataEvents(events: readonly string[], onChange: () => void, delayMs = 150) {
  const callbackRef = useRef(onChange);
  useEffect(() => {
    callbackRef.current = onChange;
  }, [onChange]);

  const eventKey = events.join('|');
  useEffect(() => {
    const names = eventKey.split('|');
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callbackRef.current(), delayMs);
    };
    for (const name of names) window.addEventListener(name, handler);
    return () => {
      clearTimeout(timer);
      for (const name of names) window.removeEventListener(name, handler);
    };
  }, [eventKey, delayMs]);
}
