import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

interface MonthSelectorProps {
  value: string;
  onChange: (month: string) => void;
  months?: string[];
  className?: string;
  label?: string;
}

const defaultMonths = [
  'Januari27',
  'Februari27',
  'Maret27',
  'April27',
  'Mei27',
  'Juni27',
  'Juli27',
  'Agustus26',
  'September26',
  'Oktober26',
  'November26',
  'Desember26',
];

const monthLabels: Record<string, string> = {
  Januari27: 'Januari 2027',
  Februari27: 'Februari 2027',
  Maret27: 'Maret 2027',
  April27: 'April 2027',
  Mei27: 'Mei 2027',
  Juni27: 'Juni 2027',
  Juli27: 'Juli 2027',
  Agustus26: 'Agustus 2026',
  September26: 'September 2026',
  Oktober26: 'Oktober 2026',
  November26: 'November 2026',
  Desember26: 'Desember 2026',
};

export default function MonthSelector({
  value,
  onChange,
  months = defaultMonths,
  className,
  label = 'Pilih Bulan',
}: MonthSelectorProps) {
  const prefersReducedMotion = useReducedMotion();

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: -10 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.3 },
      };

  return (
    <motion.div {...animationProps} className={clsx('inline-flex flex-col gap-2', className)}>
      {label && (
        <label
          htmlFor="month-selector"
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id="month-selector"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx(
            'block w-full px-4 py-2.5 pr-10',
            'text-sm font-medium text-gray-900',
            'bg-white border border-gray-300 rounded-lg',
            'shadow-sm',
            'hover:border-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'transition-colors duration-200',
            'cursor-pointer',
            'appearance-none'
          )}
          aria-label="Pilih bulan rapor"
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {monthLabels[month] || month}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Month selector tabs variant (alternative design)
 */
interface MonthTabsProps {
  value: string;
  onChange: (month: string) => void;
  months?: string[];
  className?: string;
}

export function MonthTabs({
  value,
  onChange,
  months = defaultMonths.slice(-3), // Last 3 months by default
  className,
}: MonthTabsProps) {
  return (
    <div
      className={clsx('inline-flex gap-1 p-1 bg-gray-100 rounded-lg', className)}
      role="tablist"
      aria-label="Pilih bulan"
    >
      {months.map((month) => {
        const isActive = value === month;
        return (
          <button
            key={month}
            onClick={() => onChange(month)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              isActive
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${month}`}
          >
            {monthLabels[month]?.split(' ')[0] || month}
          </button>
        );
      })}
    </div>
  );
}
