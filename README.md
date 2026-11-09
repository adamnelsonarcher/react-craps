# RollSim — React Craps

A single-player craps table you can play in the browser, on desktop or a phone.
Place chips on the layout, roll the dice, and watch bets get paid, taken, or move
to their numbers. It's built with Create React App, TypeScript, Tailwind CSS and
Framer Motion.

No real money is involved — your bank is a practice bankroll stored in your browser.

## Playing

1. **Pick a chip** ($1, $5, $25, $50 or $100) from the rack. $5 is selected to start.
2. **Click (or tap) a betting area** to put the chip there. Click again to add more.
3. **Roll** with either Roll Dice button (or press <kbd>Space</kbd>).

If a bet isn't allowed right now (say, a Pass Line bet once a point is on), a
message explains why. Turn on **Help** (the `?` button) and click any area to see
how that bet works and what it pays.

| Control | What it does |
| --- | --- |
| Undo Bet | Takes back your last bet change since the last roll. |
| Delete | Click chips to take them down (locked bets stay). Press Done, Esc, or click off the table to stop. |
| Clear All | Takes down every bet that isn't locked. |
| Quick Roll | Skips the dice animation. |
| Keep Winning Bets Up | When a bet wins, leave it on the table and only collect the winnings. |
| ⚙ Settings | Set your bank balance, or reset it to $1,000. |

Your bank (plus any chips on the table), Quick Roll and Keep Winning Bets Up are
remembered between visits. If you go broke, a **Rebuy** button appears.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> | Roll |
| <kbd>1</kbd>–<kbd>5</kbd> | Pick the $1 / $5 / $25 / $50 / $100 chip |
| <kbd>U</kbd> or <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Z</kbd> | Undo |
| <kbd>Esc</kbd> | Leave help or delete mode |
| <kbd>Tab</kbd> / <kbd>Enter</kbd> | Move between betting areas / bet on the focused one |

### On a phone

Hold the phone **sideways**. The table fills the screen and the chips, Roll button
and other controls sit in a panel on the right. Held upright, the game asks you to
rotate (the table is too wide to be playable in portrait).

## Table rules and payouts

- **Pass / Don't Pass**: standard rules. Don't Pass pushes on a come-out 12.
  Line bets can only be made on the come-out roll and are locked once a point is set.
- **Come / Don't Come**: only once a point is on. Any point number moves the bet to
  that number, where it pays even money. Come points stay working on the come-out
  roll and can't be taken down.
- **Place, Buy and Lay** bets are **off** on the come-out roll (marked OFF on the table).
- **Hard ways** are always working and lose on a 7 or the "easy" way.
- **Field** and the **proposition** bets are one-roll bets.

| Bet | Pays |
| --- | --- |
| Pass, Don't Pass, Come, Don't Come (and come points) | 1:1 |
| Field | 1:1, 2 pays 2:1, 12 pays 3:1 |
| Place 4 / 10 · 5 / 9 · 6 / 8 | 9:5 · 7:5 · 7:6 |
| Buy 4 / 10 · 5 / 9 · 6 / 8 | 2:1 · 3:2 · 6:5, minus 5% of the bet |
| Lay 4 / 10 · 5 / 9 · 6 / 8 | 1:2 · 2:3 · 5:6, minus 5% of the win |
| Hard 4 / 10 · Hard 6 / 8 | 7:1 · 9:1 |
| Any Seven · Any Craps | 4:1 · 7:1 |
| Two · Twelve · Three · Eleven | 30:1 · 30:1 · 15:1 · 15:1 |

Winnings are paid to the cent. The table artwork prints some proposition payouts
the casino "for 1" way (e.g. Hard 6 "10 to 1", Any Seven "5 to 1"); those numbers
include your returned bet, so they're one more than the "to 1" payouts above.

## Development

Requires Node.js 18+.

```bash
npm install
npm start          # dev server at http://localhost:3000
```

| Script | |
| --- | --- |
| `npm test` | Jest in watch mode |
| `npm run test:ci` | Run the tests once |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint (zero warnings allowed) |
| `npm run build` | Production build into `build/` |

### Project structure

```
src/
  App.tsx                  Root: all game state, roll handling, layouts
  game/
    rules.ts               Pure craps rules: roll outcome, what wins/loses, come bet moves
    tableLayout.ts         Betting area hotspots (percent coordinates over the artwork)
    betDescriptions.ts     Help-mode text
  utils/
    payouts.ts             Payout table + calculateWinnings()
    chips.ts               Chip denominations / colours
    storage.ts             localStorage helpers (bankroll, preferences)
  hooks/useLayout.ts       Layout mode (desktop / compact / rotate), media queries, element size
  components/
    CrapsTable.tsx         Table artwork, clickable areas, chips, help popup
    BettingControls.tsx    Bank, chip rack, Undo/Delete/Clear, Roll (bar or side-panel layout)
    ChipStack.tsx          Chips sitting on a bet
    AnimatedChipStack.tsx  Win / lose / move chip animations
    PointMarker.tsx        The ON/OFF puck
    DevTools.tsx           Hidden coordinate + forced-dice tools
    Dice.tsx, ProfitDisplay.tsx, AnimatedBalance.tsx, SettingsModal.tsx
  types/game.ts            Shared types (Bet, RollOutcome, …)
```

### Key concepts

- **Bet IDs.** Every bet is keyed by its betting area's `areaId` (`place-6`, `field`,
  `hard-8`, `come`, `come-9`, …). Pass Line / Don't Pass are clicked on the big line
  areas but stored as `pass-line-chips` / `dont-pass-chips` (see `toBetId`).
  Come bets that travel become `come-4` … `come-10` / `dont-come-4` … `dont-come-10`.
- **The rules engine is pure.** `resolveRoll(die1, die2, point, bets)` in
  `src/game/rules.ts` returns the roll outcome (new point), every area that won or
  lost, and any come / don't-come moves. It has no React or DOM code and is unit tested.
- **Scaling.** The board is a 2:1 image with percentage-positioned hotspots. `App`
  measures the board and sets `--chip-size` / `--die-size` CSS variables so chips
  and dice scale with it.

### How a roll works

1. `handleRoll` picks the dice (random, or forced from dev tools), animates them for
   one second (skipped with Quick Roll), then calls `completeRoll`.
2. `completeRoll` reads the latest bets/point, calls `resolveRoll`, and **settles
   everything immediately**: bank, bets on the table, the new point, roll history.
   Because state is settled synchronously, a fast follow-up roll or bet can never
   see a half-resolved table.
3. It then starts purely visual effects: winning areas flash, payout chips fly from
   the dice to the bet to the bank, losing chips spin away, come bets slide to their
   number. Paid bets stay drawn as "ghost" chips until their payout arrives, and a
   moving come bet's real chip is hidden until its animation lands.

### Changing rules or payouts

- Payouts: `src/utils/payouts.ts` (and the matching help text in `src/game/betDescriptions.ts`).
- Rules: `resolveRoll` / `determineRollOutcome` in `src/game/rules.ts`, plus
  `bettingRestriction` / `isLockedBet` for what can be bet or taken down.
- Add or move a betting area: `src/game/tableLayout.ts`.

Run `npm run test:ci` afterwards; `rules.test.ts`, `payouts.test.ts` and
`App.test.tsx` cover the rules, the payout math and full betting/rolling flows.

### Dev tools

For measuring hotspot coordinates or forcing a roll:

1. Open the browser console and run `window.enableDevTools()`.
2. Click **Show Dev Tools** on the table. The overlay shows the cursor position in
   board percentages, logs clicked coordinates (with a Copy Log button), and has
   Dice Controls for rolling specific numbers.
