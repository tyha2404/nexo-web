/**
 * Format a number into localized currency format
 */
export const formatCurrency = (amount: number, currency = 'VND', locale = 'vi-VN'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};
