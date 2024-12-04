import React, { useState, useRef, useEffect } from 'react';
import CrapsTable, { CrapsTableRef } from './components/CrapsTable';
import DiceArea from './components/DiceArea';
import BettingControls from './components/BettingControls';
import DiceHistory from './components/DiceHistory';
import Dice from './components/Dice';
import GameState from './components/GameState';
import AnimatedChipStack from './components/AnimatedChipStack';
import { RollOutcome, WinningArea } from './types/game';

interface DiceRoll {
  die1: number;
  die2: number;
  total: number;
  type?: 'point-made' | 'craps-out' | 'normal';
}

interface Bet {
  areaId: string;
  amount: number;
  color: string;
  count: number;
}

interface ResolvingBet extends Bet {
  isWinning: boolean;
  position: { x: number; y: number };
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
  const [isComingOut, setIsComingOut] = useState(true);
  const [point, setPoint] = useState<number | null>(null);
  const [resolvingBets, setResolvingBets] = useState<ResolvingBet[]>([]);
  const [animatingBets, setAnimatingBets] = useState<Set<string>>(new Set());
  const [winningAreas, setWinningAreas] = useState<WinningArea[]>([]);
  const winningAreasTimeout = useRef<NodeJS.Timeout | null>(null);
  const [hasRolled, setHasRolled] = useState(false);

  const handleRoll = () => {
    if (isRolling) return;

    const rollDice = () => {
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const total = die1 + die2;
      
      return { die1, die2, total };
    };

    if (quickRoll) {
      const roll = rollDice();
      setDice({ die1: roll.die1, die2: roll.die2 });
      setHasRolled(true);
    } else {
      setIsRolling(true);
      
      const interval = setInterval(() => {
        setAnimationDice({
          die1: Math.floor(Math.random() * 6) + 1,
          die2: Math.floor(Math.random() * 6) + 1
        });
      }, 100);
      
      setAnimationInterval(interval);

      setTimeout(() => {
        const roll = rollDice();
        clearInterval(interval);
        setAnimationInterval(null);
        setDice({ die1: roll.die1, die2: roll.die2 });
        setHasRolled(true);
        setIsRolling(false);
      }, 1000);
    }
  };

  const handleRollOutcome = (outcome: RollOutcome & { total: number }) => {
    if (!hasRolled) return;
    
    setRollHistory(prev => [{
      die1: dice.die1,
      die2: dice.die2,
      total: outcome.total,
      type: outcome.type === 'point-made' ? 'point-made' 
          : outcome.type === 'seven-out' ? 'craps-out' 
          : 'normal'
    }, ...prev]);
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

  const handleGameStateChange = (newIsComingOut: boolean, newPoint: number | null) => {
    setIsComingOut(newIsComingOut);
    setPoint(newPoint);
  };

  const handleWinningAreas = (areas: WinningArea[]) => {
    // Clear any existing timeout
    if (winningAreasTimeout.current) {
      clearTimeout(winningAreasTimeout.current);
    }
    
    setWinningAreas(areas);
    
    // Only remove chips from losing areas
    const losingAreas = areas.filter(area => area.type === 'lose');
    if (losingAreas.length > 0) {
      // Get the positions of losing bets for animation
      const losingBets = bets.filter(bet => 
        losingAreas.some(area => area.id === bet.areaId)
      ).map(bet => {
        const betElement = document.querySelector(`[data-bet-id="${bet.areaId}"]`);
        const tableElement = document.querySelector('.bg-felt-green');
        
        if (betElement && tableElement) {
          const betRect = betElement.getBoundingClientRect();
          const tableRect = tableElement.getBoundingClientRect();
          
          return {
            ...bet,
            isWinning: false,
            position: { 
              x: betRect.left + (betRect.width / 2),
              y: betRect.top + (betRect.height / 2)
            }
          };
        }
        
        return {
          ...bet,
          isWinning: false,
          position: { x: 0, y: 0 }
        };
      });

      // Set the bets that are being animated
      setAnimatingBets(new Set(losingBets.map(bet => bet.areaId)));
      setResolvingBets(losingBets);

      // Remove only the losing bets from the table
      setBets(currentBets => 
        currentBets.filter(bet => !losingAreas.some(area => area.id === bet.areaId))
      );
    }
    
    // Store the new timeout
    winningAreasTimeout.current = setTimeout(() => {
      setWinningAreas([]);
      winningAreasTimeout.current = null;
    }, 3500);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (winningAreasTimeout.current) {
        clearTimeout(winningAreasTimeout.current);
      }
    };
  }, []);

  return (
    <div className="relative h-screen w-screen p-4 flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="flex-1 flex gap-6">
        {/* Left side - Controls */}
        <div className={`flex-1 flex flex-col gap-4 min-w-[250px] max-w-[400px] relative ${helpMode ? 'pointer-events-none' : ''}`}>
          <h1 className="text-3xl font-semibold text-white text-center">RollSim.com</h1>
          
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
              setDice={setDice}
              isRolling={isRolling}
              point={point}
              winningAreas={winningAreas}
            />
            {/* Dice in top right */}
            <div className="absolute top-4 right-4 flex gap-4 z-10">
              <Dice value={isRolling ? animationDice.die1 : dice.die1} isRolling={isRolling} />
              <Dice value={isRolling ? animationDice.die2 : dice.die2} isRolling={isRolling} />
            </div>
            <GameState 
              isRolling={isRolling}
              diceTotal={dice.die1 + dice.die2}
              die1={dice.die1}
              die2={dice.die2}
              bets={bets}
              onStateChange={handleGameStateChange}
              onRollOutcome={handleRollOutcome}
              onWinningAreas={handleWinningAreas}
            />
          </div>
        </div>

        {/* Right side - Roll History */}
        <div className="w-24 bg-gray-800/75 rounded-lg p-1 shadow-lg backdrop-blur-sm">
          <h2 className="text-white font-bold text-xs mb-1 text-center">Roll History</h2>
          <div className="flex flex-col gap-1">
            {rollHistory.length === 0 ? (
              <div className="text-gray-400 text-center italic text-xs"> </div>
            ) : (
              rollHistory.slice(0, 20).map((roll, index) => (
                <div 
                  key={`roll-${roll.die1}-${roll.die2}-${index}`}
                  className={`flex justify-center gap-1 ${index === 0 && !isRolling ? 'animate-slideIn' : ''} 
                             p-0.5 rounded-md
                             ${roll.type === 'craps-out' ? 'bg-red-600/20 ring-1 ring-red-600' : ''}
                             ${roll.type === 'point-made' ? 'bg-yellow-500/20 ring-1 ring-yellow-500' : ''}`}
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
      
      {resolvingBets.map((bet, index) => (
        animatingBets.has(bet.areaId) ? (
          <AnimatedChipStack
            key={`resolving-${bet.areaId}-${index}`}
            amount={bet.amount}
            color={bet.color}
            position={bet.position}
            isWinning={bet.isWinning}
            onAnimationComplete={() => {
              setAnimatingBets(prev => {
                const next = new Set(prev);
                next.delete(bet.areaId);
                return next;
              });
              setResolvingBets(prev => prev.filter(b => b.areaId !== bet.areaId));
            }}
          />
        ) : null
      ))}
    </div>
  );
};

export default App; 