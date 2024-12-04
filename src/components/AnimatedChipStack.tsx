import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedChipStackProps {
  amount: number;
  color: string;
  position: { x: number; y: number };
  isWinning: boolean;
  onAnimationComplete?: () => void;
}

const AnimatedChipStack: React.FC<AnimatedChipStackProps> = ({
  amount,
  color,
  position,
  isWinning,
  onAnimationComplete
}) => {
  const chipSize = '2.3rem';
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed"
        initial={{ 
          x: position.x-30,
          y: position.y-30,
          opacity: 1,
          scale: 1
        }}
        animate={{ 
          x: isWinning ? window.innerWidth - 200 : position.x + 200,
          y: isWinning ? 100 : position.y - 200,
          opacity: 0,
          scale: isWinning ? 1.2 : 0.8,
          rotate: isWinning ? 45 : -45
        }}
        exit={{ opacity: 0 }}
        transition={{ 
          duration: 1.2,
          ease: "easeInOut"
        }}
        onAnimationComplete={onAnimationComplete}
        style={{ 
          width: chipSize, 
          height: chipSize,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className={`absolute ${color} rounded-full 
                      border-2 border-white shadow-lg
                      transition-all duration-150
                      ring-1 ring-white/20`}
          style={{
            width: chipSize,
            height: chipSize,
          }}
        />
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 
                      bg-black/80 text-white px-1.5 py-0 rounded text-sm
                      whitespace-nowrap z-50 font-bold
                      border border-white/30">
          ${amount}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedChipStack; 