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

    if (isComingOut) {
      // Come out roll rules
      if (total === 7 || total === 11) {
        // Natural
        winningAreas.push(
          { id: 'pass-line', type: 'win' },
          { id: 'dont-pass', type: 'lose' }
        );
      } else if (total === 2 || total === 3) {
        // Craps
        winningAreas.push(
          { id: 'pass-line', type: 'lose' },
          { id: 'dont-pass', type: 'win' }
        );
      } else if (total === 12) {
        // Craps - but don't pass pushes
        winningAreas.push(
          { id: 'pass-line', type: 'lose' }
        );
      }
    } else {
      // Point phase rules
      if (total === 7) {
        // Seven out
        winningAreas.push(
          { id: 'pass-line', type: 'lose' },
          { id: 'dont-pass', type: 'win' },
          { id: `place-4`, type: 'lose' },
          { id: `place-5`, type: 'lose' },
          { id: `place-6`, type: 'lose' },
          { id: `place-8`, type: 'lose' },
          { id: `place-9`, type: 'lose' },
          { id: `place-10`, type: 'lose' }
        );
      } else if (total === point) {
        // Point made
        winningAreas.push(
          { id: 'pass-line', type: 'win' },
          { id: 'dont-pass', type: 'lose' }
        );
      }
    }

    // Field bets
    if ([2, 3, 4, 9, 10, 11, 12].includes(total)) {
      winningAreas.push({ id: 'field', type: 'win' });
    } else {
      winningAreas.push({ id: 'field', type: 'lose' });
    }

    // Place bets (only when point is established)
    if (!isComingOut && total !== 7) {
      if ([4, 5, 6, 8, 9, 10].includes(total)) {
        winningAreas.push({ id: `place-${total}`, type: 'win' });
      }
    }

    // Hard ways - check both dice are equal
    if (total === 4 && die1 === 2 && die2 === 2) winningAreas.push({ id: 'hard-4', type: 'win' });
    if (total === 6 && die1 === 3 && die2 === 3) winningAreas.push({ id: 'hard-6', type: 'win' });
    if (total === 8 && die1 === 4 && die2 === 4) winningAreas.push({ id: 'hard-8', type: 'win' });
    if (total === 10 && die1 === 5 && die2 === 5) winningAreas.push({ id: 'hard-10', type: 'win' });

    // Any 7
    if (total === 7) winningAreas.push({ id: 'any-7', type: 'win' });

    // Any Craps
    if ([2, 3, 12].includes(total)) winningAreas.push({ id: 'any-craps', type: 'win' });

    return winningAreas;
  };

  React.useEffect(() => {
    if (isRolling || !diceTotal) return;

    let newIsComingOut = isComingOut;
    let newPoint = point;
    let rollType: 'point-made' | 'craps-out' | 'normal' = 'normal';

    if (isComingOut) {
      if (diceTotal === 7 || diceTotal === 11) {
        console.log('Natural!');
      } else if (diceTotal === 2 || diceTotal === 3 || diceTotal === 12) {
        console.log('Craps!');
      } else {
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
    }

    // Determine winning areas
    const winningAreas = determineWinningAreas(diceTotal, newIsComingOut, newPoint);
    onWinningAreas?.(winningAreas);

    // Update state
    setPoint(newPoint);
    setIsComingOut(newIsComingOut);
    
    // Notify parent components
    onStateChange?.(newIsComingOut, newPoint);
    if (rollType !== 'normal') {
      onRollType?.(rollType);
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