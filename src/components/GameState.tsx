import React from 'react';

interface WinningArea {
  id: string;
  type: 'win' | 'lose';
}

interface GameStateProps {
  isRolling: boolean;
  diceTotal: number;
  die1: number;
  die2: number;
  onStateChange?: (isComingOut: boolean, point: number | null) => void;
  onRollType?: (type: 'point-made' | 'craps-out' | 'normal') => void;
  onWinningAreas?: (areas: WinningArea[]) => void;
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
  onWinningAreas 
}) => {
  const [point, setPoint] = React.useState<number | null>(null);
  const [isComingOut, setIsComingOut] = React.useState(true);

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

  const prevDiceTotal = React.useRef(diceTotal);

  React.useEffect(() => {
    if (isRolling || !diceTotal) return;

    let newIsComingOut = isComingOut;
    let newPoint = point;
    let rollType: 'point-made' | 'craps-out' | 'normal' = 'normal';

    // Important: Determine winning areas BEFORE updating state
    const winningAreas = determineWinningAreas(diceTotal, isComingOut, point);
    onWinningAreas?.(winningAreas);

    // Only process game state changes if dice have actually changed
    if (diceTotal !== prevDiceTotal.current) {
      prevDiceTotal.current = diceTotal;

      if (isComingOut) {
        if (diceTotal === 7 || diceTotal === 11) {
          console.log('Natural!');
        } else if (diceTotal === 2 || diceTotal === 3 || diceTotal === 12) {
          console.log('Craps!');
        } else if ([4, 5, 6, 8, 9, 10].includes(diceTotal)) {
          // Only set point on valid point numbers
          newPoint = diceTotal;
          newIsComingOut = false;
          console.log(`Point is ${diceTotal}`);
        }
      } else {
        if (diceTotal === 7) {
          console.log('Seven out!');
          rollType = 'craps-out';
          newPoint = null;
          newIsComingOut = true;
        } else if (diceTotal === point) {
          console.log('Point made!');
          rollType = 'point-made';
          newPoint = null;
          newIsComingOut = true;
        }
        // If neither 7 nor point is hit, point stays the same
      }

      // Update state after determining winners
      setPoint(newPoint);
      setIsComingOut(newIsComingOut);
      
      // Notify parent components
      onStateChange?.(newIsComingOut, newPoint);
      if (rollType !== 'normal') {
        onRollType?.(rollType);
      }
    }
  }, [isRolling, diceTotal]);

  return (
    <PointMarker 
      point={point}
      position={point ? markerPositions[point] : markerPositions[4]}
      isOn={!isComingOut && point !== null}
    />
  );
};

export default GameState; 