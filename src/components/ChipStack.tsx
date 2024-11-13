import React from 'react';

interface ChipStackProps {
  amount: number;
  color: string;
  count?: number;
  position?: 'center' | 'bottom';
}

const CHIP_VALUES = [
  { value: 100, color: 'bg-gray-900' },  // Black
  { value: 50, color: 'bg-blue-600' },   // Blue
  { value: 25, color: 'bg-green-600' },  // Green
  { value: 10, color: 'bg-orange-500' }, // Orange
  { value: 5, color: 'bg-red-600' },     // Red
  { value: 1, color: 'bg-gray-200' }     // Light Gray (was white)
];

const ChipStack: React.FC<ChipStackProps> = ({ amount, position = 'center' }) => {
  const optimalChip = CHIP_VALUES.find(chip => amount >= chip.value) || CHIP_VALUES[CHIP_VALUES.length - 1];
  const chipCount = Math.min(5, Math.ceil(amount / optimalChip.value));
  const chips = Array(chipCount).fill(null);
  
  const positionClass = position === 'bottom' ? 'bottom-1' : 'top-1/2 -translate-y-1/2';
  
  return (
    <div className={`absolute ${positionClass} left-1/2 -translate-x-1/2 w-8 h-8`}>
      {/* Stack of chips */}
      {chips.map((_, index) => (
        <div
          key={index}
          className={`absolute ${optimalChip.color} w-8 h-8 rounded-full 
                     border-2 border-white shadow-lg
                     transition-all duration-150
                     ring-1 ring-white/20
                     ${optimalChip.color === 'bg-gray-200' ? 'text-black' : 'text-white'}`}
          style={{
            bottom: `${index * 2}px`,
            zIndex: index,
          }}
        />
      ))}
      
      {/* Amount display */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 
                    bg-black text-white px-2 py-0.5 rounded-full text-sm
                    whitespace-nowrap z-50 font-bold
                    border border-white/50 shadow-lg">
        ${amount}
      </div>
    </div>
  );
};

export default ChipStack; 