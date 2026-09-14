/**
 * Format a number into localized currency format
 */
export const formatCurrency = (amount: number, currency = 'VND', locale = 'vi-VN'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Format string or number for input fields with thousand separators (e.g. 100000 -> 100.000)
 */
export const formatNumberInput = (val: string | number, locale = 'vi-VN'): string => {
  if (val === undefined || val === null || val === '') return '';
  const str = val.toString();
  const cleanNumber = str.replace(/\D/g, '');
  if (!cleanNumber) return '';
  return parseInt(cleanNumber, 10).toLocaleString(locale);
};

/**
 * Parse a formatted thousand separator number back into raw float (e.g. "100.000" -> 100000)
 */
export const parseNumberInput = (val?: string | number): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const cleanNumber = val.replace(/\D/g, '');
  if (!cleanNumber) return 0;
  const num = parseFloat(cleanNumber);
  return isNaN(num) ? 0 : num;
};

/**
 * Format a number into compact human-readable format (e.g. 15.000.000 -> 15 tr)
 */
export const formatCompactCurrency = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} tỷ`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')} tr`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}k`;
  }
  return amount.toString();
};
