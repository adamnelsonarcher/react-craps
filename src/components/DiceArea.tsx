import React from 'react';

interface DiceAreaProps {
  onRoll: () => void;
  isRolling: boolean;
}

const DiceArea: React.FC<DiceAreaProps> = ({ onRoll, isRolling }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 backdrop-blur-sm">
      <button
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded
                   transition-colors disabled:opacity-50"
        onClick={onRoll}
        disabled={isRolling}
      >
        {isRolling ? 'Rolling...' : 'Roll Dice'}
      </button>
    </div>
  );
};

export default DiceArea; 