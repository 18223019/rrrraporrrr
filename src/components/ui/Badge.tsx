/**
 * Badge Component - Achievement and status badges
 * Paket 3 - Visual indicators for accomplishments
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Star, Award, CheckCircle, AlertCircle } from 'lucide-react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md' | 'lg';
type BadgeIcon = 'trophy' | 'trending' | 'star' | 'award' | 'check' | 'alert' | 'none';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: BadgeIcon;
  animated?: boolean;
  className?: string;
}

const getVariantStyles = (variant: BadgeVariant) => {
  switch (variant) {
    case 'success':
      return {
        background: 'var(--gauge-success)',
        color: '#fff',
      };
    case 'warning':
      return {
        background: 'var(--gauge-warning)',
        color: '#fff',
      };
    case 'danger':
      return {
        background: 'var(--gauge-danger)',
        color: '#fff',
      };
    case 'info':
      return {
        background: 'var(--primary-500)',
        color: '#fff',
      };
    case 'neutral':
    default:
      return {
        background: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
      };
  }
};

const getSizeStyles = (size: BadgeSize) => {
  switch (size) {
    case 'sm':
      return {
        padding: '0.25rem 0.5rem',
        fontSize: '0.75rem',
        iconSize: 12,
      };
    case 'lg':
      return {
        padding: '0.5rem 1rem',
        fontSize: '1rem',
        iconSize: 20,
      };
    case 'md':
    default:
      return {
        padding: '0.375rem 0.75rem',
        fontSize: '0.875rem',
        iconSize: 16,
      };
  }
};

const getIcon = (iconType: BadgeIcon, size: number) => {
  const iconProps = { size };
  switch (iconType) {
    case 'trophy':
      return <Trophy {...iconProps} />;
    case 'trending':
      return <TrendingUp {...iconProps} />;
    case 'star':
      return <Star {...iconProps} />;
    case 'award':
      return <Award {...iconProps} />;
    case 'check':
      return <CheckCircle {...iconProps} />;
    case 'alert':
      return <AlertCircle {...iconProps} />;
    default:
      return null;
  }
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  icon = 'none',
  animated = true,
  className = '',
}) => {
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  const iconElement = getIcon(icon, sizeStyles.iconSize);

  const badgeContent = (
    <div
      className={`badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: icon !== 'none' ? '0.375rem' : 0,
        ...variantStyles,
        padding: sizeStyles.padding,
        fontSize: sizeStyles.fontSize,
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        whiteSpace: 'nowrap',
        border: variant === 'neutral' ? '1px solid var(--border-light)' : 'none',
      }}
    >
      {iconElement}
      <span>{label}</span>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
        style={{ display: 'inline-block' }}
      >
        {badgeContent}
      </motion.div>
    );
  }

  return badgeContent;
};

// Preset badges for common scenarios
export const SuccessBadge: React.FC<{ label: string }> = ({ label }) => (
  <Badge label={label} variant="success" icon="check" />
);

export const WarningBadge: React.FC<{ label: string }> = ({ label }) => (
  <Badge label={label} variant="warning" icon="alert" />
);

export const AchievementBadge: React.FC<{ label: string }> = ({ label }) => (
  <Badge label={label} variant="success" icon="trophy" />
);

export const TrendBadge: React.FC<{ label: string; positive?: boolean }> = ({ label, positive = true }) => (
  <Badge label={label} variant={positive ? 'success' : 'danger'} icon="trending" />
);

export default Badge;
