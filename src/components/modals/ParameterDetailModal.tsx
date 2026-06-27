/**
 * ParameterDetailModal Component - Detailed parameter view
 * Paket 3 - Shows history, trend, and insights for a parameter
 */

import React from 'react';
import { Modal } from './Modal';
import { TrendLineChart } from '../charts/TrendLineChart';
import { ProgressBar } from '../charts/ProgressBar';
import { Badge, TrendBadge } from '../ui/Badge';
import type { TrendData } from '../../utils/trendCalculation';
import { analyzeTrend, getTrendEmoji } from '../../utils/trendCalculation';
import { getZoneLabel } from '../../utils/colorZones';

interface ParameterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  parameterName: string;
  currentValue: number;
  trendData: TrendData[];
  category?: 'ketakmiran' | 'pembinaan' | 'aktualisasi' | 'internal';
  subParameters?: Array<{
    name: string;
    value: number;
    weight?: number;
  }>;
  target?: number;
  insights?: string[];
}

export const ParameterDetailModal: React.FC<ParameterDetailModalProps> = ({
  isOpen,
  onClose,
  parameterName,
  currentValue,
  trendData,
  category,
  subParameters,
  target,
  insights,
}) => {
  const analysis = analyzeTrend(trendData);
  const zoneLabel = getZoneLabel(currentValue);
  const trendEmoji = getTrendEmoji(analysis.trend);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={parameterName} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Current Value Section */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h4 style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>
                Nilai Saat Ini
              </h4>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span
                  style={{
                    fontSize: '3rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {currentValue.toFixed(1)}
                </span>
                <span style={{ fontSize: '1.5rem', color: 'var(--text-tertiary)' }}>/100</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
              <Badge label={zoneLabel} variant={currentValue >= 80 ? 'success' : currentValue >= 60 ? 'warning' : 'danger'} />
              {target && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                  Target: <strong>{target}</strong>
                  {currentValue >= target && ' ✓'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Trend Analysis Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
              Analisis Tren {trendEmoji}
            </h4>
            <TrendBadge
              label={`${analysis.changePercentage.toFixed(1)}%`}
              positive={analysis.trend === 'up'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Rata-rata</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {analysis.average.toFixed(1)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Tertinggi</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--gauge-success)' }}>
                {analysis.highest.toFixed(1)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Terendah</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--gauge-danger)' }}>
                {analysis.lowest.toFixed(1)}
              </div>
            </div>
            {analysis.prediction && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Prediksi</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--gauge-warning)' }}>
                  {analysis.prediction.toFixed(1)}
                </div>
              </div>
            )}
          </div>

          <TrendLineChart
            data={trendData}
            category={category}
            showAverage={true}
            showPrediction={analysis.prediction !== undefined}
            height={250}
          />
        </div>

        {/* Sub-parameters Section */}
        {subParameters && subParameters.length > 0 && (
          <div>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              Rincian Sub-Parameter
            </h4>
            {subParameters.map((sub) => (
              <ProgressBar
                key={sub.name}
                label={sub.name}
                value={sub.value}
                showValue={true}
                useZoneColors={true}
                height={10}
                animated={true}
                subtitle={sub.weight ? `Bobot: ${sub.weight}%` : undefined}
              />
            ))}
          </div>
        )}

        {/* Insights Section */}
        {insights && insights.length > 0 && (
          <div>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              📊 Insights & Rekomendasi
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {insights.map((insight, index) => (
                <li key={index} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ParameterDetailModal;
