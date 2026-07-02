import React from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate as frameAnimate } from 'framer-motion';

interface ProfitDisplayProps {
  amount: number;
  onComplete?: () => void;
}

const ProfitDisplay: React.FC<ProfitDisplayProps> = ({ amount, onComplete }) => {
  const countingValue = useMotionValue(0);
  
  React.useEffect(() => {
    if (amount > 0) {
      // Reset to 0 before starting new animation
      countingValue.set(0);
      // Animate to final amount
      frameAnimate(countingValue, amount, {
        duration: 0.4,  // Faster than bank animation
        ease: "linear"
      });
    }
  }, [amount, countingValue]);

  const formattedValue = useTransform(countingValue, (latest) => {
    return `+$${latest.toFixed(2)}`;
  });

  return (
    <AnimatePresence>
      {amount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0, 1, 1, 1, 0],
            y: [10, -30],
            scale: [0.8, 1.2, 1.2, 1.2, 0.8],
          }}
          transition={{ 
            duration: 2,
            times: [0, 0.1, 0.8, 0.9, 1],
            ease: "easeOut"
          }}
          onAnimationComplete={onComplete}
          className="absolute bottom-16 left-[30%] transform -translate-x-1/2
                     text-5xl font-bold text-green-400 z-[1000]
                     bg-black/30 px-6 py-3 rounded-lg backdrop-blur-sm
                     shadow-lg border border-green-500/30
                     flex items-center gap-2"
        >
          <motion.span
            animate={{ 
              textShadow: [
                "0 0 8px rgb(34 197 94 / 0.5)",
                "0 0 16px rgb(34 197 94 / 0.8)",
                "0 0 8px rgb(34 197 94 / 0.5)"
              ]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              repeatType: "reverse" 
            }}
          >
            {formattedValue}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfitDisplay; 