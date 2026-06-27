/**
 * Tooltip Component - Hover tooltip with delay
 * Simple, accessible tooltip with positioning
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 500,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  };

  const getTooltipPosition = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 1000,
      whiteSpace: 'nowrap',
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          ...baseStyle,
          top: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          ...baseStyle,
          right: 'calc(100% + 8px)',
          top: '50%',
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          ...baseStyle,
          left: 'calc(100% + 8px)',
          top: '50%',
          transform: 'translateY(-50%)',
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      className={`tooltip-container ${className}`}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{
              ...getTooltipPosition(),
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              pointerEvents: 'none',
            }}
          >
            {content}
            {/* Arrow */}
            <div
              style={{
                position: 'absolute',
                width: 0,
                height: 0,
                borderStyle: 'solid',
                ...(position === 'top' && {
                  bottom: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderWidth: '4px 4px 0 4px',
                  borderColor: 'var(--text-primary) transparent transparent transparent',
                }),
                ...(position === 'bottom' && {
                  top: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderWidth: '0 4px 4px 4px',
                  borderColor: 'transparent transparent var(--text-primary) transparent',
                }),
                ...(position === 'left' && {
                  right: '-4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderWidth: '4px 0 4px 4px',
                  borderColor: 'transparent transparent transparent var(--text-primary)',
                }),
                ...(position === 'right' && {
                  left: '-4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderWidth: '4px 4px 4px 0',
                  borderColor: 'transparent var(--text-primary) transparent transparent',
                }),
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
