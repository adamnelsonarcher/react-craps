/**
 * Payout rules for every bet on the table, keyed by bet `areaId`.
 *
 * Values are "X to 1" multipliers: a winning $10 bet on a 4-to-1 bet wins $40
 * (and the original $10 is returned on top, unless the bet stays up).
 *
 * Note: the table artwork prints some proposition payouts the casino "for 1" way
 * (e.g. Hard 6 "10 to 1", Any Seven "5 to 1"), which includes the returned bet.
 * The real "to 1" payouts below are what the game pays; the in-game help text
 * explains this.
 */
export type PayoutRule =
  /** Pays `amount * rule`. */
  | number
  /** Field: even money, with special payouts on 2 and 12. */
  | { type: 'field'; base: number; onTwo: number; onTwelve: number }
  /** Buy / lay: true odds minus a commission ("vig"). */
  | { type: 'commission'; multiplier: number; rate: number; chargedOn: 'bet' | 'win' };

const buy = (multiplier: number): PayoutRule =>
  ({ type: 'commission', multiplier, rate: 0.05, chargedOn: 'bet' });
const lay = (multiplier: number): PayoutRule =>
  ({ type: 'commission', multiplier, rate: 0.05, chargedOn: 'win' });

export const PAYOUT_TABLE: Record<string, PayoutRule> = {
  // One-roll proposition bets
  'any-7': 4,        // 4 to 1 (layout: "5 for 1")
  'any-craps': 7,    // 7 to 1 (layout: "8 for 1")
  'roll-2': 30,      // 30 to 1
  'roll-3': 15,      // 15 to 1
  'roll-12': 30,     // 30 to 1
  'roll-11-1': 15,   // 15 to 1
  'roll-11-2': 15,   // 15 to 1

  // Hard ways
  'hard-4': 7,       // 7 to 1 (layout: "8 for 1")
  'hard-6': 9,       // 9 to 1 (layout: "10 for 1")
  'hard-8': 9,       // 9 to 1 (layout: "10 for 1")
  'hard-10': 7,      // 7 to 1 (layout: "8 for 1")

  // Field: 2 pays double, 12 pays triple, everything else even money
  'field': { type: 'field', base: 1, onTwo: 2, onTwelve: 3 },

  // Line bets (even money)
  'pass-line-chips': 1,
  'dont-pass-chips': 1,
  'come': 1,
  'dont-come': 1,

  // Come / don't-come bets that travelled to a number are flat bets: even money.
  'come-4': 1, 'come-5': 1, 'come-6': 1, 'come-8': 1, 'come-9': 1, 'come-10': 1,
  'dont-come-4': 1, 'dont-come-5': 1, 'dont-come-6': 1,
  'dont-come-8': 1, 'dont-come-9': 1, 'dont-come-10': 1,

  // Place bets
  'place-4': 9 / 5,  // 9 to 5
  'place-10': 9 / 5,
  'place-5': 7 / 5,  // 7 to 5
  'place-9': 7 / 5,
  'place-6': 7 / 6,  // 7 to 6
  'place-8': 7 / 6,

  // Buy bets: true odds, 5% of the bet charged when the bet wins
  'buy-4': buy(2),       // 2 to 1
  'buy-10': buy(2),
  'buy-5': buy(3 / 2),   // 3 to 2
  'buy-9': buy(3 / 2),
  'buy-6': buy(6 / 5),   // 6 to 5
  'buy-8': buy(6 / 5),

  // Lay bets: true odds, 5% of the amount won charged when the bet wins
  'lay-4': lay(1 / 2),   // 1 to 2
  'lay-10': lay(1 / 2),
  'lay-5': lay(2 / 3),   // 2 to 3
  'lay-9': lay(2 / 3),
  'lay-6': lay(5 / 6),   // 5 to 6
  'lay-8': lay(5 / 6),
};

/** Round to whole cents, avoiding floating point drift in the bank balance. */
export const roundToCents = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Profit (excluding the returned stake) for a winning bet, in dollars rounded to cents.
 * Returns 0 for unknown bet IDs.
 */
export function calculateWinnings(areaId: string, amount: number, diceTotal: number): number {
  const rule = PAYOUT_TABLE[areaId];
  if (rule === undefined) return 0;

  if (typeof rule === 'number') {
    return roundToCents(amount * rule);
  }

  if (rule.type === 'field') {
    const multiplier = diceTotal === 2 ? rule.onTwo : diceTotal === 12 ? rule.onTwelve : rule.base;
    return roundToCents(amount * multiplier);
  }

  const grossWin = amount * rule.multiplier;
  const commission = (rule.chargedOn === 'bet' ? amount : grossWin) * rule.rate;
  return roundToCents(grossWin - commission);
}
