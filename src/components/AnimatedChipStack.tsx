import React from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue } from 'framer-motion';

interface AnimatedChipStackProps {
  amount: number;
  color: string;
  position: { x: number; y: number };
  toPosition?: { x: number; y: number };
  isWinning?: boolean;
  isMoving?: boolean;
  isWaiting?: boolean;
  onAnimationComplete?: () => void;
  onWaitComplete?: () => void;
  totalAmount?: number;
  showTotalAtBet?: boolean;
}

interface AnimationProgress {
  x: number;
  scale: number;
}

const AnimatedChipStack: React.FC<AnimatedChipStackProps> = ({
  amount,
  color,
  position,
  toPosition,
  isWinning,
  isMoving,
  isWaiting,
  onAnimationComplete,
  onWaitComplete,
  totalAmount,
  showTotalAtBet
}) => {

  const chipSize = '2.6rem';
  const controls = useAnimation();
  const x = useMotionValue(0);
  const scale = useMotionValue(1);

  const [animationStage, setAnimationStage] = React.useState<'start' | 'atBet' | 'toBank'>('start');
  
  React.useEffect(() => {
  }, [animationStage]);

  // Track animation progress
  React.useEffect(() => {
    const unsubscribeX = x.onChange(latest => {
      const currentScale = scale.get()

      if (Math.abs(latest - (position.x-30)) < 1 && currentScale > 1) {
        //console.log('Setting atBet stage');
        setAnimationStage('atBet');
      } else if (latest < 250) {  // Changed condition for bank stage
        //console.log('Setting toBank stage');
        setAnimationStage('toBank');
      }
    });

    return () => {
      unsubscribeX();
    };
  }, [x, scale, position.x, animationStage]);

  const displayAmount = React.useMemo(() => {
    if (!showTotalAtBet || !totalAmount) return amount;
    
    switch(animationStage) {
      case 'start':
        return amount;
      case 'atBet':
        return totalAmount;
      case 'toBank':
        return totalAmount;
      default:
        return amount;
    }
  }, [amount, totalAmount, animationStage, showTotalAtBet]);

  // Format amount based on animation type
  const formatAmount = (value: number) => {
    if (isWinning) {
      return value.toFixed(2);  // Only show decimals for winning chips
    }
    return Math.round(value).toLocaleString();  // Round to whole number for losing/moving chips
  };

  const variants = {
    initial: {
      x: isWinning ? window.innerWidth - 200 : position.x-30,
      y: isWinning ? 100 : position.y-30,
      opacity: 1,
      scale: 1
    },
    winning: {
      x: [
        window.innerWidth - 200,  // Start from dice
        position.x-30,            // Move to bet
        position.x-30,            // Stay at bet briefly
        300                       // Move to new bank location (left side)
      ],
      y: [
        100,                      // Start from dice
        position.y-30,            // Move to bet
        position.y-30,            // Stay at bet briefly
        window.innerHeight - 100  // Move to bottom of screen
      ],
      opacity: [1, 1, 1, 1, 0],
      scale: [1, 1.1, 1.1, 0.8],
      transition: { 
        duration: 2.5,
        times: [0, 0.3, 0.7, 0.8, 1],
        ease: "easeInOut"
      }
    },
    moving: {
      x: toPosition ? toPosition.x-30 : 0,
      y: toPosition ? toPosition.y-30 : 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: { duration: 0.5, ease: "easeInOut" }
    },
    losing: {
      x: position.x + 200,
      y: position.y - 200,
      opacity: 0,
      scale: 0.8,
      rotate: -45,
      transition: { duration: 1.2, ease: "easeInOut" }
    },
    waiting: {
      x: position.x-30,
      y: position.y-30,
      opacity: 1,
      scale: 1,
      transition: { 
        duration: 1.5,
        onComplete: () => onWaitComplete?.()
      }
    },
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed"
        initial="initial"
        animate={isWaiting ? "waiting" : (isMoving ? "moving" : (isWinning ? "winning" : "losing"))}
        variants={variants}
        style={{ 
          width: chipSize, 
          height: chipSize,
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          x,
          scale,
          position: 'fixed',
          pointerEvents: 'none',
          left: 0,
          top: 0,
        }}
        onAnimationComplete={onAnimationComplete}
      >
        <div className={`absolute ${color} rounded-full 
                      border-2 ${color === 'bg-gray-200' ? 'border-gray-600' : 'border-white'} shadow-lg
                      transition-all duration-150
                      ring-1 ${color === 'bg-gray-200' ? 'ring-gray-600/20' : 'ring-white/20'}`}
          style={{
            width: chipSize,
            height: chipSize,
          }}
        />
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 
                      bg-black/80 text-white px-1.5 py-0 rounded text-sm
                      whitespace-nowrap z-50 font-bold
                      border border-white/30 select-none">
          ${formatAmount(displayAmount)}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedChipStack; 