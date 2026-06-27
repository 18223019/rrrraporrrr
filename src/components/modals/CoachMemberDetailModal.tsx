/**
 * CoachMemberDetailModal
 * Shows per-parameter breakdown for a member, opened from the coach leaderboard table.
 *
 * IMPORTANT: Portal is ALWAYS mounted. AnimatePresence is always alive.
 * Only the inner content is conditionally rendered based on `isOpen`.
 * This prevents the framer-motion enter animation from being missed
 * when the portal itself transitions from null → mounted.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { computeBidangScore, type BidangType } from '../../data/bidangConfig';
import type { RankingMember } from '../../hooks/useRankings';

interface CoachMemberDetailModalProps {
    member: RankingMember | null;
    month: string;
    onClose: () => void;
}

const BIDANG_LIST: Array<{
    key: BidangType;
    label: string;
    scoreKey: keyof Pick<RankingMember, 'ketakmiran' | 'pembinaan' | 'aktualisasiDiri' | 'internal'>;
    headerColor: string;
}> = [
        { key: 'ketakmiran', label: 'Ketakmiran', scoreKey: 'ketakmiran', headerColor: '#059669' },
        { key: 'pembinaan', label: 'Pembinaan', scoreKey: 'pembinaan', headerColor: '#2563eb' },
        { key: 'aktualisasi', label: 'Aktualisasi Diri', scoreKey: 'aktualisasiDiri', headerColor: '#7c3aed' },
        { key: 'internal', label: 'Internal', scoreKey: 'internal', headerColor: '#d97706' },
    ];

function scoreColor(value: number | null): string {
    if (value === null) return '#94a3b8';
    if (value >= 80) return '#059669';
    if (value >= 60) return '#d97706';
    return '#dc2626';
}

export const CoachMemberDetailModal: React.FC<CoachMemberDetailModalProps> = ({
    member,
    month,
    onClose,
}) => {
    const isOpen = !!member;

    // Close on ESC
    React.useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Lock body scroll
    React.useEffect(() => {
        if (isOpen) {
            const w = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = `${w}px`;
        } else {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };
    }, [isOpen]);

    // Compute breakdowns when member is available
    const breakdowns = React.useMemo(() => {
        if (!member) return [];
        return BIDANG_LIST.map(({ key, label, scoreKey, headerColor }) => {
            const result = computeBidangScore(key, (col) => member.rawScore?.[col], month);
            return { key, label, scoreKey, headerColor, result };
        });
    }, [member, month]);

    // Portal is ALWAYS rendered — AnimatePresence stays mounted and detects open/close transitions
    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && member && (
                <motion.div
                    key="coach-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                    }}
                >
                    <motion.div
                        key="coach-modal-panel"
                        initial={{ opacity: 0, scale: 0.96, y: 14 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 14 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Detail nilai ${member.name}`}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '900px',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: '1rem',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* ── Header ── */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '1rem', padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    height: '2.5rem', width: '2.5rem', borderRadius: '9999px',
                                    backgroundColor: '#e2e8f0', color: '#475569',
                                    fontSize: '0.875rem', fontWeight: 700, flexShrink: 0,
                                }}>
                                    #{member.rank}
                                </span>
                                <div style={{ minWidth: 0 }}>
                                    <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {member.name}
                                    </h2>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>@{member.username}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Nilai Akhir
                                    </p>
                                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                                        {member.score.toFixed(1)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Tutup"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '0.4rem', border: 'none', borderRadius: '0.5rem',
                                        backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* ── Body ── */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                                {breakdowns.map(({ key, label, scoreKey, headerColor, result }) => {
                                    const bidangScore = member[scoreKey] as number;
                                    const activeParams = result.breakdown.filter((p) => p.isActive);
                                    const inactiveParams = result.breakdown.filter((p) => !p.isActive);

                                    return (
                                        <div key={key} style={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                            {/* Bidang header */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', backgroundColor: headerColor }}>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                    {label}
                                                </span>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>
                                                    {bidangScore > 0 ? bidangScore.toFixed(1) : '–'}
                                                </span>
                                            </div>

                                            {/* Parameter rows */}
                                            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                                        <th style={{ textAlign: 'left', padding: '0.45rem 0.875rem', fontSize: '0.68rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parameter</th>
                                                        <th style={{ textAlign: 'right', padding: '0.45rem 0.875rem', fontSize: '0.68rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nilai</th>
                                                        <th style={{ textAlign: 'right', padding: '0.45rem 0.875rem', fontSize: '0.68rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bobot</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.breakdown.map((param, i) => (
                                                        <tr key={param.column} style={{ borderBottom: i < result.breakdown.length - 1 ? '1px solid #f1f5f9' : 'none', opacity: param.isActive ? 1 : 0.4 }}>
                                                            <td style={{ padding: '0.55rem 0.875rem', color: '#334155', fontWeight: 500 }}>
                                                                {param.column}
                                                                {!param.isActive && <span style={{ marginLeft: '0.35rem', fontSize: '0.7rem', color: '#94a3b8' }}>(kosong)</span>}
                                                            </td>
                                                            <td style={{ textAlign: 'right', padding: '0.55rem 0.875rem', fontVariantNumeric: 'tabular-nums', color: scoreColor(param.value), fontWeight: 600 }}>
                                                                {param.value !== null ? param.value.toFixed(1) : '–'}
                                                            </td>
                                                            <td style={{ textAlign: 'right', padding: '0.55rem 0.875rem', fontVariantNumeric: 'tabular-nums', color: '#94a3b8' }}>
                                                                {param.originalWeight}%
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                {inactiveParams.length > 0 && (
                                                    <tfoot>
                                                        <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                                                            <td colSpan={3} style={{ padding: '0.35rem 0.875rem', fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>
                                                                {activeParams.length} dari {result.breakdown.length} parameter terisi
                                                                {result.activeWeight < result.totalWeight && <span style={{ marginLeft: '0.25rem' }}>· bobot aktif {result.activeWeight}%</span>}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
