import React from 'react';

interface ChipStackProps {
  amount: number;
  color: string;
  count?: number;
  position?: 'center' | 'bottom' | 'custom';
  areaId?: string;
}

const CHIP_VALUES = [
  { value: 100, color: 'bg-gray-900' },  // Black
  { value: 50, color: 'bg-blue-600' },   // Blue
  { value: 25, color: 'bg-green-600' },  // Green
  { value: 10, color: 'bg-orange-500' }, // Orange
  { value: 5, color: 'bg-red-600' },     // Red
  { value: 1, color: 'bg-gray-200' }     // Light Gray (was white)
];

const ChipStack: React.FC<ChipStackProps> = ({ amount, position = 'center', areaId }) => {
  console.log('ChipStack rendered with:', { amount, position, areaId });
  
  const optimalChip = CHIP_VALUES.find(chip => amount >= chip.value) || CHIP_VALUES[CHIP_VALUES.length - 1];
  const chipCount = Math.min(5, Math.ceil(amount / optimalChip.value));
  const chips = Array(chipCount).fill(null);
  
  // Increased size for chips (15% larger)
  const chipSize = '2.3rem'; // Previous was 2rem (w-8 = 2rem)
  
  const positionStyle: React.CSSProperties = position === 'bottom' 
    ? { bottom: '0.25rem', left: '50%', transform: 'translateX(-50%)' }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  
  return (
    <div className="absolute" style={{ ...positionStyle, width: chipSize, height: chipSize }}>
      {/* Stack of chips */}
      {chips.map((_, index) => (
        <div
          key={index}
          className={`absolute ${optimalChip.color} rounded-full 
                     border-2 border-white shadow-lg
                     transition-all duration-150
                     ring-1 ring-white/20
                     ${optimalChip.color === 'bg-gray-200' ? 'text-black' : 'text-white'}`}
          style={{
            width: chipSize,
            height: chipSize,
            bottom: `${index * 2.3}px`, // Increased spacing between chips
            zIndex: index,
          }}
        />
      ))}
      
      {/* Amount display - adjusted for larger chips */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 
                    bg-black/80 text-white px-1.5 py-0 rounded text-sm
                    whitespace-nowrap z-50 font-bold
                    border border-white/30">
        ${amount}
      </div>
    </div>
  );
};

export default ChipStack; 