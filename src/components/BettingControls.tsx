import React from 'react';
import { CHIPS, ChipDenomination } from '../utils/chips';

interface ChipButtonProps {
  chip: ChipDenomination;
  shortcut: number;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}

const ChipButton: React.FC<ChipButtonProps> = ({ chip, shortcut, isSelected, disabled, onClick }) => (
  <button
    type="button"
    className={`relative group ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    onClick={onClick}
    disabled={disabled}
    aria-pressed={isSelected}
    aria-label={`$${chip.value} chip`}
    title={disabled ? `Not enough in the bank for a $${chip.value} chip` : `$${chip.value} chip (key ${shortcut})`}
  >
    <div className={`chip w-[clamp(2.5rem,4vw,5rem)] h-[clamp(2.5rem,4vw,5rem)] ${chip.color}
                  flex items-center justify-center
                  border-[0.15rem] ${isSelected ? 'border-gold' : chip.ringColor}
                  shadow-lg ${disabled ? 'hover:scale-100' : 'hover:scale-110 active:scale-95'}
                  transition-all duration-150
                  relative z-10 rounded-full
                  ${isSelected ? 'ring-2 ring-gold ring-opacity-50' : ''}`}>
      <div className="absolute inset-0 rounded-full border-dashed border-2 border-white/20 rotate-45" />
      <span className={`text-[clamp(0.8rem,1.5vw,1.2rem)] font-bold drop-shadow-lg ${chip.textColor}`}>
        ${chip.value}
      </span>
    </div>

    <div className={`absolute -bottom-1 left-1 w-full h-full rounded-full ${chip.color} opacity-40 -z-10 blur-[1px]`} />
    <div className={`absolute -bottom-2 left-2 w-full h-full rounded-full ${chip.color} opacity-20 -z-20 blur-[2px]`} />
  </button>
);

interface BettingControlsProps {
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
}

const actionButtonClass = `btn text-white text-[clamp(0.7rem,1vw,1rem)] px-3 h-full rounded whitespace-nowrap
  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`;

/** Bottom-left panel: bank/wager display, chip rack, and bet editing buttons. */
const BettingControls: React.FC<BettingControlsProps> = ({
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
}) => (
  <div className="bg-gray-800/50 rounded-lg p-2 flex flex-col gap-2 backdrop-blur-sm min-h-0">
    <div className="flex gap-[clamp(0.5rem,1vw,1rem)] items-start">
      <div className="min-w-[clamp(150px,15vw,200px)] flex flex-col gap-1">
        {bankDisplay}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
          className="self-start inline-flex items-center justify-center
                     w-7 h-7 rounded bg-gray-700/70 hover:bg-gray-600
                     text-white/90 text-sm leading-none"
        >
          ⚙
        </button>
      </div>

      <div className="flex gap-[clamp(0.25rem,0.75vw,1rem)]" role="group" aria-label="Chips">
        {CHIPS.map((chip, index) => {
          const isAffordable = bank >= chip.value;
          return (
            <ChipButton
              key={chip.value}
              chip={chip}
              shortcut={index + 1}
              isSelected={selectedChipValue === chip.value}
              onClick={() => onChipSelect(chip.value)}
              disabled={!isAffordable}
            />
          );
        })}
      </div>

      <div className="h-full w-px bg-gray-600/50" />

      <div className="flex flex-wrap gap-[clamp(0.25rem,0.5vw,0.5rem)] h-full py-2">
        <button
          type="button"
          className={`${actionButtonClass} bg-gray-500 hover:bg-gray-600`}
          onClick={onUndo}
          disabled={disabled || !canUndo}
          title="Undo your last bet change (U)"
        >
          Undo Bet
        </button>
        <button
          type="button"
          onClick={onToggleDelete}
          disabled={disabled && !deleteMode}
          aria-pressed={deleteMode}
          title={deleteMode ? 'Stop deleting bets (Esc)' : 'Click bets on the table to take them down'}
          className={`${actionButtonClass}
                      ${deleteMode ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-500 hover:bg-gray-600'}`}
        >
          {deleteMode ? 'Done' : 'Delete'}
        </button>
        <button
          type="button"
          className={`${actionButtonClass} bg-gray-500 hover:bg-gray-600`}
          onClick={onClear}
          disabled={disabled}
          title="Take down every bet that isn't locked"
        >
          Clear All
        </button>
      </div>

      <div className="flex gap-[clamp(0.25rem,0.75vw,1rem)] items-center h-full py-2">
        <button
          type="button"
          onClick={onRoll}
          disabled={isRolling}
          title="Roll the dice (Space)"
          className={`${actionButtonClass} bg-red-600 hover:bg-red-700 font-bold`}
        >
          Roll Dice
        </button>
        <label className="flex items-center gap-2 text-white cursor-pointer text-[clamp(0.7rem,1vw,1rem)] whitespace-nowrap"
               title="Skip the dice animation">
          <input
            type="checkbox"
            checked={quickRoll}
            onChange={(e) => onQuickRollChange(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          Quick Roll
        </label>
      </div>
    </div>
  </div>
);

export default BettingControls;
