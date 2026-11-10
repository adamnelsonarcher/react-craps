import React from 'react';
import { CHIPS, ChipDenomination } from '../utils/chips';

type ControlsLayout = 'bar' | 'panel';

interface ChipButtonProps {
  chip: ChipDenomination;
  shortcut: number;
  isSelected: boolean;
  disabled: boolean;
  layout: ControlsLayout;
  onClick: () => void;
}

const CHIP_BUTTON_SIZE: Record<ControlsLayout, string> = {
  bar: 'w-[clamp(2.5rem,4vw,5rem)] h-[clamp(2.5rem,4vw,5rem)]',
  panel: 'w-10 h-10',
};
const CHIP_BUTTON_TEXT: Record<ControlsLayout, string> = {
  bar: 'text-[clamp(0.8rem,1.5vw,1.2rem)]',
  panel: 'text-xs',
};

const ChipButton: React.FC<ChipButtonProps> = ({ chip, shortcut, isSelected, disabled, layout, onClick }) => (
  <button
    type="button"
    className={`relative group ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    onClick={onClick}
    disabled={disabled}
    aria-pressed={isSelected}
    aria-label={`$${chip.value} chip`}
    title={disabled ? `Not enough in the bank for a $${chip.value} chip` : `$${chip.value} chip (key ${shortcut})`}
  >
    <div className={`chip ${CHIP_BUTTON_SIZE[layout]} ${chip.color}
                  flex items-center justify-center
                  border-[0.15rem] ${isSelected ? 'border-gold' : chip.ringColor}
                  shadow-lg ${disabled ? 'hover:scale-100' : 'hover:scale-110 active:scale-95'}
                  transition-all duration-150
                  relative z-10 rounded-full
                  ${isSelected ? 'ring-2 ring-gold ring-opacity-50' : ''}`}>
      <div className="absolute inset-0 rounded-full border-dashed border-2 border-white/20 rotate-45" />
      <span className={`${CHIP_BUTTON_TEXT[layout]} font-bold drop-shadow-lg ${chip.textColor}`}>
        ${chip.value}
      </span>
    </div>

    <div className={`absolute -bottom-1 left-1 w-full h-full rounded-full ${chip.color} opacity-40 -z-10 blur-[1px]`} />
    <div className={`absolute -bottom-2 left-2 w-full h-full rounded-full ${chip.color} opacity-20 -z-20 blur-[2px]`} />
  </button>
);

interface BettingControlsProps {
  /** `bar`: one row along the bottom (desktop). `panel`: a narrow column (phones). */
  layout?: ControlsLayout;
  onChipSelect: (value: number) => void;
  selectedChipValue: number | null;
  onUndo: () => void;
  onClear: () => void;
  onToggleDelete: () => void;
  onOpenSettings: () => void;
  deleteMode: boolean;
  /** Disables bet editing (e.g. while the dice are rolling). */
  disabled: boolean;
  canUndo: boolean;
  bank: number;
  bankDisplay: React.ReactNode;
  onRoll: () => void;
  isRolling: boolean;
  quickRoll: boolean;
  onQuickRollChange: (value: boolean) => void;
  keepWinningBets: boolean;
  onKeepWinningBetsChange: (value: boolean) => void;
  /** Extra content for the bottom of the `panel` layout. */
  children?: React.ReactNode;
}

const actionButtonClass = `btn text-white rounded whitespace-nowrap
  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`;

/** Bank/wager display, chip rack, bet editing buttons, and the Roll button. */
const BettingControls: React.FC<BettingControlsProps> = ({
  layout = 'bar',
  onChipSelect,
  selectedChipValue,
  onUndo,
  onClear,
  onToggleDelete,
  onOpenSettings,
  deleteMode,
  disabled,
  canUndo,
  bank,
  bankDisplay,
  onRoll,
  isRolling,
  quickRoll,
  onQuickRollChange,
  keepWinningBets,
  onKeepWinningBetsChange,
  children,
}) => {
  const isPanel = layout === 'panel';
  const actionSize = isPanel ? 'text-xs px-1 py-1.5' : 'text-[clamp(0.75rem,1vw,1rem)] px-[clamp(0.5rem,1vw,1rem)] h-full';

  const settingsButton = (
    <button
      type="button"
      onClick={onOpenSettings}
      aria-label="Open settings"
      title="Settings"
      className={`inline-flex items-center justify-center shrink-0 rounded bg-gray-700/70 hover:bg-gray-600
                  text-white/90 leading-none ${isPanel ? 'w-7 h-7 text-sm' : 'w-9 h-9 text-lg'}`}
    >
      ⚙
    </button>
  );

  const chipRack = (
    <div
      className={isPanel ? 'grid grid-cols-3 gap-x-1 gap-y-2 justify-items-center' : 'flex gap-[clamp(0.25rem,0.75vw,1rem)]'}
      role="group"
      aria-label="Chips"
    >
      {CHIPS.map((chip, index) => (
        <ChipButton
          key={chip.value}
          chip={chip}
          shortcut={index + 1}
          layout={layout}
          isSelected={selectedChipValue === chip.value}
          onClick={() => onChipSelect(chip.value)}
          disabled={bank < chip.value}
        />
      ))}
    </div>
  );

  const editButtons = (
    <>
      <button
        type="button"
        className={`${actionButtonClass} ${actionSize} bg-gray-500 hover:bg-gray-600`}
        onClick={onUndo}
        disabled={disabled || !canUndo}
        title="Undo your last bet change (U)"
      >
        {isPanel ? 'Undo' : 'Undo Bet'}
      </button>
      <button
        type="button"
        onClick={onToggleDelete}
        disabled={disabled && !deleteMode}
        aria-pressed={deleteMode}
        title={deleteMode ? 'Stop deleting bets (Esc)' : 'Tap bets on the table to take them down'}
        className={`${actionButtonClass} ${actionSize}
                    ${deleteMode ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-500 hover:bg-gray-600'}`}
      >
        {deleteMode ? 'Done' : 'Delete'}
      </button>
      <button
        type="button"
        className={`${actionButtonClass} ${actionSize} bg-gray-500 hover:bg-gray-600`}
        onClick={onClear}
        disabled={disabled}
        title="Take down every bet that isn't locked"
      >
        {isPanel ? 'Clear' : 'Clear All'}
      </button>
    </>
  );

  const rollButton = (
    <button
      type="button"
      onClick={onRoll}
      disabled={isRolling}
      title="Roll the dice (Space)"
      className={`${actionButtonClass} bg-red-600 hover:bg-red-700 font-bold
                  ${isPanel ? 'w-full py-2.5 text-base'
                    : 'h-full px-[clamp(1rem,2.5vw,2.5rem)] text-[clamp(0.9rem,1.3vw,1.3rem)] shadow-lg'}`}
    >
      Roll Dice
    </button>
  );

  const toggle = (label: string, title: string, checked: boolean, onChange: (value: boolean) => void) => (
    <label
      className={`flex items-center gap-2 text-white cursor-pointer select-none
                  ${isPanel ? 'text-xs leading-tight' : 'text-[clamp(0.75rem,1vw,1rem)] whitespace-nowrap'}`}
      title={title}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded shrink-0"
      />
      {label}
    </label>
  );
  const quickRollToggle = toggle('Quick Roll', 'Skip the dice animation', quickRoll, onQuickRollChange);
  const keepWinningToggle = toggle(
    'Keep Winning Bets Up',
    'When a bet wins, leave it on the table and only collect the winnings',
    keepWinningBets,
    onKeepWinningBetsChange
  );

  if (isPanel) {
    return (
      <div className="flex flex-col gap-2 h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        {bankDisplay}
        {chipRack}
        {rollButton}
        <div className="grid grid-cols-3 gap-1">{editButtons}</div>
        <div className="flex items-center justify-between gap-1">
          {quickRollToggle}
          {settingsButton}
        </div>
        {keepWinningToggle}
        {children}
      </div>
    );
  }

  const divider = <div className="self-stretch my-[12%] w-px bg-gray-600/60 shrink-0" aria-hidden="true" />;

  // Bar: one row along the bottom of the screen, using the full width.
  return (
    <div className="flex items-center gap-[clamp(0.5rem,1.5vw,1.5rem)] h-full w-full min-w-0">
      <div className="flex items-center gap-2 shrink-0">
        {bankDisplay}
        {settingsButton}
      </div>
      {divider}
      {chipRack}
      {divider}
      <div className="flex gap-[clamp(0.25rem,0.5vw,0.5rem)] h-[55%]">{editButtons}</div>

      <div className="ml-auto flex items-center gap-[clamp(0.5rem,1.5vw,1.5rem)] h-[65%] shrink-0">
        <div className="flex flex-col gap-1.5">
          {quickRollToggle}
          {keepWinningToggle}
        </div>
        {rollButton}
      </div>
    </div>
  );
};

export default BettingControls;
