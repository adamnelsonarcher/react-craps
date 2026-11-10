/**
 * Clickable betting areas over the table artwork (`src/assets/just_text.png`).
 *
 * Positions are percentages of the board image, measured with the dev tools
 * overlay (run `window.enableDevTools()` in the console, then click on the board
 * to log coordinates). Areas later in the list sit on top of earlier ones;
 * `clipPath` areas only receive clicks inside their polygon.
 *
 * Marker areas (`pointerEvents: 'none'`) are where chips are drawn but are not
 * clicked directly: pass line / don't pass chips, and come / don't-come points.
 */
import type { CSSProperties } from 'react';
import { POINT_NUMBERS } from './rules';

export interface BettingArea {
  id: string;
  name: string;
  style: CSSProperties;
}

const NUMBER_NAMES: Record<number, string> = {
  4: 'Four', 5: 'Five', 6: 'Six', 8: 'Eight', 9: 'Nine', 10: 'Ten',
};

// Left edge (%) of each number's column in the place/buy/lay grid.
const NUMBER_COLUMN_LEFT: Record<number, number> = {
  4: 21.67,
  5: 21.67 + 8.5,
  6: 21.67 + 8.5 * 2,
  8: 21.67 + 8.5 * 2.96,
  9: 21.67 + 8.5 * 3.92,
  10: 21.67 + 8.5 * 4.93,
};
const NUMBER_COLUMN_WIDTH = 29.92 - 21.67;

// Centre-ish left edge (%) of the come / don't-come point markers for each number.
const COME_POINT_LEFT: Record<number, number> = {
  4: 22.6, 5: 31.2, 6: 39.7, 8: 47.9, 9: 56.4, 10: 64.4,
};

const numberColumnAreas = (): BettingArea[] =>
  POINT_NUMBERS.flatMap(n => {
    const left = `${NUMBER_COLUMN_LEFT[n]}%`;
    const width = `${NUMBER_COLUMN_WIDTH}%`;
    return [
      { id: `place-${n}`, name: `Place ${NUMBER_NAMES[n]}`, style: { top: '12.33%', left, width, height: '16.2%' } },
      { id: `buy-${n}`, name: `Buy ${NUMBER_NAMES[n]}`, style: { top: '7.74%', left, width, height: '4.28%' } },
      { id: `lay-${n}`, name: `Lay ${NUMBER_NAMES[n]}`, style: { top: '2.08%', left, width, height: '5.51%' } },
    ];
  });

const comePointMarker = (prefix: 'come' | 'dont-come', n: number, top: number): BettingArea => ({
  id: `${prefix}-${n}`,
  name: `${prefix === 'come' ? 'Come' : "Don't Come"} ${n}`,
  style: {
    top: `${top - 1}%`,
    left: `${COME_POINT_LEFT[n] - 1}%`,
    width: '2%',
    height: '3.5%',
    pointerEvents: 'none',
  },
});

export const BETTING_AREAS: BettingArea[] = [
  ...numberColumnAreas(),
  ...POINT_NUMBERS.map(n => comePointMarker('come', n, 21.3)),
  {
    id: 'come',
    name: 'Come',
    style: { top: '29.14%', left: '14.03%', width: '49.29%', height: '16.35%' },
  },
  {
    id: 'dont-come',
    name: "Don't Come Bar",
    style: { top: '2.08%', left: '14.03%', width: '7.56%', height: '26.75%' },
  },
  {
    id: 'field',
    name: 'Field',
    style: {
      top: '45.49%',
      left: '14.11%',
      width: '49.13%',
      height: '13.45%',
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 15% 100%, 5% 80%, 0% 45%)',
    },
  },
  {
    id: 'pass-line',
    name: 'Pass Line',
    style: {
      top: '1.93%',
      left: '2.80%',
      width: '60.21%',
      height: '73.67%',
      clipPath: `polygon(
        0.7% 0%, 8.4% 0.8%, 8.6% 64%, 10.8% 77%, 19% 86%, 29% 87.5%, 100% 88%,
        100% 99%, 18% 99.5%, 8% 94.5%, 1.6% 83%, 0% 66%, 0.4% 0%
      )`,
    },
  },
  {
    id: 'dont-pass',
    name: "Don't Pass Bar",
    style: {
      top: '2.54%',
      left: '9.29%',
      width: '53.65%',
      height: '62.21%',
      clipPath: `polygon(
        0% 0%, 0% 50%, 0% 76%, 1% 85%, 5.5% 94%, 13% 98%, 15% 99%, 35% 100%,
        100% 99%, 100% 91%, 46% 91%, 21% 90%, 14.5% 87%, 9% 79%, 8.5% 67%, 8.5% 2%
      )`,
    },
  },
  { id: 'any-7', name: 'Any 7', style: { top: '33.26%', left: '67.22%', width: '28.81%', height: '5.51%' } },
  { id: 'hard-6', name: 'Hard 6', style: { top: '39.68%', left: '65.08%', width: '15.89%', height: '12.16%' } },
  { id: 'hard-10', name: 'Hard 10', style: { top: '39.53%', left: '81.58%', width: '15.90%', height: '12.16%' } },
  { id: 'hard-8', name: 'Hard 8', style: { top: '51.91%', left: '65.15%', width: '15.75%', height: '12.62%' } },
  { id: 'hard-4', name: 'Hard 4', style: { top: '51.91%', left: '81.51%', width: '15.97%', height: '12.46%' } },
  { id: 'roll-3', name: 'Three', style: { top: '64.44%', left: '65.15%', width: '10.55%', height: '11.70%' } },
  { id: 'roll-2', name: 'Two', style: { top: '64.75%', left: '76.31%', width: '10.24%', height: '11.24%' } },
  { id: 'roll-12', name: 'Twelve', style: { top: '64.60%', left: '87.16%', width: '10.17%', height: '11.54%' } },
  { id: 'roll-11-1', name: 'Eleven', style: { top: '76.67%', left: '65.00%', width: '15.67%', height: '12.77%' } },
  { id: 'roll-11-2', name: 'Eleven', style: { top: '76.52%', left: '81.28%', width: '16.12%', height: '12.31%' } },
  { id: 'any-craps', name: 'Any Craps', style: { top: '89.51%', left: '65.15%', width: '32.18%', height: '7.72%' } },
  // Where pass line / don't pass chips are drawn (clicks fall through to the line areas)
  {
    id: 'pass-line-chips',
    name: 'Pass Line',
    style: { top: '69.45%', left: '36.26%', width: '32px', height: '32px', pointerEvents: 'none' },
  },
  {
    id: 'dont-pass-chips',
    name: "Don't Pass Bar",
    style: { top: '60.15%', left: '38.09%', width: '32px', height: '32px', pointerEvents: 'none' },
  },
  ...POINT_NUMBERS.map(n => comePointMarker('dont-come', n, 16.3)),
];

/** Line bets are clicked on the big line areas but stored on their chip marker areas. */
export const toBetId = (areaId: string): string =>
  areaId === 'pass-line' ? 'pass-line-chips' : areaId === 'dont-pass' ? 'dont-pass-chips' : areaId;

/** Inverse of `toBetId`. */
export const toAreaId = (betId: string): string =>
  betId === 'pass-line-chips' ? 'pass-line' : betId === 'dont-pass-chips' ? 'dont-pass' : betId;

/**
 * Horizontal position (% of the board width) of the point marker ("puck") above each
 * number. The puck always sits just above the board's top edge.
 */
export const POINT_MARKER_X: Record<number, number> = {
  4: 25.92,
  5: 34.42,
  6: 42.92,
  8: 51.42,
  9: 59.92,
  10: 68.42,
};
/** Where the puck sits when it's OFF (come-out roll), above the Pass Line. */
export const POINT_MARKER_OFF_X = 6;
