import type { ScoreRecord } from '../services/api';

export type BidangType = 'ketakmiran' | 'pembinaan' | 'aktualisasi' | 'internal' | 'osram';
export type BidangGroup = 'astra' | 'astri';

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
  bonus: number;
  totalWeight: number;
  activeWeight: number;
  breakdown: BidangParameterBreakdown[];
}

type BidangConfigMap = Record<BidangType, ReadonlyArray<BidangParameterConfig>>;

const ASTRA_USERNAMES = new Set([
  'Aji', 'Aufa', 'Daffa', 'Galang', 'Hafizh', 'Hamdan', 'Hanif', 'Irshad', 'Tahmid', 'Yazid',
  'Abdi', 'Altha', 'Erza', 'Ghaffar', 'Ibrahim', 'Joni', 'Faris', 'Fatih', 'Nabil', 'Syafiq',
]);

const ASTRI_USERNAMES = new Set([
  'Aisyah', 'Aliynt', 'Berlia', 'Arin', 'Hazu', 'Haura', 'Nabila', 'Maisya', 'Raisya', 'Raudah',
  'Dea', 'Adila', 'Anisa', 'Malikah', 'Haya', 'Auni', 'Nana', 'Rafa', 'Salwa', 'Sofi',
]);

export const getBidangGroup = (username: unknown): BidangGroup | undefined => {
  if (typeof username !== 'string') return undefined;
  if (ASTRA_USERNAMES.has(username)) return 'astra';
  if (ASTRI_USERNAMES.has(username)) return 'astri';
  return undefined;
};

export const getBidangColumnAliases = (column: string): string[] => {
  if (column === 'Kehadiran Osram') return ['Kehadiran'];
  if (column === 'Kehadiran Kumsub') return ['Kumsub', 'Kumsub Agustus', 'Penugasan'];
  if (column === 'Post Test') return ['Post Test', 'Rata-rata Post Test'];
  if (column === 'Rata-rata Post Test') return ['Rata-Rata', 'Post Test', 'Rata-rata Post-Test', 'Rata-rata Posttest'];
  if (column === 'Inspirasi Subuh') return ['Insipirasi Subuh'];
  if (column === 'SSD ketakmiran') return ['SSD Ketakmiran'];
  if (column === 'Feedback (AHA)') return ['Feedback AHA', 'Feedback'];
  if (column === '50 Mimpi') return ['50 Mimpi', 'Penugasan', 'Penugasan 50 Mimpi'];
  if (column === 'Wawancara Karyawan') return ['Wawancara Karyawan', 'Wawancara'];
  if (column === 'Ketakmiran') return ['Ketakmiran Astra', 'Ketakmiran Astri'];
  if (column === 'Challenge Kamar') return ['Penugasan'];
  return [];
};

export const getBidangRecordValue = (
  record: Record<string, unknown>,
  column: string,
): unknown => {
  const candidates = [column, ...getBidangColumnAliases(column)];
  const entries = Object.entries(record);

  for (const candidate of candidates) {
    const exact = record[candidate];
    if (exact !== undefined) return exact;

    const normalizedCandidate = candidate.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const match = entries.find(([key]) =>
      key.toLowerCase().replace(/[^a-z0-9]+/g, '') === normalizedCandidate,
    );
    if (match) return match[1];
  }

  return undefined;
};

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
  ],
  pembinaan: [
    { column: 'Tahfidz', weight: 20 },
    { column: 'Tahsin', weight: 30 },
    { column: 'Tadabbur', weight: 20 },
    { column: 'Kumsub', weight: 30 },
  ],
  aktualisasi: [
    { column: 'Wisdom Journey', weight: 50 },
    { column: 'English Day', weight: 20 },
    { column: 'Asra Talk', weight: 30 },
  ],
  internal: [
    { column: 'Piket Harian', weight: 30 },
    { column: 'Piket Pekanan', weight: 30 },
    { column: 'X Day', weight: 10 },
    { column: 'Family Time', weight: 10 },
    { column: 'EmCeKa Time', weight: 10 },
    { column: 'HTH (Coaching)', weight: 10 },
  ],
  osram: [
    { column: 'Kegiatan Osram', weight: 18 },
    { column: 'Kumsub Agustus', weight: 18 },
    { column: 'Challenge Kamar', weight: 13 },
    { column: 'Wawancara Karyawan', weight: 8 },
    { column: '50 Mimpi', weight: 8 },
    { column: 'Resume', weight: 7 },
    { column: 'Feedback (AHA)', weight: 5 },
    { column: 'Fiqh Interaksi', weight: 2.875 },
    { column: 'ALIP', weight: 2.875 },
    { column: 'Pemulsaran Jenazah', weight: 2.875 },
    { column: 'Utilitas Air', weight: 2.875 },
    { column: 'Utilitas Listrik', weight: 2.875 },
    { column: 'Temu Bidang I', weight: 2.875 },
    { column: 'Temu Bidang II', weight: 2.875 },
    { column: 'Temu Bidang III', weight: 2.875 },
    { column: 'Takmir Harian', weight: 12 },
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

const SEPTEMBER26_BIDANG_PARAMETER_CONFIG: BidangConfigMap = {
  ...LEGACY_BIDANG_PARAMETER_CONFIG,
  ketakmiran: [
    { column: 'Takmir Harian', weight: 60 },
    { column: 'Takmir Event', weight: 17.5 },
    { column: 'Insipirasi Subuh', weight: 12.5 },
  ],
  pembinaan: [
    { column: 'Tahfidz', weight: 20 },
    { column: 'Tahsin', weight: 30 },
    { column: 'Fiqh', weight: 20 },
    { column: 'Kumsub', weight: 30 },
  ],
  aktualisasi: [
    { column: 'Wisdom Journey', weight: 50 },
    { column: 'English Day', weight: 20 },
    { column: 'Asra Talk', weight: 30 },
  ],
};

const SEPTEMBER26_ASTRI_KETAKMIRAN_CONFIG: ReadonlyArray<BidangParameterConfig> = [
  { column: 'Takmir Harian', weight: 60 },
  { column: 'Takmir Event', weight: 12.5 },
  { column: 'Insipirasi Subuh', weight: 17.5 },
];

const AGUSTUS26_OSRAM_CONFIG: ReadonlyArray<BidangParameterConfig> = [
  { column: 'Kehadiran Osram', weight: 18 },
  { column: 'Kehadiran Kumsub', weight: 18 },
  { column: 'Challenge Kamar', weight: 13 },
  { column: 'Wawancara Karyawan', weight: 8 },
  { column: '50 Mimpi', weight: 8 },
  { column: 'Resume', weight: 7 },
  { column: 'Feedback (AHA)', weight: 5 },
  { column: 'Post Test', weight: 23 },
  { column: 'Ketakmiran', weight: 12 },
];

const AGUSTUS26_ASTRI_OSRAM_CONFIG: ReadonlyArray<BidangParameterConfig> = [
  { column: 'Kehadiran Osram', weight: 20 },
  { column: 'Kehadiran Kumsub', weight: 20 },
  { column: 'Challenge Kamar', weight: 15 },
  { column: 'Wawancara Karyawan', weight: 10 },
  { column: '50 Mimpi', weight: 10 },
  { column: 'Resume', weight: 7 },
  { column: 'Feedback (AHA)', weight: 5 },
  { column: 'Post Test', weight: 25 },
];

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
const SEPTEMBER26_CUTOFF_KEY = parseMonthKey('September26');

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
  group?: BidangGroup,
): ReadonlyArray<BidangParameterConfig> => {
  if (bidang === 'osram' && month === 'Agustus26' && group === 'astri') {
    return AGUSTUS26_ASTRI_OSRAM_CONFIG;
  }

  if (bidang === 'osram' && month === 'Agustus26') {
    return AGUSTUS26_OSRAM_CONFIG;
  }

  const parsedKey = parseMonthKey(month);

  if (parsedKey !== null && SEPTEMBER26_CUTOFF_KEY !== null && parsedKey >= SEPTEMBER26_CUTOFF_KEY) {
    if (bidang === 'ketakmiran' && group === 'astri') {
      return SEPTEMBER26_ASTRI_KETAKMIRAN_CONFIG;
    }
    return SEPTEMBER26_BIDANG_PARAMETER_CONFIG[bidang];
  }

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
  group?: BidangGroup,
): BidangScoreComputation => {
  const config = getBidangParameterConfig(bidang, month, group);
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

  const score = activeWeight === 0
    ? 0
    : bidang === 'osram'
      ? weightedSum / 100
      : bidang === 'ketakmiran' && month === 'September26'
        ? weightedSum / 100
      : weightedSum / activeWeight;
  const bonusValue = bidang === 'aktualisasi'
    ? normalizeValue(getter('Nilai bonus aktualisasi diri'))
    : null;
  const bonus = bonusValue ?? (
    bidang === 'ketakmiran' && month === 'September26' ? 10 : 0
  );

  const normalizedBreakdown = breakdown.map((entry) => ({
    ...entry,
    normalizedWeight:
      entry.isActive && activeWeight > 0
        ? bidang === 'osram' || (bidang === 'ketakmiran' && month === 'September26')
          ? entry.originalWeight
          : (entry.originalWeight / activeWeight) * 100
        : 0,
  }));

  return {
    score: score + bonus,
    bonus,
    totalWeight,
    activeWeight,
    breakdown: normalizedBreakdown,
  };
};

export const computeBidangScore = (
  bidang: BidangType,
  getter: (column: string) => unknown,
  month?: string,
  group?: BidangGroup,
): BidangScoreComputation => computeBidangScoreInternal(bidang, getter, month, group);

export const calculateBidangWeightedScore = (
  bidang: BidangType,
  getter: (column: string) => unknown,
  month?: string,
  group?: BidangGroup,
): number => computeBidangScoreInternal(bidang, getter, month, group).score;

export const calculateBidangWeightedScoreFromRecord = (
  bidang: BidangType,
  record: Partial<Record<string, unknown>> | ScoreRecord,
  month?: string,
  group?: BidangGroup,
): number => computeBidangScoreInternal(bidang, (column) => record[column], month, group).score;

export const getBidangParameterBreakdown = (
  bidang: BidangType,
  getter: (column: string) => unknown,
  month?: string,
  group?: BidangGroup,
): BidangParameterBreakdown[] => computeBidangScoreInternal(bidang, getter, month, group).breakdown;

export const getBidangTotalWeight = (bidang: BidangType, month?: string): number => {
  return getBidangParameterConfig(bidang, month).reduce((sum, item) => sum + item.weight, 0);
};
