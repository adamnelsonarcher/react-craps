import { RefObject, useEffect, useLayoutEffect, useState } from 'react';

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
 * Size in px of an element's content box, kept up to date as it resizes. Measured
 * before paint, so nothing renders at a wrong size first. Pass `key` when the element
 * behind the ref can be swapped for a different one (e.g. a layout change).
 */
export function useElementSize(ref: RefObject<HTMLElement>, key?: unknown) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const width = element.clientWidth - paddingX(element);
      const height = element.clientHeight - paddingY(element);
      setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, key]);

  return size;
}

const paddingX = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  return (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
};
const paddingY = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  return (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
};
