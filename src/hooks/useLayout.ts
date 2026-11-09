import { RefObject, useEffect, useState } from 'react';

/**
 * - `desktop`: big screens — table with a control bar along the bottom.
 * - `compact`: phones in landscape, small tablets and short windows — the table
 *   fills the height and the controls move to a side panel.
 * - `rotate`: phones held upright — too narrow for the table, so we ask the
 *   player to turn the phone sideways.
 */
export type LayoutMode = 'desktop' | 'compact' | 'rotate';

export function getLayoutMode(width: number, height: number): LayoutMode {
  if (width < 600 && height > width) return 'rotate';
  if (width < 1000 || height < 600) return 'compact';
  return 'desktop';
}

/** The current layout mode, updated on resize / rotation. */
export function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(() => getLayoutMode(window.innerWidth, window.innerHeight));

  useEffect(() => {
    const update = () => setMode(getLayoutMode(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return mode;
}

/** Whether a CSS media query currently matches (e.g. `(hover: hover)`). */
export function useMediaQuery(query: string): boolean {
  const getMatch = () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener?.('change', update);
    return () => list.removeEventListener?.('change', update);
  }, [query]);

  return matches;
}

/** True on devices with a real pointer that can hover (mouse / trackpad). */
export const useCanHover = () => useMediaQuery('(hover: hover)');

/**
 * Width in px of an element, kept up to date as it resizes. Pass `key` when the
 * element behind the ref can be swapped for a different one (e.g. a layout change).
 */
export function useElementWidth(ref: RefObject<HTMLElement>, key?: unknown): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(element.getBoundingClientRect().width);
    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, key]);

  return width;
}
