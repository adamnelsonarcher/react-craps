import React from 'react';

interface ChipStackProps {
  amount: number;
  color: string;
  count?: number;
}

const CHIP_VALUES = [
  { value: 100, color: 'bg-purple-700' },
  { value: 25, color: 'bg-chip-black' },
  { value: 10, color: 'bg-chip-green' },
  { value: 5, color: 'bg-chip-blue' },
  { value: 1, color: 'bg-chip-red' }
];

const ChipStack: React.FC<ChipStackProps> = ({ amount }) => {
  // Find the highest value chip that can be used
  const optimalChip = CHIP_VALUES.find(chip => amount >= chip.value) || CHIP_VALUES[CHIP_VALUES.length - 1];
  
  // Calculate how many chips to show (max 5)
  const chipCount = Math.min(5, Math.ceil(amount / optimalChip.value));
  const chips = Array(chipCount).fill(null);
  
  return (
    <div className="relative w-8 h-8">
      {/* Stack of chips */}
      {chips.map((_, index) => (
        <div
          key={index}
          className={`absolute ${optimalChip.color} w-8 h-8 rounded-full border-2 border-white/20
                     shadow-md transition-all duration-150`}
          style={{
            bottom: `${index * 2}px`,
            zIndex: index,
          }}
        />
      ))}
      
      {/* Amount display */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 
                    bg-black/80 text-white px-2 py-0.5 rounded-full text-sm
                    whitespace-nowrap z-50">
        ${amount}
      </div>
    </div>
  );
};

export default ChipStack; 