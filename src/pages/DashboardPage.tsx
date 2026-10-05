/**
 * Dashboard Page - Main Overview with Bento Layout
 * Shows profile, KPIs, and trend chart
 * NOW INTEGRATED WITH REAL DATA FROM API
 */

import React from 'react';
import { motion } from 'framer-motion';
import { BentoGrid, BentoCard } from '../components/bento';
import { GaugeChart } from '../components/charts';
import { MultiPagePDFButton } from '../components/ui/MultiPagePDFButton';
import { MonthSelector } from '../components/ui/MonthSelector';
import { useUserProfile } from '../hooks/useUserProfile';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useDashboardPrefetch } from '../hooks/useDashboardPrefetch';
import { useMonthSelector } from '../hooks/useMonthSelector';
import { useRankings } from '../hooks/useRankings';
import type { BidangType } from '../data/bidangConfig';
import { getBidangGroup } from '../data/bidangConfig';
import { formatPercent } from '../utils/format';

export const DashboardPage: React.FC = () => {
  // ⏱️ PAGE MOUNT TIMING
  const pageStartTime = React.useRef(performance.now());

  // Fetch real user profile from API
  const { profile, loading: profileLoading } = useUserProfile();

  // Debug: Check profile data
  React.useEffect(() => {
  }, [profile]);

  // Month selector
  const {
    months,
    selectedMonth,
    setSelectedMonth,
    currentMonth,
    loading: monthsLoading,
  } = useMonthSelector(profile?.username);

  // Fetch real dashboard stats from API for selected month
  const { stats, loading: statsLoading } = useDashboardStats({
    username: profile?.username || '',
    month: selectedMonth,
    historyMonths: 3,
  });

  const {
    rankings,
    loading: rankingsLoading,
    error: rankingsError,
  } = useRankings(selectedMonth);

  // Prefetch all available months in background for instant switching
  useDashboardPrefetch({
    username: profile?.username || '',
    availableMonths: months,
    currentMonth: selectedMonth,
    enabled: !profileLoading && !statsLoading && !!stats,
  });

  const renderWeightFooter = React.useCallback(
    (bidangKey: BidangType) => {
      const breakdown = stats?.bidangBreakdown?.[bidangKey];
      if (!breakdown) {
        return null;
      }

      const active = breakdown.breakdown.filter((item) => item.isActive);
      const inactive = breakdown.breakdown.filter((item) => !item.isActive);

      const chipColor = `var(--${bidangKey})`;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: '#765743',
          }}
        >
          <div>
            Bobot aktif ({active.length}/{breakdown.breakdown.length}), total {breakdown.activeWeight}:
          </div>
          {active.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.35rem',
              }}
            >
              {active.map((item) => (
                <span
                  key={`${bidangKey}-${item.column}`}
                  style={{
                    backgroundColor: 'rgba(148, 163, 184, 0.12)',
                    border: `1px solid ${chipColor}`,
                    borderRadius: '999px',
                    padding: '0.15rem 0.6rem',
                    fontSize: '0.75rem',
                    color: '#5f4030',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{item.column}</span>:{' '}
                  {bidangKey === 'osram' ? `${item.originalWeight}%` : formatPercent(item.normalizedWeight)}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              Belum ada parameter aktif
            </div>
          )}
          {inactive.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#5f4030' }}>
              Tidak dinilai:{' '}
              {inactive.map((item) => item.column).join(', ')}
            </div>
          )}
        </div>
      );
    },
    [stats?.bidangBreakdown],
  );

  // Combined loading state
  const loading = profileLoading || statsLoading || monthsLoading;

  const rankingSummary = React.useMemo(() => {
    if (!rankings || !profile?.username) {
      return null;
    }

    const username = profile.username;
    const astraIndex = rankings.astra.findIndex((member) => member.username === username);
    const astriIndex = rankings.astri.findIndex((member) => member.username === username);

    let groupKey: 'astra' | 'astri' | null = null;
    let groupIndex = -1;

    if (astraIndex !== -1) {
      groupKey = 'astra';
      groupIndex = astraIndex;
    } else if (astriIndex !== -1) {
      groupKey = 'astri';
      groupIndex = astriIndex;
    } else {
      return null;
    }

    const groupRank = groupIndex + 1;
    const groupTotal = groupKey === 'astra' ? rankings.astra.length : rankings.astri.length;
    const groupLabel = groupKey === 'astra' ? 'Astra' : 'Astri';
    const groupDescriptor = groupKey === 'astra' ? 'Ikhwan' : 'Akhwat';
    const groupPercent = groupTotal > 0 ? ((groupTotal - groupIndex) / groupTotal) * 100 : 0;

    const combined = [...rankings.astra, ...rankings.astri].sort((a, b) => b.score - a.score);
    const overallIndex = combined.findIndex((member) => member.username === username);
    const overallRank = overallIndex !== -1 ? overallIndex + 1 : null;
    const overallTotal = combined.length;
    const overallPercent = overallRank && overallTotal > 0
      ? ((overallTotal - (overallRank - 1)) / overallTotal) * 100
      : 0;

    const groupAboveMember = groupIndex > 0
      ? groupKey === 'astra'
        ? rankings.astra[groupIndex - 1]
        : rankings.astri[groupIndex - 1]
      : null;

    return {
      groupLabel,
      groupDescriptor,
      groupRank,
      groupTotal,
      groupPercent,
      groupAboveRank: groupAboveMember ? groupIndex : null,
      groupAboveName: groupAboveMember?.name ?? null,
      overallRank,
      overallTotal,
      overallPercent,
    };
  }, [rankings, profile?.username]);

  const bidangGroup = getBidangGroup(profile?.username);
  const isAugust = selectedMonth === 'Agustus26';
  const visibleBidang = isAugust
    ? bidangGroup === 'astra'
      ? new Set<BidangType>(['ketakmiran', 'osram'])
      : new Set<BidangType>(['osram'])
    : new Set<BidangType>(['ketakmiran', 'pembinaan', 'aktualisasi', 'internal']);

  const groupBarWidth = rankingSummary
    ? Math.max(6, Math.round(Math.min(100, rankingSummary.groupPercent)))
    : 0;
  const overallBarWidth = rankingSummary && rankingSummary.overallRank
    ? Math.max(6, Math.round(Math.min(100, rankingSummary.overallPercent)))
    : 0;

  // ⏱️ RENDER COMPLETE TIMING
  React.useEffect(() => {
    if (!loading && stats) {
      const totalPageTime = performance.now() - pageStartTime.current;
      console.log(`Dashboard page fully rendered in ${(totalPageTime / 1000).toFixed(3)} seconds`);
    }
  }, [loading, stats]);

  // Show loading state or no profile
  if (!profile && !loading) {
    return (
      <div className="dashboard-page">
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2>👤 Profile tidak ditemukan</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
            Silakan login atau hubungi admin jika Anda sudah terdaftar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Page Header with Month Selector and PDF Button */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: '2rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                margin: '0 0 0.5rem 0',
              }}
            >
              Rapor Asrama
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Assalamu'alaikum, {profile?.username || ''}! 👋
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Month Selector */}
            <MonthSelector
              months={months}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              loading={monthsLoading}
            />

            {/* PDF Download Button */}
            {profile && (
              <MultiPagePDFButton
                userName={profile.username}
                userSlug={profile.slug}
                userPanggilan={profile.panggilan}
                userFullName={profile.name}
                selectedMonth={selectedMonth}
              />
            )}
          </div>
        </div>

        {/* Show current period info */}
        {currentMonth && (
          <p style={{
            marginTop: '0.75rem',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)'
          }}>
            Berikut rapor performa <strong>berasramamu</strong> untuk periode <strong>{currentMonth.label}</strong> ya! ^^
          </p>
        )}
      </motion.div>

      {/* 16:9 Dashboard Content - optimized for PDF */}
      <div className="page-16-9 dashboard-content" data-pdf-export>
        <BentoGrid>
          {/* Row 1: Profile + 3 KPI Cards */}
          <BentoCard size="profile" variant="gradient" loading={loading}>
            <div className="profile-card">
              <div className="profile-avatar">
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile?.name || profile?.username || 'Foto profil santri'}
                    className="profile-avatar-image"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                ) : (
                  profile?.initials || 'U'
                )}
              </div>
              <h2 className="profile-name" style={{ margin: '0.75rem 0 0.25rem 0' }}>
                {profile?.username || 'username'}
              </h2>
              <p style={{
                fontSize: '1rem',
                  color: '#765743',
                margin: '0 0 0rem 0',
                fontWeight: '400'
              }}>
                {profile?.name || 'Nama Lengkap'}
              </p>
              <p
                style={{
                  fontSize: '0.95rem',
                  color: '#765743',
                  margin: '0 0 0rem 0',
                  letterSpacing: '0.03em'
                }}
              >
                {profile?.nim ?? ''}
              </p>
              <p
                style={{
                  fontSize: '0.95rem',
                  color: '#765743',
                  margin: '0 0 0.25rem 0',
                  letterSpacing: '0.03em'
                }}
              >
                {profile?.jurusan ?? ''}
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                <div className="label" style={{ color: '#5f4030', fontWeight: 700 }}>
                  Nilai Keseluruhan
                </div>
                <div
                  className="stat-number"
                  style={{ color: 'var(--primary-600)', marginTop: '0.5rem' }}
                >
                  {stats?.averageScore.toFixed(1) || '0.0'}
                </div>
              </div>
            </div>
          </BentoCard>

          {/* Row 1 Right: Ketakmiran & Pembinaan */}
          {visibleBidang.has('ketakmiran') && <BentoCard
            size="medium"
            title="Ketakmiran"
            category="ketakmiran"
            loading={loading}
            footer={renderWeightFooter('ketakmiran')}
          >
            <GaugeChart
              value={stats?.ketakmiran || 0}
              label="Ketakmiran"
              category="ketakmiran"
              size="large"
              showValue={true}
              animated={true}
            />
          </BentoCard>}

          {visibleBidang.has('pembinaan') && <BentoCard
            size="medium"
            title="Pembinaan"
            category="pembinaan"
            loading={loading}
            footer={renderWeightFooter('pembinaan')}
          >
            <GaugeChart
              value={stats?.pembinaan || 0}
              label="Pembinaan"
              category="pembinaan"
              size="large"
              showValue={true}
              animated={true}
            />
          </BentoCard>}

          {/* Row 2 Right: Aktualisasi & Internal */}
          {visibleBidang.has('aktualisasi') && <BentoCard
            size="medium"
            title="Aktualisasi Diri"
            category="aktualisasi"
            loading={loading}
            footer={renderWeightFooter('aktualisasi')}
          >
            <GaugeChart
              value={stats?.aktualisasi || 0}
              label="Aktualisasi"
              category="aktualisasi"
              size="large"
              showValue={true}
              animated={true}
            />
          </BentoCard>}

          {visibleBidang.has('internal') && <BentoCard
            size="medium"
            title="Internal"
            category="internal"
            loading={loading}
            footer={renderWeightFooter('internal')}
          >
            <GaugeChart
              value={stats?.internal || 0}
              label="Internal"
              category="internal"
              size="large"
              showValue={true}
              animated={true}
            />
          </BentoCard>}

          {visibleBidang.has('osram') && <BentoCard
            size="medium"
            title="Osram"
            category="osram"
            loading={loading}
            footer={renderWeightFooter('osram')}
          >
            <GaugeChart
              value={stats?.bidangBreakdown?.osram?.score || 0}
              label="Osram"
              category="osram"
              size="large"
              showValue={true}
              animated={true}
            />
          </BentoCard>}

          <BentoCard
            size="wide"
            title="Ranking"
            subtitle={currentMonth ? `Periode ${currentMonth.label}` : undefined}
            loading={rankingsLoading}
          >
            {rankingsLoading ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', width: '100%' }}>
                Data ranking masih loading...
              </div>
            ) : rankingsError ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', width: '100%' }}>
                Tidak dapat memuat data ranking saat ini.
              </div>
            ) : rankingSummary ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1.5rem',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Ranking {rankingSummary.groupLabel}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                    <span style={{ fontSize: '3rem', fontWeight: 700, color: '#ede9fe' }}>
                      {rankingSummary.groupRank}
                    </span>
                    <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                      / {rankingSummary.groupTotal}
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '999px',
                      background: 'rgba(148, 163, 184, 0.25)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${groupBarWidth}%`,
                        height: '100%',
                        borderRadius: 'inherit',
                        background: 'linear-gradient(90deg, rgba(129, 140, 248, 0.9), rgba(79, 70, 229, 0.9))',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                    {rankingSummary.groupRank === 1
                      ? 'Mantap semoga istiqomah!'
                      : `Rank diatasmu: #${rankingSummary.groupAboveRank ?? rankingSummary.groupRank - 1}${rankingSummary.groupAboveName ? ` - ${rankingSummary.groupAboveName}` : ''}`}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Ranking Asrama
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                    <span style={{ fontSize: '3rem', fontWeight: 700, color: '#ede9fe' }}>
                      {rankingSummary.overallRank ?? '—'}
                    </span>
                    <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                      / {rankingSummary.overallTotal || '—'}
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '999px',
                      background: 'rgba(148, 163, 184, 0.25)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${overallBarWidth}%`,
                        height: '100%',
                        borderRadius: 'inherit',
                        background: 'linear-gradient(90deg, rgba(45, 212, 191, 0.9), rgba(14, 165, 233, 0.9))',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                    {rankingSummary.overallRank && rankingSummary.overallRank === 1
                      ? 'Kamu rank #1 asrama!'
                      : rankingSummary.overallRank
                        ? `Rankmu bulan ini di asrama: #${rankingSummary.overallRank}.`
                        : 'Belum ada data ranking asrama.'}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', width: '100%' }}>
                Data ranking masih loading...
              </div>
            )}
          </BentoCard>
        </BentoGrid>
      </div>
    </div>
  );
};

export default DashboardPage;
