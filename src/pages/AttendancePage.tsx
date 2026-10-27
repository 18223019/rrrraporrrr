/**
 * AttendancePage — kehadiran Kumsub (kumpul subuh) & Program asrama.
 * Hanya informasi: nilai kehadiran sudah termasuk di akumulasi rapor.
 * Memakai komponen yang sama dengan Dashboard (BentoGrid, BentoCard, GaugeChart).
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
// tone = kelas warna teks di src/styles/attendance.css
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
const EMPTY_STYLE = { bg: 'rgba(118, 87, 67, 0.1)', tone: 'att-muted' };

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

function formatDate(date: string): string {
  const parsed = parseDay(date);
  return parsed ? `${parsed.day} ${SHORT_MONTH[parsed.month] ?? ''}` : date || '-';
}

const attendedCount = (section?: AttendanceSection) =>
  section ? section.summary.count - (section.summary.counts.TK ?? 0) : 0;

const EmptyText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ color: 'var(--text-secondary)', textAlign: 'center', width: '100%' }}>{children}</div>
);

const StatusBadge: React.FC<{ code: AttendanceCode }> = ({ code }) => {
  const style = CODE_STYLE[code];
  return (
    <span
      className={style.tone}
      style={{
        background: style.bg,
        borderRadius: 999,
        padding: '0.15rem 0.7rem',
        fontSize: '0.8rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
      }}
    >
      {code}
    </span>
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

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.4rem', marginBottom: '0.4rem' }}>
        {WEEKDAYS.map((day) => (
          <div key={day} className="label" style={{ textAlign: 'center', color: '#997e67', fontSize: '0.7rem' }}>
            {day}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.4rem' }}>
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const entry = byDay.get(day);
          const style = entry ? CODE_STYLE[entry.code] : EMPTY_STYLE;
          return (
            <div
              key={day}
              className={style.tone}
              title={entry ? `${day} ${SHORT_MONTH[parsedMonth.month]}: ${entry.code}` : `${day} ${SHORT_MONTH[parsedMonth.month]}`}
              style={{
                height: '2.9rem',
                borderRadius: 12,
                background: style.bg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1.15,
              }}
            >
              <span className={style.tone} style={{ fontSize: '0.9rem', fontWeight: 600 }}>{day}</span>
              {entry && <span className={style.tone} style={{ fontSize: '0.65rem', opacity: 0.9 }}>{entry.code}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Rekap kehadiran Kumsub dan program asrama</p>
          </div>
          <MonthSelector months={months} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} loading={monthsLoading} />
        </div>
        {currentMonth && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Berikut catatan kehadiranmu untuk periode <strong>{currentMonth.label}</strong> ya! ^^
          </p>
        )}
      </motion.div>

      <div className="page-16-9 dashboard-content">
        <BentoGrid>
          <BentoCard size="medium" title="Kumsub" subtitle="Kumpul subuh" category="ketakmiran" loading={busy}>
            {kumsub?.found && kumsub.summary.score !== null ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <GaugeChart value={kumsub.summary.score} label="Kumsub" category="ketakmiran" size="large" showValue animated />
                <p style={{ margin: '0.5rem 0 0', color: '#765743', fontSize: '0.9rem' }}>
                  Hadir {attendedCount(kumsub)} dari {kumsub.summary.count} hari
                </p>
              </div>
            ) : (
              <EmptyText>{error ? 'Gagal memuat data.' : 'Belum ada data bulan ini.'}</EmptyText>
            )}
          </BentoCard>

          <BentoCard size="medium" title="Program asrama" subtitle="Kajian & pembinaan" category="pembinaan" loading={busy}>
            {program?.found && program.summary.score !== null ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <GaugeChart value={program.summary.score} label="Program" category="pembinaan" size="large" showValue animated />
                <p style={{ margin: '0.5rem 0 0', color: '#765743', fontSize: '0.9rem' }}>
                  Hadir {attendedCount(program)} dari {program.summary.count} kegiatan
                </p>
              </div>
            ) : (
              <EmptyText>{error ? 'Gagal memuat data.' : 'Belum ada data bulan ini.'}</EmptyText>
            )}
          </BentoCard>

          <BentoCard size="medium" title="Tanpa keterangan" subtitle="Jumlah TK bulan ini" category="internal" loading={busy}>
            {hasData ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
                <div className={`stat-number ${tkKumsub + tkProgram > 0 ? 'att-danger' : 'att-good'}`} style={{ fontSize: '3.25rem' }}>
                  {tkKumsub + tkProgram}
                </div>
                <p style={{ margin: 0, color: '#765743', fontSize: '0.9rem', textAlign: 'center' }}>
                  {tkKumsub} di Kumsub · {tkProgram} di Program
                </p>
                <p style={{ margin: '0.25rem 0 0', color: '#997e67', fontSize: '0.8rem', textAlign: 'center' }}>
                  {tkKumsub + tkProgram === 0 ? 'MasyaAllah, pertahankan yaa!' : 'Kalau berhalangan, jangan lupa izin ke coach ya'}
                </p>
              </div>
            ) : (
              <EmptyText>{error ? 'Gagal memuat data.' : 'Belum ada data bulan ini.'}</EmptyText>
            )}
          </BentoCard>

          <BentoCard size="wide" title="Kalender Kumsub" subtitle={currentMonth?.label} loading={busy}>
            {kumsub?.found ? (
              <KumsubCalendar monthKey={selectedMonth} entries={kumsub.entries} />
            ) : (
              <EmptyText>Belum ada data Kumsub bulan ini.</EmptyText>
            )}
          </BentoCard>

          <BentoCard size="tall" title="Kegiatan program" subtitle={currentMonth?.label} loading={busy}>
            {program?.found && program.entries.length > 0 ? (
              <div style={{ width: '100%', alignSelf: 'flex-start' }}>
                {program.entries.map((entry, index) => (
                  <div
                    key={`${entry.date}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 0',
                      borderTop: index === 0 ? 'none' : '1px solid rgba(118, 87, 67, 0.15)',
                    }}
                  >
                    <span style={{ width: '3.25rem', fontSize: '0.8rem', color: '#997e67' }}>{formatDate(entry.date)}</span>
                    <span style={{ flex: 1, color: '#42291d', fontWeight: 500 }}>{entry.label || 'Kegiatan'}</span>
                    <StatusBadge code={entry.code} />
                  </div>
                ))}
              </div>
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
