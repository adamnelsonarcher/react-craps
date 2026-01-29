import React, { useState, useRef, useEffect } from 'react';
import CrapsTable, { CrapsTableRef } from './components/CrapsTable';
import DiceArea from './components/DiceArea';
import BettingControls from './components/BettingControls';
import Dice from './components/Dice';
import GameState from './components/GameState';
import AnimatedChipStack from './components/AnimatedChipStack';
import { RollOutcome, WinningArea, BetMovement, ResolvingBet } from './types/game';
import { PAYOUT_TABLE } from './utils/payouts';
import ProfitDisplay from './components/ProfitDisplay';
import AnimatedBalance from './components/AnimatedBalance';
import { useScreenSize } from './hooks/useScreenSize';
import SettingsModal from './components/SettingsModal';

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
  const isTooSmall = useScreenSize();
  const [dice, setDice] = useState<{ die1: number; die2: number }>({ die1: 1, die2: 1 });
  const [isRolling, setIsRolling] = useState(false);
  // Increments when a user roll completes; used to trigger resolution exactly once per roll.
  const [rollId, setRollId] = useState(0);
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [selectedChipValue, setSelectedChipValue] = useState<number | null>(null);
  const tableRef = useRef<CrapsTableRef>(null);
  const [quickRoll, setQuickRoll] = useState(false);
  const [animationDice, setAnimationDice] = useState({ die1: 1, die2: 1 });
  const [animationInterval, setAnimationInterval] = useState<NodeJS.Timeout | null>(null);
  const [bank, setBank] = useState(1000);
  const [helpMode, setHelpMode] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [point, setPoint] = useState<number | null>(null);
  const [winningBets, setWinningBets] = useState<ResolvingBet[]>([]);
  const [losingBets, setLosingBets] = useState<ResolvingBet[]>([]);
  const [animatingBets, setAnimatingBets] = useState<Set<string>>(new Set());
  const [winningAreas, setWinningAreas] = useState<WinningArea[]>([]);
  const winningAreasTimeout = useRef<NodeJS.Timeout | null>(null);
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      setRollId(prev => prev + 1);
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
        setRollId(prev => prev + 1);
        setIsRolling(false);
      }, 1000);
    }
  };

  const handleRollOutcome = (outcome: RollOutcome & { total: number }) => {
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
      );
      
      // After mapping and before setting state
      const mappedWinningBets = newWinningBets.map(bet => {
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
      
      setWinningBets(mappedWinningBets);

      // Set the profit for display
      setLastProfit(totalProfit);

      // Add ALL winning bets to animation first
      setAnimatingBets(new Set(mappedWinningBets.map(bet => bet.areaId)));

      // Then filter which ones should be removed from the table
      const betsToRemove = mappedWinningBets.filter(bet => 
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
              if (
                (bet.areaId.startsWith('come-') || bet.areaId.startsWith('dont-come-')) &&
                (movingBetIds.has('come') || movingBetIds.has('dont-come'))
              ) {
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

  const content = isTooSmall ? (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white p-8">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Screen Too Small</h1>
        <p className="text-gray-300">
          This app was built for larger screens. It would be hard to play craps on a small screen anyways.
        </p>
      </div>
    </div>
  ) : (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden relative">
      <div className="h-full w-full flex flex-col gap-2 p-2">
        <div className="flex-1 relative min-w-0 pr-24">
          <div className={`h-full bg-felt-green rounded-xl p-3 pt-14 shadow-table min-h-0 relative 
                           ${deleteMode ? 'pointer-events-auto' : ''}`}>
            <div className="w-full h-full flex items-center justify-center min-w-0 min-h-0 overflow-hidden relative z-10">
              <div className="w-full aspect-[2/1] relative min-w-0 min-h-0 max-w-full max-h-[calc(100vh-280px)]" 
                   style={{ maxWidth: 'calc((100vh - 280px) * 2)' }}>
                <GameState 
                  isRolling={isRolling}
                  rollId={rollId}
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
                  className={`absolute right-[7.74%] top-[24%] w-[10.09%] h-[5.78%]  
                             bg-[#1a472a] hover:bg-[#143621] text-white font-bold rounded
                             ${isRolling ? 'opacity-50 cursor-not-allowed' : ''}
                             shadow-lg z-20 text-[clamp(0.6rem,1.2vw,1rem)]`}
                >
                  Roll Dice
                </button>

                {/* Dice in top right - adjusted position and gap */}
                <div className="absolute top-[9%] right-[12.74%] flex gap-[2rem] z-10 translate-x-[50%]">
                  <div className="w-[clamp(2rem,4vw,4rem)]">
                    <Dice 
                      value={isRolling ? animationDice.die1 : dice.die1} 
                      isRolling={isRolling}
                      size="large"
                    />
                  </div>
                  <div className="w-[clamp(2rem,4vw,4rem)]">
                    <Dice 
                      value={isRolling ? animationDice.die2 : dice.die2} 
                      isRolling={isRolling}
                      size="large"
                    />
                  </div>
                </div>
                <ProfitDisplay 
                  amount={lastProfit}
                  onComplete={() => setLastProfit(0)}
                />

                {/* Keep Winning Bets checkbox - positioned higher */}
                <label className="absolute bottom-[1%] left-[10%] 
                                  flex items-center gap-2 text-white cursor-pointer text-base 
                                  bg-black/40 px-3 py-1.5 rounded backdrop-blur-sm z-30 select-none">
                  <div className="flex items-center gap-2 pointer-events-none">
                    <input
                      type="checkbox"
                      checked={keepWinningBets}
                      onChange={(e) => setKeepWinningBets(e.target.checked)}
                      className="w-4 h-4 rounded pointer-events-auto"
                    />
                    <span>Keep Winning Bets Up</span>
                  </div>
                </label>
              </div>
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
              onOpenSettings={() => setIsSettingsOpen(true)}
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
    
      {/* Dice History - with proper styling and animations */}
      <div className="absolute right-2 top-2 bottom-[17%] w-[90px] bg-gray-800/75 rounded-lg p-1 
                    shadow-lg backdrop-blur-sm overflow-hidden z-[100]">
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

      {helpMode && (
        <div className="fixed inset-0 cursor-help pointer-events-none" />
      )}

      {/* Winning bet animations */}
      {winningBets.map((bet, index) => {
        return (
          <AnimatedChipStack
            key={`winning-${bet.areaId}-${index}`}
            amount={bet.winAmount || bet.amount}
            color={bet.color}
            position={bet.position}
            isWinning={true}
            totalAmount={bet.totalAmount}
            showTotalAtBet={bet.showTotalAtBet}
            onAnimationComplete={() => {
              setAnimatingBets(prev => {
                const next = new Set(prev);
                next.delete(bet.areaId);
                return next;
              });
              setWinningBets(prev => prev.filter(b => b.areaId !== bet.areaId));
            }}
          />
        );
      })}

      {/* Losing bet animations */}
      {losingBets.map((bet, index) => {
        return (
          <AnimatedChipStack
            key={`losing-${bet.areaId}-${index}`}
            amount={bet.amount}
            color={bet.color}
            position={bet.position}
            isWinning={false}
            onAnimationComplete={() => {
              setAnimatingBets(prev => {
                const next = new Set(prev);
                next.delete(bet.areaId);
                return next;
              });
              setLosingBets(prev => prev.filter(b => b.areaId !== bet.areaId));
            }}
          />
        );
      })}

      {/* Moving bet animations */}
      {movingBets.map((bet, index) => (
        <AnimatedChipStack
          key={`moving-${bet.areaId}-${index}`}
          amount={bet.amount}
          color={bet.color}
          position={bet.fromPosition}
          toPosition={bet.toPosition}
          isMoving={true}
          onAnimationComplete={() => {
            setMovingBets(prev => prev.filter(b => b.areaId !== bet.areaId));
            setMovingBetIds(prev => {
              const next = new Set(prev);
              next.delete(bet.areaId);
              return next;
            });
          }}
        />
      ))}

      {/* Waiting bet animations */}
      {waitingBets.map((bet, index) => (
        <AnimatedChipStack
          key={`waiting-${bet.areaId}-${index}`}
          amount={bet.amount}
          color={bet.color}
          position={bet.position}
          isWaiting={true}
          onWaitComplete={() => {
            // Wait for winning animation to complete before starting movement
            setTimeout(() => {
              // Start the movement animation
              setMovingBets(prev => [...prev, {
                ...bet,
                fromPosition: bet.position,
                toPosition: bet.targetPosition
              }]);
              setWaitingBets(prev => prev.filter(b => b.areaId !== bet.areaId));
              
              // Add the new bet after movement completes
              setTimeout(() => {
                handleBetPlacement(
                  {
                    fromId: bet.areaId,
                    toId: bet.areaId.replace('come', `come-${diceTotal}`),
                    amount: bet.amount,
                    color: bet.color,
                    count: bet.count
                  },
                  { left: bet.targetPosition.x, top: bet.targetPosition.y, width: 0, height: 0 } as DOMRect
                );
              }, 500);
            }, 1500);  // Wait for winning animation to complete
          }}
        />
      ))}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        bank={bank}
        onSetBank={setBank}
        gameName="RollSim"
        version="2.2"
        credits="Made by Adam Nelson-Archer"
      />
    </div>
  );

  return content;
};

export default App; 