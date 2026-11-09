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
import { useElementWidth, useLayoutMode } from './hooks/useLayout';
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Screen-space centre of an element, or `undefined` if it isn't rendered. */
const centerOf = (element: Element | null | undefined) => {
  if (!element) return undefined;
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

/** Screen-space centre of a bet's chips (or of the area itself if it has none). */
const getScreenCenter = (areaId: string, preferChips = true) => {
  const area = document.querySelector(`[data-bet-id="${areaId}"]`);
  return centerOf((preferChips && area?.querySelector('.chip-container')) || area) ?? { x: 0, y: 0 };
};

const App: React.FC = () => {
  const layoutMode = useLayoutMode();
  const isCompact = layoutMode === 'compact';
  const boardRef = useRef<HTMLDivElement>(null);
  const diceRef = useRef<HTMLDivElement>(null);
  const bankRef = useRef<HTMLSpanElement>(null);

  // Chips and dice scale with the table so small (phone) tables stay readable.
  const boardWidth = useElementWidth(boardRef, layoutMode);
  const scaleVars = {
    '--chip-size': `${clamp(boardWidth * 0.04, 22, 41.6)}px`,
    '--die-size': `${clamp(boardWidth * 0.06, 28, 72)}px`,
  } as React.CSSProperties;

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
    // Payouts fly from the dice to the bet, then on to the bank display.
    const dicePosition = centerOf(diceRef.current);
    const bankPosition = centerOf(bankRef.current);

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
          fromPosition: dicePosition,
          bankPosition,
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
    if (layoutMode === 'rotate' || isSettingsOpen || e.altKey) return;
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

  if (layoutMode === 'rotate') {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8"
        style={{ height: '100dvh' }}
      >
        <div className="text-center max-w-xs">
          <div className="text-6xl mb-6 inline-block animate-rotate-hint" aria-hidden="true">📱</div>
          <h1 className="text-2xl font-bold mb-2">Turn your phone sideways</h1>
          <p className="text-gray-300">
            The craps table needs a landscape screen. Rotate your phone to start rolling.
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

  const board = (
    <div
      ref={boardRef}
      className={`w-full aspect-[2/1] relative min-w-0 min-h-0 max-w-full
                  ${isCompact ? 'max-h-full max-w-[calc((100vh-3.5rem)*2)]' : 'max-h-[calc(100vh-280px)]'}`}
      // Keep the 2:1 board inside the available height. `dvh` tracks mobile browser
      // toolbars; browsers without it ignore this and use the class above.
      style={{ maxWidth: isCompact ? 'calc((100dvh - 3.5rem) * 2)' : 'calc((100vh - 280px) * 2)' }}
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
        ref={diceRef}
        className="absolute top-[10%] right-[5%] flex gap-[clamp(0.5rem,1.5vw,1rem)] z-10"
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
          className={`absolute left-[40%] -translate-x-1/2 z-[950] pointer-events-none
                     bg-black/80 text-white px-4 py-2 rounded-full font-semibold
                     whitespace-nowrap shadow-lg border border-white/20
                     ${isCompact ? 'bottom-10 text-xs' : 'bottom-14 text-sm'}`}
        >
          {notice.message}
        </div>
      )}
    </div>
  );

  const bankDisplay = (
    <div className={`flex flex-col justify-center ${isCompact ? 'min-w-0' : 'w-[150px]'}`}>
      <span className={`${isCompact ? 'text-sm' : 'text-xl'} text-green-400 font-bold whitespace-nowrap`}>
        Bank:{' '}
        <span ref={bankRef}>
          <AnimatedBalance value={bank} animate={lastProfit.amount > 0} />
        </span>
      </span>
      {isBroke ? (
        <button
          type="button"
          onClick={() => setBank(STARTING_BANK)}
          className="mt-1 self-start rounded bg-yellow-500 hover:bg-yellow-400 text-black
                     font-bold text-xs px-2 py-1 whitespace-nowrap"
        >
          {isCompact ? 'Rebuy' : 'Out of chips — Rebuy'} {formatMoney(STARTING_BANK)}
        </button>
      ) : (
        <span className={`${isCompact ? 'text-sm' : 'text-xl'} text-yellow-400 font-bold whitespace-nowrap`}>
          Wager: {formatMoney(totalWager)}
        </span>
      )}
    </div>
  );

  const keepWinningToggle = (className: string) => (
    <label
      className={`flex items-center gap-2 text-white cursor-pointer select-none ${className}`}
      title="When a bet wins, leave it on the table and only collect the winnings"
    >
      <input
        type="checkbox"
        checked={keepWinningBets}
        onChange={(e) => setKeepWinningBets(e.target.checked)}
        className="w-4 h-4 rounded"
      />
      <span>Keep Winning Bets Up</span>
    </label>
  );

  const rollTitle = (roll: RollRecord) =>
    `Rolled ${roll.total}${roll.type === 'point-made' ? ' — point made' : roll.type === 'seven-out' ? ' — seven out' : ''}`;

  const controlsProps = {
    onChipSelect: selectChip,
    selectedChipValue,
    onUndo: handleUndo,
    onClear: handleClear,
    onToggleDelete: () => setDeleteMode(mode => !mode),
    onOpenSettings: () => setIsSettingsOpen(true),
    deleteMode,
    disabled: isRolling,
    canUndo: betHistory.length > 0,
    bank,
    bankDisplay,
    onRoll: () => handleRoll(),
    isRolling,
    quickRoll,
    onQuickRollChange: setQuickRoll,
  };

  const overlays = (
    <>
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
    </>
  );

  if (isCompact) {
    // Phones in landscape / short screens: table on the left, controls in a side panel.
    return (
      <div
        className="relative h-screen w-screen flex gap-2 bg-gradient-to-br from-gray-900 to-gray-800
                   overflow-hidden touch-manipulation select-none
                   py-2 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]"
        style={{ ...scaleVars, height: '100dvh' }}
        onClick={handleGlobalClick}
      >
        <main className="flex-1 min-w-0 h-full bg-felt-green rounded-xl px-2 pt-7 pb-2 shadow-table relative">
          <div className="w-full h-full flex items-center justify-center min-w-0 min-h-0 relative z-10">
            {board}
          </div>
        </main>

        <aside className="w-[9.5rem] shrink-0 h-full bg-gray-800/90 rounded-lg p-2" aria-label="Betting controls">
          <BettingControls layout="panel" {...controlsProps}>
            {keepWinningToggle('text-xs leading-tight')}
            {rollHistory.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Last rolls</div>
                <ol className="flex flex-wrap gap-1" aria-label="Recent rolls">
                  {rollHistory.slice(0, 5).map(roll => (
                    <li
                      key={roll.id}
                      title={rollTitle(roll)}
                      className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center
                                  ${roll.type === 'seven-out' ? 'bg-red-600 text-white'
                                    : roll.type === 'point-made' ? 'bg-yellow-500 text-black'
                                    : 'bg-gray-700 text-white'}`}
                    >
                      {roll.total}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </BettingControls>
        </aside>

        {overlays}
      </div>
    );
  }

  return (
    <div
      className="relative h-screen w-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden"
      style={scaleVars}
      onClick={handleGlobalClick}
    >
      <div className="flex-1 flex gap-4 p-2 max-h-screen relative">
        <div className="flex flex-row gap-4 h-full max-w-[1800px] mx-auto">
          {/* Left side: the table */}
          <div className="flex-[3.8] relative">
            <div className="h-full bg-felt-green rounded-xl p-3 pt-14 pb-12 shadow-table min-h-0 relative">
              <div className="w-full h-full flex items-center justify-center min-w-0 min-h-0 overflow-hidden relative z-10">
                {board}
              </div>

              {keepWinningToggle(`absolute bottom-[20%] left-[2%] text-base bg-black/40 px-3 py-1.5 rounded
                                  backdrop-blur-sm z-30`)}
            </div>

            {/* Betting controls: fixed bar along the bottom of the screen */}
            <div className="fixed bottom-0 left-0 right-0 mb-2 mt-4 z-50 px-2">
              <div
                className="flex gap-2 items-stretch bg-gray-800/90 backdrop-blur-sm rounded-lg px-2
                           mx-auto min-w-[600px] max-w-[1500px] w-[98vw]"
                style={{ height: 'clamp(60px, 15vh, 100px)' }}
              >
                <BettingControls layout="bar" {...controlsProps} />
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
                  title={rollTitle(roll)}
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

      {overlays}
    </div>
  );
};

export default App;
