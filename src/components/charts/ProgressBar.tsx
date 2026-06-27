/**
 * ProgressBar Component - Visual progress indicator
 * Paket 3 - For sub-parameter values
 */

import React from 'react';
import { motion } from 'framer-motion';
import { getZoneColor } from '../../utils/colorZones';

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  min?: number;
  showValue?: boolean;
  showPercentage?: boolean;
  useZoneColors?: boolean;
  color?: string;
  height?: number;
  animated?: boolean;
  subtitle?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  value,
  max = 100,
  min = 0,
  showValue = true,
  showPercentage = false,
  useZoneColors = true,
  color,
  height = 8,
  animated = true,
  subtitle,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const displayValue = showPercentage ? `${percentage.toFixed(0)}%` : value.toFixed(1);
  const barColor = color || (useZoneColors ? getZoneColor(value) : 'var(--primary-500)');

  return (
    <div className="progress-bar-wrapper" style={{ marginBottom: '1rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <div>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            {label}
          </span>
          {subtitle && (
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-tertiary)',
                marginLeft: '0.5rem',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
        {showValue && (
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: barColor,
            }}
          >
            {displayValue}
          </span>
        )}
      </div>

      {/* Progress Bar Track */}
      <div
        style={{
          width: '100%',
          height: `${height}px`,
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '999px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Progress Fill */}
        {animated ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              height: '100%',
              backgroundColor: barColor,
              borderRadius: '999px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Shimmer effect */}
            <motion.div
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              }}
            />
          </motion.div>
        ) : (
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: barColor,
              borderRadius: '999px',
              transition: 'width 0.3s ease',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
