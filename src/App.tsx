import React, { useState, useRef, useEffect } from 'react';
import CrapsTable, { CrapsTableRef } from './components/CrapsTable';
import DiceArea from './components/DiceArea';
import BettingControls from './components/BettingControls';
import DiceHistory from './components/DiceHistory';
import Dice from './components/Dice';
import GameState from './components/GameState';
import AnimatedChipStack from './components/AnimatedChipStack';
import { RollOutcome, WinningArea, BetMovement } from './types/game';
import { PAYOUT_TABLE } from './utils/payouts';

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
  const [movingBets, setMovingBets] = useState<(Bet & { 
    fromPosition: { x: number; y: number };
    toPosition: { x: number; y: number };
  })[]>([]);
  const [movingBetIds, setMovingBetIds] = useState<Set<string>>(new Set());
  const [betHistory, setBetHistory] = useState<Bet[][]>([]);

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

    // Clear bet history after each roll
    setBetHistory([]);
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
    
    // Calculate dice total
    const total = dice.die1 + dice.die2;
    
    // Process winning bets first
    const winningAreas = areas.filter(area => area.type === 'win');
    if (winningAreas.length > 0) {
      // Get positions of winning bets for animation
      const winningBets = bets.filter(bet => 
        winningAreas.some(area => area.id === bet.areaId)
      ).map(bet => {
        const betElement = document.querySelector(`[data-bet-id="${bet.areaId}"]`);
        const chipElement = betElement?.querySelector('.absolute');
        const tableElement = document.querySelector('.bg-felt-green');
        
        if (chipElement && tableElement) {
          const chipRect = chipElement.getBoundingClientRect();
          
          // Calculate winnings before removing the bet
          const payout = PAYOUT_TABLE[bet.areaId as keyof typeof PAYOUT_TABLE];
          if (payout) {
            let winAmount = 0;
            
            if (typeof payout === 'number') {
              winAmount = bet.amount * payout;
            } else if ('base' in payout) {
              if (bet.areaId === 'field') {
                const baseWin = bet.amount * payout.base;
                if (total === 2) {
                  winAmount = bet.amount * payout['2'];
                } else if (total === 12) {
                  winAmount = bet.amount * payout['12'];
                } else {
                  winAmount = baseWin;
                }
              }
            } else if ('multiplier' in payout) {
              winAmount = bet.amount * payout.multiplier;
              const commission = bet.amount * payout.commission;
              winAmount -= commission;
            }
            
            // Add original bet amount back plus winnings
            setBank(prev => prev + bet.amount + winAmount);
          }

          return {
            ...bet,
            isWinning: true,
            position: { 
              x: chipRect.left + (chipRect.width / 2),
              y: chipRect.top + (chipRect.height / 2)
            }
          };
        }
        
        return {
          ...bet,
          isWinning: true,
          position: { x: 0, y: 0 }
        };
      });

      // Set the bets that are being animated
      setAnimatingBets(prev => 
        new Set([
          ...Array.from(prev), 
          ...winningBets.map(bet => bet.areaId)
        ])
      );
      setResolvingBets(prev => [...prev, ...winningBets]);

      // Remove the winning bets from the table
      setBets(currentBets => 
        currentBets.filter(bet => !winningAreas.some(area => area.id === bet.areaId))
      );
    }
    
    // Process losing bets (existing code)
    const losingAreas = areas.filter(area => area.type === 'lose');
    if (losingAreas.length > 0) {
      // Get the positions of losing bets for animation
      const losingBets = bets.filter(bet => 
        losingAreas.some(area => area.id === bet.areaId)
      ).map(bet => {
        const betElement = document.querySelector(`[data-bet-id="${bet.areaId}"]`);
        const chipElement = betElement?.querySelector('.absolute'); // Get the chip stack container
        const tableElement = document.querySelector('.bg-felt-green');
        
        if (chipElement && tableElement) {
          const chipRect = chipElement.getBoundingClientRect();
          const tableRect = tableElement.getBoundingClientRect();
          
          return {
            ...bet,
            isWinning: false,
            position: { 
              x: chipRect.left + (chipRect.width / 2),
              y: chipRect.top + (chipRect.height / 2)
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

  const handleBetMovement = (movement: BetMovement) => {
    // If this bet is already being moved, ignore
    if (movingBetIds.has(movement.fromId)) return;

    const fromElement = document.querySelector(`[data-bet-id="${movement.fromId}"]`);
    const toElement = document.querySelector(`[data-bet-id="${movement.toId}"]`);
    const fromChip = fromElement?.querySelector('.chip-container');
    
    // Instead of looking for an existing chip, just use the betting area's position
    if (fromChip && toElement) {
      const fromRect = fromChip.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();

      // Mark this bet as moving
      setMovingBetIds(prev => new Set(prev).add(movement.fromId));

      // Add to moving bets
      setMovingBets(prev => [...prev, {
        areaId: movement.fromId,
        amount: movement.amount,
        color: movement.color,
        count: movement.count,
        fromPosition: {
          x: fromRect.left + (fromRect.width / 2),
          y: fromRect.top + (fromRect.height / 2)
        },
        toPosition: {
          x: toRect.left + (toRect.width / 2),
          y: toRect.top + (toRect.height / 2)
        }
      }]);

      // After animation completes
      setTimeout(() => {
        // Remove the original bet and add the new one in a single update
        setBets(currentBets => {
          const remainingBets = currentBets.filter(bet => bet.areaId !== movement.fromId);
          return [...remainingBets, {
            areaId: movement.toId,
            amount: movement.amount,
            color: movement.color,
            count: movement.count
          }];
        });
        
        // Clean up moving states
        setMovingBets(prev => prev.filter(bet => bet.areaId !== movement.fromId));
        setMovingBetIds(prev => {
          const next = new Set(prev);
          next.delete(movement.fromId);
          return next;
        });
      }, 500);
    } else {
      handleBetMovementImmediate(movement);
    }
  };

  const handleBetMovementImmediate = (movement: BetMovement) => {
    setBets(currentBets => {
      const remainingBets = currentBets.filter(bet => bet.areaId !== movement.fromId);
      const newBet = {
        areaId: movement.toId,
        amount: movement.amount,
        color: movement.color,
        count: movement.count
      };
      return [...remainingBets, newBet];
    });
  };

  return (
    <div className="relative h-screen w-screen p-4 flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="flex-1 flex gap-6">
        {/* Main container */}
        <div className="flex flex-row gap-4 h-full max-w-[1800px] mx-auto p-4">
          {/* Left side - Betting Controls */}
          <div className="flex-[1]">
            <div className={`flex-1 flex flex-col gap-4 min-w-[8vw] max-w-[23vw] relative ${helpMode ? 'pointer-events-none' : ''}`}>
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
          </div>

          {/* Center - Table */}
          <div className="flex-[2.8] flex items-center justify-center bg-felt-green rounded-xl p-4 shadow-table">
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
                movingBetIds={movingBetIds}
                betHistory={betHistory}
                setBetHistory={setBetHistory}
              />
              {/* Dice in top right */}
              <div className="absolute top-[10%] right-[5%] flex gap-4 z-10">
                <Dice 
                  value={isRolling ? animationDice.die1 : dice.die1} 
                  isRolling={isRolling}
                  size="large"
                />
                <Dice 
                  value={isRolling ? animationDice.die2 : dice.die2} 
                  isRolling={isRolling}
                  size="large"
                />
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
                onMoveBet={handleBetMovement}
              />
            </div>
          </div>

          {/* Right side - Roll History */}
          <div className="w-18 bg-gray-800/75 rounded-lg p-1 shadow-lg backdrop-blur-sm h-full overflow-hidden">
            <h2 className="text-white font-bold text-xs mb-1 text-center">Roll History</h2>
            <div className="flex flex-col items-center gap-1 h-[calc(100%-1.5rem)]">
              {rollHistory.length === 0 ? (
                <div className="text-gray-400 text-center italic text-xs"> </div>
              ) : (
                rollHistory.slice(0, Math.min(15, rollHistory.length)).map((roll, index) => (
                  <div 
                    key={`roll-${rollHistory.length - index}`}
                    className={`flex justify-center items-center gap-1 
                               ${index === 0 ? 'animate-slideIn' : ''} 
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
      {movingBets.map((bet, index) => (
        <AnimatedChipStack
          key={`moving-${bet.areaId}-${index}`}
          amount={bet.amount}
          color={bet.color}
          position={bet.fromPosition}
          toPosition={bet.toPosition}
          isMoving={true}
        />
      ))}
    </div>
  );
};

export default App; 