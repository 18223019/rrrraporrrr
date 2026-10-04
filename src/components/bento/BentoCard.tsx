/**
 * BentoCard Component - Individual Card in Bento Grid
 * Supports various sizes and category colors
 */

import React from 'react';
import { motion } from 'framer-motion';

interface BentoCardProps {
  children: React.ReactNode;
  size?: 'large' | 'medium' | 'small' | 'wide' | 'tall' | 'profile' | 'kpi' | 'chart';
  category?: 'ketakmiran' | 'pembinaan' | 'aktualisasi' | 'internal' | 'osram';
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'gradient' | 'primary';
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
  onClick?: () => void;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  size = 'medium',
  category,
  title,
  subtitle,
  icon,
  footer,
  variant = 'default',
  loading = false,
  empty = false,
  emptyMessage = 'No data available',
  className = '',
  onClick,
}) => {
  const cardClasses = [
    'bento-card',
    `bento-card-${size}`,
    category && `bento-card-${category}`,
    variant !== 'default' && `bento-card-${variant}`,
    loading && 'loading',
    onClick && 'cursor-pointer',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.div
      className={cardClasses}
      onClick={onClick}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={
        onClick
          ? { scale: 1.02, y: -4, transition: { duration: 0.2 } }
          : { y: -2, transition: { duration: 0.2 } }
      }
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {(title || icon) && (
        <div className="bento-card-header">
          <div>
            {title && (
              <div className="bento-card-title">
                {icon && <span className="bento-card-icon">{icon}</span>}
                {title}
              </div>
            )}
            {subtitle && <div className="bento-card-subtitle">{subtitle}</div>}
          </div>
        </div>
      )}

      <div className="bento-card-body">
        {empty ? (
          <div className="bento-card-empty">
            <svg
              className="bento-card-empty-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="bento-card-empty-text">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {footer && <div className="bento-card-footer">{footer}</div>}
    </motion.div>
  );
};

export default BentoCard;
