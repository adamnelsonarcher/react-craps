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
      frameAnimate(motionValue, value, {
        duration: 0.8,
        ease: "linear"
      });
    } else {
      motionValue.set(value);
    }
  }, [value, animate, motionValue]);

  const dollars = useTransform(motionValue, (latest) => {
    const parts = latest.toFixed(2).split('.');
    return `$${parseInt(parts[0]).toLocaleString()}`;
  });

  const cents = useTransform(motionValue, (latest) => {
    const parts = latest.toFixed(2).split('.');
    return `.${parts[1]}`;
  });

  return (
    <motion.span className={className}>
      <motion.span>{dollars}</motion.span>
      <motion.span className="text-[0.7em] opacity-75">
        {cents}
      </motion.span>
    </motion.span>
  );
};

export default AnimatedBalance; 