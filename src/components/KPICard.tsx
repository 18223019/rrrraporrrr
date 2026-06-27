import { motion, useReducedMotion } from 'framer-motion';
import { type ReactNode } from 'react';
import clsx from 'clsx';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  className?: string;
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  red: 'bg-red-50 text-red-700 border-red-200',
};

export default function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
  className,
}: KPICardProps) {
  const prefersReducedMotion = useReducedMotion();

  const animationProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { scale: 1.02, y: -2 },
        transition: { duration: 0.2 },
      };

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      {...animationProps}
      className={clsx(
        'bg-white rounded-xl shadow-sm border border-gray-100 p-5',
        'hover:shadow-md transition-shadow duration-200',
        'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
        className
      )}
      role="article"
      aria-label={`${title}: ${value}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
            {trend && (
              <span
                className={clsx(
                  'text-sm font-semibold',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
                aria-label={`Trend: ${trend.isPositive ? 'naik' : 'turun'} ${Math.abs(trend.value)}%`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div
            className={clsx(
              'rounded-lg p-3 border',
              colorClasses[color]
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}
