/**
 * useRankings Hook
 * Fetch dan calculate rankings untuk Astra (Ikhwan) dan Astri (Akhwat)
 */

import { useState, useEffect } from 'react';
import { getScores, getMembers } from '../services/api';
import type { ScoreRecord, Member } from '../services/api';
import { useApiRoute } from './useApiRoute';
import { computeBidangScore } from '../data/bidangConfig';

// List Ikhwan (Astra) usernames - dari memberNames.ts
const IKHWAN_USERNAMES = [
  'Alif', 'Mamad', 'AF', 'Dio', 'Ditok', 'Ilham', 'Icad', 'Uwais', 'Zamil', 'Riki',
  'Aji', 'Aufa', 'Daffa', 'Galang', 'Hafizh', 'Hamdan', 'Hanif', 'Irshad', 'Tahmid', 'Yazid'
];

// List Akhwat (Astri) usernames - dari memberNames.ts
const AKHWAT_USERNAMES = [
  'Aqeela', 'Amal', 'Annisa', 'Izza', 'Khansa', 'Kuny', 'Aza', 'Yara', 'Nisa', 'Tifa',
  'Aisyah', 'Aliynt', 'Berlia', 'Arin', 'Hazu', 'Haura', 'Nabila', 'Najma', 'Raisya', 'Raudah'
];

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

        // Fetch scores dan members
        const [scoresResponse, membersResponse] = await Promise.all([
          getScores(month),
          getMembers(),
        ]);

        if (!scoresResponse.success || !membersResponse.success) {
          throw new Error('Failed to fetch data');
        }

        const scores = scoresResponse.data;
        const members = membersResponse.data;

        // Create map untuk lookup member details
        const memberMap = new Map<string, Member>();
        members.forEach(member => {
          memberMap.set(member.username, member);
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

        scores.forEach((score: ScoreRecord) => {
          const username = score.Panggilan;
          const member = memberMap.get(username);
          
          const ketakmiranResult = computeBidangScore('ketakmiran', (column) => score[column], month);
          const pembinaanResult = computeBidangScore('pembinaan', (column) => score[column], month);
          const aktualisasiResult = computeBidangScore('aktualisasi', (column) => score[column], month);
          const internalResult = computeBidangScore('internal', (column) => score[column], month);

          const bidangResults = [
            ketakmiranResult,
            pembinaanResult,
            aktualisasiResult,
            internalResult,
          ];
          
          // OVERALL SCORE: Average of bidang yang memiliki data aktif (aktif weight > 0)
          const bidangWithData = bidangResults.filter((result) => result.activeWeight > 0);
          const totalScore = bidangWithData.length > 0
            ? bidangWithData.reduce((acc, result) => acc + result.score, 0) / bidangWithData.length
            : 0;

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

          if (IKHWAN_USERNAMES.includes(username)) {
            astraScores.push(scoreData);
          } else if (AKHWAT_USERNAMES.includes(username)) {
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
