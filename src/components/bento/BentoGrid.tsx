/**
 * BentoGrid Component - Main Grid Container
 * With stagger animation support for children
 */

import React from 'react';
import { motion } from 'framer-motion';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
  staggerDelay?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: (staggerDelay: number) => ({
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: staggerDelay,
    },
  }),
};

export const BentoGrid: React.FC<BentoGridProps> = ({ 
  children, 
  className = '',
  stagger = true,
  staggerDelay = 0.08,
}) => {
  if (!stagger) {
    return (
      <div className={`bento-grid ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <motion.div 
      className={`bento-grid ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={staggerDelay}
    >
      {children}
    </motion.div>
  );
};

export default BentoGrid;
