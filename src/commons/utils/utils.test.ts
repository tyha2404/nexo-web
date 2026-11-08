import moment from 'moment';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OPEN_ADD_TRANSACTION_EVENT, TransactionType } from '../constants';
import { getCategoryIcon } from './category';
import { formatDate, toISODateString } from './date';
import { getErrorMessage } from './error';
import { MIN_FORECAST_DAYS, projectMonthEnd } from './forecast';
import { isTouchDevice, SEARCH_INPUT_PROPS } from './input';
import { openAddTransaction } from './transaction';

describe('formatDate / toISODateString', () => {
  it('formats for display as DD/MM/YYYY by default', () => {
    expect(formatDate('2026-11-08')).toBe('08/11/2026');
    expect(formatDate(moment('2026-01-31'), 'MM/YYYY')).toBe('01/2026');
  });

  it('formats API dates as YYYY-MM-DD', () => {
    expect(toISODateString('2026-11-08T23:59:00')).toBe('2026-11-08');
    expect(toISODateString(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toISODateString(undefined)).toBe('');
  });
});

describe('getErrorMessage', () => {
  it('prefers the error message, then a thrown string, then the fallback', () => {
    expect(getErrorMessage(new Error('Không lưu được'), 'fallback')).toBe('Không lưu được');
    expect(getErrorMessage('Lỗi mạng', 'fallback')).toBe('Lỗi mạng');
    expect(getErrorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(getErrorMessage('', 'fallback')).toBe('fallback');
    expect(getErrorMessage({ message: 'not an Error' }, 'fallback')).toBe('fallback');
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});

describe('getCategoryIcon', () => {
  it.each([
    ['Ăn uống', '🍔'],
    ['Cà phê sáng', '🍔'],
    ['Mua sắm', '🛍️'],
    ['Đổ xăng', '🚗'],
    ['Grab đi làm', '🚗'],
    ['Tiền điện', '🏠'],
    ['Du lịch', '🎬'],
    ['Khám bệnh', '💊'],
    ['Học phí', '📚'],
    ['Lương', '💵'],
    ['Cổ phiếu', '📈'],
    ['Trả nợ', '🤝'],
    ['Quà tặng', '🎁'],
    ['Hóa đơn', '📄'],
  ])('%s -> %s', (name, icon) => {
    expect(getCategoryIcon(name, TransactionType.EXPENSE)).toBe(icon);
  });

  it('matches whole words, not substrings', () => {
    // "xăng", "căn", "khăn" all contain "ăn"
    expect(getCategoryIcon('Đổ xăng')).toBe('🚗');
    expect(getCategoryIcon('Tiền căn hộ', TransactionType.EXPENSE)).toBe('💸');
    expect(getCategoryIcon('Khăn giấy', TransactionType.EXPENSE)).toBe('💸');
    // "xe" inside "xem" is not a vehicle
    expect(getCategoryIcon('Xem phim')).toBe('🎬');
  });

  it('matches multi-word keywords as a phrase', () => {
    expect(getCategoryIcon('Đi nhà hàng')).toBe('🍔');
    expect(getCategoryIcon('Y tế & Sức khỏe')).toBe('💊');
    expect(getCategoryIcon('Chứng chỉ quỹ')).toBe('📈');
    expect(getCategoryIcon('Phí dịch vụ')).toBe('📄');
  });

  it('handles decomposed (NFD) Vietnamese input', () => {
    expect(getCategoryIcon('Ăn uống'.normalize('NFD'))).toBe('🍔');
  });

  it('is case-insensitive', () => {
    expect(getCategoryIcon('GRAB')).toBe('🚗');
  });

  it('falls back on the transaction type', () => {
    expect(getCategoryIcon('Linh tinh', TransactionType.INCOME)).toBe('💰');
    expect(getCategoryIcon('Linh tinh', TransactionType.INVESTMENT)).toBe('📈');
    expect(getCategoryIcon('Linh tinh', TransactionType.EXPENSE)).toBe('💸');
    expect(getCategoryIcon(undefined, TransactionType.INCOME)).toBe('💰');
    expect(getCategoryIcon(undefined, TransactionType.INVESTMENT)).toBe('📈');
    expect(getCategoryIcon()).toBe('💸');
  });
});

describe('projectMonthEnd', () => {
  const day = (d: string) => moment(d, 'YYYY-MM-DD');

  it('projects spending so far over the whole month, rounded to the thousand', () => {
    // 1.000.000 over 10 days of a 30-day month -> 3.000.000
    expect(projectMonthEnd(1_000_000, '2026-11', day('2026-11-10'))).toBe(3_000_000);
    // 31-day month: 100.000/day * 31
    expect(projectMonthEnd(1_000_000, '2026-12', day('2026-12-10'))).toBe(3_100_000);
    // 123.456 / 7 * 30 = 529.097 -> 529.000
    expect(projectMonthEnd(123_456, '2026-11', day('2026-11-07'))).toBe(529_000);
  });

  it(`needs at least ${MIN_FORECAST_DAYS} days of data`, () => {
    expect(projectMonthEnd(500_000, '2026-11', day('2026-11-02'))).toBeNull();
    expect(
      projectMonthEnd(500_000, '2026-11', day(`2026-11-0${MIN_FORECAST_DAYS}`))
    ).not.toBeNull();
  });

  it('only projects the current month', () => {
    expect(projectMonthEnd(500_000, '2026-10', day('2026-11-15'))).toBeNull();
    expect(projectMonthEnd(500_000, '2026-12', day('2026-11-15'))).toBeNull();
  });

  it('returns null with no spending or an invalid month', () => {
    expect(projectMonthEnd(0, '2026-11', day('2026-11-15'))).toBeNull();
    expect(projectMonthEnd(-10, '2026-11', day('2026-11-15'))).toBeNull();
    expect(projectMonthEnd(500_000, '11/2026', day('2026-11-15'))).toBeNull();
  });
});

describe('openAddTransaction', () => {
  it('dispatches the global open event with the type (expense by default)', () => {
    const seen: TransactionType[] = [];
    const listener = (e: Event) => seen.push((e as CustomEvent<TransactionType>).detail);
    window.addEventListener(OPEN_ADD_TRANSACTION_EVENT, listener);
    openAddTransaction(TransactionType.INCOME);
    openAddTransaction();
    window.removeEventListener(OPEN_ADD_TRANSACTION_EVENT, listener);
    expect(seen).toEqual([TransactionType.INCOME, TransactionType.EXPENSE]);
  });
});

describe('input helpers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('detects touch devices with the coarse-pointer media query', () => {
    const matchMedia = vi.fn((query: string) => ({ matches: query === '(pointer: coarse)' }));
    vi.stubGlobal('matchMedia', matchMedia);
    expect(isTouchDevice()).toBe(true);

    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(isTouchDevice()).toBe(false);

    vi.stubGlobal('matchMedia', undefined);
    expect(isTouchDevice()).toBe(false);
  });

  it('search fields hide the keyboard on return', () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    const blur = vi.spyOn(input, 'blur');

    SEARCH_INPUT_PROPS.onKeyDown({ key: 'a', currentTarget: input } as never);
    expect(blur).not.toHaveBeenCalled();
    SEARCH_INPUT_PROPS.onKeyDown({ key: 'Enter', currentTarget: input } as never);
    expect(blur).toHaveBeenCalledOnce();
    input.remove();
  });
});
