import React, { useMemo, useState } from 'react';
import boardLayout from '../assets/just_text.png';
import ChipStack from './ChipStack';
import DevTools from './DevTools';
import { BETTING_AREAS, BettingArea, toAreaId, toBetId } from '../game/tableLayout';
import { HELP_INTRO, getBetDescription } from '../game/betDescriptions';
import { bettingRestriction, isLockedBet, isOffOnComeOut } from '../game/rules';
import { Bet, DicePair, WinningArea } from '../types/game';

interface CrapsTableProps {
  /** The board element (used to position overlays). */
  boardRef: React.RefObject<HTMLDivElement>;
  bets: Bet[];
  /** Bets that were just paid and are shown until the payout animation reaches them. */
  ghostBets: Bet[];
  /** Bets whose chips are currently animating elsewhere (e.g. a come bet travelling). */
  hiddenBetIds: Set<string>;
  point: number | null;
  winningAreas: WinningArea[];
  isRolling: boolean;
  helpMode: boolean;
  onToggleHelp: () => void;
  deleteMode: boolean;
  /** A betting area was clicked (place a bet). */
  onAreaClick: (areaId: string) => void;
  /** A chip on the table was clicked (delete in delete mode, otherwise add to it). */
  onChipClick: (betId: string) => void;
  onForcedRoll: (dice: DicePair) => void;
}

/** Marker areas show chips but aren't betting areas you click or highlight. */
const isMarkerArea = (area: BettingArea) => area.style.pointerEvents === 'none';

/** The table artwork with clickable betting areas and the chips on them. */
const CrapsTable: React.FC<CrapsTableProps> = ({
  boardRef,
  bets,
  ghostBets,
  hiddenBetIds,
  point,
  winningAreas,
  isRolling,
  helpMode,
  onToggleHelp,
  deleteMode,
  onAreaClick,
  onChipClick,
  onForcedRoll,
}) => {
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [helpAreaId, setHelpAreaId] = useState<string | null>(null);
  const [devToolsActive, setDevToolsActive] = useState(false);

  const betById = useMemo(() => new Map(bets.map(bet => [bet.areaId, bet])), [bets]);
  const ghostById = useMemo(() => new Map(ghostBets.map(bet => [bet.areaId, bet])), [ghostBets]);
  const winningIds = useMemo(
    () => new Set(winningAreas.filter(area => area.type === 'win').map(area => area.id)),
    [winningAreas]
  );

  const hovered = BETTING_AREAS.find(area => area.id === hoveredArea);
  const hoveredRestriction = hovered ? bettingRestriction(hovered.id, point) : null;
  const helpText = helpMode ? (helpAreaId ? getBetDescription(helpAreaId) : HELP_INTRO) : null;

  const handleAreaClick = (areaId: string) => {
    if (devToolsActive) return;
    if (helpMode) {
      setHelpAreaId(areaId);
      return;
    }
    onAreaClick(areaId);
  };

  const handleChipClick = (betId: string) => {
    if (devToolsActive) return;
    if (helpMode) {
      setHelpAreaId(betId);
      return;
    }
    onChipClick(betId);
  };

  return (
    <div className={`relative w-full h-full ${helpMode ? 'cursor-help' : ''} ${deleteMode ? 'cursor-pointer' : ''}`}>
      <img
        src={boardLayout}
        alt="Craps table layout"
        className="w-full h-full min-w-0 min-h-0 object-contain max-w-full max-h-full select-none"
        draggable={false}
      />

      <DevTools
        boardRef={boardRef}
        active={devToolsActive}
        onToggle={() => setDevToolsActive(active => !active)}
        onForcedRoll={onForcedRoll}
      />

      {/* Help button */}
      <button
        type="button"
        className={`absolute bottom-2 left-2 z-50 px-4 h-8 rounded-full
                    flex items-center justify-center gap-2
                    ${helpMode ? 'bg-blue-500' : 'bg-gray-600'}
                    text-white font-bold text-lg
                    hover:bg-opacity-90 transition-colors
                    ring-2 ring-white/50 shadow-lg`}
        onClick={() => {
          onToggleHelp();
          setHelpAreaId(null);
        }}
        aria-pressed={helpMode}
        aria-label={helpMode ? 'Exit help mode' : 'Help: explain the bets'}
        title={helpMode ? 'Exit help mode (Esc)' : 'Help: click a bet to see how it works'}
      >
        ? {helpMode && <span className="text-sm font-normal">Help</span>}
      </button>

      {/* Help text popup */}
      {helpText && (
        <div
          className="absolute bottom-12 left-2 z-[200] w-max max-w-[min(32rem,60%)]
                     bg-black/90 text-white p-4 rounded-lg text-sm
                     shadow-lg backdrop-blur-sm
                     max-h-[85%] overflow-y-auto"
          role="note"
        >
          {helpText.split('\n').map((line, i) => (
            <div key={i} className={i === 0 ? 'font-bold text-lg mb-1' : 'min-h-[0.5rem]'}>
              {line.trim()}
            </div>
          ))}
        </div>
      )}

      {/* Betting areas layer */}
      <div className="absolute inset-0 min-w-0 min-h-0">
        {/* Hover indicator */}
        <div className="absolute bottom-0 left-[40%] -translate-x-1/2 flex justify-center z-[900] pointer-events-none">
          {hovered && !isMarkerArea(hovered) && (
            <div className="bg-black/70 text-white px-4 py-2 rounded-full text-center
                          font-bold text-lg transition-opacity duration-150">
              {hovered.name}
              {hoveredRestriction && !helpMode && (
                <div className="text-xs font-normal text-red-200">{hoveredRestriction}</div>
              )}
            </div>
          )}
        </div>

        <div className={`absolute inset-0 ${isRolling ? 'pointer-events-none' : ''}`} style={{ zIndex: 1 }}>
          {BETTING_AREAS.map((area) => {
            const bet = betById.get(area.id);
            const showBet = bet !== undefined && !hiddenBetIds.has(area.id);
            const ghost = showBet ? undefined : ghostById.get(area.id);
            const marker = isMarkerArea(area);
            const highlight = !marker && winningIds.has(toBetId(area.id));
            const isHovered = hoveredArea === area.id && !marker;
            const blocked = bettingRestriction(area.id, point) !== null;
            const tint = blocked && !helpMode ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
            const chipPosition = area.id.startsWith('place-') ? 'bottom-offset' : 'center';
            // Hovering a line bet's chip counts as hovering the line itself.
            const hoverId = marker ? toAreaId(area.id) : area.id;

            return (
              <div
                key={area.id}
                className={`absolute transition-all duration-200 focus:outline-none
                            ${marker ? '' : 'cursor-pointer focus-visible:bg-white/10'}
                            ${highlight ? 'animate-flash-win bg-[rgba(255,255,200,0.25)]' : ''}`}
                data-bet-id={area.id}
                role={marker ? undefined : 'button'}
                aria-label={marker ? undefined : area.name}
                tabIndex={marker ? undefined : 0}
                onKeyDown={(e) => {
                  if (!marker && e.key === 'Enter') {
                    e.preventDefault();
                    handleAreaClick(area.id);
                  }
                }}
                style={{
                  ...area.style,
                  backgroundColor: !highlight && isHovered ? tint : 'transparent',
                  border: `2px solid ${isHovered ? tint : 'transparent'}`,
                  pointerEvents: area.style.pointerEvents ?? 'auto',
                }}
                onMouseEnter={() => setHoveredArea(hoverId)}
                onMouseLeave={() => setHoveredArea(current => (current === hoverId ? null : current))}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAreaClick(area.id);
                }}
              >
                {showBet && (
                  <ChipStack
                    amount={bet.amount}
                    position={chipPosition}
                    isOff={point === null && isOffOnComeOut(area.id)}
                    isLocked={point !== null && (area.id === 'pass-line-chips' || area.id === 'dont-pass-chips')}
                    deletable={deleteMode && !isLockedBet(area.id, point)}
                    onClick={() => handleChipClick(area.id)}
                  />
                )}
                {ghost && <ChipStack amount={ghost.amount} position={chipPosition} ghost />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CrapsTable;
