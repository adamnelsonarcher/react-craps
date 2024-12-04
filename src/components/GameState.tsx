import React from 'react';
import { RollOutcome, WinningArea, BetMovement } from '../types/game';

interface Bet {
  areaId: string;
  amount: number;
  color: string;
  count: number;
}

interface GameStateProps {
  isRolling: boolean;
  diceTotal: number;
  die1: number;
  die2: number;
  bets: Bet[];
  onStateChange?: (isComingOut: boolean, point: number | null) => void;
  onRollType?: (type: 'point-made' | 'craps-out' | 'normal') => void;
  onWinningAreas?: (areas: WinningArea[]) => void;
  onRollOutcome?: (outcome: RollOutcome & { total: number }) => void;
  onMoveBet?: (movement: BetMovement) => void;
}

interface PointMarkerProps {
  point: number | null;
  position: { x: number; y: number };
  isOn: boolean;
}

const PointMarker: React.FC<PointMarkerProps> = ({ point, position, isOn }) => {
  const offPosition = { x: 6, y: -4 };
  const currentPosition = isOn ? position : offPosition;

  return (
    <div 
      className={`absolute w-[clamp(1.75rem,3.5vw,3.5rem)] h-[clamp(1.75rem,3.5vw,3.5rem)]
                 rounded-full flex items-center justify-center
                 border-[0.2rem] transform -translate-x-1/2 -translate-y-1/2
                 font-bold transition-all duration-1000 ease-in-out
                 ${isOn ? 'bg-white border-black text-black' : 'bg-black border-white text-white'}`}
      style={{ 
        left: `${currentPosition.x}%`,
        top: `${currentPosition.y}%`,
        fontSize: 'clamp(0.8rem, 1.6vw, 1.2rem)',
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
  bets,
  onStateChange,
  onRollType,
  onWinningAreas,
  onRollOutcome,
  onMoveBet
}) => {
  const [point, setPoint] = React.useState<number | null>(null);
  const [isComingOut, setIsComingOut] = React.useState(true);
  const prevRoll = React.useRef({ die1: 0, die2: 0 });
  const [lastWinTimestamp, setLastWinTimestamp] = React.useState(0);
  const [hasRolled, setHasRolled] = React.useState(false);

  // Point marker positions for each number (moved up to avoid overlap)
  const markerPositions: Record<number, { x: number; y: number }> = {
    4: { x: 25.92, y: -4 },   // Above the 4
    5: { x: 34.42, y: -4 },   // Above the 5
    6: { x: 42.92, y: -4 },   // Above the 6
    8: { x: 51.42, y: -4 },   // Above the 8
    9: { x: 59.92, y: -4 },   // Above the 9
    10: { x: 68.42, y: -4 },  // Above the 10
  };

  // Add function to determine winning areas based on the roll
  const determineWinningAreas = (total: number, isComingOut: boolean, point: number | null): WinningArea[] => {
    const winningAreas: WinningArea[] = [];
    const losingAreas: WinningArea[] = [];

    // Pass line bets - handle come out roll first
    if (isComingOut) {
      if (total === 7 || total === 11) {
        // Natural - pass line wins, don't pass loses
        winningAreas.push(
          { id: 'pass-line', type: 'win' },
          { id: 'pass-line-chips', type: 'win' }
        );
        losingAreas.push(
          { id: 'dont-pass', type: 'lose' },
          { id: 'dont-pass-chips', type: 'lose' }
        );
      } else if (total === 2 || total === 3 || total === 12) {
        // Craps - pass line loses, don't pass wins (except push on 12)
        losingAreas.push(
          { id: 'pass-line', type: 'lose' },
          { id: 'pass-line-chips', type: 'lose' }
        );
        winningAreas.push(
          { id: 'dont-pass', type: 'win' },
        );
      }
    } else if (point !== null) {
      if (total === point) {
        winningAreas.push(
          { id: 'pass-line', type: 'win' },
          //{ id: 'pass-line-chips', type: 'win' }
        );
        losingAreas.push({ id: 'dont-pass', type: 'lose' });
        losingAreas.push({ id: 'dont-pass-chips', type: 'lose' });
        losingAreas.push({ id: 'dont-come', type: 'lose' });
        losingAreas.push({ id: 'dont-come-chips', type: 'lose' });
        losingAreas.push({ id: `lay-${total}`, type: 'lose' });
        winningAreas.push({ id: `place-${total}`, type: 'win' });
      } else if (total === 7) {
        losingAreas.push(
          { id: 'pass-line', type: 'lose' },
          { id: 'pass-line-chips', type: 'lose' }
        );
        winningAreas.push({ id: 'dont-pass', type: 'win' });
        // All place bets lose on seven
        [4, 5, 6, 8, 9, 10].forEach(num => {
          losingAreas.push({ id: `place-${num}`, type: 'lose' });
          winningAreas.push({ id: `lay-${num}`, type: 'win' });
        });
      } else if ([4, 5, 6, 8, 9, 10].includes(total)) {
        winningAreas.push({ id: `place-${total}`, type: 'win' });
        losingAreas.push({ id: `lay-${total}`, type: 'lose' });
      }
    }

    // Any 7 - Only wins on 7 during come-out roll
    if (total === 7) {  // Any 7 should win on ANY 7, not just during come-out
      winningAreas.push({ id: 'any-7', type: 'win' });
    } else {
      losingAreas.push({ id: 'any-7', type: 'lose' });
    }

    // Any Craps
    if ([2, 3, 12].includes(total)) {
      winningAreas.push({ id: 'any-craps', type: 'win' });
    } else {
      losingAreas.push({ id: 'any-craps', type: 'lose' });
    }

    // Individual number bets
    // Snake Eyes (2)
    if (total === 2) {
      winningAreas.push({ id: 'roll-2', type: 'win' });
    } else {
      losingAreas.push({ id: 'roll-2', type: 'lose' });
    }

    // Three (Ace-Deuce)
    if (total === 3) {
      winningAreas.push({ id: 'roll-3', type: 'win' });
    } else {
      losingAreas.push({ id: 'roll-3', type: 'lose' });
    }

    // Twelve (Boxcars)
    if (total === 12) {
      winningAreas.push({ id: 'roll-12', type: 'win' });
    } else {
      losingAreas.push({ id: 'roll-12', type: 'lose' });
    }

    // Eleven (Yo)
    if (total === 11) {
      winningAreas.push({ id: 'roll-11-1', type: 'win' });
      winningAreas.push({ id: 'roll-11-2', type: 'win' });
    } else {
      losingAreas.push({ id: 'roll-11-1', type: 'lose' });
      losingAreas.push({ id: 'roll-11-2', type: 'lose' });
    }

    // Hard ways
    // Hard 4
    if (total === 4 && die1 === 2 && die2 === 2) {
      winningAreas.push({ id: 'hard-4', type: 'win' });
    } else if (total === 7 || (total === 4 && (die1 !== die2))) {
      losingAreas.push({ id: 'hard-4', type: 'lose' });
    }

    // Hard 6
    if (total === 6 && die1 === 3 && die2 === 3) {
      winningAreas.push({ id: 'hard-6', type: 'win' });
    } else if (total === 7 || (total === 6 && (die1 !== 3 || die2 !== 3))) {
      losingAreas.push({ id: 'hard-6', type: 'lose' });
    }

    // Hard 8
    if (total === 8 && die1 === 4 && die2 === 4) {
      winningAreas.push({ id: 'hard-8', type: 'win' });
    } else if (total === 7 || (total === 8 && (die1 !== 4 || die2 !== 4))) {
      losingAreas.push({ id: 'hard-8', type: 'lose' });
    }

    // Hard 10
    if (total === 10 && die1 === 5 && die2 === 5) {
      winningAreas.push({ id: 'hard-10', type: 'win' });
    } else if (total === 7 || (total === 10 && (die1 !== 5 || die2 !== 5))) {
      losingAreas.push({ id: 'hard-10', type: 'lose' });
    }

    // Field
    if ([2, 3, 4, 9, 10, 11, 12].includes(total)) {
      winningAreas.push({ 
        id: 'field', 
        type: 'win',
        timestamp: Date.now()
      });
    } else {
      losingAreas.push({ 
        id: 'field', 
        type: 'lose',
        timestamp: Date.now()
      });
    }

    // Come bets - only active after a point is established
    if (!isComingOut) {
      // For new come bets
      if (total === 7 || total === 11) {
        winningAreas.push({ id: 'come', type: 'win' });
      } else if (total === 2 || total === 3 || total === 12) {
        losingAreas.push({ id: 'come', type: 'lose' });
      } else if ([4, 5, 6, 8, 9, 10].includes(total)) {
        // Instead of marking come as losing, move the bet
        const comeBets = bets.filter(bet => bet.areaId === 'come');
        comeBets.forEach(bet => {
          onMoveBet?.({
            fromId: 'come',
            toId: `come-${total}`,
            amount: bet.amount,
            color: bet.color,
            count: bet.count
          });
        });
      }
    }

    return [...winningAreas, ...losingAreas];
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

    // Set hasRolled to true when we get a new roll
    setHasRolled(true);

    // Update previous roll
    prevRoll.current = { die1, die2 };

    // Only process winning areas if we've had an actual roll
    if (hasRolled) {
      // Determine the outcome of this roll
      const outcome = determineRollOutcome(diceTotal, isComingOut, point);

      // Determine winning areas and add timestamp to force update
      const winningAreas = determineWinningAreas(diceTotal, isComingOut, point).map(area => ({
        ...area,
        timestamp: area.timestamp || Date.now()
      }));
      
      // Update timestamp to force re-render of winning areas
      setLastWinTimestamp(Date.now());
      
      // Pass winning areas to parent
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
          console.log('Point made! Should be winning pass line');
          onRollType?.('point-made');
        } else if (outcome.type === 'seven-out') {
          console.log('Seven out! Should be losing pass line');
          onRollType?.('craps-out');
        }
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