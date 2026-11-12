import { describe, expect, it } from 'vitest';
import type { Debt } from '../types';
import { debtPaidPercent, debtStatusLabel, isDebtLate } from './debt';

const TODAY = '2026-11-11';
const debt = (patch: Partial<Debt>): Debt => ({
  id: 'd1',
  userId: 'u1',
  type: 'PAYABLE',
  title: 'Vay',
  totalAmount: 1000000,
  paidAmount: 250000,
  remaining: 750000,
  status: 'PENDING',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...patch,
});

describe('debt helpers', () => {
  it('isDebtLate: OVERDUE, or unsettled past its due date', () => {
    expect(isDebtLate(debt({ status: 'OVERDUE' }), TODAY)).toBe(true);
    expect(isDebtLate(debt({ dueDate: '2026-11-10' }), TODAY)).toBe(true);
    expect(isDebtLate(debt({ dueDate: TODAY }), TODAY)).toBe(false);
    expect(isDebtLate(debt({}), TODAY)).toBe(false);
    expect(isDebtLate(debt({ status: 'COMPLETED', dueDate: '2026-01-01' }), TODAY)).toBe(false);
  });

  it('debtPaidPercent guards a zero total and clamps', () => {
    expect(debtPaidPercent(debt({}))).toBe(25);
    expect(debtPaidPercent(debt({ totalAmount: 0, paidAmount: 0 }))).toBe(0);
    expect(debtPaidPercent(debt({ paidAmount: 2000000 }))).toBe(100);
  });

  it('debtStatusLabel: done, late (by date too), or the paid share per side', () => {
    expect(debtStatusLabel(debt({ status: 'COMPLETED' }), TODAY)).toBe('🎉 Đã xong');
    expect(debtStatusLabel(debt({ dueDate: '2026-11-01' }), TODAY)).toBe('🚨 Quá hạn');
    expect(debtStatusLabel(debt({}), TODAY)).toBe('Đã trả 25%');
    expect(debtStatusLabel(debt({ type: 'RECEIVABLE' }), TODAY)).toBe('Đã thu 25%');
    expect(debtStatusLabel(debt({ totalAmount: 0, paidAmount: 0 }), TODAY)).toBe('Đã trả 0%');
  });
});
