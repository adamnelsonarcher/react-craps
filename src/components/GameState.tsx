import React from 'react';

interface GameStateProps {
  isRolling: boolean;
  diceTotal: number;
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

const GameState: React.FC<GameStateProps> = ({ isRolling, diceTotal }) => {
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

    if (isComingOut) {
      // Come out roll logic
      if (diceTotal === 7 || diceTotal === 11) {
        // Natural - Pass line wins, stay in come out
        console.log('Natural!');
      } else if (diceTotal === 2 || diceTotal === 3 || diceTotal === 12) {
        // Craps - Pass line loses, stay in come out
        console.log('Craps!');
      } else {
        // Point established
        setPoint(diceTotal);
        setIsComingOut(false);
        console.log(`Point is ${diceTotal}`);
      }
    } else {
      // Point phase logic
      if (diceTotal === 7) {
        // Seven out - Pass line loses
        console.log('Seven out!');
        setPoint(null);
        setIsComingOut(true);
      } else if (diceTotal === point) {
        // Point made - Pass line wins
        console.log('Point made!');
        setPoint(null);
        setIsComingOut(true);
      }
    }
  }, [isRolling, diceTotal]);

  return (
    <PointMarker 
      point={point}
      position={point ? markerPositions[point] : markerPositions[4]} // Default position if no point
      isOn={!isComingOut && point !== null}
    />
  );
};

export default GameState; 