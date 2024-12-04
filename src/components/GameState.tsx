import React from 'react';
import { RollOutcome, WinningArea } from '../types/game';

interface GameStateProps {
  isRolling: boolean;
  diceTotal: number;
  die1: number;
  die2: number;
  onStateChange?: (isComingOut: boolean, point: number | null) => void;
  onRollType?: (type: 'point-made' | 'craps-out' | 'normal') => void;
  onWinningAreas?: (areas: WinningArea[]) => void;
  onRollOutcome?: (outcome: RollOutcome & { total: number }) => void;
}

interface PointMarkerProps {
  point: number | null;
  position: { x: number; y: number };
  isOn: boolean;
}

const PointMarker: React.FC<PointMarkerProps> = ({ point, position, isOn }) => {
  // Default "OFF" position on the left side of the board
  const offPosition = { x: 8, y: -3 };
  
  const currentPosition = isOn ? position : offPosition;

  return (
    <div 
      className={`absolute w-12 h-12 rounded-full flex items-center justify-center
                 border-4 transform -translate-x-1/2 -translate-y-1/2
                 font-bold text-xl transition-all duration-1000 ease-in-out
                 ${isOn ? 'bg-white border-black text-black' : 'bg-black border-white text-white'}`}
      style={{ 
        left: `${currentPosition.x}%`,
        top: `${currentPosition.y}%`,
      }}
    >
      {isOn ? 'ON' : 'OFF'}
    </div>
  );
};

const GameState: React.FC<GameStateProps> = ({ 
  isRolling, 
  diceTotal,
  die1,
  die2,
  onStateChange,
  onRollType,
  onWinningAreas,
  onRollOutcome 
}) => {
  const [point, setPoint] = React.useState<number | null>(null);
  const [isComingOut, setIsComingOut] = React.useState(true);
  const prevRoll = React.useRef({ die1: 0, die2: 0 });

  // Point marker positions for each number (moved up to avoid overlap)
  const markerPositions: Record<number, { x: number; y: number }> = {
    4: { x: 25.92, y: -3 },   // Above the 4
    5: { x: 34.42, y: -3 },   // Above the 5
    6: { x: 42.92, y: -3 },   // Above the 6
    8: { x: 51.42, y: -3 },   // Above the 8
    9: { x: 59.92, y: -3 },   // Above the 9
    10: { x: 68.42, y: -3 },  // Above the 10
  };

  // Add function to determine winning areas based on the roll
  const determineWinningAreas = (total: number, isComingOut: boolean, point: number | null): WinningArea[] => {
    const winningAreas: WinningArea[] = [];

    // One-roll bets - ALWAYS check these first
    if (total === 7) {
      winningAreas.push({ id: 'any-7', type: 'win' });
    }
    if (total === 2) {
      winningAreas.push({ id: 'roll-2', type: 'win' });
      winningAreas.push({ id: 'any-craps', type: 'win' });
    }
    if (total === 3) {
      winningAreas.push({ id: 'roll-3', type: 'win' });
      winningAreas.push({ id: 'any-craps', type: 'win' });
    }
    if (total === 11) {
      winningAreas.push({ id: 'roll-11-1', type: 'win' });
      winningAreas.push({ id: 'roll-11-2', type: 'win' });
    }
    if (total === 12) {
      winningAreas.push({ id: 'roll-12', type: 'win' });
      winningAreas.push({ id: 'any-craps', type: 'win' });
    }

    // Hard ways - check both dice are equal
    if (die1 === die2) {  // Both dice show same number
      const hardTotal = die1 + die1;  // Calculate total using one die
      if ([4, 6, 8, 10].includes(hardTotal)) {
        winningAreas.push({ id: `hard-${hardTotal}`, type: 'win' });
      }
    }

    // Pass line bets
    if (isComingOut) {
      // On come out roll
      if (total === 7 || total === 11) {
        winningAreas.push(
          { id: 'pass-line', type: 'win' },
          { id: 'dont-pass', type: 'lose' }
        );
      } else if (total === 2 || total === 3) {
        winningAreas.push(
          { id: 'pass-line', type: 'lose' },
          { id: 'dont-pass', type: 'win' }
        );
      } else if (total === 12) {
        winningAreas.push(
          { id: 'pass-line', type: 'lose' }
        );
      }
    } else {
      // Point is established
      if (total === 7) {
        // Seven out
        winningAreas.push(
          { id: 'pass-line', type: 'lose' },
          { id: 'dont-pass', type: 'win' },
          { id: 'come', type: 'win' },
          { id: 'dont-come', type: 'lose' },
          // All place bets lose on seven out
          { id: 'place-4', type: 'lose' },
          { id: 'place-5', type: 'lose' },
          { id: 'place-6', type: 'lose' },
          { id: 'place-8', type: 'lose' },
          { id: 'place-9', type: 'lose' },
          { id: 'place-10', type: 'lose' }
        );
      } else if (total === point) {
        // Point is made
        winningAreas.push(
          { id: 'pass-line', type: 'win' },
          { id: 'dont-pass', type: 'lose' },
          { id: `place-${total}`, type: 'win' }
        );
      }
    }

    // Place bets - Always check if a number hits (except on seven)
    if (total !== 7 && [4, 5, 6, 8, 9, 10].includes(total)) {
      winningAreas.push({ id: `place-${total}`, type: 'win' });
    }

    // Field bets - always active
    if ([2, 3, 4, 9, 10, 11, 12].includes(total)) {
      winningAreas.push({ id: 'field', type: 'win' });
    } else {
      winningAreas.push({ id: 'field', type: 'lose' });
    }

    // Come/Don't Come bets (when point is established)
    if (!isComingOut) {
      if (total === 7 || total === 11) {
        winningAreas.push(
          { id: 'come', type: 'win' },
          { id: 'dont-come', type: 'lose' }
        );
      } else if (total === 2 || total === 3) {
        winningAreas.push(
          { id: 'come', type: 'lose' },
          { id: 'dont-come', type: 'win' }
        );
      } else if (total === 12) {
        winningAreas.push(
          { id: 'come', type: 'lose' }
        );
      }
    }

    return winningAreas;
  };

  // Determine the outcome of a roll
  const determineRollOutcome = (total: number, currentIsComingOut: boolean, currentPoint: number | null): RollOutcome => {
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
  };

  React.useEffect(() => {
    if (isRolling || !diceTotal) return;

    // Check if this is actually a new roll
    if (die1 === prevRoll.current.die1 && die2 === prevRoll.current.die2) {
      return;
    }

    // Update previous roll
    prevRoll.current = { die1, die2 };

    // Determine the outcome of this roll
    const outcome = determineRollOutcome(diceTotal, isComingOut, point);

    // Determine winning areas
    const winningAreas = determineWinningAreas(diceTotal, isComingOut, point);
    onWinningAreas?.(winningAreas);

    // Broadcast the roll outcome
    onRollOutcome?.({
      ...outcome,
      total: diceTotal
    });

    // Update game state based on outcome
    if (outcome.type !== 'normal') {
      console.log(`Roll outcome: ${outcome.type}`);
      setIsComingOut(outcome.isComingOut);
      setPoint(outcome.point ?? null);
      onStateChange?.(outcome.isComingOut, outcome.point ?? null);

      if (outcome.type === 'point-made') {
        onRollType?.('point-made');
      } else if (outcome.type === 'seven-out') {
        onRollType?.('craps-out');
      }
    }
  }, [diceTotal, die1, die2, isRolling]);

  return (
    <PointMarker 
      point={point}
      position={point ? markerPositions[point] : markerPositions[4]}
      isOn={!isComingOut && point !== null}
    />
  );
};

export default GameState; 