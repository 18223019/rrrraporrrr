/**
 * StatCard Component - Statistical display card
 * Paket 3 - For showing key metrics
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'var(--primary-500)',
  size = 'md',
  animated = true,
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: '1rem',
          labelSize: '0.75rem',
          valueSize: '1.5rem',
          iconSize: 20,
        };
      case 'lg':
        return {
          padding: '2rem',
          labelSize: '1rem',
          valueSize: '3rem',
          iconSize: 32,
        };
      case 'md':
      default:
        return {
          padding: '1.5rem',
          labelSize: '0.875rem',
          valueSize: '2rem',
          iconSize: 24,
        };
    }
  };

  const styles = getSizeStyles();

  const content = (
    <div
      style={{
        padding: styles.padding,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--bento-radius)',
        boxShadow: 'var(--bento-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {/* Header with Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: styles.labelSize,
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
        {Icon && (
          <div
            style={{
              padding: '0.5rem',
              backgroundColor: `${color}15`,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={styles.iconSize} style={{ color }} />
          </div>
        )}
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span
          style={{
            fontSize: styles.valueSize,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {trend && (
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: trend.isPositive ? 'var(--gauge-success)' : 'var(--gauge-danger)',
            }}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <span
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ y: -4, boxShadow: 'var(--bento-shadow-hover)' }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
};

export default StatCard;
