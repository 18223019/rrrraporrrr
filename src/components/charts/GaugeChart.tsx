/**
 * GaugeChart Component - Custom Gauge using Chart.js v4 Doughnut
 * Paket 3: Enhanced with dynamic color zones and target indicator
 * Paket 4: Enhanced with WCAG 2.1 AA accessibility
 */

import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { getZoneColor } from '../../utils/colorZones';
import { getAriaLabel } from '../../utils/accessibility';
import { usePrefersReducedMotion } from '../../hooks/useAccessibility';

// Register Chart.js core components
Chart.register(...registerables);

interface GaugeChartProps {
  value: number;
  max?: number;
  min?: number;
  label?: string;
  unit?: string;
  category?: 'ketakmiran' | 'pembinaan' | 'aktualisasi' | 'internal';
  size?: 'small' | 'medium' | 'large';
  showValue?: boolean;
  animated?: boolean;
  useZoneColors?: boolean; // Use dynamic zone colors instead of category color
  target?: number; // Target value to display
}

const getCategoryColor = (category?: string): string => {
  switch (category) {
    case 'ketakmiran':
      return '#3b82f6'; // Blue
    case 'pembinaan':
      return '#10b981'; // Green
    case 'aktualisasi':
      return '#8b5cf6'; // Purple
    case 'internal':
      return '#f59e0b'; // Orange
    default:
      return '#6b7280'; // Gray
  }
};

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  max = 100,
  min = 0,
  label = '',
  unit = '',
  category,
  size = 'medium',
  showValue = true,
  animated = true,
  useZoneColors = false,
  target,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  // Generate unique ID for each chart instance to avoid canvas conflicts
  const chartId = useRef(`gauge-${Math.random().toString(36).substr(2, 9)}`).current;
  // Force re-animation on every mount by tracking mount time
  const [mountKey, setMountKey] = useState(Date.now());

  const sizeConfig = {
    small: { width: 120, height: 100, fontSize: 14 },
    medium: { width: 180, height: 150, fontSize: 18 },
    large: { width: 240, height: 200, fontSize: 24 },
  };

  const { width, height, fontSize } = sizeConfig[size];

  // Accessibility: Respect reduced motion
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldAnimate = animated && !prefersReducedMotion;

  // Accessibility: ARIA labels (simple, no descriptive text)
  const ariaLabel = getAriaLabel(value, label);

  // Reset mount key on component mount to force animation
  useEffect(() => {
    setMountKey(Date.now());
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // CRITICAL: Destroy existing chart before creating new one
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    // Also clear any existing Chart.js instance attached to this canvas
    const existingChart = Chart.getChart(canvasRef.current);
    if (existingChart) {
      existingChart.destroy();
    }

    // Determine color: zone-based or category-based
    const mainColor = useZoneColors
      ? getZoneColor(value)
      : category
      ? getCategoryColor(category)
      : getZoneColor(value); // Default to zone colors if no category
    
    // Calculate percentage and remaining
    const percentage = ((value - min) / (max - min)) * 100;
    const remaining = 100 - percentage;

    // Helper function to convert hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    // Helper function to lighten color
    const lightenColor = (hex: string, percent: number) => {
      const rgb = hexToRgb(hex);
      const factor = 1 + percent;
      const r = Math.min(255, Math.round(rgb.r * factor));
      const g = Math.min(255, Math.round(rgb.g * factor));
      const b = Math.min(255, Math.round(rgb.b * factor));
      return `rgb(${r}, ${g}, ${b})`;
    };

    // Create gradient effect by splitting into segments
    // Each segment gets progressively lighter/darker
    const segments = 10; // Number of gradient segments
    const segmentSize = percentage / segments;
    const gradientData: number[] = [];
    const gradientColors: string[] = [];

    for (let i = 0; i < segments; i++) {
      const progress = i / segments;
      // Gradient from darker to lighter (or vice versa)
      const colorFactor = 0.3 + (progress * 0.7); // 0.3 to 1.0
      gradientData.push(segmentSize);
      gradientColors.push(lightenColor(mainColor, colorFactor - 1));
    }

    // Add remaining segment
    if (remaining > 0) {
      gradientData.push(remaining);
      gradientColors.push('rgba(200, 200, 200, 0.2)');
    }

    // Create gauge using Doughnut chart (half circle)
    const config = {
      type: 'doughnut' as const,
      data: {
        datasets: [
          {
            data: gradientData,
            backgroundColor: gradientColors,
            borderWidth: 0,
            circumference: 180, // Half circle
            rotation: 270, // Start from bottom
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%', // Thickness of the gauge ring
        animation: shouldAnimate
          ? {
              duration: 1200,
              easing: 'easeOutCubic' as const,
              animateRotate: true,
              animateScale: false,
            }
          : false,
        plugins: {
          tooltip: {
            enabled: false,
          },
          legend: {
            display: false,
          },
        },
        layout: {
          padding: 10,
        },
      },
    };

    // Create new chart with initial data at 0 for animation effect
    const initialData = gradientData.map(() => 0);
    const initialConfig = {
      ...config,
      data: {
        datasets: [{
          ...config.data.datasets[0],
          data: initialData,
        }]
      }
    };

    chartRef.current = new Chart(ctx, initialConfig);

    // Animate to actual values after a tiny delay
    if (shouldAnimate) {
      setTimeout(() => {
        if (chartRef.current) {
          chartRef.current.data.datasets[0].data = gradientData;
          chartRef.current.update('active');
        }
      }, 50);
    } else {
      // No animation, set data directly
      if (chartRef.current) {
        chartRef.current.data.datasets[0].data = gradientData;
        chartRef.current.update('none');
      }
    }

    // Cleanup
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [value, max, min, category, size, showValue, shouldAnimate, fontSize, useZoneColors, target, mountKey]);

  return (
    <div 
      className="gauge-chart-wrapper" 
      role="img"
      aria-label={ariaLabel}
      style={{ width: '100%', maxWidth: width, margin: '0 auto' }}
    >
      {label && (
        <div className="gauge-card-title" id={`gauge-label-${chartId}`}>
          {label}
        </div>
      )}
      <div style={{ position: 'relative', height, width: '100%' }}>
        <canvas 
          ref={canvasRef} 
          id={chartId}
          role="presentation"
          aria-hidden="true"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))',
          }}
        />
        {/* Target indicator overlay */}
        {target && (
          <div
            style={{
              position: 'absolute',
              bottom: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              fontWeight: 500,
            }}
          >
            Target: {target}
          </div>
        )}
      </div>
      {showValue && (
        <div
          className="gauge-card-value"
          style={{ color: useZoneColors ? getZoneColor(value) : category ? getCategoryColor(category) : getZoneColor(value) }}
        >
          {Math.round(value)}
          {unit && <span style={{ fontSize: '0.6em', marginLeft: '0.25rem' }}>{unit}</span>}
        </div>
      )}
    </div>
  );
};

export default GaugeChart;
