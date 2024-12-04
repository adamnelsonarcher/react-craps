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
  const [lastWinTimestamp, setLastWinTimestamp] = React.useState(0);

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
    const losingAreas: WinningArea[] = [];

    // Pass line bets - handle come out roll first
    if (isComingOut) {
      if (total === 7 || total === 11) {
        // Natural - pass line wins, don't pass loses
        winningAreas.push({ id: 'pass-line', type: 'win' });
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
        losingAreas.push(
          { id: 'dont-come', type: 'lose' },
          { id: 'dont-come-chips', type: 'lose' }
        );
      } else if (total === 2 || total === 3) {
        losingAreas.push(
          { id: 'come', type: 'lose' },
          { id: 'come-chips', type: 'lose' }
        );
        winningAreas.push(
          { id: 'dont-come', type: 'win' },
          { id: 'dont-come-chips', type: 'win' }
        );
      } else if (total === 12) {  // Don't come pushes on 12, just like don't pass
        losingAreas.push(
          { id: 'come', type: 'lose' },
          { id: 'come-chips', type: 'lose' }
        );
      }
      
      // For established come/don't come points
      if (total === 7) {
        // Come points lose on seven
        [4, 5, 6, 8, 9, 10].forEach(num => {
          losingAreas.push({ id: `come-${num}`, type: 'lose' });
          // Don't come points win on seven
          winningAreas.push({ id: `dont-come-${num}`, type: 'win' });
        });
      } else if ([4, 5, 6, 8, 9, 10].includes(total)) {
        // Come point is made
        winningAreas.push({ id: `come-${total}`, type: 'win' });
        // Don't come point loses
        losingAreas.push({ id: `dont-come-${total}`, type: 'lose' });
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

  const determineLosingAreas = (total: number, die1: number, die2: number, isComingOut: boolean, point: number | null): WinningArea[] => {
    const losingAreas: WinningArea[] = [];

    // One-roll bets
    // Any 7 - Loses on anything other than 7
    if (total !== 7) {
      losingAreas.push({ id: 'any-7', type: 'lose' });
    }

    // Any Craps - Loses on anything other than 2, 3, 12
    if (![2, 3, 12].includes(total)) {
      losingAreas.push({ id: 'any-craps', type: 'lose' });
    }

    // Individual number bets
    // Snake Eyes (2) - Loses on anything other than 2
    if (total !== 2) {
      losingAreas.push({ id: 'roll-2', type: 'lose' });
    }

    // Three (Ace-Deuce) - Loses on anything other than 3
    if (total !== 3) {
      losingAreas.push({ id: 'roll-3', type: 'lose' });
    }

    // Twelve (Boxcars) - Loses on anything other than 12
    if (total !== 12) {
      losingAreas.push({ id: 'roll-12', type: 'lose' });
    }

    // Eleven (Yo) - Loses on anything other than 11
    if (total !== 11) {
      losingAreas.push(
        { id: 'roll-11-1', type: 'lose' },
        { id: 'roll-11-2', type: 'lose' }
      );
    }

    // Hard ways
    // Hard 4 - Loses on 7 or any other 4
    if (total === 7 || (total === 4 && (die1 !== 2 || die2 !== 2))) {
      losingAreas.push({ id: 'hard-4', type: 'lose' });
    }

    // Hard 6 - Loses on 7 or any other 6
    if (total === 7 || (total === 6 && (die1 !== 3 || die2 !== 3))) {
      losingAreas.push({ id: 'hard-6', type: 'lose' });
    }

    // Hard 8 - Loses on 7 or any other 8
    if (total === 7 || (total === 8 && (die1 !== 4 || die2 !== 4))) {
      losingAreas.push({ id: 'hard-8', type: 'lose' });
    }

    // Hard 10 - Loses on 7 or any other 10
    if (total === 7 || (total === 10 && (die1 !== 5 || die2 !== 5))) {
      losingAreas.push({ id: 'hard-10', type: 'lose' });
    }

    // Field - Loses on 5, 6, 7, 8
    if ([5, 6, 7, 8].includes(total)) {
      losingAreas.push({ id: 'field', type: 'lose' });
    }

    // Pass line bets
    if (isComingOut) {
      if ([2, 3, 12].includes(total)) {
        losingAreas.push({ id: 'pass-line', type: 'lose' });
      }
    } else {
      if (total === 7) {
        losingAreas.push({ id: 'pass-line', type: 'lose' });
        // All place bets lose on seven
        [4, 5, 6, 8, 9, 10].forEach(num => {
          losingAreas.push({ id: `place-${num}`, type: 'lose' });
        });
      }
    }

    return losingAreas;
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

    // Determine winning areas and add timestamp to force update
    const winningAreas = determineWinningAreas(diceTotal, isComingOut, point).map(area => ({
      ...area,
      timestamp: area.timestamp || Date.now()
    }));

    // Add debug logging
    console.log('=== Roll Debug ===');
    console.log('Dice:', die1, die2, 'Total:', diceTotal);
    console.log('Is Coming Out:', isComingOut);
    console.log('Point:', point);
    console.log('Outcome:', outcome);
    console.log('Winning Areas:', winningAreas.filter(area => area.type === 'win').map(area => area.id));
    console.log('Losing Areas:', winningAreas.filter(area => area.type === 'lose').map(area => area.id));
    console.log('================');
    
    // Update timestamp to force re-render of winning areas
    setLastWinTimestamp(Date.now());
    
    // Pass winning areas to parent
    onWinningAreas?.(winningAreas);

    // Determine losing areas
    const losingAreas = determineLosingAreas(diceTotal, die1, die2, isComingOut, point);

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