import React from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { chipForAmount, isLightChip } from '../utils/chips';
import { CHIP_SIZE, formatChipAmount } from './ChipStack';

export type ChipAnimationKind = 'win' | 'lose' | 'move';

export interface AnimatedChipStackProps {
  kind: ChipAnimationKind;
  /** Amount shown on the chip (the winnings for `win`, the bet for `lose`/`move`). */
  amount: number;
  /** Original bet size; decides the chip colour. */
  betAmount: number;
  /** Screen position (px) of the bet the animation is about. */
  position: { x: number; y: number };
  /** Destination (px) for `move` animations. */
  toPosition?: { x: number; y: number };
  /** Seconds to wait before a `move` animation starts. */
  delay?: number;
  /** For `win`: amount shown once the payout reaches the bet (bet + winnings, if the bet comes down). */
  totalAmount?: number;
  onAnimationComplete?: () => void;
}

// Half the chip size in px, used to centre the chip on a point.
const HALF_CHIP = 30;

/** Animation lengths in seconds (a `move` also waits for its `delay` first). */
export const CHIP_ANIMATION_SECONDS: Record<ChipAnimationKind, number> = {
  win: 2.5,
  lose: 1.2,
  move: 0.5,
};

/**
 * Screen-space chip animation:
 * - `win`: payout flies from the dice to the bet, pauses, then flies to the bank.
 * - `lose`: the bet spins away and fades out.
 * - `move`: a come / don't-come bet slides to its number.
 */
const AnimatedChipStack: React.FC<AnimatedChipStackProps> = ({
  kind,
  amount,
  betAmount,
  position,
  toPosition,
  delay = 0,
  totalAmount,
  onAnimationComplete,
}) => {
  const x = useMotionValue(0);
  const [arrivedAtBet, setArrivedAtBet] = React.useState(false);

  // For winning chips, switch the label to the total once the payout reaches the bet.
  React.useEffect(() => {
    if (kind !== 'win' || totalAmount === undefined) return;
    const target = position.x - HALF_CHIP;
    return x.on('change', latest => {
      if (Math.abs(latest - target) < 1) setArrivedAtBet(true);
    });
  }, [kind, totalAmount, position.x, x]);

  const displayAmount = arrivedAtBet && totalAmount !== undefined ? totalAmount : amount;

  const chip = chipForAmount(betAmount);
  const light = isLightChip(chip);

  const variants = {
    initial: {
      x: kind === 'win' ? window.innerWidth - 200 : position.x - HALF_CHIP,
      y: kind === 'win' ? 100 : position.y - HALF_CHIP,
      opacity: 1,
      scale: 1,
    },
    win: {
      x: [window.innerWidth - 200, position.x - HALF_CHIP, position.x - HALF_CHIP, 300],
      y: [100, position.y - HALF_CHIP, position.y - HALF_CHIP, window.innerHeight - 100],
      opacity: [1, 1, 1, 1, 0],
      scale: [1, 1.1, 1.1, 0.8],
      transition: { duration: CHIP_ANIMATION_SECONDS.win, times: [0, 0.3, 0.7, 0.8, 1], ease: 'easeInOut' },
    },
    move: {
      x: (toPosition?.x ?? position.x) - HALF_CHIP,
      y: (toPosition?.y ?? position.y) - HALF_CHIP,
      opacity: 1,
      scale: 1,
      transition: { duration: CHIP_ANIMATION_SECONDS.move, ease: 'easeInOut', delay },
    },
    lose: {
      x: position.x + 100,
      y: position.y - 150,
      opacity: 0,
      scale: 0.8,
      rotate: -45,
      transition: { duration: CHIP_ANIMATION_SECONDS.lose, ease: 'easeInOut' },
    },
  };

  return (
    <motion.div
      initial="initial"
      animate={kind}
      variants={variants}
      style={{
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        zIndex: 9999,
        x,
        position: 'fixed',
        pointerEvents: 'none',
        left: 0,
        top: 0,
      }}
      onAnimationComplete={onAnimationComplete}
      aria-hidden="true"
    >
      <div
        className={`absolute ${chip.color} rounded-full border-2 shadow-lg ring-1
                    ${light ? 'border-gray-600 ring-gray-600/20' : 'border-white ring-white/20'}`}
        style={{ width: CHIP_SIZE, height: CHIP_SIZE }}
      />
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2
                    bg-black/80 text-white px-1.5 py-0 rounded text-sm
                    whitespace-nowrap z-50 font-bold
                    border border-white/30 select-none">
        ${kind === 'win' ? displayAmount.toFixed(2) : formatChipAmount(displayAmount)}
      </div>
    </motion.div>
  );
};

export default AnimatedChipStack;
