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
      <div className={`chip w-20 h-20 ${color} 
                    flex items-center justify-center
                    border-4 ${isSelected ? 'border-gold' : ringColor}
                    shadow-lg ${!disabled && 'hover:scale-110 active:scale-95'}
                    transition-all duration-150
                    relative z-10
                    ${isSelected ? 'ring-4 ring-gold ring-opacity-50' : ''}`}>
        <div className="absolute inset-0 rounded-full
                    border-dashed border-2 border-white/20
                    rotate-45"></div>
        
        <div className="flex flex-col items-center">
          <span className={`text-2xl font-bold drop-shadow-lg
                        ${color === 'bg-gray-200' ? 'text-black' : 'text-white'}`}>
            ${value}
          </span>
        </div>
      </div>
      
      <div className={`absolute -bottom-1 left-1 w-20 h-20 rounded-full ${color} 
                    opacity-40 -z-10 blur-[1px]`}></div>
      <div className={`absolute -bottom-2 left-2 w-20 h-20 rounded-full ${color} 
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
}

const BettingControls: React.FC<BettingControlsProps> = ({ 
  onChipSelect, 
  selectedChipValue,
  onUndo,
  onClear,
  onToggleDelete,
  deleteMode,
  bank,
}) => {
  const chipConfigs: ChipConfig[] = [
    { value: 1, color: 'bg-gray-200', ringColor: 'border-gray-300' },
    { value: 5, color: 'bg-red-600', ringColor: 'border-red-300' },
    { value: 10, color: 'bg-orange-500', ringColor: 'border-orange-300' },
    { value: 25, color: 'bg-green-600', ringColor: 'border-green-300' },
    { value: 50, color: 'bg-blue-600', ringColor: 'border-blue-300' },
    { value: 100, color: 'bg-gray-900', ringColor: 'border-gray-400' },
  ];

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 flex flex-col gap-6 backdrop-blur-sm">
      <div className="grid grid-cols-3 gap-4 justify-items-center">
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
      <div className="grid grid-cols-3 gap-3">
        <button
          className="btn bg-gray-500 text-white hover:bg-gray-600 
                      text-base py-3"
          onClick={onUndo}
        >
          Undo Bet
        </button>
        <button
          className="btn bg-gray-500 text-white hover:bg-gray-600 
                    text-base py-3"
          onClick={onClear}
        >
          Clear All
        </button>
        <button
          onClick={onToggleDelete}
          className={`btn ${deleteMode ? 'bg-red-600 hover:bg-red-800' : 'bg-gray-500 hover:bg-gray-600'} 
                     text-white text-base py-3`}
        >
          {deleteMode ? 'Cancel' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

export default BettingControls; 