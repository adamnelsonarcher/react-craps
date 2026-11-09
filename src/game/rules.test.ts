import {
  bettingRestriction,
  determineRollOutcome,
  isLockedBet,
  resolveRoll,
  staysUpAfterWin,
} from './rules';
import { Bet } from '../types/game';

const resultOf = (resolution: ReturnType<typeof resolveRoll>, id: string) =>
  resolution.results.find(r => r.id === id)?.type ?? 'none';

describe('determineRollOutcome', () => {
  it('handles the come-out roll', () => {
    expect(determineRollOutcome(7, null).type).toBe('natural');
    expect(determineRollOutcome(11, null).type).toBe('natural');
    expect(determineRollOutcome(2, null).type).toBe('craps');
    expect(determineRollOutcome(12, null).type).toBe('craps');
    expect(determineRollOutcome(6, null)).toEqual({ type: 'point-set', point: 6, isComingOut: false });
  });

  it('handles rolls while a point is on', () => {
    expect(determineRollOutcome(7, 6)).toEqual({ type: 'seven-out', point: null, isComingOut: true });
    expect(determineRollOutcome(6, 6)).toEqual({ type: 'point-made', point: null, isComingOut: true });
    expect(determineRollOutcome(8, 6)).toEqual({ type: 'normal', point: 6, isComingOut: false });
  });
});

describe('resolveRoll — line bets', () => {
  it('pays pass line on a come-out 7 and pushes don\'t pass on 12', () => {
    const seven = resolveRoll(3, 4, null, []);
    expect(resultOf(seven, 'pass-line-chips')).toBe('win');
    expect(resultOf(seven, 'dont-pass-chips')).toBe('lose');

    const twelve = resolveRoll(6, 6, null, []);
    expect(resultOf(twelve, 'pass-line-chips')).toBe('lose');
    expect(resultOf(twelve, 'dont-pass-chips')).toBe('none');
  });

  it('resolves line bets against the point', () => {
    expect(resultOf(resolveRoll(2, 2, 4, []), 'pass-line-chips')).toBe('win');
    expect(resultOf(resolveRoll(3, 4, 4, []), 'dont-pass-chips')).toBe('win');
    expect(resultOf(resolveRoll(3, 3, 4, []), 'pass-line-chips')).toBe('none');
  });
});

describe('resolveRoll — place / buy / lay', () => {
  it('are off on the come-out roll', () => {
    const seven = resolveRoll(3, 4, null, []);
    expect(resultOf(seven, 'place-6')).toBe('none');
    expect(resultOf(seven, 'buy-4')).toBe('none');
    expect(resultOf(seven, 'lay-10')).toBe('none');

    const six = resolveRoll(3, 3, null, []);
    expect(resultOf(six, 'place-6')).toBe('none');
  });

  it('work while a point is on', () => {
    const six = resolveRoll(4, 2, 8, []);
    expect(resultOf(six, 'place-6')).toBe('win');
    expect(resultOf(six, 'buy-6')).toBe('win');
    expect(resultOf(six, 'lay-6')).toBe('lose');
    expect(resultOf(six, 'place-8')).toBe('none');

    const seven = resolveRoll(5, 2, 8, []);
    expect(resultOf(seven, 'place-8')).toBe('lose');
    expect(resultOf(seven, 'lay-4')).toBe('win');
  });
});

describe('resolveRoll — hard ways and props', () => {
  it('wins hard ways only on the hard way', () => {
    expect(resultOf(resolveRoll(3, 3, 5, []), 'hard-6')).toBe('win');
    expect(resultOf(resolveRoll(4, 2, 5, []), 'hard-6')).toBe('lose');
    expect(resultOf(resolveRoll(4, 3, 5, []), 'hard-8')).toBe('lose');
    expect(resultOf(resolveRoll(4, 4, 5, []), 'hard-6')).toBe('none');
  });

  it('resolves one-roll bets every roll', () => {
    const eleven = resolveRoll(5, 6, null, []);
    expect(resultOf(eleven, 'roll-11-1')).toBe('win');
    expect(resultOf(eleven, 'field')).toBe('win');
    expect(resultOf(eleven, 'any-7')).toBe('lose');
    expect(resultOf(eleven, 'any-craps')).toBe('lose');

    const eight = resolveRoll(5, 3, null, []);
    expect(resultOf(eight, 'field')).toBe('lose');
  });
});

describe('resolveRoll — come / don\'t come', () => {
  const comeBets: Bet[] = [
    { areaId: 'come', amount: 10 },
    { areaId: 'dont-come', amount: 5 },
  ];

  it('moves come bets to their number', () => {
    const { movements } = resolveRoll(5, 4, 6, comeBets);
    expect(movements).toEqual([
      { fromId: 'come', toId: 'come-9', amount: 10 },
      { fromId: 'dont-come', toId: 'dont-come-9', amount: 5 },
    ]);
  });

  it('resolves the come box like a come-out roll', () => {
    const eleven = resolveRoll(5, 6, 6, comeBets);
    expect(resultOf(eleven, 'come')).toBe('win');
    expect(resultOf(eleven, 'dont-come')).toBe('lose');
    expect(eleven.movements).toHaveLength(0);

    const twelve = resolveRoll(6, 6, 6, comeBets);
    expect(resultOf(twelve, 'come')).toBe('lose');
    expect(resultOf(twelve, 'dont-come')).toBe('none');
  });

  it('resolves come points, including on the come-out roll', () => {
    const nine = resolveRoll(5, 4, 6, []);
    expect(resultOf(nine, 'come-9')).toBe('win');
    expect(resultOf(nine, 'dont-come-9')).toBe('lose');

    const comeOutSeven = resolveRoll(3, 4, null, []);
    expect(resultOf(comeOutSeven, 'come-9')).toBe('lose');
    expect(resultOf(comeOutSeven, 'dont-come-9')).toBe('win');
  });
});

describe('table helpers', () => {
  it('only keeps eligible winning bets up', () => {
    expect(staysUpAfterWin('place-6', false, 6)).toBe(false);
    expect(staysUpAfterWin('place-6', true, 6)).toBe(true);
    expect(staysUpAfterWin('come-6', true, 6)).toBe(false);
    expect(staysUpAfterWin('come', true, 6)).toBe(true);
    expect(staysUpAfterWin('come', true, null)).toBe(false);
  });

  it('locks contract bets', () => {
    expect(isLockedBet('pass-line-chips', 6)).toBe(true);
    expect(isLockedBet('pass-line-chips', null)).toBe(false);
    expect(isLockedBet('come-6', null)).toBe(true);
    expect(isLockedBet('come', 6)).toBe(false);
  });

  it('explains why a bet is not allowed', () => {
    expect(bettingRestriction('pass-line', 6)).not.toBeNull();
    expect(bettingRestriction('pass-line', null)).toBeNull();
    expect(bettingRestriction('come', null)).not.toBeNull();
    expect(bettingRestriction('come', 6)).toBeNull();
    expect(bettingRestriction('come-6', 6)).not.toBeNull();
    expect(bettingRestriction('place-6', null)).toBeNull();
  });
});
