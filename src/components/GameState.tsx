import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { RollOutcome, WinningArea, BetMovement } from '../types/game';

interface Bet {
  areaId: string;
  amount: number;
  color: string;
  count: number;
}

interface GameStateProps {
  isRolling: boolean;
  rollId: number;
  diceTotal: number;
  die1: number;
  die2: number;
  bets: Bet[];
  onStateChange?: (isComingOut: boolean, point: number | null) => void;
  onRollType?: (type: 'point-made' | 'craps-out' | 'normal') => void;
  onWinningAreas?: (areas: WinningArea[]) => void;
  onRollOutcome?: (outcome: RollOutcome & { total: number }) => void;
  onMoveBet?: (movement: BetMovement) => void;
  animatingBets: Set<string>;
}

interface PointMarkerProps {
  point: number | null;
  position: { x: number; y: number };
  isOn: boolean;
}

const PointMarker: React.FC<PointMarkerProps> = ({ point, position, isOn }) => {
  const [markerPosition, setMarkerPosition] = useState({ x: 0, y: 0 });
  const offPosition = { x: 6, y: -4 };
  const currentPercentPosition = isOn ? position : offPosition;

  const updatePosition = useCallback(() => {
    const gameBoard = document.querySelector(String.raw`.aspect-\[2\/1\]`);
    if (gameBoard) {
      const rect = gameBoard.getBoundingClientRect();
      const x = rect.left + (rect.width * currentPercentPosition.x / 100);
      const y = rect.top + (rect.height * (currentPercentPosition.y) / 100); // Add offset to bring it down
      setMarkerPosition({ x, y });
    }
  }, [currentPercentPosition.x, currentPercentPosition.y]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  return ReactDOM.createPortal(
    <div 
      className={`fixed w-[clamp(1.75rem,3vw,3rem)] h-[clamp(1.75rem,3vw,3rem)]
                 rounded-full flex items-center justify-center
                 border-[0.2rem] transform -translate-x-1/2 -translate-y-1/2
                 font-bold transition-all duration-1000 ease-in-out
                 ${isOn ? 'bg-white border-black text-black' : 'bg-black border-white text-white'}`}
      style={{ 
        left: `${markerPosition.x}px`,
        top: `${markerPosition.y}px`,
        fontSize: 'clamp(0.6rem, 1.2vw, 1rem)',
      }}
    >
      {isOn ? 'ON' : 'OFF'}
    </div>,
    document.body
  );
};

const GameState: React.FC<GameStateProps> = ({ 
  isRolling, 
  rollId,
  diceTotal,
  die1,
  die2,
  bets,
  onStateChange,
  onRollType,
  onWinningAreas,
  onRollOutcome,
  onMoveBet,
  animatingBets
}) => {
  const [point, setPoint] = React.useState<number | null>(null);
  const [isComingOut, setIsComingOut] = React.useState(true);
  // Prevent resolving the same roll more than once.
  // `rollId` comes from `App.tsx` and increments once per completed roll.
  const lastProcessedRollIdRef = React.useRef<number>(0);

  // Point marker positions for each number (moved up to avoid overlap)
  const markerPositions: Record<number, { x: number; y: number }> = {
    4: { x: 25.92, y: -4 },   // Above the 4
    5: { x: 34.42, y: -4 },   // Above the 5
    6: { x: 42.92, y: -4 },   // Above the 6
    8: { x: 51.42, y: -4 },   // Above the 8
    9: { x: 59.92, y: -4 },   // Above the 9
    10: { x: 68.42, y: -4 },  // Above the 10
  };

  // Determines which bet areas win/lose for a given roll.
  // Keep this in-sync with the bet `areaId`s defined in `CrapsTable.tsx`.
  const determineWinningAreas = useCallback((total: number, isComingOut: boolean, point: number | null): WinningArea[] => {
    const winningAreas: WinningArea[] = [];
    const losingAreas: WinningArea[] = [];

    const win = (id: string) => winningAreas.push({ id, type: 'win' });
    const lose = (id: string) => losingAreas.push({ id, type: 'lose' });
    const winMany = (...ids: string[]) => ids.forEach(win);
    const loseMany = (...ids: string[]) => ids.forEach(lose);

    const isPointNumber = [4, 5, 6, 8, 9, 10].includes(total);
    const pointNumbers: Array<4 | 5 | 6 | 8 | 9 | 10> = [4, 5, 6, 8, 9, 10];

    // Pass line / don't pass
    // Note: actual bets are stored on `pass-line-chips` / `dont-pass-chips` (see `CrapsTable.tsx`)
    if (isComingOut) {
      if (total === 7 || total === 11) {
        win('pass-line-chips');
        lose('dont-pass-chips');
      } else if (total === 2 || total === 3) {
        lose('pass-line-chips');
        win('dont-pass-chips');
      } else if (total === 12) {
        lose('pass-line-chips');
        // don't pass pushes on 12 (no win/lose)
      }
    } else if (point !== null) {
      if (total === point) {
        win('pass-line-chips');
        lose('dont-pass-chips');
      } else if (total === 7) {
        lose('pass-line-chips');
        win('dont-pass-chips');
      }
    }

    // Place / buy / lay
    if (total === 7) {
      pointNumbers.forEach(num => {
        loseMany(`place-${num}`, `buy-${num}`);
        win(`lay-${num}`);
      });
    } else if (isPointNumber) {
      winMany(`place-${total}`, `buy-${total}`);
      lose(`lay-${total}`);
    }

    // One-roll proposition bets
    if (total === 7) win('any-7');
    else lose('any-7');

    if (total === 2 || total === 3 || total === 12) win('any-craps');
    else lose('any-craps');

    if (total === 2) win('roll-2');
    else lose('roll-2');

    if (total === 3) win('roll-3');
    else lose('roll-3');

    if (total === 12) win('roll-12');
    else lose('roll-12');

    if (total === 11) winMany('roll-11-1', 'roll-11-2');
    else loseMany('roll-11-1', 'roll-11-2');

    // Field (one-roll)
    if ([2, 3, 4, 9, 10, 11, 12].includes(total)) {
      win('field');
    } else {
      lose('field');
    }

    // Hard ways: resolve only on 7 or the hard-way number
    if (total === 7) {
      loseMany('hard-4', 'hard-6', 'hard-8', 'hard-10');
    } else if (total === 4) {
      if (die1 === 2 && die2 === 2) win('hard-4');
      else lose('hard-4');
    } else if (total === 6) {
      if (die1 === 3 && die2 === 3) win('hard-6');
      else lose('hard-6');
    } else if (total === 8) {
      if (die1 === 4 && die2 === 4) win('hard-8');
      else lose('hard-8');
    } else if (total === 10) {
      if (die1 === 5 && die2 === 5) win('hard-10');
      else lose('hard-10');
    }

    // Come / don't come "base" bets resolve on next roll after being placed
    // These can only be placed once a table point exists (`point !== null`)
    if (point !== null) {
      if (total === 7 || total === 11) {
        win('come');
        lose('dont-come');
      } else if (total === 2 || total === 3) {
        lose('come');
        win('dont-come');
      } else if (total === 12) {
        lose('come');
        // don't come pushes on 12
      } else if (isPointNumber) {
        // Move come/don't-come bets to their own point numbers (if present)
        const comeBet = bets.find(bet => bet.areaId === 'come');
        const dontComeBet = bets.find(bet => bet.areaId === 'dont-come');

        if (comeBet) {
          const targetId = `come-${total}`;
          if (!animatingBets.has(targetId)) {
            onMoveBet?.({
              fromId: 'come',
              toId: targetId,
              amount: comeBet.amount,
              color: comeBet.color,
              count: comeBet.count
            });
          }
        }

        if (dontComeBet) {
          const targetId = `dont-come-${total}`;
          if (!animatingBets.has(targetId)) {
            onMoveBet?.({
              fromId: 'dont-come',
              toId: targetId,
              amount: dontComeBet.amount,
              color: dontComeBet.color,
              count: dontComeBet.count
            });
          }
        }
      }
    }

    // Established come / don't-come point bets resolve regardless of come-out
    if (total === 7) {
      pointNumbers.forEach(num => {
        lose(`come-${num}`);
        win(`dont-come-${num}`);
      });
    } else if (isPointNumber) {
      win(`come-${total}`);
      lose(`dont-come-${total}`);
    }

    return [...winningAreas, ...losingAreas];
  }, [animatingBets, bets, die1, die2, onMoveBet]);

  // Determine the outcome of a roll
  const determineRollOutcome = useCallback((total: number, currentIsComingOut: boolean, currentPoint: number | null): RollOutcome => {
    if (currentIsComingOut) {
      if (total === 7 || total === 11) {
        return { type: 'natural', isComingOut: true };
      } else if (total === 2 || total === 3 || total === 12) {
        return { type: 'craps', isComingOut: true };
      } else if ([4, 5, 6, 8, 9, 10].includes(total)) {
        return { type: 'point-set', point: total, isComingOut: false };
      }
    } else {
      if (total === 7) {
        return { type: 'seven-out', point: null, isComingOut: true };
      } else if (total === currentPoint) {
        return { type: 'point-made', point: null, isComingOut: true };
      }
    }
    return { type: 'normal', isComingOut: currentIsComingOut };
  }, []);

  React.useEffect(() => {
    // `rollId` comes from `App.tsx` and only increments when a user roll completes.
    // This prevents the game from resolving on initial mount and avoids relying on
    // fragile timing/hasRolled flags that can desync under StrictMode.
    if (isRolling) return;
    if (rollId <= 0) return;
    if (lastProcessedRollIdRef.current === rollId) return;
    lastProcessedRollIdRef.current = rollId;

    const outcome = determineRollOutcome(diceTotal, isComingOut, point);

    // Add timestamps so the UI can re-highlight the same area on back-to-back wins
    const resolvedAreas = determineWinningAreas(diceTotal, isComingOut, point).map(area => ({
      ...area,
      timestamp: area.timestamp || Date.now()
    }));

    onWinningAreas?.(resolvedAreas);
    onRollOutcome?.({ ...outcome, total: diceTotal });

    if (outcome.type !== 'normal') {
      setIsComingOut(outcome.isComingOut);
      setPoint(outcome.point ?? null);
      onStateChange?.(outcome.isComingOut, outcome.point ?? null);

      if (outcome.type === 'point-made') onRollType?.('point-made');
      else if (outcome.type === 'seven-out') onRollType?.('craps-out');
    }
  }, [
    rollId,
    isRolling,
    diceTotal,
    die1,
    die2,
    isComingOut,
    point,
    bets,
    animatingBets,
    determineRollOutcome,
    determineWinningAreas,
    onMoveBet,
    onWinningAreas,
    onRollOutcome,
    onRollType,
    onStateChange
  ]);

  return (
    <PointMarker 
      point={point}
      position={point ? markerPositions[point] : markerPositions[4]}
      isOn={!isComingOut && point !== null}
    />
  );
};

export default GameState; 
