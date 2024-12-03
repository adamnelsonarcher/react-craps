import React, { useState, useRef } from 'react';
import CrapsTable, { CrapsTableRef } from './components/CrapsTable';
import DiceArea from './components/DiceArea';
import BettingControls from './components/BettingControls';
import DiceHistory from './components/DiceHistory';
import Dice from './components/Dice';

interface DiceRoll {
  die1: number;
  die2: number;
  total: number;
}

interface Bet {
  areaId: string;
  amount: number;
  color: string;
  count: number;
}

const App: React.FC = () => {
  const [dice, setDice] = useState<{ die1: number; die2: number }>({ die1: 1, die2: 1 });
  const [isRolling, setIsRolling] = useState(false);
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [selectedChipValue, setSelectedChipValue] = useState<number | null>(null);
  const tableRef = useRef<CrapsTableRef>(null);
  const [quickRoll, setQuickRoll] = useState(false);
  const [animationDice, setAnimationDice] = useState({ die1: 1, die2: 1 });
  const [animationInterval, setAnimationInterval] = useState<NodeJS.Timeout | null>(null);
  const [bank, setBank] = useState(1000);
  const [helpMode, setHelpMode] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);

  const handleRoll = () => {
    if (isRolling) return;

    if (quickRoll) {
      // Instant roll without animation
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      setDice({ die1, die2 });
      setRollHistory(prev => [{
        die1,
        die2,
        total: die1 + die2
      }, ...prev]);
    } else {
      // Roll with animation
      setIsRolling(true);
      
      // Start the animation interval
      const interval = setInterval(() => {
        setAnimationDice({
          die1: Math.floor(Math.random() * 6) + 1,
          die2: Math.floor(Math.random() * 6) + 1
        });
      }, 100); // Change numbers every 100ms
      
      setAnimationInterval(interval);

      // Final roll after animation
      setTimeout(() => {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        
        clearInterval(interval);
        setAnimationInterval(null);
        setDice({ die1, die2 });
        setRollHistory(prev => [{
          die1,
          die2,
          total: die1 + die2
        }, ...prev]);
        setIsRolling(false);
      }, 1000);
    }
  };

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
    };
  }, [animationInterval]);

  const calculateTotalWager = (bets: Bet[]) => {
    return bets.reduce((total, bet) => total + bet.amount, 0);
  };

  return (
    <div className="relative h-screen w-screen p-4 flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      <h1 className="text-3xl font-semibold text-white text-center mb-4">RollSim.com</h1>
      
      <div className="flex-1 flex gap-6">
        {/* Left side - Controls */}
        <div className={`flex-1 flex flex-col gap-4 min-w-[250px] max-w-[430px] relative ${helpMode ? 'pointer-events-none' : ''}`}>
          <div className="bg-gray-800 rounded-lg p-4 text-center shadow-lg flex justify-between items-center">
            <div className="w-[200px] text-left">
              <span className="text-2xl text-green-400 font-bold">Bank: ${bank.toLocaleString()}</span>
            </div>
            <div className="w-[200px] text-right">
              <span className="text-2xl text-yellow-400 font-bold">Wager: ${calculateTotalWager(bets).toLocaleString()}</span>
            </div>
          </div>
          
          <BettingControls 
            onChipSelect={setSelectedChipValue}
            selectedChipValue={selectedChipValue}
            onUndo={() => tableRef.current?.handleUndo()}
            onClear={() => tableRef.current?.handleClear()}
            bank={bank}
          />
          
          <DiceArea 
            onRoll={handleRoll} 
            isRolling={isRolling} 
            quickRoll={quickRoll}
            onQuickRollChange={setQuickRoll}
          />
        </div>
        
        {/* Center - Table */}
        <div className="flex-[2.5] flex items-center justify-center bg-felt-green rounded-xl p-4 shadow-table">
          <div className="w-full aspect-[2/1] relative">
            <CrapsTable 
              ref={tableRef}
              selectedChipValue={selectedChipValue}
              bank={bank}
              setBank={setBank}
              helpMode={helpMode}
              setHelpMode={setHelpMode}
              bets={bets}
              setBets={setBets}
              dice={dice}
              isRolling={isRolling}
            />
            {/* Dice in top right */}
            <div className="absolute top-4 right-4 flex gap-4 z-10">
              <Dice value={isRolling ? animationDice.die1 : dice.die1} isRolling={isRolling} />
              <Dice value={isRolling ? animationDice.die2 : dice.die2} isRolling={isRolling} />
            </div>
          </div>
        </div>

        {/* Right side - Roll History */}
        <div className="w-24 bg-gray-800/75 rounded-lg p-1 shadow-lg backdrop-blur-sm">
          <h2 className="text-white font-bold text-xs mb-1 text-center">Roll History</h2>
          <div className="flex flex-col gap-1">
            {rollHistory.length === 0 ? (
              <div className="text-gray-400 text-center italic text-xs"> </div>
            ) : (
              rollHistory.slice(0, 20).map((roll, index) => (  // Only show last 15 rolls
                <div 
                  key={`roll-${roll.die1}-${roll.die2}-${index}`}  // Removed Date.now()
                  className={`flex justify-center gap-1 ${index === 0 && !isRolling ? 'animate-slideIn' : ''}`}
                >
                  <Dice value={roll.die1} isRolling={false} size="small" />
                  <Dice value={roll.die2} isRolling={false} size="small" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {helpMode && (
        <div className="fixed inset-0 cursor-help pointer-events-none" />
      )}
    </div>
  );
};

export default App; 