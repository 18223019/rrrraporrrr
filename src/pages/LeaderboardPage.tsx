/**
 * LeaderboardPage — Top 5 per asrama.
 * Santri Astra hanya melihat Top 5 Astra, santri Astri hanya melihat Top 5 Astri.
 * Data diambil dari useRankings (sama dengan yang dipakai Dashboard & Coach).
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';
import { MonthSelector } from '../components/ui/MonthSelector';
import { MemberAvatar } from '../components/ui/MemberAvatar';
import { useUserProfile } from '../hooks/useUserProfile';
import { useMonthSelector } from '../hooks/useMonthSelector';
import { useRankings, type RankingMember } from '../hooks/useRankings';
import { getBidangGroup, type BidangGroup } from '../data/bidangConfig';

const TOP_N = 5;

const GROUP_LABEL: Record<BidangGroup, string> = {
  astra: 'Astra',
  astri: 'Astri',
};

const MEDAL_COLORS = ['#d4a017', '#9ca3af', '#b87333'];

const sameUser = (a?: string, b?: string) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export const LeaderboardPage: React.FC = () => {
  const { profile, loading: profileLoading } = useUserProfile();
  const {
    months,
    selectedMonth,
    setSelectedMonth,
    currentMonth,
    loading: monthsLoading,
  } = useMonthSelector(profile?.username);
  const { rankings, loading: rankingsLoading, error } = useRankings(selectedMonth);

  const username = profile?.username;

  // Tentukan asrama user: dari daftar ranking dulu, fallback ke daftar nama di bidangConfig
  const group: BidangGroup | undefined = React.useMemo(() => {
    if (rankings && username) {
      if (rankings.astra.some((m) => sameUser(m.username, username))) return 'astra';
      if (rankings.astri.some((m) => sameUser(m.username, username))) return 'astri';
    }
    return getBidangGroup(username);
  }, [rankings, username]);

  const groupRankings: RankingMember[] = group && rankings ? rankings[group] : [];
  const top = groupRankings.slice(0, TOP_N);
  const myEntry = groupRankings.find((m) => sameUser(m.username, username));
  const loading = profileLoading || rankingsLoading;

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
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Trophy size={32} color="#d4a017" /> Leaderboard {group ? GROUP_LABEL[group] : ''}
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.05rem' }}>
              Top {TOP_N} {group ? GROUP_LABEL[group] : ''}
              {currentMonth ? <> periode <strong>{currentMonth.label}</strong></> : null}
            </p>
          </div>
          <MonthSelector
            months={months}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            loading={monthsLoading}
          />
        </div>
      </motion.div>

      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          background: '#fffbf4',
          borderRadius: 20,
          boxShadow: 'var(--shadow-lg)',
          padding: '1.5rem',
        }}
      >
        {loading && <p style={{ textAlign: 'center', color: '#765743' }}>Memuat leaderboard…</p>}

        {!loading && error && (
          <p style={{ textAlign: 'center', color: '#b91c1c' }}>Gagal memuat leaderboard. Coba muat ulang halaman.</p>
        )}

        {!loading && !error && !group && (
          <p style={{ textAlign: 'center', color: '#765743' }}>
            Akunmu belum terdaftar di Astra/Astri. Hubungi coach ya.
          </p>
        )}

        {!loading && !error && group && top.length === 0 && (
          <p style={{ textAlign: 'center', color: '#765743' }}>Belum ada data nilai untuk periode ini.</p>
        )}

        {!loading && !error && top.length > 0 && (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {top.map((member, index) => {
              const isMe = sameUser(member.username, username);
              return (
                <motion.li
                  key={member.username}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 16,
                    background: isMe ? 'rgba(212, 160, 23, 0.14)' : 'rgba(118, 87, 67, 0.06)',
                    border: isMe ? '2px solid #d4a017' : '1px solid transparent',
                  }}
                >
                  <div style={{ width: 36, textAlign: 'center', fontWeight: 700, fontSize: '1.25rem', color: '#42291d' }}>
                    {index < 3 ? <Medal size={26} color={MEDAL_COLORS[index]} aria-label={`Peringkat ${index + 1}`} /> : `#${member.rank}`}
                  </div>
                  <MemberAvatar
                    username={member.username}
                    name={member.name}
                    style={{
                      width: 52,
                      height: 52,
                      flexShrink: 0,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'var(--bg-gradient)',
                      color: 'white',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#42291d' }}>
                      {member.username} {isMe && <span style={{ fontSize: '0.8rem', color: '#a16207' }}>(kamu)</span>}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#765743', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.name}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#42291d' }}>
                    {member.score.toFixed(1)}
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}

        {!loading && !error && myEntry && myEntry.rank > TOP_N && (
          <p style={{ textAlign: 'center', color: '#765743', marginTop: '1.25rem', marginBottom: 0 }}>
            Posisimu saat ini: <strong>#{myEntry.rank}</strong> dari {groupRankings.length} {group ? GROUP_LABEL[group] : ''}. Semangat! 💪
          </p>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
