import moment from 'moment';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Debt, Repayment } from '../../commons/types';
import { formatCompactCurrency, formatCurrency } from '../../commons/utils';
import {
  buildDebtCalendar,
  debtMarkerLegend,
  debtTouchesDay,
  startDayOf,
  toPaidAt,
} from './debtCalendar';

const debt = (patch: Partial<Debt>): Debt => ({
  id: 'd1',
  userId: 'u1',
  type: 'PAYABLE',
  title: 'Vay',
  totalAmount: 1000000,
  paidAmount: 0,
  remaining: 1000000,
  status: 'PENDING',
  createdAt: '2026-11-01T03:00:00',
  updatedAt: '2026-11-01T03:00:00',
  ...patch,
});

const repayment = (paidAt: string, amount: number): Repayment => ({
  id: `r-${paidAt}`,
  debtId: 'd1',
  amount,
  paidAt,
  createdAt: paidAt,
});

describe('debt calendar helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0, 0)); // 2026-11-15, local time
  });
  afterEach(() => vi.useRealTimers());

  it('startDayOf: the start date, else the day it was recorded', () => {
    expect(startDayOf(debt({ startDate: '2026-11-05' }))).toBe('2026-11-05');
    expect(startDayOf(debt({}))).toBe('2026-11-01');
  });

  it('toPaidAt: today goes to the server clock, a past day is sent as local midnight', () => {
    expect(toPaidAt('2026-11-15')).toBeUndefined();
    const paidAt = toPaidAt('2026-11-10');
    expect(paidAt).toBe(moment('2026-11-10').startOf('day').format());
    expect(moment(paidAt).format('YYYY-MM-DD HH:mm')).toBe('2026-11-10 00:00');
  });

  it('debtTouchesDay: start, due and repayment days', () => {
    const d = debt({
      startDate: '2026-11-02',
      dueDate: '2026-11-20',
      repayments: [repayment('2026-11-08T09:00:00', 100000)],
    });
    expect(debtTouchesDay(d, '2026-11-02')).toBe(true);
    expect(debtTouchesDay(d, '2026-11-20')).toBe(true);
    expect(debtTouchesDay(d, '2026-11-08')).toBe(true);
    expect(debtTouchesDay(d, '2026-11-09')).toBe(false);
  });

  it('debtMarkerLegend is worded for each side of the ledger', () => {
    expect(debtMarkerLegend(true)).toEqual({
      success: 'Đã trả',
      warning: 'Chưa trả xong',
      danger: 'Quá hạn chưa trả',
    });
    expect(debtMarkerLegend(false)).toEqual({
      success: 'Đã thu',
      warning: 'Chưa thu đủ',
      danger: 'Quá hạn chưa thu',
    });
  });

  it('buildDebtCalendar: money per day, details, status markers and month summary', () => {
    const open = debt({
      id: 'a',
      title: 'Anh Tuấn',
      startDate: '2026-11-02',
      dueDate: '2026-11-10', // passed and unpaid: late
      remaining: 600000,
      repayments: [
        repayment('2026-11-05T08:00:00', 300000),
        repayment('2026-11-05T18:00:00', 100000),
      ],
    });
    const done = debt({
      id: 'b',
      title: 'Chị Lan',
      totalAmount: 500000,
      remaining: 0,
      status: 'COMPLETED',
      startDate: '2026-10-20', // started last month: only its due day is in November
      dueDate: '2026-11-25',
    });
    const cal = buildDebtCalendar([open, done], '2026-11', true);

    expect(cal.values).toEqual({ '2026-11-02': 1000000, '2026-11-05': 400000 });
    expect(cal.details['2026-11-02']).toBe(`Vay ${formatCurrency(1000000)}`);
    expect(cal.details['2026-11-05']).toBe(`Trả ${formatCurrency(400000)}`);
    expect(cal.markers['2026-11-02']).toEqual([
      { tone: 'danger', text: `Quá hạn, chưa trả ${formatCurrency(600000)}: Anh Tuấn` },
    ]);
    // Two payments on one day read as one line.
    expect(cal.markers['2026-11-05']).toEqual([
      { tone: 'success', text: `Đã trả ${formatCurrency(400000)}: Anh Tuấn` },
    ]);
    expect(cal.markers['2026-11-10']).toEqual([
      { tone: 'danger', text: `Quá hạn, chưa trả ${formatCurrency(600000)}: Anh Tuấn` },
    ]);
    expect(cal.markers['2026-11-25']).toEqual([{ tone: 'success', text: 'Đã trả xong: Chị Lan' }]);
    expect(cal.summary).toBe(
      `Vay ${formatCompactCurrency(1000000)} · Trả ${formatCompactCurrency(400000)}`
    );
    expect(cal.legend).toEqual(debtMarkerLegend(true));
  });

  it('buildDebtCalendar: receivable wording, open debt not yet due', () => {
    const d = debt({
      type: 'RECEIVABLE',
      title: 'Minh',
      startDate: '2026-11-03',
      dueDate: '2026-11-30',
    });
    const cal = buildDebtCalendar([d], '2026-11', false);
    expect(cal.details['2026-11-03']).toBe(`Cho vay ${formatCurrency(1000000)}`);
    expect(cal.markers['2026-11-03']).toEqual([
      { tone: 'warning', text: `Chưa thu đủ, còn ${formatCurrency(1000000)}: Minh` },
    ]);
    expect(cal.markers['2026-11-30']).toEqual([
      { tone: 'warning', text: `Đến hạn, chưa thu ${formatCurrency(1000000)}: Minh` },
    ]);
    // Another month: nothing.
    expect(buildDebtCalendar([d], '2026-10', false).values).toEqual({});
  });
});
