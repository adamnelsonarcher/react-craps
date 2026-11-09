import React from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { chipForAmount, isLightChip } from '../utils/chips';
import { CHIP_LABEL_FONT_SIZE, CHIP_SIZE, formatChipAmount } from './ChipStack';

export type ChipAnimationKind = 'win' | 'lose' | 'move';

type Point = { x: number; y: number };

export interface AnimatedChipStackProps {
  kind: ChipAnimationKind;
  /** Amount shown on the chip (the winnings for `win`, the bet for `lose`/`move`). */
  amount: number;
  /** Original bet size; decides the chip colour. */
  betAmount: number;
  /** Screen position (px) of the bet the animation is about. */
  position: Point;
  /** Destination (px) for `move` animations. */
  toPosition?: Point;
  /** For `win`: where the payout comes from (the dice) and goes to (the bank), in px. */
  fromPosition?: Point;
  bankPosition?: Point;
  /** Seconds to wait before a `move` animation starts. */
  delay?: number;
  /** For `win`: amount shown once the payout reaches the bet (bet + winnings, if the bet comes down). */
  totalAmount?: number;
  onAnimationComplete?: () => void;
}

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
 *
 * The animated element is a zero-size anchor moved to exact screen points; the chip
 * is centred on it, so positions don't depend on the chip size.
 */
const AnimatedChipStack: React.FC<AnimatedChipStackProps> = ({
  kind,
  amount,
  betAmount,
  position,
  toPosition,
  fromPosition = { x: window.innerWidth - 200, y: 100 },
  bankPosition = { x: 300, y: window.innerHeight - 100 },
  delay = 0,
  totalAmount,
  onAnimationComplete,
}) => {
  const x = useMotionValue(kind === 'win' ? fromPosition.x : position.x);
  const [arrivedAtBet, setArrivedAtBet] = React.useState(false);

  // For winning chips, switch the label to the total once the payout reaches the bet.
  React.useEffect(() => {
    if (kind !== 'win' || totalAmount === undefined) return;
    return x.on('change', latest => {
      if (Math.abs(latest - position.x) < 1) setArrivedAtBet(true);
    });
  }, [kind, totalAmount, position.x, x]);

  const displayAmount = arrivedAtBet && totalAmount !== undefined ? totalAmount : amount;

  const chip = chipForAmount(betAmount);
  const light = isLightChip(chip);

  const variants = {
    initial: {
      x: kind === 'win' ? fromPosition.x : position.x,
      y: kind === 'win' ? fromPosition.y : position.y,
      opacity: 1,
      scale: 1,
    },
    win: {
      x: [fromPosition.x, position.x, position.x, bankPosition.x],
      y: [fromPosition.y, position.y, position.y, bankPosition.y],
      opacity: [1, 1, 1, 1, 0],
      scale: [1, 1.1, 1.1, 0.8],
      transition: { duration: CHIP_ANIMATION_SECONDS.win, times: [0, 0.3, 0.7, 0.8, 1], ease: 'easeInOut' },
    },
    move: {
      x: toPosition?.x ?? position.x,
      y: toPosition?.y ?? position.y,
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
      style={{ x, position: 'fixed', left: 0, top: 0, width: 0, height: 0, zIndex: 9999, pointerEvents: 'none' }}
      onAnimationComplete={onAnimationComplete}
      aria-hidden="true"
    >
      <div
        className="absolute"
        style={{
          width: CHIP_SIZE,
          height: CHIP_SIZE,
          left: `calc(${CHIP_SIZE} / -2)`,
          top: `calc(${CHIP_SIZE} / -2)`,
        }}
      >
        <div
          className={`absolute inset-0 ${chip.color} rounded-full border-2 shadow-lg ring-1
                      ${light ? 'border-gray-600 ring-gray-600/20' : 'border-white ring-white/20'}`}
        />
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2
                      bg-black/80 text-white px-1.5 py-0 rounded leading-tight
                      whitespace-nowrap z-50 font-bold
                      border border-white/30 select-none"
             style={{ fontSize: CHIP_LABEL_FONT_SIZE }}>
          ${kind === 'win' ? displayAmount.toFixed(2) : formatChipAmount(displayAmount)}
        </div>
      </div>
    </motion.div>
  );
};

export default AnimatedChipStack;
