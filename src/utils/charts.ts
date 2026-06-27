/**
 * Chart.js utility functions and default configurations
 * Menggunakan chart.js/auto untuk registrasi otomatis semua chart types
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Default chart options untuk konsistensi
 */
export const defaultChartOptions: ChartOptions<any> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        padding: 12,
        font: {
          size: 12,
          family: "'Poppins', 'Plus Jakarta Sans', sans-serif",
        },
        usePointStyle: true,
      },
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      cornerRadius: 8,
      titleFont: {
        size: 13,
        weight: '600',
      },
      bodyFont: {
        size: 12,
      },
    },
  },
  animation: {
    duration: 750,
    easing: 'easeInOutQuart',
  },
};

/**
 * Line chart specific options
 */
export const lineChartOptions: ChartOptions<'line'> = {
  ...defaultChartOptions,
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      ticks: {
        stepSize: 20,
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
  elements: {
    line: {
      tension: 0.4, // Smooth curves
      borderWidth: 2,
    },
    point: {
      radius: 4,
      hoverRadius: 6,
    },
  },
};

/**
 * Radar chart specific options
 */
export const radarChartOptions: ChartOptions<'radar'> = {
  ...defaultChartOptions,
  scales: {
    r: {
      beginAtZero: true,
      max: 100,
      ticks: {
        stepSize: 20,
        backdropColor: 'transparent',
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
      pointLabels: {
        font: {
          size: 11,
          weight: '500',
        },
      },
    },
  },
};

/**
 * Bar chart specific options
 */
export const barChartOptions: ChartOptions<'bar'> = {
  ...defaultChartOptions,
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      ticks: {
        stepSize: 20,
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
  elements: {
    bar: {
      borderRadius: 6,
      borderSkipped: false,
    },
  },
};

/**
 * Doughnut chart specific options
 */
export const doughnutChartOptions: ChartOptions<'doughnut'> = {
  ...defaultChartOptions,
  cutout: '70%',
  plugins: {
    ...defaultChartOptions.plugins,
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 16,
        font: {
          size: 12,
        },
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
  },
};

/**
 * Theme colors for charts
 */
export const chartColors = {
  primary: 'rgb(29, 78, 216)', // blue-700
  secondary: 'rgb(99, 102, 241)', // indigo-500
  success: 'rgb(34, 197, 94)', // green-500
  warning: 'rgb(251, 146, 60)', // orange-400
  danger: 'rgb(239, 68, 68)', // red-500
  info: 'rgb(59, 130, 246)', // blue-500
  purple: 'rgb(168, 85, 247)', // purple-500
  pink: 'rgb(236, 72, 153)', // pink-500
};

/**
 * Generate gradient for charts
 */
export const createGradient = (
  ctx: CanvasRenderingContext2D,
  color: string
): CanvasGradient => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0.1)'));
  return gradient;
};

/**
 * Helper untuk disabled animation jika user prefer reduced motion
 */
export const getAnimationConfig = (prefersReducedMotion: boolean) => {
  if (prefersReducedMotion) {
    return {
      animation: {
        duration: 0,
      },
    };
  }
  return {};
};
