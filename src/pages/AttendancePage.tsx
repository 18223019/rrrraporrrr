/**
 * AttendancePage — kehadiran Kumsub (kumpul subuh) & Program asrama.
 * Hanya informasi: nilai kehadiran sudah termasuk di akumulasi rapor.
 * Memakai komponen yang sama dengan Dashboard (BentoGrid, BentoCard, GaugeChart).
 * Gaya khusus ada di src/styles/attendance.css.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { BentoGrid, BentoCard } from '../components/bento';
import { GaugeChart } from '../components/charts';
import { MonthSelector } from '../components/ui/MonthSelector';
import { useUserProfile } from '../hooks/useUserProfile';
import { useMonthSelector } from '../hooks/useMonthSelector';
import { useAttendance } from '../hooks/useAttendance';
import type { AttendanceCode, AttendanceEntry, AttendanceSection } from '../services/api';
import '../styles/attendance.css';

// Palet tanah sesuai warna web (lihat src/styles/colors.css)
// tone = kelas warna teks di attendance.css
const CODE_STYLE: Record<AttendanceCode, { bg: string; tone: string }> = {
  H1: { bg: '#6f8555', tone: 'att-on-dark' },
  H2: { bg: '#98a677', tone: 'att-on-dark' },
  H3: { bg: '#d4b27c', tone: 'att-on-light' },
  S1: { bg: '#d4b27c', tone: 'att-on-light' },
  I: { bg: '#c9b8a6', tone: 'att-on-light' },
  S2: { bg: '#b87845', tone: 'att-on-dark' },
  H4: { bg: '#b87845', tone: 'att-on-dark' },
  TK: { bg: '#9b4f3f', tone: 'att-on-dark' },
};
const EMPTY_STYLE = { bg: 'rgba(118, 87, 67, 0.09)', tone: 'att-muted' };

// Keterangan warna kalender (tanpa poin)
const LEGEND: Array<{ color: string; text: string }> = [
  { color: CODE_STYLE.H1.bg, text: 'H1 · Hadir' },
  { color: CODE_STYLE.H2.bg, text: 'H2 · Hadir sebagian' },
  { color: CODE_STYLE.H3.bg, text: 'H3/S1 · Telat atau sakit' },
  { color: CODE_STYLE.I.bg, text: 'I · Izin' },
  { color: CODE_STYLE.S2.bg, text: 'S2/H4 · Sakit ringan atau telat >15 menit' },
  { color: CODE_STYLE.TK.bg, text: 'TK · Tanpa keterangan' },
];

const MONTH_INDEX: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const SHORT_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function parseMonthKey(key: string): { year: number; month: number } | null {
  const match = /^([A-Za-z]+)(\d{2})$/.exec(key || '');
  if (!match) return null;
  const month = MONTH_INDEX[match[1].toLowerCase()];
  return month === undefined ? null : { year: 2000 + Number(match[2]), month };
}

function parseDay(date: string): { day: number; month: number } | null {
  const match = /^(\d{1,2})\/(\d{1,2})\//.exec(date || '');
  return match ? { day: Number(match[1]), month: Number(match[2]) - 1 } : null;
}

// "Kumon#9" → "Kumon #9" supaya penulisan seragam
const tidyLabel = (label: string) => (label ? label.replace(/\s*#\s*/g, ' #').trim() : 'Kegiatan');

const formatPercent = (value: number) =>
  value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

const attendedCount = (section?: AttendanceSection) =>
  section ? section.summary.count - (section.summary.counts.TK ?? 0) : 0;

const EmptyText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="att-empty">{children}</div>
);

const ScoreGauge: React.FC<{
  section?: AttendanceSection;
  category: 'ketakmiran' | 'pembinaan';
  unit: string;
  error: boolean;
}> = ({ section, category, unit, error }) => {
  if (!section?.found || section.summary.score === null) {
    return <EmptyText>{error ? 'Gagal memuat data.' : 'Belum ada data bulan ini.'}</EmptyText>;
  }
  return (
    <div className="att-score">
      <div className="att-gauge">
        <GaugeChart value={section.summary.score} category={category} size="large" showValue={false} animated />
        <div className="att-gauge-value">
          {formatPercent(section.summary.score)}
          <small>%</small>
        </div>
      </div>
      <div className="att-pill">
        Hadir <strong>{attendedCount(section)}</strong> dari {section.summary.count} {unit}
      </div>
    </div>
  );
};

const KumsubCalendar: React.FC<{ monthKey: string; entries: AttendanceEntry[] }> = ({ monthKey, entries }) => {
  const parsedMonth = parseMonthKey(monthKey);
  if (!parsedMonth) return null;

  const byDay = new Map<number, AttendanceEntry>();
  entries.forEach((entry) => {
    const parsed = parseDay(entry.date);
    if (parsed && parsed.month === parsedMonth.month) byDay.set(parsed.day, entry);
  });

  const daysInMonth = new Date(parsedMonth.year, parsedMonth.month + 1, 0).getDate();
  const offset = (new Date(parsedMonth.year, parsedMonth.month, 1).getDay() + 6) % 7; // Senin = 0
  const now = new Date();
  const today =
    now.getFullYear() === parsedMonth.year && now.getMonth() === parsedMonth.month ? now.getDate() : null;

  return (
    <div className="att-calendar">
      <div className="att-weekdays">
        {WEEKDAYS.map((day) => (
          <div key={day} className="att-weekday">
            {day}
          </div>
        ))}
      </div>
      <div className="att-days">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const entry = byDay.get(day);
          const style = entry ? CODE_STYLE[entry.code] : EMPTY_STYLE;
          const dateLabel = `${day} ${SHORT_MONTH[parsedMonth.month]}`;
          return (
            <div
              key={day}
              className={`att-day ${day === today ? 'att-day-today' : ''}`}
              title={entry ? `${dateLabel}: ${entry.code}` : dateLabel}
              style={{ background: style.bg }}
            >
              <span className={`att-day-num ${style.tone}`}>{day}</span>
              {entry && <span className={`att-day-code ${style.tone}`}>{entry.code}</span>}
            </div>
          );
        })}
      </div>
      <div className="att-legend">
        {LEGEND.map((item) => (
          <span key={item.text} className="att-legend-item">
            <span className="att-legend-dot" style={{ background: item.color }} />
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
};

const ProgramList: React.FC<{ entries: AttendanceEntry[] }> = ({ entries }) => (
  <div className="att-list">
    {entries.map((entry, index) => {
      const parsed = parseDay(entry.date);
      const style = CODE_STYLE[entry.code];
      return (
        <div key={`${entry.date}-${index}`} className="att-row">
          <div className="att-date">
            <span className="att-date-day">{parsed ? parsed.day : '-'}</span>
            <span className="att-date-month">{parsed ? SHORT_MONTH[parsed.month] : ''}</span>
          </div>
          <span className="att-activity">{tidyLabel(entry.label)}</span>
          <span className={`att-badge ${style.tone}`} style={{ background: style.bg }}>
            {entry.code}
          </span>
        </div>
      );
    })}
  </div>
);

export const AttendancePage: React.FC = () => {
  const { profile, loading: profileLoading } = useUserProfile();
  const { months, selectedMonth, setSelectedMonth, currentMonth, loading: monthsLoading } = useMonthSelector(
    profile?.username,
  );
  const { data, loading, error } = useAttendance(selectedMonth, profile?.username);
  const busy = profileLoading || loading;

  const kumsub = data?.kumsub;
  const program = data?.program;
  const tkKumsub = kumsub?.summary.counts.TK ?? 0;
  const tkProgram = program?.summary.counts.TK ?? 0;
  const tkTotal = tkKumsub + tkProgram;
  const hasData = Boolean(kumsub?.found || program?.found);

  return (
    <div className="dashboard-page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: '2rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
              Kehadiran
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.05rem' }}>
              Rekap kehadiran Kumsub dan program asrama
            </p>
          </div>
          <MonthSelector months={months} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} loading={monthsLoading} />
        </div>
        {currentMonth && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Berikut catatan kehadiranmu untuk periode <strong>{currentMonth.label}</strong> ya! ^^
          </p>
        )}
      </motion.div>

      <div className="page-16-9 dashboard-content">
        <BentoGrid>
          <BentoCard size="medium" title="Kumsub" subtitle="Kumpul subuh" category="ketakmiran" loading={busy}>
            <ScoreGauge section={kumsub} category="ketakmiran" unit="hari" error={Boolean(error)} />
          </BentoCard>

          <BentoCard size="medium" title="Program asrama" subtitle="Kajian dan pembinaan" category="pembinaan" loading={busy}>
            <ScoreGauge section={program} category="pembinaan" unit="kegiatan" error={Boolean(error)} />
          </BentoCard>

          <BentoCard size="medium" title="Tanpa keterangan" subtitle="Jumlah TK bulan ini" category="internal" loading={busy}>
            {hasData ? (
              <div className="att-tk">
                <div className={`att-tk-number ${tkTotal > 0 ? 'att-danger' : 'att-good'}`}>{tkTotal}x</div>
                <div className="att-tk-split">
                  <div>
                    <span className="att-tk-split-value">{tkKumsub}</span>
                    <span className="att-caption">Kumsub</span>
                  </div>
                  <div>
                    <span className="att-tk-split-value">{tkProgram}</span>
                    <span className="att-caption">Program</span>
                  </div>
                </div>
                <p className="att-note">
                  {tkTotal === 0 ? 'MasyaAllah, pertahankan yaa!' : 'Kalau berhalangan, jangan lupa izin ke coach ya'}
                </p>
              </div>
            ) : (
              <EmptyText>{error ? 'Gagal memuat data.' : 'Belum ada data bulan ini.'}</EmptyText>
            )}
          </BentoCard>

          <BentoCard size="wide" title="Kalender Kumsub" subtitle={currentMonth?.label} loading={busy} className="att-top">
            {kumsub?.found ? (
              <KumsubCalendar monthKey={selectedMonth} entries={kumsub.entries} />
            ) : (
              <EmptyText>Belum ada data Kumsub bulan ini.</EmptyText>
            )}
          </BentoCard>

          <BentoCard size="tall" title="Kegiatan program" subtitle={currentMonth?.label} loading={busy} className="att-top">
            {program?.found && program.entries.length > 0 ? (
              <ProgramList entries={program.entries} />
            ) : (
              <EmptyText>Belum ada data program bulan ini.</EmptyText>
            )}
          </BentoCard>
        </BentoGrid>
      </div>
    </div>
  );
};

export default AttendancePage;
