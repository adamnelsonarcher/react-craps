/** A pair of dice. */
export interface DicePair {
  die1: number;
  die2: number;
}

/**
 * Chips sitting on a betting area. `areaId` is the bet's identity everywhere in
 * the app (rules, payouts, rendering). See `src/game/tableLayout.ts` for the list.
 */
export interface Bet {
  areaId: string;
  amount: number;
}

/** What a roll did to the table's point. */
export interface RollOutcome {
  type: 'natural' | 'craps' | 'point-set' | 'seven-out' | 'point-made' | 'normal';
  /** The table point *after* this roll (`null` means the next roll is a come-out roll). */
  point: number | null;
  isComingOut: boolean;
}

/** A betting area that won or lost on a roll. */
export interface WinningArea {
  id: string;
  type: 'win' | 'lose';
  timestamp?: number;
}

/** A come / don't-come bet travelling to its number after a roll. */
export interface BetMovement {
  fromId: string;
  toId: string;
  amount: number;
}

/** One entry in the roll history sidebar. */
export interface RollRecord extends DicePair {
  id: number;
  total: number;
  type: 'point-made' | 'seven-out' | 'normal';
}
