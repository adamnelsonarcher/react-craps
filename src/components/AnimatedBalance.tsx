import React, { useEffect, useState } from 'react';
import { motion, animate as frameAnimate, useMotionValue, useTransform } from 'framer-motion';

export interface AnimatedBalanceProps {
  value: number;
  className?: string;
  animate?: boolean;
}

const AnimatedBalance: React.FC<AnimatedBalanceProps> = ({ value, className, animate = false }) => {
  const motionValue = useMotionValue(value);
  
  useEffect(() => {
    if (animate) {
      // Linear animation with fixed duration
      frameAnimate(motionValue, value, {
        duration: 0.8,  // Half second duration
        ease: "linear"  // Linear interpolation
      });
    } else {
      // Instant update
      motionValue.set(value);
    }
  }, [value, animate, motionValue]);

  const formattedValue = useTransform(motionValue, (latest) => {
    return `$${Math.floor(latest).toLocaleString()}`;
  });

  return (
    <motion.span className={className}>
      {formattedValue}
    </motion.span>
  );
};

export default AnimatedBalance; 