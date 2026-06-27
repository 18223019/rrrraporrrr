/**
 * Chart Helpers - Paket 3
 * Shared utilities for all chart components
 */

import type { ChartOptions } from 'chart.js';

/**
 * Default responsive config
 */
export const defaultResponsiveConfig = {
  responsive: true,
  maintainAspectRatio: false,
};

/**
 * Default animation config
 */
export const defaultAnimationConfig = {
  duration: 800,
  easing: 'easeOutCubic' as const,
};

/**
 * Default font config
 */
export const defaultFontConfig = {
  family: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
  size: 12,
  weight: 400 as const,
};

/**
 * Get gradient background for chart
 */
export const createGradient = (
  ctx: CanvasRenderingContext2D,
  color1: string,
  color2: string,
  vertical: boolean = true
): CanvasGradient => {
  const gradient = vertical
    ? ctx.createLinearGradient(0, 0, 0, ctx.canvas.height)
    : ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);

  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);

  return gradient;
};

/**
 * Format number with appropriate suffix (K, M)
 */
export const formatChartNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * Get common tooltip config
 */
export const getTooltipConfig = (category?: string) => ({
  enabled: true,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  titleColor: '#fff',
  bodyColor: '#fff',
  borderColor: category ? `var(--${category})` : 'var(--primary-500)',
  borderWidth: 2,
  padding: 12,
  cornerRadius: 8,
  displayColors: false,
  titleFont: {
    ...defaultFontConfig,
    size: 13,
    weight: 600 as const,
  },
  bodyFont: {
    ...defaultFontConfig,
    size: 12,
  },
});

/**
 * Get common legend config
 */
export const getLegendConfig = (position: 'top' | 'bottom' | 'left' | 'right' = 'top') => ({
  display: true,
  position,
  labels: {
    font: defaultFontConfig,
    color: 'var(--text-primary)',
    padding: 12,
    usePointStyle: true,
    pointStyle: 'circle',
  },
});

/**
 * Get grid config for axes
 */
export const getGridConfig = (color: string = 'var(--border-light)') => ({
  display: true,
  color,
  drawBorder: false,
  lineWidth: 1,
});

/**
 * Get axis config
 */
export const getAxisConfig = (title?: string) => ({
  display: true,
  title: title
    ? {
        display: true,
        text: title,
        font: {
          ...defaultFontConfig,
          size: 13,
          weight: 600 as const,
        },
        color: 'var(--text-secondary)',
      }
    : undefined,
  ticks: {
    font: defaultFontConfig,
    color: 'var(--text-tertiary)',
  },
  grid: getGridConfig(),
});

/**
 * Create line chart options
 */
export const createLineChartOptions = (
  category?: string,
  yAxisTitle?: string
): ChartOptions<'line'> => ({
  ...defaultResponsiveConfig,
  animation: defaultAnimationConfig,
  plugins: {
    legend: getLegendConfig('top'),
    tooltip: getTooltipConfig(category),
  },
  scales: {
    y: {
      ...getAxisConfig(yAxisTitle),
      beginAtZero: true,
      max: 100,
    },
    x: {
      ...getAxisConfig(),
    },
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
});

/**
 * Create bar chart options
 */
export const createBarChartOptions = (
  category?: string,
  yAxisTitle?: string
): ChartOptions<'bar'> => ({
  ...defaultResponsiveConfig,
  animation: defaultAnimationConfig,
  plugins: {
    legend: getLegendConfig('top'),
    tooltip: getTooltipConfig(category),
  },
  scales: {
    y: {
      ...getAxisConfig(yAxisTitle),
      beginAtZero: true,
    },
    x: {
      ...getAxisConfig(),
    },
  },
});

/**
 * Hex to RGBA converter
 */
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  // Remove # if present
  hex = hex.replace('#', '');

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Generate color palette
 */
export const generateColorPalette = (baseColor: string, count: number): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const alpha = 1 - (i * 0.15); // Fade from 1 to 0.4
    colors.push(hexToRgba(baseColor, Math.max(alpha, 0.4)));
  }
  return colors;
};

export default {
  defaultResponsiveConfig,
  defaultAnimationConfig,
  defaultFontConfig,
  createGradient,
  formatChartNumber,
  getTooltipConfig,
  getLegendConfig,
  getGridConfig,
  getAxisConfig,
  createLineChartOptions,
  createBarChartOptions,
  hexToRgba,
  generateColorPalette,
};
