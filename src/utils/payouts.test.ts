import { calculateWinnings, roundToCents } from './payouts';

describe('calculateWinnings', () => {
  it('pays simple multipliers', () => {
    expect(calculateWinnings('pass-line-chips', 10, 7)).toBe(10);
    expect(calculateWinnings('any-7', 5, 7)).toBe(20);
    expect(calculateWinnings('hard-6', 5, 6)).toBe(45);
  });

  it('pays place bets at exact fractions', () => {
    expect(calculateWinnings('place-6', 6, 6)).toBe(7);
    expect(calculateWinnings('place-5', 5, 5)).toBe(7);
    expect(calculateWinnings('place-4', 5, 4)).toBe(9);
    expect(calculateWinnings('place-8', 5, 8)).toBe(5.83);
  });

  it('pays come points even money', () => {
    expect(calculateWinnings('come-4', 10, 4)).toBe(10);
    expect(calculateWinnings('dont-come-4', 10, 7)).toBe(10);
  });

  it('pays the field double on 2 and triple on 12', () => {
    expect(calculateWinnings('field', 10, 9)).toBe(10);
    expect(calculateWinnings('field', 10, 2)).toBe(20);
    expect(calculateWinnings('field', 10, 12)).toBe(30);
  });

  it('charges buy commission on the bet and lay commission on the win', () => {
    // Buy $20 on the 4: wins $40, minus 5% of $20
    expect(calculateWinnings('buy-4', 20, 4)).toBe(39);
    // Lay $40 against the 4: wins $20, minus 5% of $20
    expect(calculateWinnings('lay-4', 40, 7)).toBe(19);
  });

  it('returns 0 for unknown bets', () => {
    expect(calculateWinnings('not-a-bet', 10, 7)).toBe(0);
  });
});

describe('roundToCents', () => {
  it('removes floating point noise', () => {
    expect(roundToCents(0.1 + 0.2)).toBe(0.3);
    expect(roundToCents(1.005)).toBe(1.01);
  });
});
