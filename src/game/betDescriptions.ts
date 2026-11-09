/**
 * Help-mode text for each bet. Lines are separated with `\n`; the first line is the title.
 * Keep payouts here in sync with `src/utils/payouts.ts`.
 */

const STATIC_DESCRIPTIONS: Record<string, string> = {
  'pass-line':
    'Pass Line\n' +
    'The most common bet. On the come-out roll, wins on 7 or 11 and loses on 2, 3 or 12.\n' +
    'Any other number becomes the point: you win if the point is rolled again before a 7.\n' +
    'Pays even money (1:1). Locked once a point is set.',
  'dont-pass':
    "Don't Pass\n" +
    'The opposite of the Pass Line. On the come-out roll, wins on 2 or 3, loses on 7 or 11, and pushes on 12.\n' +
    'Once a point is set, wins if a 7 is rolled before the point.\n' +
    'Pays even money (1:1).',
  'come':
    'Come\n' +
    'Like a Pass Line bet, but made after a point is set.\n' +
    'Wins on 7 or 11, loses on 2, 3 or 12. Any other number moves your bet to that number,\n' +
    'where it wins if the number repeats before a 7. Pays even money (1:1).',
  'dont-come':
    "Don't Come\n" +
    'Like a Don\'t Pass bet, but made after a point is set.\n' +
    'Wins on 2 or 3, loses on 7 or 11, pushes on 12. Any other number moves your bet to that number,\n' +
    'where it wins if a 7 comes before the number. Pays even money (1:1).',
  'field':
    'Field\n' +
    'One-roll bet. Wins on 2, 3, 4, 9, 10, 11 or 12.\n' +
    '2 pays double (2:1), 12 pays triple (3:1), everything else pays even money (1:1).',
  'any-7':
    'Any Seven\n' +
    'One-roll bet. Wins if the next roll is a 7.\n' +
    'Pays 4:1 (the layout shows "5", which counts your bet coming back).',
  'any-craps':
    'Any Craps\n' +
    'One-roll bet. Wins if the next roll is 2, 3 or 12.\n' +
    'Pays 7:1 (the layout shows "8", which counts your bet coming back).',
  'hard-4':
    'Hard 4\n' +
    'Wins if 2-2 is rolled before any 7 or an "easy" 4 (3-1).\n' +
    'Pays 7:1 (the layout shows "8", which counts your bet coming back).',
  'hard-6':
    'Hard 6\n' +
    'Wins if 3-3 is rolled before any 7 or an "easy" 6 (4-2, 5-1).\n' +
    'Pays 9:1 (the layout shows "10", which counts your bet coming back).',
  'hard-8':
    'Hard 8\n' +
    'Wins if 4-4 is rolled before any 7 or an "easy" 8 (5-3, 6-2).\n' +
    'Pays 9:1 (the layout shows "10", which counts your bet coming back).',
  'hard-10':
    'Hard 10\n' +
    'Wins if 5-5 is rolled before any 7 or an "easy" 10 (6-4).\n' +
    'Pays 7:1 (the layout shows "8", which counts your bet coming back).',
  'roll-2': 'Two ("Snake Eyes")\nOne-roll bet. Wins if the next roll is 1-1.\nPays 30:1.',
  'roll-3': 'Three ("Ace-Deuce")\nOne-roll bet. Wins if the next roll is a 3.\nPays 15:1.',
  'roll-12': 'Twelve ("Boxcars")\nOne-roll bet. Wins if the next roll is 6-6.\nPays 30:1.',
  'roll-11': 'Eleven ("Yo")\nOne-roll bet. Wins if the next roll is an 11.\nPays 15:1.',
  'come-point':
    'Come Point\n' +
    'A Come bet that moved to this number. Wins if the number is rolled again before a 7.\n' +
    'Pays even money (1:1). It stays working on the come-out roll and can\'t be taken down.',
  'dont-come-point':
    "Don't Come Point\n" +
    "A Don't Come bet that moved to this number. Wins if a 7 is rolled before the number.\n" +
    'Pays even money (1:1). It stays working on the come-out roll.',
};

const PLACE_PAYOUTS = '4 and 10 pay 9:5\n5 and 9 pay 7:5\n6 and 8 pay 7:6';
const BUY_PAYOUTS = '4 and 10 pay 2:1\n5 and 9 pay 3:2\n6 and 8 pay 6:5';
const LAY_PAYOUTS = '4 and 10 pay 1:2\n5 and 9 pay 2:3\n6 and 8 pay 5:6';
const OFF_ON_COME_OUT = 'Off (not working) on the come-out roll.';

export const HELP_INTRO =
  'Help mode\n' +
  'Click any betting area to learn how it works.\n' +
  ' \n' +
  'Keyboard shortcuts:\n' +
  'Space: roll the dice\n' +
  '1-5: pick a chip ($1, $5, $25, $50, $100)\n' +
  'U: undo your last bet\n' +
  'Esc: leave help or delete mode';

/** Help text for a betting area, or `null` if there isn't any. */
export function getBetDescription(areaId: string): string | null {
  const [kind, number] = areaId.split('-');

  if (kind === 'place') {
    return `Place ${number}\nWins if ${number} is rolled before a 7.\n${OFF_ON_COME_OUT}\n${PLACE_PAYOUTS}`;
  }
  if (kind === 'buy') {
    return `Buy ${number}\nLike a Place bet, but pays true odds minus a 5% commission on the bet.\n` +
      `${OFF_ON_COME_OUT}\n${BUY_PAYOUTS}`;
  }
  if (kind === 'lay') {
    return `Lay ${number}\nWins if a 7 is rolled before ${number}. Pays true odds minus a 5% commission on the win.\n` +
      `${OFF_ON_COME_OUT}\n${LAY_PAYOUTS}`;
  }

  const key = areaId
    .replace(/-chips$/, '')               // pass-line-chips -> pass-line
    .replace(/^roll-11-\d$/, 'roll-11')   // both Eleven boxes
    .replace(/^(dont-)?come-\d+$/, '$1come-point');
  return STATIC_DESCRIPTIONS[key] ?? null;
}
