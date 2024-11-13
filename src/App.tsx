import React, { useState } from 'react';
import CrapsTable from './components/CrapsTable';
import DiceArea from './components/DiceArea';
import BettingControls from './components/BettingControls';
import DiceHistory from './components/DiceHistory';
import Dice from './components/Dice';

interface DiceRoll {
  die1: number;
  die2: number;
  total: number;
}

const App: React.FC = () => {
  const [dice, setDice] = useState<{ die1: number; die2: number }>({ die1: 1, die2: 1 });
  const [isRolling, setIsRolling] = useState(false);
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [selectedChipValue, setSelectedChipValue] = useState<number | null>(null);

  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    
    setTimeout(() => {
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      
      setDice({ die1, die2 });
      setRollHistory(prev => [{
        die1,
        die2,
        total: die1 + die2
      }, ...prev].slice(0, 10));
      
      setIsRolling(false);
    }, 1000);
  };

  return (
    <div className="relative h-screen w-screen p-4 flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      <h1 className="text-3xl font-semibold text-white text-center mb-4">React Craps</h1>
      
      <div className="flex-1 flex gap-6">
        {/* Left side - Controls */}
        <div className="flex-1 flex flex-col gap-4 min-w-[300px]">
          <div className="bg-gray-800 rounded-lg p-4 text-center shadow-lg">
            <span className="text-2xl text-green-400 font-bold">Bank: $1000</span>
          </div>
          
          <BettingControls 
            onChipSelect={setSelectedChipValue}
            selectedChipValue={selectedChipValue}
          />
          
          <DiceArea onRoll={handleRoll} isRolling={isRolling} />
        </div>
        
        {/* Right side - Table */}
        <div className="flex-[2.5] flex items-center justify-center bg-felt-green rounded-xl p-4 shadow-table">
          <div className="w-full aspect-[2/1] relative">
            <CrapsTable selectedChipValue={selectedChipValue} />
            {/* Dice in top right */}
            <div className="absolute top-4 right-4 flex gap-4 z-10">
              <Dice value={dice.die1} isRolling={isRolling} />
              <Dice value={dice.die2} isRolling={isRolling} />
            </div>
          </div>
        </div>
      </div>

      {/* History overlay */}
      <div className="fixed bottom-0 left-0 right-1/2 bg-gray-800/75 rounded-t-lg p-2 shadow-lg backdrop-blur-sm">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {rollHistory.map((roll, index) => (
            <div 
              key={index}
              className="flex items-center gap-1 px-2 py-1 rounded whitespace-nowrap animate-slideIn"
            >
              <div className="flex gap-1">
                <Dice value={roll.die1} isRolling={false} size="small" />
                <Dice value={roll.die2} isRolling={false} size="small" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App; 