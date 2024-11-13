import React from 'react';

interface ChipProps {
  value: number;
  color: string;
  ringColor: string;
}

const Chip: React.FC<ChipProps> = ({ value, color, ringColor }) => {
  return (
    <div className={`relative group cursor-pointer`}>
      {/* Main chip circle */}
      <div className={`chip w-20 h-20 ${color} 
                      flex items-center justify-center
                      border-4 ${ringColor}
                      shadow-lg hover:scale-110 active:scale-95
                      transition-all duration-150
                      relative z-10`}>
        {/* Dashed ring pattern */}
        <div className="absolute inset-0 rounded-full
                      border-dashed border-2 border-white/20
                      rotate-45"></div>
        
        {/* Value display */}
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-white drop-shadow-lg">
            ${value}
          </span>
        </div>
      </div>
      
      {/* Stacked chips effect */}
      <div className={`absolute -bottom-1 left-1 w-20 h-20 rounded-full ${color} 
                      opacity-40 -z-10 blur-[1px]`}></div>
      <div className={`absolute -bottom-2 left-2 w-20 h-20 rounded-full ${color} 
                      opacity-20 -z-20 blur-[2px]`}></div>
    </div>
  );
};

const BettingControls: React.FC = () => {
  const chips: ChipProps[] = [
    { value: 1, color: 'bg-chip-red', ringColor: 'border-red-300' },
    { value: 5, color: 'bg-chip-blue', ringColor: 'border-blue-300' },
    { value: 10, color: 'bg-chip-green', ringColor: 'border-green-300' },
    { value: 25, color: 'bg-chip-black', ringColor: 'border-gray-400' },
    { value: 100, color: 'bg-purple-700', ringColor: 'border-purple-300' },
  ];

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 flex flex-col gap-6 backdrop-blur-sm">
      <div className="grid grid-cols-3 gap-4 justify-items-center">
        {chips.map((chipProps) => (
          <Chip key={chipProps.value} {...chipProps} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn bg-green-600 text-white hover:bg-green-500 
                          focus:ring-green-500 text-lg py-4">
          Place Bet
        </button>
        <button className="btn bg-red-600 text-white hover:bg-red-500 
                          focus:ring-red-500 text-lg py-4">
          Clear
        </button>
      </div>
    </div>
  );
};

export default BettingControls; 