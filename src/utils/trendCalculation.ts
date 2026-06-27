/**
 * Trend Calculation Utilities - Paket 3
 * Calculate trends, growth rates, and predictions
 */

export interface TrendData {
  period: string;
  value: number;
  date?: Date;
}

export interface TrendAnalysis {
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  changeValue: number;
  average: number;
  highest: number;
  lowest: number;
  prediction?: number;
}

/**
 * Calculate trend between two periods
 */
export const calculateTrend = (
  current: number,
  previous: number
): { trend: 'up' | 'down' | 'stable'; percentage: number; value: number } => {
  if (previous === 0) {
    return { trend: 'stable', percentage: 0, value: 0 };
  }

  const changeValue = current - previous;
  const changePercentage = (changeValue / previous) * 100;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changePercentage) > 2) {
    // 2% threshold for "stable"
    trend = changePercentage > 0 ? 'up' : 'down';
  }

  return {
    trend,
    percentage: Math.abs(changePercentage),
    value: changeValue,
  };
};

/**
 * Analyze trend from historical data
 */
export const analyzeTrend = (data: TrendData[]): TrendAnalysis => {
  if (data.length === 0) {
    return {
      trend: 'stable',
      changePercentage: 0,
      changeValue: 0,
      average: 0,
      highest: 0,
      lowest: 0,
    };
  }

  const values = data.map((d) => d.value);
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const highest = Math.max(...values);
  const lowest = Math.min(...values);

  // Calculate trend between first and last
  const first = values[0];
  const last = values[values.length - 1];
  const trendResult = calculateTrend(last, first);

  // Simple linear prediction for next period
  let prediction: number | undefined;
  if (data.length >= 2) {
    const recentValues = values.slice(-3); // Use last 3 periods
    const avgChange =
      recentValues.reduce((sum, v, i) => {
        if (i === 0) return 0;
        return sum + (v - recentValues[i - 1]);
      }, 0) /
      (recentValues.length - 1);
    prediction = Math.max(0, Math.min(100, last + avgChange)); // Clamp between 0-100
  }

  return {
    trend: trendResult.trend,
    changePercentage: trendResult.percentage,
    changeValue: trendResult.value,
    average,
    highest,
    lowest,
    prediction,
  };
};

/**
 * Calculate moving average
 */
export const calculateMovingAverage = (data: TrendData[], window: number = 3): TrendData[] => {
  if (data.length < window) return data;

  const result: TrendData[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(data[i]);
    } else {
      const windowData = data.slice(i - window + 1, i + 1);
      const average = windowData.reduce((sum, d) => sum + d.value, 0) / window;
      result.push({
        ...data[i],
        value: average,
      });
    }
  }

  return result;
};

/**
 * Calculate growth rate
 */
export const calculateGrowthRate = (current: number, initial: number): number => {
  if (initial === 0) return 0;
  return ((current - initial) / initial) * 100;
};

/**
 * Detect if value is improving
 */
export const isImproving = (data: TrendData[]): boolean => {
  if (data.length < 2) return false;

  const recent = data.slice(-3); // Last 3 periods
  let improvements = 0;

  for (let i = 1; i < recent.length; i++) {
    if (recent[i].value > recent[i - 1].value) {
      improvements++;
    }
  }

  return improvements > recent.length / 2;
};

/**
 * Get trend emoji indicator
 */
export const getTrendEmoji = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up':
      return '📈';
    case 'down':
      return '📉';
    case 'stable':
      return '➡️';
  }
};

/**
 * Get trend color
 */
export const getTrendColor = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up':
      return 'var(--gauge-success)';
    case 'down':
      return 'var(--gauge-danger)';
    case 'stable':
      return 'var(--text-tertiary)';
  }
};

/**
 * Format trend percentage
 */
export const formatTrendPercentage = (percentage: number, showSign: boolean = true): string => {
  const sign = showSign && percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
};

/**
 * Generate mock trend data for testing
 */
export const generateMockTrendData = (
  months: number = 3,
  baseValue: number = 75,
  volatility: number = 10
): TrendData[] => {
  const data: TrendData[] = [];
  const monthNames = ['September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari'];

  for (let i = 0; i < months; i++) {
    const randomChange = (Math.random() - 0.5) * volatility;
    const value = Math.max(0, Math.min(100, baseValue + randomChange));

    data.push({
      period: monthNames[i] || `Month ${i + 1}`,
      value: Math.round(value * 10) / 10,
    });

    baseValue = value; // Next month starts from current value
  }

  return data;
};

export default {
  calculateTrend,
  analyzeTrend,
  calculateMovingAverage,
  calculateGrowthRate,
  isImproving,
  getTrendEmoji,
  getTrendColor,
  formatTrendPercentage,
  generateMockTrendData,
};
