/**
 * TrendLineChart Component - 3-Month Trend Visualization
 * Paket 3 - Shows historical performance with trend line
 */

import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import type { ChartConfiguration } from 'chart.js';
import type { TrendData } from '../../utils/trendCalculation';
import { createLineChartOptions } from '../../utils/chartHelpers';

Chart.register(...registerables);

interface TrendLineChartProps {
  data: TrendData[];
  category?: 'ketakmiran' | 'pembinaan' | 'aktualisasi' | 'internal';
  title?: string;
  showAverage?: boolean;
  showPrediction?: boolean;
  height?: number;
}

const getCategoryColor = (category?: string): string => {
  switch (category) {
    case 'ketakmiran':
      return '#3b82f6';
    case 'pembinaan':
      return '#10b981';
    case 'aktualisasi':
      return '#8b5cf6';
    case 'internal':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
};

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  category,
  title = 'Tren 3 Bulan',
  showAverage = true,
  showPrediction = false,
  height = 250,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const lineColor = getCategoryColor(category);
    const labels = data.map((d) => d.period);
    const values = data.map((d) => d.value);

    // Calculate average
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;

    // Prepare datasets
    const datasets: any[] = [
      {
        label: 'Nilai',
        data: values,
        borderColor: lineColor,
        backgroundColor: `${lineColor}20`,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: lineColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
      },
    ];

    // Add average line
    if (showAverage) {
      datasets.push({
        label: 'Rata-rata',
        data: new Array(values.length).fill(average),
        borderColor: 'var(--text-tertiary)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
      });
    }

    // Add prediction point
    if (showPrediction && data.length >= 2) {
      const recentValues = values.slice(-3);
      const avgChange =
        recentValues.reduce((sum, v, i) => {
          if (i === 0) return 0;
          return sum + (v - recentValues[i - 1]);
        }, 0) /
        (recentValues.length - 1);
      const prediction = Math.max(0, Math.min(100, values[values.length - 1] + avgChange));

      datasets.push({
        label: 'Prediksi',
        data: [...new Array(values.length - 1).fill(null), values[values.length - 1], prediction],
        borderColor: 'var(--gauge-warning)',
        borderWidth: 2,
        borderDash: [10, 5],
        fill: false,
        pointRadius: [0, 0, 0, 0, 6],
        pointBackgroundColor: 'var(--gauge-warning)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      });
    }

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets,
      },
      options: createLineChartOptions(category, 'Nilai'),
    };

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, category, showAverage, showPrediction]);

  if (data.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)',
        }}
      >
        <p>Tidak ada data tren</p>
      </div>
    );
  }

  return (
    <div className="trend-line-chart-wrapper">
      {title && (
        <h4
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '1rem',
          }}
        >
          {title}
        </h4>
      )}
      <div style={{ position: 'relative', height }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default TrendLineChart;
