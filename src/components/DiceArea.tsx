import React from 'react';

interface DiceAreaProps {
  onRoll: () => void;
  isRolling: boolean;
  quickRoll: boolean;
  onQuickRollChange: (checked: boolean) => void;
}

const DiceArea: React.FC<DiceAreaProps> = ({ onRoll, isRolling, quickRoll, onQuickRollChange }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <button
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded
                     transition-colors disabled:opacity-50"
          onClick={onRoll}
          disabled={isRolling}
        >
          {isRolling ? 'Rolling...' : 'Roll Dice'}
        </button>
        
        <label className="flex items-center gap-2 text-white cursor-pointer">
          <input
            type="checkbox"
            checked={quickRoll}
            onChange={(e) => onQuickRollChange(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          Quick Roll
        </label>
      </div>
    </div>
  );
};

export default DiceArea; 