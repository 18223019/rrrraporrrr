/**
 * Color Zones Utilities - Paket 3
 * Logic for determining gauge colors based on value ranges
 */

export interface ColorZone {
  min: number;
  max: number;
  color: string;
  label: string;
  description: string;
}

export const defaultZones: ColorZone[] = [
  {
    min: 0,
    max: 60,
    color: 'var(--gauge-danger)',
    label: 'Perlu Perbaikan',
    description: 'Nilai di bawah standar, perlu peningkatan signifikan',
  },
  {
    min: 60,
    max: 80,
    color: 'var(--gauge-warning)',
    label: 'Cukup Baik',
    description: 'Nilai memadai, masih ada ruang untuk peningkatan',
  },
  {
    min: 80,
    max: 100,
    color: 'var(--gauge-success)',
    label: 'Sangat Baik',
    description: 'Nilai excellent, pertahankan performa',
  },
];

/**
 * Get color for a specific value based on zones
 */
export const getZoneColor = (value: number, zones: ColorZone[] = defaultZones): string => {
  const zone = zones.find((z) => value >= z.min && value < z.max);
  return zone?.color || zones[zones.length - 1].color;
};

/**
 * Get zone label for a specific value
 */
export const getZoneLabel = (value: number, zones: ColorZone[] = defaultZones): string => {
  const zone = zones.find((z) => value >= z.min && value < z.max);
  return zone?.label || 'Unknown';
};

/**
 * Get zone description for a specific value
 */
export const getZoneDescription = (value: number, zones: ColorZone[] = defaultZones): string => {
  const zone = zones.find((z) => value >= z.min && value < z.max);
  return zone?.description || '';
};

/**
 * Get zone object for a specific value
 */
export const getZone = (value: number, zones: ColorZone[] = defaultZones): ColorZone | undefined => {
  return zones.find((z) => value >= z.min && value < z.max);
};

/**
 * Check if value is in danger zone
 */
export const isInDangerZone = (value: number): boolean => {
  return value < 60;
};

/**
 * Check if value is in warning zone
 */
export const isInWarningZone = (value: number): boolean => {
  return value >= 60 && value < 80;
};

/**
 * Check if value is in success zone
 */
export const isInSuccessZone = (value: number): boolean => {
  return value >= 80;
};

/**
 * Get zone boundaries for chart visualization
 */
export const getZoneBoundaries = (zones: ColorZone[] = defaultZones) => {
  return zones.map((zone) => ({
    from: zone.min,
    to: zone.max,
    color: zone.color,
  }));
};

/**
 * Calculate zone distribution for a set of values
 */
export const calculateZoneDistribution = (values: number[], zones: ColorZone[] = defaultZones) => {
  const distribution = zones.map((zone) => ({
    ...zone,
    count: 0,
    percentage: 0,
  }));

  values.forEach((value) => {
    const zoneIndex = zones.findIndex((z) => value >= z.min && value < z.max);
    if (zoneIndex !== -1) {
      distribution[zoneIndex].count++;
    }
  });

  const total = values.length;
  distribution.forEach((d) => {
    d.percentage = total > 0 ? (d.count / total) * 100 : 0;
  });

  return distribution;
};

export default {
  defaultZones,
  getZoneColor,
  getZoneLabel,
  getZoneDescription,
  getZone,
  isInDangerZone,
  isInWarningZone,
  isInSuccessZone,
  getZoneBoundaries,
  calculateZoneDistribution,
};
