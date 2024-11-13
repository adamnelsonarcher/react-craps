import React from 'react';

const DiceArea: React.FC = () => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col items-center gap-4 backdrop-blur-sm">
      <div className="flex gap-4 mb-2">
        <div className="dice w-28 h-28 text-5xl">1</div>
        <div className="dice w-28 h-28 text-5xl">1</div>
      </div>
      <button className="btn bg-gold text-gray-900 hover:bg-yellow-400 
                       focus:ring-yellow-500 w-full text-xl py-4">
        Roll Dice
      </button>
    </div>
  );
};

export default DiceArea; 