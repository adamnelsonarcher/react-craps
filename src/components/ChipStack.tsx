import React from 'react';
import { chipForAmount, chipStackCount, isLightChip } from '../utils/chips';

export const CHIP_SIZE = '2.6rem';

interface ChipStackProps {
  amount: number;
  /** `bottom-offset` hangs the stack off the bottom edge of the area (place bets). */
  position?: 'center' | 'bottom-offset';
  /** Bet is on the table but not working this roll. */
  isOff?: boolean;
  /** Bet can't be taken down. */
  isLocked?: boolean;
  /** Delete mode is on and this bet can be removed. */
  deletable?: boolean;
  /** Purely visual copy of a bet that was just paid (no interaction). */
  ghost?: boolean;
  onClick?: () => void;
}

/** Formats a dollar amount, hiding cents when they're zero. */
export const formatChipAmount = (amount: number) =>
  Number.isInteger(amount) ? amount.toLocaleString() : amount.toFixed(2);

/** A stack of chips sitting on a betting area, with its dollar amount. */
const ChipStack: React.FC<ChipStackProps> = ({
  amount,
  position = 'center',
  isOff = false,
  isLocked = false,
  deletable = false,
  ghost = false,
  onClick,
}) => {
  const chip = chipForAmount(amount);
  const light = isLightChip(chip);
  const chipCount = chipStackCount(amount);

  const positionStyle: React.CSSProperties =
    position === 'bottom-offset'
      ? { bottom: '-0.5rem', left: '50%', transform: 'translateX(-50%)' }
      : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <div
      className={`absolute chip-container transition-opacity duration-150
        ${ghost ? 'pointer-events-none' : 'pointer-events-auto'}
        ${deletable ? 'hover:opacity-50 cursor-pointer' : ''}`}
      style={{ ...positionStyle, width: CHIP_SIZE, height: CHIP_SIZE }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {Array.from({ length: chipCount }, (_, index) => (
        <div
          key={index}
          className={`absolute ${chip.color} rounded-full border-2 shadow-lg
                     ${light ? 'border-gray-600 ring-gray-600/20' : 'border-white ring-white/20'} ring-1
                     ${isOff ? 'opacity-75' : ''}`}
          style={{ width: CHIP_SIZE, height: CHIP_SIZE, bottom: `${index * 2.3}px`, zIndex: index }}
        />
      ))}

      <div className="absolute top-1.5 left-1/2 -translate-x-1/2
                    bg-black/80 text-white px-1.5 py-0 rounded text-sm
                    whitespace-nowrap z-50 font-bold
                    border border-white/30 select-none">
        ${formatChipAmount(amount)}
      </div>

      {isOff && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2
                      bg-red-600 text-white px-1.5 py-0.5 rounded-sm text-xs
                      whitespace-nowrap z-50 font-bold
                      border border-white/30 select-none">
          OFF
        </div>
      )}

      {isLocked && !deletable && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2
                      bg-black/80 text-white px-2 py-0.5 rounded-full text-xs
                      font-bold whitespace-nowrap select-none z-50">
          LOCKED
        </div>
      )}

      {deletable && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2
                      bg-red-500/80 text-white px-2 py-0.5 rounded-full text-xs
                      font-bold whitespace-nowrap select-none z-50">
          CLICK TO DELETE
        </div>
      )}
    </div>
  );
};

export default ChipStack;
