/**
 * AttendancePage — kehadiran Kumsub (kumpul subuh) & Program asrama.
 * Hanya informasi: nilai kehadiran sudah termasuk di akumulasi rapor.
 * Data: spreadsheet "Penilaian Kehadiran 26/27" lewat Apps Script ?path=attendance.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, BookOpen, CalendarCheck, Sunrise } from 'lucide-react';
import { MonthSelector } from '../components/ui/MonthSelector';
import { useUserProfile } from '../hooks/useUserProfile';
import { useMonthSelector } from '../hooks/useMonthSelector';
import { useAttendance } from '../hooks/useAttendance';
import type { AttendanceCode, AttendanceEntry, AttendanceSection } from '../services/api';

// Warna per tingkat poin (5 → 0)
const LEVEL_STYLE: Record<number, { bg: string; fg: string }> = {
  5: { bg: '#b9d98f', fg: '#27500a' },
  4: { bg: '#e3efd2', fg: '#3b6d11' },
  3: { bg: '#f6deb0', fg: '#854f0b' },
  2: { bg: '#d6e6f7', fg: '#0c447c' },
  1: { bg: '#f5d2c4', fg: '#993c1d' },
  0: { bg: '#d9534f', fg: '#ffffff' },
};

const CODE_POINTS: Record<AttendanceCode, number> = { H1: 5, H2: 4, H3: 3, S1: 3, I: 2, S2: 1, H4: 1, TK: 0 };

const LEGEND: Array<{ codes: string; points: number; desc: string }> = [
  { codes: 'H1', points: 5, desc: 'Hadir tepat waktu, penuh' },
  { codes: 'H2', points: 4, desc: 'Menyusul / pulang duluan / tidak fokus' },
  { codes: 'H3 · S1', points: 3, desc: 'Telat 5–15 menit · sakit tk. 1' },
  { codes: 'I', points: 2, desc: 'Izin sesuai SOP' },
  { codes: 'S2 · H4', points: 1, desc: 'Sakit tk. 2 / izin mendadak · telat >15 menit' },
  { codes: 'TK', points: 0, desc: 'Tanpa keterangan' },
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

function formatDate(date: string): string {
  const parsed = parseDay(date);
  return parsed ? `${parsed.day} ${SHORT_MONTH[parsed.month] ?? ''}` : date || '-';
}

const card: React.CSSProperties = {
  background: '#fffbf4',
  borderRadius: 20,
  boxShadow: 'var(--shadow-lg)',
  padding: '1.25rem 1.5rem',
};

const Chip: React.FC<{ code: AttendanceCode | string; points: number; children?: React.ReactNode }> = ({ code, points, children }) => {
  const style = LEVEL_STYLE[points] ?? LEVEL_STYLE[0];
  return (
    <span
      style={{
        background: style.bg,
        color: style.fg,
        borderRadius: 8,
        padding: '2px 10px',
        fontSize: '0.8rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {children ?? code}
    </span>
  );
};

const DistributionBar: React.FC<{ section: AttendanceSection }> = ({ section }) => {
  const { count, counts } = section.summary;
  if (!count) return null;
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 10 }}>
      {(Object.keys(CODE_POINTS) as AttendanceCode[])
        .sort((a, b) => CODE_POINTS[b] - CODE_POINTS[a])
        .filter((code) => counts[code] > 0)
        .map((code) => (
          <div
            key={code}
            title={`${code}: ${counts[code]}x`}
            style={{ width: `${(counts[code] / count) * 100}%`, background: LEVEL_STYLE[CODE_POINTS[code]].bg }}
          />
        ))}
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; icon: React.ReactNode; section?: AttendanceSection; unit: string }> = ({
  title,
  icon,
  section,
  unit,
}) => {
  const summary = section?.summary;
  const attended = summary ? summary.count - (summary.counts.TK ?? 0) : 0;
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#765743', fontWeight: 600 }}>
        {icon} {title}
      </div>
      {section?.found && summary?.score !== null && summary ? (
        <>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#42291d', marginTop: 4 }}>
            {summary.score.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.9rem', color: '#765743' }}>
            Hadir {attended} dari {summary.count} {unit} · {summary.totalPoints}/{summary.maxPoints} poin
          </div>
          <DistributionBar section={section} />
        </>
      ) : (
        <div style={{ fontSize: '0.95rem', color: '#765743', marginTop: 8 }}>Belum ada data bulan ini</div>
      )}
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

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginBottom: 6 }}>
        {WEEKDAYS.map((day) => (
          <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', color: '#997e67', fontWeight: 600 }}>
            {day}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const entry = byDay.get(day);
          const style = entry ? LEVEL_STYLE[entry.points] : { bg: 'rgba(118, 87, 67, 0.08)', fg: '#b8a99b' };
          return (
            <div
              key={day}
              title={entry ? `${day}: ${entry.code} (${entry.points} poin)` : `${day}: belum ada data`}
              style={{
                aspectRatio: '1',
                borderRadius: 10,
                background: style.bg,
                color: style.fg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              <span style={{ fontSize: '0.85rem' }}>{day}</span>
              {entry && <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>{entry.code}</span>}
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

  const tkCount = (data?.kumsub.summary.counts.TK ?? 0) + (data?.program.summary.counts.TK ?? 0);

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
            <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#42291d', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <CalendarCheck size={32} color="#8b5e3c" /> Kehadiran
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>
              Rekap kehadiran Kumsub dan program asrama
              {currentMonth ? <> periode <strong>{currentMonth.label}</strong></> : null}
            </p>
          </div>
          <MonthSelector months={months} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} loading={monthsLoading} />
        </div>
      </motion.div>

      {busy && <div style={{ ...card, textAlign: 'center', color: '#765743' }}>Memuat kehadiran…</div>}

      {!busy && error && (
        <div style={{ ...card, textAlign: 'center', color: '#b91c1c' }}>Gagal memuat kehadiran. Coba muat ulang halaman.</div>
      )}

      {!busy && !error && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <SummaryCard title="Kumsub (kumpul subuh)" icon={<Sunrise size={18} />} section={data.kumsub} unit="hari" />
            <SummaryCard title="Program asrama" icon={<BookOpen size={18} />} section={data.program} unit="kegiatan" />
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#765743', fontWeight: 600 }}>
                <AlertTriangle size={18} /> Tanpa keterangan
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: tkCount > 0 ? '#b91c1c' : '#3b6d11', marginTop: 4 }}>
                {tkCount}x
              </div>
              <div style={{ fontSize: '0.9rem', color: '#765743' }}>
                {data.kumsub.summary.counts.TK ?? 0} Kumsub · {data.program.summary.counts.TK ?? 0} Program
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
            <div style={card}>
              <h3 style={{ margin: '0 0 1rem', color: '#42291d' }}>Kalender Kumsub</h3>
              {data.kumsub.found ? (
                <KumsubCalendar monthKey={selectedMonth} entries={data.kumsub.entries} />
              ) : (
                <p style={{ color: '#765743', margin: 0 }}>Belum ada data Kumsub bulan ini.</p>
              )}
            </div>

            <div style={card}>
              <h3 style={{ margin: '0 0 0.5rem', color: '#42291d' }}>Kegiatan program</h3>
              {data.program.found && data.program.entries.length > 0 ? (
                <div>
                  {data.program.entries.map((entry, index) => (
                    <div
                      key={`${entry.date}-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '0.6rem 0',
                        borderTop: index === 0 ? 'none' : '1px solid rgba(118, 87, 67, 0.15)',
                      }}
                    >
                      <span style={{ width: 56, fontSize: '0.85rem', color: '#997e67' }}>{formatDate(entry.date)}</span>
                      <span style={{ flex: 1, color: '#42291d', fontWeight: 500 }}>{entry.label || 'Kegiatan'}</span>
                      <Chip code={entry.code} points={entry.points} />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#765743', margin: 0 }}>Belum ada data program bulan ini.</p>
              )}
            </div>
          </div>

          <div style={card}>
            <h3 style={{ margin: '0 0 0.75rem', color: '#42291d' }}>Keterangan poin</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem 1.25rem' }}>
              {LEGEND.map((item) => (
                <div key={item.codes} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: '#765743' }}>
                  <Chip code={item.codes} points={item.points}>
                    {item.codes} = {item.points}
                  </Chip>
                  {item.desc}
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#997e67', margin: '0.9rem 0 0' }}>
              Skor = total poin ÷ (5 × jumlah kegiatan). Nilai kehadiran sudah termasuk di nilai rapor; halaman ini sebagai informasi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
