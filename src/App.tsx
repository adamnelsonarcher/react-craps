import React, { useState, useRef, useEffect } from 'react';
import CrapsTable, { CrapsTableRef } from './components/CrapsTable';
import DiceArea from './components/DiceArea';
import BettingControls from './components/BettingControls';
import DiceHistory from './components/DiceHistory';
import Dice from './components/Dice';
import GameState from './components/GameState';
import AnimatedChipStack from './components/AnimatedChipStack';
import { RollOutcome, WinningArea, BetMovement, ResolvingBet } from './types/game';
import { PAYOUT_TABLE } from './utils/payouts';
import ProfitDisplay from './components/ProfitDisplay';
import AnimatedBalance from './components/AnimatedBalance';

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
  const [winningBets, setWinningBets] = useState<ResolvingBet[]>([]);
  const [losingBets, setLosingBets] = useState<ResolvingBet[]>([]);
  const [animatingBets, setAnimatingBets] = useState<Set<string>>(new Set());
  const [winningAreas, setWinningAreas] = useState<WinningArea[]>([]);
  const winningAreasTimeout = useRef<NodeJS.Timeout | null>(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [movingBets, setMovingBets] = useState<(Bet & { 
    fromPosition: { x: number; y: number };
    toPosition: { x: number; y: number };
    initialPosition?: { x: number; y: number };
  })[]>([]);
  const [movingBetIds, setMovingBetIds] = useState<Set<string>>(new Set());
  const [betHistory, setBetHistory] = useState<Bet[][]>([]);
  const [keepWinningBets, setKeepWinningBets] = useState(false);
  const [lastProfit, setLastProfit] = useState(0);
  const [deleteMode, setDeleteMode] = useState(false);
  const [waitingBets, setWaitingBets] = useState<(Bet & { 
    position: { x: number; y: number };
    targetPosition: { x: number; y: number };
  })[]>([]);

  const handleGlobalClick = (e: React.MouseEvent) => {
    if (deleteMode) {
      const clickedOnChip = (e.target as HTMLElement).closest('.chip-container');
      if (!clickedOnChip) {
        setDeleteMode(false);
      }
    }
  };

  const handleRoll = (forcedRoll?: { die1: number; die2: number }) => {
    if (isRolling) return;

    const rollDice = () => {
      // Make sure we have valid numbers for both dice
      if (forcedRoll && typeof forcedRoll.die1 === 'number' && typeof forcedRoll.die2 === 'number') {
        console.log('Using forced roll:', forcedRoll);
        return { 
          ...forcedRoll,
          total: forcedRoll.die1 + forcedRoll.die2
        };
      }

      // Default random roll
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      const total = die1 + die2;
      console.log('Using random roll:', { die1, die2, total });
      return { die1, die2, total };
    };

    // Store the roll result before animation starts
    const roll = rollDice();

    if (quickRoll) {
      console.log('Quick roll result:', roll);
      setDice({ die1: roll.die1, die2: roll.die2 });
      setHasRolled(true);
    } else {
      setIsRolling(true);
      
      console.log('Stored roll for animation:', roll);
      
      const interval = setInterval(() => {
        setAnimationDice({
          die1: Math.floor(Math.random() * 6) + 1,
          die2: Math.floor(Math.random() * 6) + 1
        });
      }, 100);
      
      setAnimationInterval(interval);

      setTimeout(() => {
        console.log('Setting final dice values:', roll);
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
    
    let totalProfit = 0; // Track total profit for this roll
    
    // Process winning bets first
    const winningAreas = areas.filter(area => area.type === 'win');
    if (winningAreas.length > 0) {
      const newWinningBets = bets.filter(bet => 
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
            
            // Add to total profit and bank
            totalProfit += winAmount;
            if (keepWinningBets && !bet.areaId.startsWith('come-') && !bet.areaId.startsWith('dont-come-')) {
              setBank(prev => prev + winAmount);
            } else {
              setBank(prev => prev + bet.amount + winAmount);
            }

            return {
              ...bet,
              isWinning: true,
              position: { 
                x: chipRect.left + (chipRect.width / 2),
                y: chipRect.top + (chipRect.height / 2)
              },
              winAmount: winAmount,
              totalAmount: bet.areaId.startsWith('come-') || bet.areaId.startsWith('dont-come-') 
                ? bet.amount + winAmount 
                : (keepWinningBets ? winAmount : bet.amount + winAmount),
              showTotalAtBet: bet.areaId.startsWith('come-') || bet.areaId.startsWith('dont-come-') 
                ? true 
                : !keepWinningBets
            } as ResolvingBet;
          }
        }
        return null;
      }).filter((bet): bet is ResolvingBet => bet !== null);

      // Set the profit for display
      setLastProfit(totalProfit);

      // Add ALL winning bets to animation first
      setWinningBets(newWinningBets);
      setAnimatingBets(new Set(newWinningBets.map(bet => bet.areaId)));

      // Then filter which ones should be removed from the table
      const betsToRemove = newWinningBets.filter(bet => 
        bet.areaId.startsWith('come-') || 
        bet.areaId.startsWith('dont-come-') || 
        !keepWinningBets
      );

      if (betsToRemove.length > 0) {
        // Delay bet removal until animation reaches betting spot
        setTimeout(() => {
          setBets(currentBets => {
            // Create a map of bets to remove by areaId
            const betsToRemoveMap = new Map<string, ResolvingBet>();
            betsToRemove.forEach(bet => {
              // For come/don't-come bets that are moving, don't add them to removal map
              if ((bet.areaId.startsWith('come-') || bet.areaId.startsWith('dont-come-')) && 
                  movingBetIds.has('come') || movingBetIds.has('dont-come')) {
                return;
              }
              betsToRemoveMap.set(bet.areaId, bet);
            });

            // Filter out bets that should be removed
            return currentBets.filter(bet => {
              // If this is a come/don't-come point bet and we're moving a new bet there,
              // keep the existing bet
              if ((bet.areaId.startsWith('come-') || bet.areaId.startsWith('dont-come-')) && 
                  (movingBetIds.has('come') || movingBetIds.has('dont-come'))) {
                return true;
              }
              // Otherwise, remove if it's in our removal map
              return !betsToRemoveMap.has(bet.areaId);
            });
          });
        }, 750);
      }
    }
    
    // Process losing bets (existing code)
    const losingAreas = areas.filter(area => area.type === 'lose');
    if (losingAreas.length > 0) {
      const newLosingBets = bets.filter(bet => 
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

      setLosingBets(newLosingBets);
      setAnimatingBets(new Set(newLosingBets.map(bet => bet.areaId)));

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
    if (movingBetIds.has(movement.fromId)) return;

    const fromElement = document.querySelector(`[data-bet-id="${movement.fromId}"]`);
    const toElement = document.querySelector(`[data-bet-id="${movement.toId}"]`);
    const fromChip = fromElement?.querySelector('.chip-container');
    
    // Check if there's an existing bet in the target area
    const existingBet = bets.find(bet => bet.areaId === movement.toId);
    
    if (fromChip && toElement) {
      const fromRect = fromChip.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();

      // Mark this bet as moving
      setMovingBetIds(prev => new Set(prev).add(movement.fromId));

      if (existingBet) {
        // Add to waiting bets if there's an existing bet
        setWaitingBets(prev => [...prev, {
          areaId: movement.fromId,
          amount: movement.amount,
          color: movement.color,
          count: movement.count,
          position: {
            x: fromRect.left + (fromRect.width / 2),
            y: fromRect.top + (fromRect.height / 2)
          },
          targetPosition: {
            x: toRect.left + (toRect.width / 2),
            y: toRect.top + (toRect.height / 2)
          }
        }]);

        // Remove original bet only when waiting animation starts
        setBets(currentBets => 
          currentBets.filter(bet => bet.areaId !== movement.fromId)
        );
      } else {
        // If no existing bet, proceed with immediate movement
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

        // Remove original bet when movement starts
        setBets(currentBets => 
          currentBets.filter(bet => bet.areaId !== movement.fromId)
        );

        // Add the new bet after movement completes
        setTimeout(() => {
          handleBetPlacement(movement, toRect);
        }, 500);
      }
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

  const handleBetPlacement = (movement: BetMovement, rect: DOMRect) => {
    setBets(currentBets => [...currentBets, {
      areaId: movement.toId,
      amount: movement.amount,
      color: movement.color,
      count: movement.count
    }]);

    // Clean up moving states
    setMovingBets(prev => prev.filter(bet => bet.areaId !== movement.fromId));
    setMovingBetIds(prev => {
      const next = new Set(prev);
      next.delete(movement.fromId);
      return next;
    });
  };

  const diceTotal = dice.die1 + dice.die2;

  useEffect(() => {
    const updateContainerSize = () => {
      const container = document.querySelector('.bg-felt-green');
      if (container) {
        const rect = container.getBoundingClientRect();
        document.documentElement.style.setProperty('--container-width', `${rect.width}px`);
        document.documentElement.style.setProperty('--container-height', `${rect.height}px`);
      }
    };

    window.addEventListener('resize', updateContainerSize);
    updateContainerSize();

    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
      <div className="h-full w-full max-w-[1800px] mx-auto flex gap-2 p-2">
        {/* Main content area with betting controls */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Game board area - fills available space */}
          <div className="flex-1 bg-felt-green rounded-xl p-3 pt-14 shadow-table min-h-0 relative">
            <div className="w-full h-full flex items-center justify-center">
              {/* This container will maintain 2:1 ratio and fit within the green area */}
              <div className="relative w-full h-full" style={{ 
                maxWidth: 'min(100%, calc(var(--container-height) * 2))',
                maxHeight: 'min(100%, calc(var(--container-width) / 2))',
                aspectRatio: '2/1',
              }}>
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
                  onPredeterminedRoll={(roll) => handleRoll(roll)}
                  deleteMode={deleteMode}
                />
                
                {/* Additional Roll Dice button */}
                <button
                  onClick={() => !isRolling && handleRoll()}
                  disabled={isRolling}
                  className={`absolute right-[5.74%] top-[24%] w-[10.09%] h-[5.78%]  
                             bg-[#1a472a] hover:bg-[#143621] text-white font-bold rounded
                             ${isRolling ? 'opacity-50 cursor-not-allowed' : ''}
                             shadow-lg text-sm z-20`}
                >
                  Roll Dice
                </button>

                {/* Dice in top right */}
                <div className="absolute top-[10%] right-[5%] flex gap-4 z-10 scale-125">
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
                  animatingBets={animatingBets}
                />
                <ProfitDisplay 
                  amount={lastProfit}
                  onComplete={() => setLastProfit(0)}
                />
              </div>
            </div>
          </div>

          {/* Keep existing betting controls */}
          <div className={`h-[15%] ${helpMode ? 'pointer-events-none' : ''} min-h-0`}>
            <div className="flex gap-4 items-stretch h-full bg-gray-800/50 rounded-lg px-3">
              <BettingControls 
                onChipSelect={setSelectedChipValue}
                selectedChipValue={selectedChipValue}
                onUndo={() => tableRef.current?.handleUndo()}
                onClear={() => tableRef.current?.handleClear()}
                onToggleDelete={() => setDeleteMode(!deleteMode)}
                deleteMode={deleteMode}
                bank={bank}
                bankDisplay={
                  <div className="flex flex-col justify-center w-[200px]">
                    <span className="text-2xl text-green-400 font-bold whitespace-nowrap">
                      Bank: <AnimatedBalance value={bank} animate={lastProfit > 0} />
                    </span>
                    <span className="text-2xl text-yellow-400 font-bold whitespace-nowrap">
                      Wager: ${calculateTotalWager(bets).toLocaleString()}
                    </span>
                  </div>
                }
              />

              <div className="h-full w-px bg-gray-600/50" />

              {/* Right section - Dice and Quick Roll */}
              <div className="flex-1 flex flex-col gap-2 py-2">
                <div className="flex-1 flex flex-col gap-2">
                  <DiceArea 
                    onRoll={handleRoll} 
                    isRolling={isRolling} 
                    quickRoll={quickRoll}
                    onQuickRollChange={setQuickRoll}
                    className="w-40 h-full"
                  />
                  <label className="flex items-center gap-2 text-white cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={quickRoll}
                      onChange={(e) => setQuickRoll(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    Quick Roll
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keep existing roll history */}
        <div className="w-18 bg-gray-800/75 rounded-lg p-1 shadow-lg backdrop-blur-sm h-full overflow-hidden">
          <h2 className="text-white font-bold text-xs mb-1 text-center">Roll History</h2>
          <div className="flex flex-col items-center gap-1 h-[calc(100%-1.5rem)]">
            {rollHistory.length === 0 ? (
              <div className="flex justify-center items-center gap-1 p-0.5 rounded-md h-[2.5rem] opacity-0">
                <Dice value={1} isRolling={false} size="small" />
                <Dice value={1} isRolling={false} size="small" />
              </div>
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
  );
};

export default App; 