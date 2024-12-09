import React from 'react';

interface DiceAreaProps {
  onRoll: (forcedRoll?: { die1: number; die2: number }) => void;
  isRolling: boolean;
  quickRoll: boolean;
  onQuickRollChange: (value: boolean) => void;
  className?: string;
}

const DiceArea: React.FC<DiceAreaProps> = ({ 
  onRoll, 
  isRolling, 
  quickRoll,
  onQuickRollChange,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <button
        onClick={() => onRoll()}
        disabled={isRolling}
        className={`w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded
                   ${isRolling ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Roll Dice
      </button>
    </div>
  );
};

export default DiceArea; 