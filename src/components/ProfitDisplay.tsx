import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfitDisplayProps {
  amount: number;
  onComplete?: () => void;
}

const ProfitDisplay: React.FC<ProfitDisplayProps> = ({ amount, onComplete }) => {
  return (
    <AnimatePresence>
      {amount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -50 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          onAnimationComplete={onComplete}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2
                     text-4xl font-bold text-green-400 z-50
                     bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm
                     shadow-lg"
        >
          +${amount.toFixed(2)}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfitDisplay; 