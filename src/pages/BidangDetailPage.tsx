/**
 * BidangDetailPage - Detail page for each Bidang
 * Shows parameters breakdown with Bento Grid layout
 * NOW INTEGRATED WITH REAL DATA FROM API
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { BentoGrid } from '../components/bento/BentoGrid';
import { BentoCard } from '../components/bento/BentoCard';
import { GaugeChart } from '../components/charts/GaugeChart';
import { useUserProfile } from '../hooks/useUserProfile';
import { useBidangStats, type BidangType } from '../hooks/useBidangStats';
import { useMonthSelector } from '../hooks/useMonthSelector';
import { formatPercent } from '../utils/format';

const bidangConfig = {
  ketakmiran: {
    title: 'Ketakmiran',
    color: 'ketakmiran'
  },
  pembinaan: {
    title: 'Pembinaan',
    color: 'pembinaan'
  },
  aktualisasi: {
    title: 'Aktualisasi Diri',
    color: 'aktualisasi'
  },
  internal: {
    title: 'Internal',
    color: 'internal'
  },
};

const glowColorMap: Record<BidangType, string> = {
  ketakmiran: 'rgba(59, 130, 246, 0.55)',
  pembinaan: 'rgba(16, 185, 129, 0.55)',
  aktualisasi: 'rgba(139, 92, 246, 0.55)',
  internal: 'rgba(245, 158, 11, 0.55)',
};

export const BidangDetailPage: React.FC = () => {
  const { bidang } = useParams<{ slug: string; bidang: string }>();
  
  // Fetch user profile
  const { profile } = useUserProfile();
  
  // Get selected month from month selector
  const { selectedMonth } = useMonthSelector();
  
  // Get bidang configuration
  const currentBidang = bidang as BidangType;
  const config = bidangConfig[currentBidang];
  
  // Fetch real bidang stats from API with selected month
  const { parameters, kumulatif, loading } = useBidangStats({
    username: profile?.username || '',
    bidang: currentBidang,
    month: selectedMonth,
  });

  const totalOriginalWeight = React.useMemo(
    () => parameters.reduce((sum, param) => sum + param.originalWeight, 0),
    [parameters],
  );

  const activeParameters = React.useMemo(
    () => parameters.filter((param) => param.isActive),
    [parameters],
  );

  const inactiveParameters = React.useMemo(
    () => parameters.filter((param) => !param.isActive),
    [parameters],
  );

  if (!config) {
    return (
      <div className="page-container">
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-gray-700">Bidang tidak ditemukan</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header - No individual PDF button, use dashboard multi-page */}
      <div className="page-header" style={{ marginBottom: '-0.5rem', marginLeft: '2.2rem', marginTop: '0.5rem' }}>
        <div>
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              margin: '0 0 0.5rem 0',
              textShadow: `0 8px 26px ${glowColorMap[config.color as BidangType] ?? 'rgba(139, 92, 246, 0.45)'}`,
            }}
          >
            {config.title}
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Detail nilai per program
          </p>
        </div>
      </div>

      {/* 16:9 Content wrapper for PDF export */}
      <div className="page-16-9 bidang-content" data-pdf-export>
      <BentoGrid>
        {/* Kumulatif Card - Large */}
        <BentoCard
          size="large"
          title={`Nilai Kumulatif ${config.title}`}
          category={config.color as any}
          loading={loading}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            padding: '2rem',
          }}>
            <GaugeChart 
              value={kumulatif} 
              label={config.title}
              category={config.color as any}
              size="large"
              showValue={false}
            />
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: 'bold', 
              color: `var(--${config.color})`,
              marginTop: '1rem',
            }}>
              {kumulatif.toFixed(1)}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              Nilai akhir dari {activeParameters.length} / {parameters.length} parameter aktif
            </div>
            {inactiveParameters.length > 0 && (
              <div
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}
              >
                Bobot disesuaikan karena belum ada nilai untuk:
                <br />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {inactiveParameters.map((param) => param.label).join(', ')}
                </span>
              </div>
            )}
          </div>
        </BentoCard>

        {/* Parameter Cards - Individual Gauges */}
        {parameters.map((param) => {
          const rawValue = param.value ?? 0;
          const roundedRawValue = Math.round(rawValue * 10) / 10;
          const weightedContribution = param.isActive && param.value !== null
            ? Math.round(((param.value * param.normalizedWeight) / 100) * 10) / 10
            : 0;

          return (
            <BentoCard
              key={param.id}
              size="medium"
              title={param.label}
              category={config.color as any}
              loading={loading}
              footer={(
                <div
                  style={{
                    display: 'grid',
                    gap: '0.25rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <div>
                    Bobot dasar:{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {formatPercent(
                        totalOriginalWeight > 0
                          ? (param.originalWeight / totalOriginalWeight) * 100
                          : 0,
                      )}
                    </span>
                  </div>
                  {param.isActive ? (
                    <div>
                      Bobot aktif:{' '}
                      <span style={{ color: `var(--${config.color})` }}>
                        {formatPercent(param.normalizedWeight)}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.15rem' }}>
                      <div>
                        Bobot aktif:{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>0%</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Bobot dialihkan ke parameter lain
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            >
              {!param.isActive ? (
                // Show "Tidak Ada Nilai" text
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  gap: '1rem'
                }}>
                  <div style={{
                    fontSize: '3rem',
                    opacity: 0.3,
                  }}>
                    —
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}>
                    Tidak/Belum Ada Nilai
                  </div>
                  <div
                    style={{
                      fontSize: '0.775rem',
                      color: 'var(--text-tertiary)',
                      textAlign: 'center',
                      lineHeight: 1.3,
                    }}
                  >
                    Bobot program ini dialihkan sepenuhnya ke parameter yang memiliki nilai aktif.
                  </div>
                </div>
              ) : (
                <>
                  <GaugeChart
                    value={roundedRawValue}
                    label={param.label}
                    category={config.color as any}
                    size="medium"
                    showValue={false}
                  />
                  <div
                    style={{
                      textAlign: 'center',
                      display: 'grid',
                      gap: '0.35rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: `var(--${config.color})`,
                      }}
                    >
                      {Number.isInteger(roundedRawValue) ? roundedRawValue : roundedRawValue.toFixed(1)}
                    </div>
                    <div
                      style={{
                        fontSize: '1rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Kontribusi nilai:{' '}
                      <span style={{ color: `var(--${config.color})`, fontWeight: 600 }}>
                        {weightedContribution.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </BentoCard>
          );
        })}
      </BentoGrid>
      </div>
    </div>
  );
};

export default BidangDetailPage;
