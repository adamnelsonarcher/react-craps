import React, { useState } from 'react';

interface ChipConfig {
  value: number;
  color: string;
  ringColor: string;
}

interface ChipProps extends ChipConfig {
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const Chip: React.FC<ChipProps> = ({ value, color, ringColor, isSelected, onClick, disabled }) => {
  return (
    <div 
      className={`relative group ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} 
      onClick={onClick}
    >
      <div className={`chip w-[clamp(2.5rem,4vw,5rem)] h-[clamp(2.5rem,4vw,5rem)] ${color} 
                    flex items-center justify-center
                    border-[0.15rem] ${isSelected ? 'border-gold' : ringColor}
                    shadow-lg ${!disabled && 'hover:scale-110 active:scale-95'}
                    transition-all duration-150
                    relative z-10 rounded-full
                    ${isSelected ? 'ring-2 ring-gold ring-opacity-50' : ''}`}>
        <div className="absolute inset-0 rounded-full
                    border-dashed border-2 border-white/20
                    rotate-45"></div>
        
        <div className="flex flex-col items-center">
          <span className={`text-[clamp(0.8rem,1.5vw,1.2rem)] font-bold drop-shadow-lg
                        ${color === 'bg-gray-200' ? 'text-black' : 'text-white'}`}>
            ${value}
          </span>
        </div>
      </div>
      
      <div className={`absolute -bottom-1 left-1 w-full h-full rounded-full ${color} 
                    opacity-40 -z-10 blur-[1px]`}></div>
      <div className={`absolute -bottom-2 left-2 w-full h-full rounded-full ${color} 
                    opacity-20 -z-20 blur-[2px]`}></div>
    </div>
  );
};

interface BettingControlsProps {
  onChipSelect: (value: number) => void;
  selectedChipValue: number | null;
  onUndo: () => void;
  onClear: () => void;
  onToggleDelete: () => void;
  deleteMode: boolean;
  bank: number;
  bankDisplay: React.ReactNode;
}

const BettingControls: React.FC<BettingControlsProps> = ({ 
  onChipSelect, 
  selectedChipValue,
  onUndo,
  onClear,
  onToggleDelete,
  deleteMode,
  bank,
  bankDisplay,
}) => {
  const chipConfigs: ChipConfig[] = [
    { value: 1, color: 'bg-gray-200', ringColor: 'border-gray-500' },
    { value: 5, color: 'bg-red-600', ringColor: 'border-red-300' },
    { value: 25, color: 'bg-green-600', ringColor: 'border-green-300' },
    { value: 50, color: 'bg-blue-600', ringColor: 'border-blue-300' },
    { value: 100, color: 'bg-gray-900', ringColor: 'border-gray-400' },
  ];

  return (
    <div className="bg-gray-800/50 rounded-lg p-2 flex flex-col gap-2 backdrop-blur-sm min-h-0">
      <div className="flex gap-[clamp(0.5rem,1vw,1rem)] items-start">
        <div className="min-w-[clamp(150px,15vw,200px)]">
          {bankDisplay}
        </div>

        <div className="flex gap-[clamp(0.25rem,0.75vw,1rem)]">
          {chipConfigs.map((config) => {
            const isAffordable = bank >= config.value;
            return (
              <Chip 
                key={config.value} 
                {...config}
                isSelected={selectedChipValue === config.value}
                onClick={() => isAffordable && onChipSelect(config.value)}
                disabled={!isAffordable}
              />
            );
          })}
        </div>

        <div className="h-full w-px bg-gray-600/50" />

        <div className="flex gap-[clamp(0.25rem,0.5vw,0.5rem)] h-full py-2">
          <button
            className="btn bg-gray-500 text-white hover:bg-gray-600 
                    text-[clamp(0.7rem,1vw,1rem)] px-2 w-[clamp(4rem,8vw,8rem)] h-full rounded"
            onClick={onUndo}
          >
            Undo Bet
          </button>
          <div data-delete-controls className="flex gap-[clamp(0.25rem,0.5vw,0.5rem)]">
            <button
              onClick={() => onToggleDelete()}
              className={`btn text-white text-[clamp(0.7rem,1vw,1rem)] 
                          px-2 w-[clamp(4rem,8vw,8rem)] h-full rounded
                          ${deleteMode 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-gray-500 hover:bg-gray-600'}`}
            >
              {deleteMode ? 'Cancel' : 'Delete'}
            </button>
          </div>
          <button
            className="btn bg-gray-500 text-white hover:bg-gray-600 
                    text-[clamp(0.7rem,1vw,1rem)] px-2 w-[clamp(4rem,8vw,8rem)] h-full rounded"
            onClick={onClear}
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
};

export default BettingControls; 