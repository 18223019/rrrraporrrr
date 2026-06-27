import { motion, useReducedMotion } from 'framer-motion';
import { type ReactNode, Suspense } from 'react';
import clsx from 'clsx';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  height?: number;
  className?: string;
  loading?: boolean;
}

export default function ChartCard({
  title,
  subtitle,
  children,
  actions,
  height = 300,
  className,
  loading = false,
}: ChartCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4 },
      };

  return (
    <motion.section
      {...animationProps}
      className={clsx(
        'bg-white rounded-xl shadow-sm border border-gray-100 p-6',
        'hover:shadow-md transition-shadow duration-200',
        className
      )}
      role="region"
      aria-label={title}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="ml-4 flex items-center gap-2">{actions}</div>
        )}
      </div>

      {/* Chart Container */}
      <div
        className="relative"
        style={{ height: `${height}px` }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div
                className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"
                role="status"
                aria-label="Memuat grafik"
              />
              <p className="text-sm text-gray-500">Memuat grafik...</p>
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
              </div>
            }
          >
            {children}
          </Suspense>
        )}
      </div>
    </motion.section>
  );
}

/**
 * Skeleton loader untuk chart
 */
export function ChartCardSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div
        className="bg-gray-50 rounded-lg"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
