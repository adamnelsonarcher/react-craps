import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CrapsTable from './components/CrapsTable';
import BettingControls from './components/BettingControls';
import Dice from './components/Dice';
import PointMarker from './components/PointMarker';
import AnimatedChipStack, {
  AnimatedChipStackProps,
  CHIP_ANIMATION_SECONDS,
} from './components/AnimatedChipStack';
import ProfitDisplay from './components/ProfitDisplay';
import AnimatedBalance from './components/AnimatedBalance';
import SettingsModal from './components/SettingsModal';
import { useScreenSize } from './hooks/useScreenSize';
import { Bet, DicePair, RollRecord, WinningArea } from './types/game';
import { bettingRestriction, isLockedBet, resolveRoll, staysUpAfterWin } from './game/rules';
import { toAreaId, toBetId } from './game/tableLayout';
import { calculateWinnings, roundToCents } from './utils/payouts';
import { CHIPS } from './utils/chips';
import { STORAGE_KEYS, loadNumber, save, useStoredBoolean } from './utils/storage';

export const STARTING_BANK = 1000;

const ROLL_ANIMATION_MS = 1000;
/** When a winning payout chip reaches its bet (30% of the 2.5s win animation). */
const PAYOUT_ARRIVAL_MS = 750;
/** When the payout chip leaves the bet again (70% of the win animation), in seconds. */
const PAYOUT_LEAVES_S = 1.75;
const WIN_HIGHLIGHT_MS = 3500;
const NOTICE_MS = 2500;
const MAX_ROLL_HISTORY = 50;
const VISIBLE_ROLL_HISTORY = 15;

type ChipAnimation = Omit<AnimatedChipStackProps, 'onAnimationComplete'> & {
  id: number;
  /** For `move` animations: the bet whose real chips stay hidden until the chip lands. */
  hideBetId?: string;
};

const randomDie = () => Math.floor(Math.random() * 6) + 1;
const randomRoll = (): DicePair => ({ die1: randomDie(), die2: randomDie() });
const totalOf = (bets: Bet[]) => roundToCents(bets.reduce((sum, bet) => sum + bet.amount, 0));
const formatMoney = (amount: number) =>
  `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Screen-space centre of a bet's chips (or of the area itself if it has none). */
const getScreenCenter = (areaId: string, preferChips = true) => {
  const area = document.querySelector(`[data-bet-id="${areaId}"]`);
  const element = (preferChips && area?.querySelector('.chip-container')) || area;
  if (!element) return { x: 0, y: 0 };
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const App: React.FC = () => {
  const isTooSmall = useScreenSize();
  const boardRef = useRef<HTMLDivElement>(null);

  // Dice & table state
  const [dice, setDice] = useState<DicePair>({ die1: 1, die2: 1 });
  const [animationDice, setAnimationDice] = useState<DicePair>({ die1: 1, die2: 1 });
  const [isRolling, setIsRolling] = useState(false);
  const [point, setPoint] = useState<number | null>(null);
  const [rollHistory, setRollHistory] = useState<RollRecord[]>([]);

  // Money & bets
  const [bank, setBank] = useState(() => loadNumber(STORAGE_KEYS.bankroll, STARTING_BANK));
  const [bets, setBets] = useState<Bet[]>([]);
  /** Snapshots of `bets` before each change since the last roll, for Undo. */
  const [betHistory, setBetHistory] = useState<Bet[][]>([]);
  const [selectedChipValue, setSelectedChipValue] = useState<number | null>(5);

  // Preferences & modes
  const [quickRoll, setQuickRoll] = useStoredBoolean(STORAGE_KEYS.quickRoll, false);
  const [keepWinningBets, setKeepWinningBets] = useStoredBoolean(STORAGE_KEYS.keepWinningBets, false);
  const [helpMode, setHelpMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);

  // Purely visual state (the game logic never reads these)
  const [winningAreas, setWinningAreas] = useState<WinningArea[]>([]);
  const [ghostBets, setGhostBets] = useState<Bet[]>([]);
  const [chipAnimations, setChipAnimations] = useState<ChipAnimation[]>([]);
  const [lastProfit, setLastProfit] = useState({ rollId: 0, amount: 0 });

  const totalWager = totalOf(bets);
  const hiddenBetIds = useMemo(
    () => new Set(chipAnimations.flatMap(animation => (animation.hideBetId ? [animation.hideBetId] : []))),
    [chipAnimations]
  );

  // Remember the bankroll (chips on the table are returned on reload).
  useEffect(() => {
    save(STORAGE_KEYS.bankroll, roundToCents(bank + totalWager));
  }, [bank, totalWager]);

  // ---- Timers -------------------------------------------------------------
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const rollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const later = useCallback((fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      fn();
    }, ms);
    timers.current.add(timer);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      if (rollInterval.current) clearInterval(rollInterval.current);
    };
  }, []);

  const showNotice = useCallback((message: string) => {
    const id = Date.now();
    setNotice({ id, message });
    later(() => setNotice(current => (current?.id === id ? null : current)), NOTICE_MS);
  }, [later]);

  // ---- Rolling ------------------------------------------------------------

  // Latest table state, read when a roll lands (the roll timer outlives the render that started it).
  const tableState = useRef({ bets, point, keepWinningBets });
  tableState.current = { bets, point, keepWinningBets };
  const isRollingRef = useRef(false);
  const rollCount = useRef(0);
  const animationCount = useRef(0);

  /**
   * Apply a roll: resolve every bet, update bank/bets/point immediately, then kick
   * off the chip animations. Bets are settled synchronously so a quick follow-up
   * roll or bet can never see half-resolved state.
   */
  const completeRoll = useCallback((roll: DicePair) => {
    const { bets: currentBets, point: currentPoint, keepWinningBets: keepUp } = tableState.current;
    const total = roll.die1 + roll.die2;
    const { outcome, results, movements } = resolveRoll(roll.die1, roll.die2, currentPoint, currentBets);
    const resultById = new Map(results.map(result => [result.id, result.type]));
    const nextId = () => ++animationCount.current;

    const animations: ChipAnimation[] = [];
    const paidBets: Bet[] = [];
    let nextBets: Bet[] = [];
    let returnedToBank = 0;
    let profit = 0;

    for (const bet of currentBets) {
      const result = resultById.get(bet.areaId);
      if (result === 'lose') {
        animations.push({
          id: nextId(), kind: 'lose', amount: bet.amount, betAmount: bet.amount,
          position: getScreenCenter(bet.areaId),
        });
      } else if (result === 'win') {
        const winnings = calculateWinnings(bet.areaId, bet.amount, total);
        const staysUp = staysUpAfterWin(bet.areaId, keepUp, outcome.point);
        profit += winnings;
        returnedToBank += staysUp ? winnings : bet.amount + winnings;
        animations.push({
          id: nextId(), kind: 'win', amount: winnings, betAmount: bet.amount,
          position: getScreenCenter(bet.areaId),
          totalAmount: staysUp ? undefined : roundToCents(bet.amount + winnings),
        });
        if (staysUp) nextBets.push(bet);
        else paidBets.push(bet);
      } else {
        nextBets.push(bet);
      }
    }

    // Come / don't-come bets travel to their number.
    for (const movement of movements) {
      const moving = nextBets.find(bet => bet.areaId === movement.fromId);
      if (!moving) continue;
      nextBets = nextBets.filter(bet => bet !== moving);
      const existing = nextBets.find(bet => bet.areaId === movement.toId);
      nextBets = existing
        ? nextBets.map(bet => (bet === existing ? { ...bet, amount: bet.amount + moving.amount } : bet))
        : [...nextBets, { areaId: movement.toId, amount: moving.amount }];

      // If the number already had a bet (which just got paid), wait for its payout to clear.
      const targetWasOccupied = currentBets.some(bet => bet.areaId === movement.toId);
      animations.push({
        id: nextId(), kind: 'move', amount: moving.amount, betAmount: moving.amount,
        position: getScreenCenter(movement.fromId),
        toPosition: getScreenCenter(movement.toId, false),
        delay: targetWasOccupied ? PAYOUT_LEAVES_S : 0,
        hideBetId: movement.toId,
      });
    }

    const rollId = ++rollCount.current;
    setDice(roll);
    setPoint(outcome.point);
    setBets(nextBets);
    setBetHistory([]);
    if (returnedToBank > 0) setBank(current => roundToCents(current + returnedToBank));
    setLastProfit({ rollId, amount: roundToCents(profit) });
    setRollHistory(prev => [
      {
        id: rollId,
        ...roll,
        total,
        type: outcome.type === 'point-made' ? 'point-made' as const
          : outcome.type === 'seven-out' ? 'seven-out' as const
          : 'normal' as const,
      },
      ...prev,
    ].slice(0, MAX_ROLL_HISTORY));

    setWinningAreas(results);
    later(() => setWinningAreas(current => (current === results ? [] : current)), WIN_HIGHLIGHT_MS);

    // Keep paid bets drawn on the table until the payout chip reaches them.
    if (paidBets.length > 0) {
      setGhostBets(prev => [...prev.filter(ghost => !paidBets.some(bet => bet.areaId === ghost.areaId)), ...paidBets]);
      later(() => setGhostBets(prev => prev.filter(ghost => !paidBets.includes(ghost))), PAYOUT_ARRIVAL_MS);
    }
    if (animations.length > 0) {
      setChipAnimations(prev => [...prev, ...animations]);
      // Safety net: drop the overlays even if an animation never reports completion
      // (animations pause while the tab is hidden), so hidden chips always reappear.
      const ids = new Set(animations.map(animation => animation.id));
      const longestSeconds = Math.max(
        ...animations.map(animation => (animation.delay ?? 0) + CHIP_ANIMATION_SECONDS[animation.kind])
      );
      later(
        () => setChipAnimations(prev => prev.filter(animation => !ids.has(animation.id))),
        longestSeconds * 1000 + 1000
      );
    }
  }, [later]);

  const handleRoll = useCallback((forcedRoll?: DicePair) => {
    if (isRollingRef.current) return;
    const roll = forcedRoll ?? randomRoll();

    if (quickRoll) {
      completeRoll(roll);
      return;
    }

    isRollingRef.current = true;
    setIsRolling(true);
    rollInterval.current = setInterval(() => setAnimationDice(randomRoll()), 100);
    later(() => {
      if (rollInterval.current) clearInterval(rollInterval.current);
      rollInterval.current = null;
      isRollingRef.current = false;
      setIsRolling(false);
      completeRoll(roll);
    }, ROLL_ANIMATION_MS);
  }, [quickRoll, completeRoll, later]);

  // ---- Betting ------------------------------------------------------------

  const placeBet = (areaId: string) => {
    if (isRollingRef.current) return;
    if (deleteMode) {
      showNotice('Delete mode: click a chip to take it down');
      return;
    }
    const restriction = bettingRestriction(areaId, point);
    if (restriction) {
      showNotice(restriction);
      return;
    }
    if (selectedChipValue === null) {
      showNotice('Pick a chip first');
      return;
    }
    if (selectedChipValue > bank) {
      showNotice(`Not enough in the bank for a $${selectedChipValue} chip`);
      return;
    }

    const betId = toBetId(areaId);
    const chipValue = selectedChipValue;
    setBetHistory(prev => [...prev, bets]);
    setBank(current => roundToCents(current - chipValue));
    setBets(prev => (prev.some(bet => bet.areaId === betId)
      ? prev.map(bet => (bet.areaId === betId ? { ...bet, amount: bet.amount + chipValue } : bet))
      : [...prev, { areaId: betId, amount: chipValue }]));
  };

  const handleChipClick = (betId: string) => {
    if (isRollingRef.current) return;
    if (!deleteMode) {
      placeBet(toAreaId(betId));
      return;
    }
    if (isLockedBet(betId, point)) {
      showNotice('This bet is locked until it wins or loses');
      return;
    }
    const bet = bets.find(b => b.areaId === betId);
    if (!bet) return;
    setBetHistory(prev => [...prev, bets]);
    setBank(current => roundToCents(current + bet.amount));
    setBets(prev => prev.filter(b => b.areaId !== betId));
  };

  const handleUndo = () => {
    if (isRollingRef.current || betHistory.length === 0) return;
    const previous = betHistory[betHistory.length - 1];
    const refund = totalOf(bets) - totalOf(previous);
    setBank(current => roundToCents(current + refund));
    setBets(previous);
    setBetHistory(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isRollingRef.current) return;
    const removable = bets.filter(bet => !isLockedBet(bet.areaId, point));
    if (removable.length === 0) return;
    setBetHistory(prev => [...prev, bets]);
    setBank(current => roundToCents(current + totalOf(removable)));
    setBets(bets.filter(bet => isLockedBet(bet.areaId, point)));
  };

  const selectChip = (value: number) => {
    if (value > bank) return;
    setSelectedChipValue(value);
  };

  const isBroke = bank < CHIPS[0].value && bets.length === 0 && !isRolling;

  // ---- Keyboard shortcuts -------------------------------------------------
  const keyHandler = useRef<(e: KeyboardEvent) => void>();
  keyHandler.current = (e: KeyboardEvent) => {
    if (isTooSmall || isSettingsOpen || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key !== 'z') return;

    if (e.code === 'Space') {
      e.preventDefault();
      handleRoll();
    } else if (key === 'u' || key === 'z') {
      e.preventDefault();
      handleUndo();
    } else if (/^[1-5]$/.test(key)) {
      selectChip(CHIPS[Number(key) - 1].value);
    } else if (key === 'escape') {
      setDeleteMode(false);
      setHelpMode(false);
    }
  };
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keyHandler.current?.(e);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ---- Render -------------------------------------------------------------

  if (isTooSmall) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Screen Too Small</h1>
          <p className="text-gray-300">
            RollSim needs a screen at least 768×600 — craps is hard to play on a tiny table.
            Try a bigger window, or turn your device sideways.
          </p>
        </div>
      </div>
    );
  }

  const removeAnimation = (id: number) =>
    setChipAnimations(prev => prev.filter(animation => animation.id !== id));

  // In delete mode, clicking anywhere that isn't a chip exits delete mode.
  const handleGlobalClick = (e: React.MouseEvent) => {
    if (deleteMode && !(e.target as HTMLElement).closest('.chip-container')) {
      setDeleteMode(false);
    }
  };

  return (
    <div
      className="relative h-screen w-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden"
      onClick={handleGlobalClick}
    >
      <div className="flex-1 flex gap-4 p-2 max-h-screen relative">
        <div className="flex flex-row gap-4 h-full max-w-[1800px] mx-auto">
          {/* Left side: the table */}
          <div className="flex-[3.8] relative">
            <div className="h-full bg-felt-green rounded-xl p-3 pt-14 pb-12 shadow-table min-h-0 relative">
              <div className="w-full h-full flex items-center justify-center min-w-0 min-h-0 overflow-hidden relative z-10">
                {/* Fixed 2:1 board, constrained by the viewport height */}
                <div
                  ref={boardRef}
                  className="w-full aspect-[2/1] relative min-w-0 min-h-0 max-w-full max-h-[calc(100vh-280px)]"
                  style={{ maxWidth: 'calc((100vh - 280px) * 2)' }}
                >
                  <PointMarker point={point} boardRef={boardRef} />
                  <CrapsTable
                    boardRef={boardRef}
                    bets={bets}
                    ghostBets={ghostBets}
                    hiddenBetIds={hiddenBetIds}
                    point={point}
                    winningAreas={winningAreas}
                    isRolling={isRolling}
                    helpMode={helpMode}
                    onToggleHelp={() => setHelpMode(mode => !mode)}
                    deleteMode={deleteMode}
                    onAreaClick={placeBet}
                    onChipClick={handleChipClick}
                    onForcedRoll={handleRoll}
                  />

                  {/* Roll button on the table */}
                  <button
                    type="button"
                    onClick={() => handleRoll()}
                    disabled={isRolling}
                    title="Roll the dice (Space)"
                    className={`absolute right-[5.74%] top-[24%]
                               bg-[#1a472a] hover:bg-[#143621] text-white font-bold rounded
                               ${isRolling ? 'opacity-50 cursor-not-allowed' : ''}
                               shadow-lg z-20`}
                    style={{
                      width: 'clamp(40px, 10.09%, 120px)',
                      height: 'clamp(20px, 5.78%, 60px)',
                      fontSize: 'clamp(0.5rem, 1.5vw, 1rem)',
                    }}
                  >
                    Roll Dice
                  </button>

                  {/* Dice */}
                  <div
                    className="absolute top-[10%] right-[5%] flex gap-4 z-10"
                    aria-live="polite"
                    aria-label={isRolling ? 'Rolling…' : `Rolled ${dice.die1 + dice.die2}`}
                  >
                    <Dice value={isRolling ? animationDice.die1 : dice.die1} isRolling={isRolling} size="large" />
                    <Dice value={isRolling ? animationDice.die2 : dice.die2} isRolling={isRolling} size="large" />
                  </div>

                  <ProfitDisplay
                    key={lastProfit.rollId}
                    amount={lastProfit.amount}
                    onComplete={() => setLastProfit(current => ({ ...current, amount: 0 }))}
                  />

                  {/* Notices (why a bet wasn't placed, etc.) */}
                  {notice && (
                    <div
                      key={notice.id}
                      role="status"
                      className="absolute bottom-14 left-[40%] -translate-x-1/2 z-[950] pointer-events-none
                                 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-semibold
                                 whitespace-nowrap shadow-lg border border-white/20"
                    >
                      {notice.message}
                    </div>
                  )}
                </div>
              </div>

              <label className="absolute bottom-[20%] left-[2%]
                                flex items-center gap-2 text-white cursor-pointer text-base
                                bg-black/40 px-3 py-1.5 rounded backdrop-blur-sm z-30 select-none"
                     title="When a bet wins, leave it on the table and only collect the winnings">
                <input
                  type="checkbox"
                  checked={keepWinningBets}
                  onChange={(e) => setKeepWinningBets(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span>Keep Winning Bets Up</span>
              </label>
            </div>

            {/* Betting controls: fixed bar along the bottom of the screen */}
            <div className="fixed bottom-0 left-0 right-0 mb-2 mt-4 z-50 px-2">
              <div
                className="flex gap-2 items-stretch bg-gray-800/90 backdrop-blur-sm rounded-lg px-2
                           mx-auto min-w-[600px] max-w-[1500px] w-[98vw]"
                style={{ height: 'clamp(60px, 15vh, 100px)' }}
              >
                <BettingControls
                  onChipSelect={selectChip}
                  selectedChipValue={selectedChipValue}
                  onUndo={handleUndo}
                  onClear={handleClear}
                  onToggleDelete={() => setDeleteMode(mode => !mode)}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  deleteMode={deleteMode}
                  disabled={isRolling}
                  canUndo={betHistory.length > 0}
                  bank={bank}
                  onRoll={() => handleRoll()}
                  isRolling={isRolling}
                  quickRoll={quickRoll}
                  onQuickRollChange={setQuickRoll}
                  bankDisplay={
                    <div className="flex flex-col justify-center w-[150px]">
                      <span className="text-xl text-green-400 font-bold whitespace-nowrap">
                        Bank: <AnimatedBalance value={bank} animate={lastProfit.amount > 0} />
                      </span>
                      {isBroke ? (
                        <button
                          type="button"
                          onClick={() => setBank(STARTING_BANK)}
                          className="mt-1 self-start rounded bg-yellow-500 hover:bg-yellow-400 text-black
                                     font-bold text-xs px-2 py-1 whitespace-nowrap"
                        >
                          Out of chips — Rebuy {formatMoney(STARTING_BANK)}
                        </button>
                      ) : (
                        <span className="text-xl text-yellow-400 font-bold whitespace-nowrap">
                          Wager: {formatMoney(totalWager)}
                        </span>
                      )}
                    </div>
                  }
                />
              </div>
            </div>
          </div>

          {/* Right side: roll history */}
          <div className="bg-gray-800/75 rounded-lg p-1 shadow-lg backdrop-blur-sm h-full overflow-hidden">
            <h2 className="text-white font-bold text-xs mb-1 text-center">Roll History</h2>
            <ol className="flex flex-col items-center gap-1 h-[calc(100%-1.5rem)]">
              {rollHistory.slice(0, VISIBLE_ROLL_HISTORY).map((roll, index) => (
                <li
                  key={roll.id}
                  title={`Rolled ${roll.total}${roll.type === 'point-made' ? ' — point made' : roll.type === 'seven-out' ? ' — seven out' : ''}`}
                  className={`flex justify-center items-center gap-1 p-0.5 rounded-md
                             ${index === 0 ? 'animate-slideIn' : ''}
                             ${roll.type === 'seven-out' ? 'bg-red-600/20 ring-1 ring-red-600' : ''}
                             ${roll.type === 'point-made' ? 'bg-yellow-500/20 ring-1 ring-yellow-500' : ''}`}
                >
                  <Dice value={roll.die1} isRolling={false} size="small" />
                  <Dice value={roll.die2} isRolling={false} size="small" />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Chip animations (screen-space overlays) */}
      {chipAnimations.map(({ id, hideBetId, ...animation }) => (
        <AnimatedChipStack key={id} {...animation} onAnimationComplete={() => removeAnimation(id)} />
      ))}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        bank={bank}
        startingBank={STARTING_BANK}
        onSetBank={setBank}
      />
    </div>
  );
};

export default App;
