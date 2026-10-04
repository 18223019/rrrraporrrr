import {
  computeBidangScore,
  getBidangRecordValue,
  getBidangGroup,
  type BidangScoreComputation,
  type BidangType,
} from '../data/bidangConfig';

const BIDANG_LIST: BidangType[] = ['ketakmiran', 'pembinaan', 'aktualisasi', 'internal'];

export type DashboardRecord = Record<string, unknown> | null;

export type BidangBreakdownMap = Record<BidangType, BidangScoreComputation>;

const getDashboardValue = (record: Record<string, unknown>, column: string, month?: string) => {
  if (month === 'Agustus26' && column === 'Takmir Harian') {
    return record['Ketakmiran Astra'];
  }
  return getBidangRecordValue(record, column);
};

export function calculateBidangBreakdown(
  record: DashboardRecord,
  month?: string,
  group = getBidangGroup(record?.Panggilan),
): BidangBreakdownMap {
  if (!record) {
    return {
      ketakmiran: computeBidangScore('ketakmiran', () => null, month),
      pembinaan: computeBidangScore('pembinaan', () => null, month),
      aktualisasi: computeBidangScore('aktualisasi', () => null, month),
      internal: computeBidangScore('internal', () => null, month),
      osram: computeBidangScore('osram', () => null, month),
    };
  }

  return {
    ketakmiran: computeBidangScore('ketakmiran', (column) => getDashboardValue(record, column, month), month, group),
    pembinaan: computeBidangScore('pembinaan', (column) => getDashboardValue(record, column, month), month, group),
    aktualisasi: computeBidangScore('aktualisasi', (column) => getDashboardValue(record, column, month), month, group),
    internal: computeBidangScore('internal', (column) => getDashboardValue(record, column, month), month, group),
    osram: computeBidangScore('osram', (column) => getDashboardValue(record, column, month), month, group),
  };
}

export interface DashboardStatsResult {
  averageScore: number;
  ketakmiran: number;
  pembinaan: number;
  aktualisasi: number;
  internal: number;
  trend: number;
  bidangBreakdown: BidangBreakdownMap;
}

export function calculateStats(
  currentData: DashboardRecord,
  currentMonth?: string,
  historyData?: Array<Record<string, unknown> & { month?: string }>,
): DashboardStatsResult {
  if (!currentData) {
    return {
      averageScore: 0,
      ketakmiran: 0,
      pembinaan: 0,
      aktualisasi: 0,
      internal: 0,
      trend: 0,
      bidangBreakdown: calculateBidangBreakdown(null, currentMonth),
    };
  }

  const latest = currentData;
  const bidangBreakdown = calculateBidangBreakdown(latest, currentMonth);

  const finalScoreValue = currentMonth === 'Agustus26'
    ? latest['Final Score'] ?? latest['Final score'] ?? latest['FinalScore']
    : undefined;
  const finalScore = Number(finalScoreValue);
  const averageScore = Number.isFinite(finalScore)
    ? finalScore
    :
    BIDANG_LIST.reduce((sum, bidang) => sum + bidangBreakdown[bidang].score, 0) /
    BIDANG_LIST.length;

  let trend = 0;
  if (historyData && historyData.length >= 2) {
  const previous = historyData[historyData.length - 2];
  const previousMonth = previous?.month ?? currentMonth;
  const prevBreakdown = calculateBidangBreakdown(previous, previousMonth, getBidangGroup(previous?.Panggilan));
    const previousAvg =
      BIDANG_LIST.reduce((sum, bidang) => sum + prevBreakdown[bidang].score, 0) /
      BIDANG_LIST.length;

    if (previousAvg > 0) {
      trend = ((averageScore - previousAvg) / previousAvg) * 100;
    }
  }

  return {
    averageScore,
    ketakmiran: bidangBreakdown.ketakmiran.score,
    pembinaan: bidangBreakdown.pembinaan.score,
    aktualisasi: bidangBreakdown.aktualisasi.score,
    internal: bidangBreakdown.internal.score,
    trend,
    bidangBreakdown,
  };
}
