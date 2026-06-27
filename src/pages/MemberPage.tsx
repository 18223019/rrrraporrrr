import { useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import MonthSelector from '../components/MonthSelector';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import PDFDownloadButton from '../components/PDFDownloadButton';
import { motion } from 'framer-motion';

// Lazy load charts
const Line = lazy(() => import('react-chartjs-2').then(m => ({ default: m.Line })));
const Radar = lazy(() => import('react-chartjs-2').then(m => ({ default: m.Radar })));
const Bar = lazy(() => import('react-chartjs-2').then(m => ({ default: m.Bar })));
const Doughnut = lazy(() => import('react-chartjs-2').then(m => ({ default: m.Doughnut })));

// Import chart options
import {
  lineChartOptions,
  radarChartOptions,
  barChartOptions,
  doughnutChartOptions,
  chartColors,
} from '../utils/charts';

export const MemberPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('September25');

  // Redirect jika slug tidak cocok dengan user saat ini
  if (user && slug !== user.uid) {
    navigate(`/${user.uid}`, { replace: true });
  }

  // Dummy data - akan diganti dengan real data di Paket 3
  const kpiData = {
    totalScore: 85,
    rank: 5,
    attendance: 95,
    achievement: 12,
  };

  const lineData = {
    labels: ['Sep', 'Okt', 'Nov'],
    datasets: [
      {
        label: 'Total Score',
        data: [82, 85, 88],
        borderColor: chartColors.primary,
        backgroundColor: 'rgba(29, 78, 216, 0.1)',
        fill: true,
      },
    ],
  };

  const radarData = {
    labels: ['Ibadah', 'Akademik', 'Organisasi', 'Sosial', 'Kedisiplinan'],
    datasets: [
      {
        label: 'Score',
        data: [85, 90, 75, 80, 95],
        borderColor: chartColors.secondary,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
      },
    ],
  };

  const barData = {
    labels: ['Ibadah', 'Akademik', 'Organisasi', 'Sosial', 'Kedisiplinan'],
    datasets: [
      {
        label: 'Score',
        data: [85, 90, 75, 80, 95],
        backgroundColor: [
          chartColors.primary,
          chartColors.success,
          chartColors.warning,
          chartColors.info,
          chartColors.purple,
        ],
      },
    ],
  };

  const doughnutData = {
    labels: ['Hadir', 'Izin', 'Sakit', 'Alpha'],
    datasets: [
      {
        data: [85, 10, 3, 2],
        backgroundColor: [
          chartColors.success,
          chartColors.info,
          chartColors.warning,
          chartColors.danger,
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <Navbar username={slug || 'Member'} role="member" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Rapor Pribadi
              </h2>
              <p className="text-gray-600">
                Lihat perkembangan dan pencapaianmu bulan ini
              </p>
            </div>
            <div className="flex items-center gap-3">
              <MonthSelector
                value={selectedMonth}
                onChange={setSelectedMonth}
                label=""
              />
              <PDFDownloadButton
                containerId="rapor-content"
                filename={`rapor-${slug}-${selectedMonth}.pdf`}
              />
            </div>
          </div>
        </motion.div>

        {/* Content to be exported as PDF */}
        <div id="rapor-content">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="Total Skor"
              value={kpiData.totalScore}
              subtitle="dari 100"
              color="blue"
              trend={{ value: 3.5, isPositive: true }}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <KPICard
              title="Ranking"
              value={`#${kpiData.rank}`}
              subtitle="dari 30 anggota"
              color="purple"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              }
            />
            <KPICard
              title="Kehadiran"
              value={`${kpiData.attendance}%`}
              subtitle="sangat baik"
              color="green"
              trend={{ value: 2, isPositive: true }}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <KPICard
              title="Prestasi"
              value={kpiData.achievement}
              subtitle="pencapaian"
              color="orange"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              }
            />
          </div>

          {/* Charts Grid - Bento Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Line Chart - Trend */}
            <ChartCard
              title="Tren Perkembangan"
              subtitle="3 bulan terakhir"
              height={320}
            >
              <Suspense fallback={<div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>}>
                <Line data={lineData} options={lineChartOptions} />
              </Suspense>
            </ChartCard>

            {/* Radar Chart - Categories */}
            <ChartCard
              title="Analisis Kategori"
              subtitle="Per aspek penilaian"
              height={320}
            >
              <Suspense fallback={<div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>}>
                <Radar data={radarData} options={radarChartOptions} />
              </Suspense>
            </ChartCard>

            {/* Bar Chart - Comparison */}
            <ChartCard
              title="Perbandingan Skor"
              subtitle="Per kategori bulan ini"
              height={320}
            >
              <Suspense fallback={<div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>}>
                <Bar data={barData} options={barChartOptions} />
              </Suspense>
            </ChartCard>

            {/* Doughnut Chart - Attendance */}
            <ChartCard
              title="Statistik Kehadiran"
              subtitle="Distribusi kehadiran"
              height={320}
            >
              <Suspense fallback={<div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>}>
                <Doughnut data={doughnutData} options={doughnutChartOptions} />
              </Suspense>
            </ChartCard>
          </div>

          {/* Notes Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Catatan Coach
            </h3>
            <div className="prose prose-sm max-w-none text-gray-600">
              <p>
                Perkembangan bulan ini sangat baik. Pertahankan konsistensi dalam ibadah dan
                akademik. Tingkatkan partisipasi dalam kegiatan organisasi.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
