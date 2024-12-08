import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedChipStackProps {
  amount: number;
  color: string;
  position: { x: number; y: number };
  toPosition?: { x: number; y: number };
  isWinning?: boolean;
  isMoving?: boolean;
  onAnimationComplete?: () => void;
}

const AnimatedChipStack: React.FC<AnimatedChipStackProps> = ({
  amount,
  color,
  position,
  toPosition,
  isWinning,
  isMoving,
  onAnimationComplete
}) => {
  const chipSize = '2.3rem';

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
        position.x-30,            // Stay at bet
        200                       // Move to bank
      ],
      y: [
        100,                      // Start from dice
        position.y-30,            // Move to bet
        position.y-30,            // Stay at bet
        100                       // Move to bank
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
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed"
        initial="initial"
        animate={isMoving ? "moving" : (isWinning ? "winning" : "losing")}
        variants={variants}
        onAnimationComplete={onAnimationComplete}
        style={{ 
          width: chipSize, 
          height: chipSize,
          transform: 'translate(-50%, -50%)',
          zIndex: 900
        }}
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
          ${amount}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedChipStack; 