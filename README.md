# React Craps

A single-player craps table built with Create React App + TypeScript. The UI lets you place chips on common bets, roll dice (including “forced” rolls in dev tools), and watch bets animate as they win/lose/move.

## Running locally

```bash
npm install
npm start
```

## How the app is structured

- **`src/index.tsx`**: React entry point (renders `App`).
- **`src/App.tsx`**: “Orchestrator” component that owns almost all state (bank, active bets, roll history, animations).
- **`src/components/CrapsTable.tsx`**: Table layout + click handling for placing/removing bets.
- **`src/components/GameState.tsx`**: Game rules engine:
  - tracks table **point** / **come-out** vs **point-on**
  - resolves each roll into **winning/losing areas**
  - emits **bet movement** events for come / don’t-come
- **`src/utils/payouts.ts`**: Payout multipliers/commission for each bet ID.

## Key data model concepts

- **Bet IDs**: Everything keys off `areaId` strings (examples: `place-6`, `field`, `come`, `come-8`, `pass-line-chips`).
  - Pass-line and don’t-pass are **stored as** `pass-line-chips` / `dont-pass-chips` (see `CrapsTable.tsx` mapping).
  - Come-point and don’t-come-point bets are stored as `come-4/5/6/8/9/10` and `dont-come-4/5/6/8/9/10`.
- **Resolution**: `GameState` emits a list of `{ id, type: 'win' | 'lose' }` and `App`:
  - computes profit using `PAYOUT_TABLE`
  - updates bank
  - triggers animations and then removes/keeps the resolved bets

## Roll lifecycle (end-to-end)

1. User clicks Roll (or uses a forced roll via dev tools).
2. `App` sets the dice and increments `rollId` when the roll completes.
3. `GameState` listens to `rollId` and, for that roll:
   - determines `RollOutcome` (natural/craps/point-set/seven-out/point-made/normal)
   - determines winning/losing bet IDs and any come/don’t-come bet movement
4. `App` calculates payouts and updates UI/animations accordingly.

## Adjusting payouts / rules

- **Payouts**: edit `src/utils/payouts.ts`.
- **Rules** (win/lose/move logic): edit `src/components/GameState.tsx` (`determineWinningAreas` and `determineRollOutcome`).

## Dev tools (forced dice)

There’s a small dev overlay in `CrapsTable.tsx` used for debugging coordinates and forcing dice:

1. Open browser devtools console.
2. Run: `window.enableDevTools()`
3. Use the Dice Controls panel to set a specific roll.

## Scripts

```bash
npm test
npm run build
```
