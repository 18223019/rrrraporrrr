/**
 * MonthSelector Component - Dropdown for selecting report period
 */

import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MonthOption } from '../../services/api';
import './MonthSelector.css';

interface MonthSelectorProps {
  months: MonthOption[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  loading?: boolean;
  className?: string;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  months,
  selectedMonth,
  onMonthChange,
  loading = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const currentMonth = months.find(m => m.value === selectedMonth);

  const handleSelect = (monthValue: string, available: boolean) => {
    if (!available) return; // Don't select unavailable months

    onMonthChange(monthValue);
    setIsOpen(false);
  };

  return (
    <div className={`month-selector ${className}`}>
      {/* Trigger Button */}
      <button
        className="month-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        aria-label="Periode rapor"
        aria-expanded={isOpen}
      >
        <Calendar size={20} className="month-selector-icon" />
        <span className="month-selector-label">
          {loading ? 'Loading...' : currentMonth?.label || 'Pilih Periode'}
        </span>
        <ChevronDown
          size={20}
          className={`month-selector-chevron ${isOpen ? 'open' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="month-selector-backdrop"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              className="month-selector-menu"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="month-selector-header">
                Periode Rapor
              </div>

              <div className="month-selector-list">
                {months.filter((month) => month.available).map((month) => (
                  <button
                    key={month.value}
                    className={`month-selector-item ${month.value === selectedMonth ? 'selected' : ''
                      } ${!month.available ? 'disabled' : ''}`}
                    onClick={() => handleSelect(month.value, month.available)}
                    disabled={!month.available}
                    title={!month.available ? 'Data belum tersedia' : undefined}
                  >
                    <span className="month-selector-item-label">
                      {month.label}
                    </span>

                    {!month.available && (
                      <span className="month-selector-item-badge">
                        Tidak tersedia
                      </span>
                    )}

                    {month.value === selectedMonth && (
                      <span className="month-selector-item-check">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MonthSelector;
