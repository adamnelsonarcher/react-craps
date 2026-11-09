/**
 * Craps rules engine. Everything here is pure (no React, no DOM) so it can be
 * unit-tested directly — see `rules.test.ts`.
 *
 * Table rules implemented:
 * - Pass / don't pass: standard; don't pass pushes ("bar 12") on a come-out 12.
 * - Come / don't come: can only be bet while a point is on; they travel to their
 *   own number and then resolve like a pass / don't-pass bet on that number.
 *   Come points are always working (including on the come-out roll).
 * - Place, buy and lay bets are OFF on the come-out roll (they neither win nor lose).
 * - Hard ways are always working; they lose on a 7 or the "easy" way.
 * - Field and the proposition bets are one-roll bets.
 */
import { Bet, BetMovement, RollOutcome, WinningArea } from '../types/game';

export const POINT_NUMBERS = [4, 5, 6, 8, 9, 10] as const;
export type PointNumber = typeof POINT_NUMBERS[number];

export const isPointNumber = (n: number): n is PointNumber =>
  (POINT_NUMBERS as readonly number[]).includes(n);

/** Place, buy and lay bets don't resolve on the come-out roll. */
export const isOffOnComeOut = (areaId: string): boolean => /^(place|buy|lay)-\d+$/.test(areaId);

/** Come / don't-come bets that have travelled to a number (e.g. `come-6`, `dont-come-9`). */
export const isComePointBet = (areaId: string): boolean => /^(dont-)?come-\d+$/.test(areaId);

/** How the table's point changes for a given roll. */
export function determineRollOutcome(total: number, point: number | null): RollOutcome {
  if (point === null) {
    if (total === 7 || total === 11) return { type: 'natural', point: null, isComingOut: true };
    if (total === 2 || total === 3 || total === 12) return { type: 'craps', point: null, isComingOut: true };
    return { type: 'point-set', point: total, isComingOut: false };
  }
  if (total === 7) return { type: 'seven-out', point: null, isComingOut: true };
  if (total === point) return { type: 'point-made', point: null, isComingOut: true };
  return { type: 'normal', point, isComingOut: false };
}

export interface RollResolution {
  outcome: RollOutcome;
  /**
   * Every betting area that won or lost on this roll, whether or not a bet is on it
   * (the UI also uses this to flash winning areas). Areas not listed are unaffected
   * (still working, off, or a push).
   */
  results: WinningArea[];
  /** Come / don't-come bets that travel to their number on this roll. */
  movements: BetMovement[];
}

/**
 * Resolve a roll against the current table state.
 * @param point the point *before* this roll (`null` = come-out roll)
 * @param bets the bets on the table before this roll
 */
export function resolveRoll(die1: number, die2: number, point: number | null, bets: Bet[]): RollResolution {
  const total = die1 + die2;
  const comingOut = point === null;
  const results: WinningArea[] = [];
  const win = (...ids: string[]) => ids.forEach(id => results.push({ id, type: 'win' }));
  const lose = (...ids: string[]) => ids.forEach(id => results.push({ id, type: 'lose' }));

  // Pass line / don't pass (bets live on the `*-chips` areas)
  if (comingOut) {
    if (total === 7 || total === 11) {
      win('pass-line-chips');
      lose('dont-pass-chips');
    } else if (total === 2 || total === 3) {
      lose('pass-line-chips');
      win('dont-pass-chips');
    } else if (total === 12) {
      lose('pass-line-chips'); // don't pass pushes
    }
  } else if (total === point) {
    win('pass-line-chips');
    lose('dont-pass-chips');
  } else if (total === 7) {
    lose('pass-line-chips');
    win('dont-pass-chips');
  }

  // Place / buy / lay — off on the come-out roll
  if (!comingOut) {
    if (total === 7) {
      POINT_NUMBERS.forEach(n => {
        lose(`place-${n}`, `buy-${n}`);
        win(`lay-${n}`);
      });
    } else if (isPointNumber(total)) {
      win(`place-${total}`, `buy-${total}`);
      lose(`lay-${total}`);
    }
  }

  // One-roll proposition bets
  (total === 7 ? win : lose)('any-7');
  (total === 2 || total === 3 || total === 12 ? win : lose)('any-craps');
  (total === 2 ? win : lose)('roll-2');
  (total === 3 ? win : lose)('roll-3');
  (total === 12 ? win : lose)('roll-12');
  (total === 11 ? win : lose)('roll-11-1', 'roll-11-2');

  // Field (one-roll)
  ([2, 3, 4, 9, 10, 11, 12].includes(total) ? win : lose)('field');

  // Hard ways: win on the hard way, lose on 7 or the easy way
  if (total === 7) {
    lose('hard-4', 'hard-6', 'hard-8', 'hard-10');
  } else if (total === 4 || total === 6 || total === 8 || total === 10) {
    (die1 === die2 ? win : lose)(`hard-${total}`);
  }

  // Come / don't-come bets already on a number
  if (total === 7) {
    POINT_NUMBERS.forEach(n => {
      lose(`come-${n}`);
      win(`dont-come-${n}`);
    });
  } else if (isPointNumber(total)) {
    win(`come-${total}`);
    lose(`dont-come-${total}`);
  }

  // Come / don't-come bets in the come box / don't-come bar
  const movements: BetMovement[] = [];
  if (!comingOut) {
    if (total === 7 || total === 11) {
      win('come');
      lose('dont-come');
    } else if (total === 2 || total === 3) {
      lose('come');
      win('dont-come');
    } else if (total === 12) {
      lose('come'); // don't come pushes
    } else {
      for (const fromId of ['come', 'dont-come']) {
        const bet = bets.find(b => b.areaId === fromId);
        if (bet) movements.push({ fromId, toId: `${fromId}-${total}`, amount: bet.amount });
      }
    }
  }

  return { outcome: determineRollOutcome(total, point), results, movements };
}

/**
 * Whether a winning bet stays on the table (only its winnings are paid) instead of
 * being returned to the bank along with the winnings.
 */
export function staysUpAfterWin(areaId: string, keepWinningBets: boolean, nextPoint: number | null): boolean {
  if (!keepWinningBets) return false;
  // A come bet that travelled to a number is finished once it wins.
  if (isComePointBet(areaId)) return false;
  // Come / don't-come can't sit in the come box during a come-out roll.
  if ((areaId === 'come' || areaId === 'dont-come') && nextPoint === null) return false;
  return true;
}

/**
 * Bets that can't be taken down: a pass / don't-pass bet once a point is set, and
 * come / don't-come bets that have travelled to a number.
 */
export function isLockedBet(areaId: string, point: number | null): boolean {
  if ((areaId === 'pass-line-chips' || areaId === 'dont-pass-chips') && point !== null) return true;
  return isComePointBet(areaId);
}

/** Why a bet can't be placed on `areaId` right now, or `null` if it can. */
export function bettingRestriction(areaId: string, point: number | null): string | null {
  if (isComePointBet(areaId)) return 'Come points are set by the dice';
  if ((areaId === 'pass-line' || areaId === 'dont-pass') && point !== null) {
    return 'Line bets can only be made on the come-out roll';
  }
  if ((areaId === 'come' || areaId === 'dont-come') && point === null) {
    return 'Come bets can only be made once a point is set';
  }
  return null;
}
