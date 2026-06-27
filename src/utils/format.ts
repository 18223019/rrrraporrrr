export const formatPercent = (value: number, maximumFractionDigits = 1): string => {
  if (!Number.isFinite(value)) {
    return '0%';
  }

  const normalizedValue = Math.abs(value) < 0.0001 ? 0 : value;
  const hasFraction = Math.abs(normalizedValue % 1) > 0.0001;

  const formatter = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: hasFraction ? Math.min(1, maximumFractionDigits) : 0,
    maximumFractionDigits,
  });

  return `${formatter.format(normalizedValue)}%`;
};
