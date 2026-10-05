/**
 * useRankings Hook
 * Fetch dan calculate rankings untuk Astra (Ikhwan) dan Astri (Akhwat)
 */

import { useState, useEffect } from 'react';
import { getScores, getMembers } from '../services/api';
import type { ScoreRecord, Member } from '../services/api';
import { useApiRoute } from './useApiRoute';
import { computeBidangScore, getBidangRecordValue, getBidangGroup } from '../data/bidangConfig';

// List Ikhwan (Astra) usernames - dari memberNames.ts
const IKHWAN_USERNAMES = [
  'Aji', 'Aufa', 'Daffa', 'Galang', 'Hafizh', 'Hamdan', 'Hanif', 'Irshad', 'Tahmid', 'Yazid',
  'Abdi', 'Altha' , 'Erza', 'Ghaffar', 'Ibrahim', 'Joni', 'Faris', 'Fatih', 'Nabil', 'Syafiq'
];

// List Akhwat (Astri) usernames - dari memberNames.ts
const AKHWAT_USERNAMES = [
  'Aisyah', 'Aliynt', 'Berlia', 'Arin', 'Hazu', 'Haura', 'Nabila', 'Maisya', 'Raisya', 'Raudah',
  'Dea', 'Adila', 'Anisa', 'Malikah', 'Haya', 'Auni', 'Nana', 'Rafa', 'Salwa', 'Sofi'
];

const RANKING_USERNAME_ALIASES: Record<string, string> = {
  dheaa: 'dea',
};

export interface RankingMember {
  rank: number;
  name: string;
  username: string;
  score: number; // Overall Score
  ketakmiran: number;
  pembinaan: number;
  aktualisasiDiri: number;
  internal: number;
  trend: number; // Perubahan rank dari bulan lalu
  rawScore: ScoreRecord; // Raw data for parameter breakdown
}

export interface RankingsData {
  astra: RankingMember[]; // Ikhwan
  astri: RankingMember[]; // Akhwat
  month: string;
}

const getAugustSheetName = (month: string, group: 'astra' | 'astri') =>
  month === 'Agustus26' ? `${month}_${group === 'astra' ? 'Astra' : 'Astri'}` : month;

const getAugustFinalScore = (score: ScoreRecord): number | null => {
  const value = score['Total'] ?? score['Final Score'] ?? score['Final score'] ?? score['FinalScore'];
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const useRankings = (month: string) => {
  const apiRoute = useApiRoute();
  const [rankings, setRankings] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRankings = async () => {
      // Don't fetch if month is empty
      if (!month) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Agustus uses separate Astra/Astri sheets; other months use one sheet.
        const isAugust = month === 'Agustus26';
        const [astraScoresResponse, astriScoresResponse, membersResponse] = await Promise.all([
          getScores(getAugustSheetName(month, 'astra')),
          getScores(isAugust ? getAugustSheetName(month, 'astri') : month),
          getMembers(),
        ]);

        if (!astraScoresResponse.success || !astriScoresResponse.success || !membersResponse.success) {
          throw new Error('Failed to fetch data');
        }

        const scores = isAugust
          ? [
              ...astraScoresResponse.data.map((score) => ({ score, group: 'astra' as const })),
              ...astriScoresResponse.data.map((score) => ({ score, group: 'astri' as const })),
            ]
          : astraScoresResponse.data.map((score) => ({ score, group: undefined }));
        const members = membersResponse.data;

        // Create map untuk lookup member details
        const memberMap = new Map<string, Member>();
        const memberNameMap = new Map<string, Member>();
        members.forEach(member => {
          memberMap.set(member.username.toLowerCase(), member);
          memberNameMap.set(member.name.trim().toLowerCase(), member);
        });

        // Process scores dan split by gender
        const astraScores: Array<{ 
          username: string; 
          name: string; 
          score: number;
          ketakmiran: number;
          pembinaan: number;
          aktualisasiDiri: number;
          internal: number;
          rawScore: ScoreRecord;
        }> = [];
        const astriScores: Array<{ 
          username: string; 
          name: string; 
          score: number;
          ketakmiran: number;
          pembinaan: number;
          aktualisasiDiri: number;
          internal: number;
          rawScore: ScoreRecord;
        }> = [];

        scores.forEach(({ score, group: sourceGroup }) => {
          const scoreIdentity = score.Panggilan || score.Username || score.username || score.Nama;
          const normalizedIdentity = typeof scoreIdentity === 'string'
            ? scoreIdentity.trim().toLowerCase()
            : '';
          const mappedIdentity = RANKING_USERNAME_ALIASES[normalizedIdentity] ?? normalizedIdentity;
          const member = typeof scoreIdentity === 'string'
            ? memberMap.get(mappedIdentity)
              ?? memberNameMap.get(normalizedIdentity)
            : undefined;
          const username = member?.username ?? String(scoreIdentity ?? '').trim();
          const scoreGroup = sourceGroup ?? getBidangGroup(username);
          
          const readScoreValue = (column: string) => getBidangRecordValue(score, column);
          const ketakmiranResult = computeBidangScore('ketakmiran', readScoreValue, month, scoreGroup);
          const pembinaanResult = computeBidangScore('pembinaan', readScoreValue, month, scoreGroup);
          const aktualisasiResult = computeBidangScore('aktualisasi', readScoreValue, month, scoreGroup);
          const internalResult = computeBidangScore('internal', readScoreValue, month, scoreGroup);

          const bidangResults = [
            ketakmiranResult,
            pembinaanResult,
            aktualisasiResult,
            internalResult,
          ];
          
          // OVERALL SCORE: Average of bidang yang memiliki data aktif (aktif weight > 0)
          const bidangWithData = bidangResults.filter((result) => result.activeWeight > 0);
          const computedScore = bidangWithData.length > 0
            ? bidangWithData.reduce((acc, result) => acc + result.score, 0) / bidangWithData.length
            : 0;
          const totalScore = month === 'Agustus26'
            ? getAugustFinalScore(score) ?? computedScore
            : computedScore;

          if (!member) {
            console.warn(`⚠️ [useRankings] Member not found: ${username}`);
            return;
          }

          const scoreData = {
            username: member.username,
            name: member.name,
            score: totalScore,
            ketakmiran: ketakmiranResult.score,
            pembinaan: pembinaanResult.score,
            aktualisasiDiri: aktualisasiResult.score,
            internal: internalResult.score,
            rawScore: score,
          };

          if (IKHWAN_USERNAMES.some((candidate) => candidate.toLowerCase() === username.toLowerCase())) {
            astraScores.push(scoreData);
          } else if (AKHWAT_USERNAMES.some((candidate) => candidate.toLowerCase() === username.toLowerCase())) {
            astriScores.push(scoreData);
          }
        });

        // Sort by score descending
        astraScores.sort((a, b) => b.score - a.score);
        astriScores.sort((a, b) => b.score - a.score);

        // Add rank
        const astraRankings: RankingMember[] = astraScores.map((item, index) => ({
          rank: index + 1,
          name: item.name,
          username: item.username,
          score: item.score,
          ketakmiran: item.ketakmiran,
          pembinaan: item.pembinaan,
          aktualisasiDiri: item.aktualisasiDiri,
          internal: item.internal,
          trend: 0, // TODO: Calculate from previous month
          rawScore: item.rawScore,
        }));

        const astriRankings: RankingMember[] = astriScores.map((item, index) => ({
          rank: index + 1,
          name: item.name,
          username: item.username,
          score: item.score,
          ketakmiran: item.ketakmiran,
          pembinaan: item.pembinaan,
          aktualisasiDiri: item.aktualisasiDiri,
          internal: item.internal,
          trend: 0, // TODO: Calculate from previous month
          rawScore: item.rawScore,
        }));

        setRankings({
          astra: astraRankings,
          astri: astriRankings,
          month: month,
        });
      } catch (err) {
        console.error('❌ [useRankings] Error fetching rankings:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (month) {
      fetchRankings();
    }
  }, [month, apiRoute.revision]);

  return { rankings, loading, error };
};
