import React from 'react';

interface GameStateProps {
  isRolling: boolean;
  diceTotal: number;
  onStateChange?: (isComingOut: boolean, point: number | null) => void;
  onRollType?: (type: 'point-made' | 'craps-out' | 'normal') => void;
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
  onStateChange,
  onRollType 
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