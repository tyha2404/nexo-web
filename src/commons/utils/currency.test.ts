import { describe, expect, it } from 'vitest';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumberInput,
  parseNumberInput,
} from './currency';

// Intl separates the amount and the symbol with a no-break space.
const normalize = (s: string) => s.replace(/\s/g, ' ');

describe('formatCurrency', () => {
  it('formats VND with dots and "đ" instead of the underlined ₫ glyph', () => {
    expect(normalize(formatCurrency(1234567))).toBe('1.234.567 đ');
    expect(formatCurrency(0)).not.toContain('₫');
  });

  it('formats negative amounts', () => {
    expect(normalize(formatCurrency(-50000))).toBe('-50.000 đ');
  });

  it('keeps other currencies untouched', () => {
    expect(formatCurrency(12.5, 'USD', 'en-US')).toBe('$12.50');
  });
});

describe('formatNumberInput', () => {
  it.each([
    [100000, '100.000'],
    ['1234567', '1.234.567'],
    ['1.234.567', '1.234.567'],
    ['12a3 4', '1.234'],
    ['0', '0'],
  ])('%j -> %j', (input, expected) => {
    expect(formatNumberInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '.,'])('returns empty for %j', (input) => {
    expect(formatNumberInput(input)).toBe('');
  });
});

describe('parseNumberInput', () => {
  it.each([
    ['100.000', 100000],
    ['1.234.567 đ', 1234567],
    [42, 42],
    ['', 0],
    ['abc', 0],
    [undefined, 0],
  ])('%j -> %j', (input, expected) => {
    expect(parseNumberInput(input)).toBe(expected);
  });

  it('round-trips with formatNumberInput', () => {
    expect(parseNumberInput(formatNumberInput(98765432))).toBe(98765432);
  });
});

describe('formatCompactCurrency', () => {
  it.each([
    [2_500_000_000, '2.5 tỷ'],
    [1_000_000_000, '1 tỷ'],
    [15_000_000, '15 tr'],
    [1_250_000, '1.3 tr'],
    [-3_000_000, '-3 tr'],
    [45_000, '45k'],
    [999, '999'],
    [0, '0'],
  ])('%d -> %s', (amount, expected) => {
    expect(formatCompactCurrency(amount)).toBe(expected);
  });
});
