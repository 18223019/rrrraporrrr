import type { ScoreRecord } from '../services/api';

export type BidangType = 'ketakmiran' | 'pembinaan' | 'aktualisasi' | 'internal';

export interface BidangParameterConfig {
  column: string;
  weight: number;
}

export interface BidangParameterBreakdown {
  column: string;
  originalWeight: number;
  normalizedWeight: number;
  isActive: boolean;
  value: number | null;
}

export interface BidangScoreComputation {
  score: number;
  totalWeight: number;
  activeWeight: number;
  breakdown: BidangParameterBreakdown[];
}

type BidangConfigMap = Record<BidangType, ReadonlyArray<BidangParameterConfig>>;

const configDebugLog = (() => {
  const logged = new Set<string>();
  return (
    bidang: BidangType,
    month: string | undefined,
    parsedKey: number | null,
    resolved: 'legacy' | 'oktober25' | 'november25+',
  ) => {
    if (typeof console === 'undefined') return;
    const key = `${bidang}-${month ?? 'unset'}`;
    if (logged.has(key)) return;
    logged.add(key);
    console.info(
      `[BIDANG_CONFIG] bidang=${bidang} month=${month ?? 'unset'} parsedKey=${parsedKey ?? 'null'} resolved=${resolved}`,
    );
  };
})();

const LEGACY_BIDANG_PARAMETER_CONFIG: BidangConfigMap = {
  ketakmiran: [
    { column: 'Takmir Harian', weight: 65 },
    { column: 'Takmir Event', weight: 10 },
    { column: 'Insipirasi Subuh', weight: 15 },
    { column: 'SSD Ketakmiran', weight: 10 },
    { column: 'Challenge Takmir', weight: 5 },
  ],
  pembinaan: [
    { column: 'Tahfidz', weight: 20 },
    { column: 'Tahsin', weight: 35 },
    { column: 'Tadabbur', weight: 15 },
    { column: 'Kumsub', weight: 30 },
  ],
  aktualisasi: [
    { column: 'Eksplorasi Diri', weight: 30 },
    { column: 'Update Profil', weight: 30 },
    { column: 'Usroh/Asra Visit', weight: 5 },
    { column: 'Asra Bercerita', weight: 10 },
    { column: 'English Day', weight: 10 },
    { column: 'Mentoring 1o1', weight: 10 },
    { column: 'Asra Talk', weight: 5 },
  ],
  internal: [
    { column: 'Piket Harian', weight: 30 },
    { column: 'Piket Pekanan', weight: 30 },
    { column: 'X Day', weight: 10 },
    { column: 'Family Time', weight: 10 },
    { column: 'EmCeKa Time', weight: 10 },
    { column: 'HTH (Coaching)', weight: 10 },
  ],
};

const OKTOBER25_BIDANG_PARAMETER_CONFIG: BidangConfigMap = {
  ...LEGACY_BIDANG_PARAMETER_CONFIG,
  // Oktober25: eksplorasi sudah dihapus, bobot baru yang mulai Oktober25
  aktualisasi: [
    { column: 'Update Profil', weight: 30 },
    { column: 'Usroh/Asra Visit', weight: 10 },
    { column: 'Asra Bercerita', weight: 15 },
    { column: 'English Day', weight: 15 },
    { column: 'Mentoring 1o1', weight: 15 },
    { column: 'Asra Talk', weight: 15 },
  ],
};

const NOVEMBER25_BIDANG_PARAMETER_CONFIG: BidangConfigMap = {
  ...LEGACY_BIDANG_PARAMETER_CONFIG,
  // November25+: pembaruan bobot continuous
  aktualisasi: [
    { column: 'Update Profil', weight: 10 },
    { column: 'Usroh/Asra Visit', weight: 10 },
    { column: 'Asra Talk', weight: 20 },
    { column: 'Asra Bercerita', weight: 20 },
    { column: 'English Day', weight: 20 },
    { column: 'Mentoring 1o1', weight: 20 },
  ],
};

const MONTH_NAME_INDEX: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

const OKTOBER25_CUTOFF_KEY = parseMonthKey('Oktober25');
const NOVEMBER25_CUTOFF_KEY = parseMonthKey('November25');

function parseMonthKey(month?: string): number | null {
  if (!month) {
    return null;
  }

  const match = /^([A-Za-z]+)(\d{2})$/.exec(month.trim());
  if (!match) {
    return null;
  }

  const [, monthNameRaw, yearSuffix] = match;
  const monthIndex = MONTH_NAME_INDEX[monthNameRaw.toLowerCase()];
  if (!monthIndex) {
    return null;
  }

  const year = Number.parseInt(yearSuffix, 10);
  if (Number.isNaN(year)) {
    return null;
  }

  const normalizedYear = year + 2000;
  return normalizedYear * 12 + monthIndex;
}

export const getBidangParameterConfig = (
  bidang: BidangType,
  month?: string,
): ReadonlyArray<BidangParameterConfig> => {
  const parsedKey = parseMonthKey(month);

  if (parsedKey !== null && OKTOBER25_CUTOFF_KEY !== null && parsedKey < OKTOBER25_CUTOFF_KEY) {
    configDebugLog(bidang, month, parsedKey, 'legacy');
    return LEGACY_BIDANG_PARAMETER_CONFIG[bidang];
  }

  if (parsedKey !== null && NOVEMBER25_CUTOFF_KEY !== null && parsedKey < NOVEMBER25_CUTOFF_KEY) {
    configDebugLog(bidang, month, parsedKey, 'oktober25');
    return OKTOBER25_BIDANG_PARAMETER_CONFIG[bidang];
  }

  configDebugLog(bidang, month, parsedKey, 'november25+');
  return NOVEMBER25_BIDANG_PARAMETER_CONFIG[bidang];
};

export const normalizeValue = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric) || numeric === -1) {
    return null;
  }

  return numeric;
};

const computeBidangScoreInternal = (
  bidang: BidangType,
  getter: (column: string) => unknown,
  month?: string,
): BidangScoreComputation => {
  const config = getBidangParameterConfig(bidang, month);
  const breakdown: BidangParameterBreakdown[] = [];
  let weightedSum = 0;
  let activeWeight = 0;
  let totalWeight = 0;

  for (const { column, weight } of config) {
    const numericValue = normalizeValue(getter(column));
    const isActive = numericValue !== null;

    if (isActive && numericValue !== null) {
      weightedSum += numericValue * weight;
      activeWeight += weight;
    }

    totalWeight += weight;

    breakdown.push({
      column,
      originalWeight: weight,
      normalizedWeight: 0,
      isActive,
      value: isActive ? numericValue : null,
    });
  }

  const score = activeWeight === 0 ? 0 : weightedSum / activeWeight;

  const normalizedBreakdown = breakdown.map((entry) => ({
    ...entry,
    normalizedWeight:
      entry.isActive && activeWeight > 0
        ? (entry.originalWeight / activeWeight) * 100
        : 0,
  }));

  return {
    score,
    totalWeight,
    activeWeight,
    breakdown: normalizedBreakdown,
  };
};

export const computeBidangScore = (
  bidang: BidangType,
  getter: (column: string) => unknown,
  month?: string,
): BidangScoreComputation => computeBidangScoreInternal(bidang, getter, month);

export const calculateBidangWeightedScore = (
  bidang: BidangType,
  getter: (column: string) => unknown,
  month?: string,
): number => computeBidangScoreInternal(bidang, getter, month).score;

export const calculateBidangWeightedScoreFromRecord = (
  bidang: BidangType,
  record: Partial<Record<string, unknown>> | ScoreRecord,
  month?: string,
): number => computeBidangScoreInternal(bidang, (column) => record[column], month).score;

export const getBidangParameterBreakdown = (
  bidang: BidangType,
  getter: (column: string) => unknown,
  month?: string,
): BidangParameterBreakdown[] => computeBidangScoreInternal(bidang, getter, month).breakdown;

export const getBidangTotalWeight = (bidang: BidangType, month?: string): number => {
  return getBidangParameterConfig(bidang, month).reduce((sum, item) => sum + item.weight, 0);
};
