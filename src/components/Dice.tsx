import React from 'react';

interface DiceProps {
  value: number;
  isRolling: boolean;
  size?: 'small' | 'large';
}

const Dice: React.FC<DiceProps> = ({ value, isRolling, size = 'large' }) => {
  const gridPositions = Array(9).fill(0);
  
  const sizeClasses = {
    small: 'w-[clamp(1.5rem,4vw,2.1rem)] h-[clamp(1.5rem,4vw,2.1rem)]',
    large: 'w-[clamp(3.5rem,7vw,4.5rem)] h-[clamp(3.5rem,7vw,4.5rem)]'
  };

  const paddingClasses = {
    small: 'inset-[15%]',
    large: 'inset-[20%]'
  };
  
  return (
    <div className={`${sizeClasses[size]} bg-white rounded-lg shadow-lg 
                    relative ${isRolling ? 'animate-spin dice-rolling' : ''}`}>
      <div className={`absolute ${paddingClasses[size]} grid grid-cols-3 grid-rows-3 gap-0.5`}>
        {gridPositions.map((_, i) => (
          <div 
            key={i} 
            className="bg-black rounded-full"
            style={{
              visibility: getDotVisibility(value, i) as 'visible' | 'hidden'
            }}
          />
        ))}
      </div>
    </div>
  );
};

const getDotVisibility = (value: number, index: number): 'visible' | 'hidden' => {
  const patterns: Record<number, number[]> = {
    1: [4],
    2: [2, 6],
    3: [2, 4, 6],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 6, 8, 3, 5]
  };
  
  return patterns[value].includes(index) ? 'visible' : 'hidden';
};

export default Dice; 