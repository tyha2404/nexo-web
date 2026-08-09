# Dashboard All-Time Assets & Investment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add distinct sections on the Dashboard for "Tổng tài sản từ trước đến giờ" (All-Time Net Assets) and "Đầu tư từ trước đến giờ" (All-Time Investments) formatted consistently with the system design.

**Architecture:** Extend API calls in `Dashboard.tsx` to fetch both all-time summary report metrics and selected monthly report metrics. Refactor Dashboard layout to organize cards into distinct visual sections: All-Time Net Assets & Investments, Monthly Overview, Monthly Targets, and Category Breakdown & Activity.

**Tech Stack:** React, TypeScript, Vite, CSS (CSS variables, glassmorphism design system).

---

### Task 1: Update API Service and Fetch Logic in Dashboard

**Files:**

- Modify: `nexo-web/src/services/api.ts:212-221`
- Modify: `nexo-web/src/components/Dashboard.tsx:24-72`

- [ ] **Step 1: Inspect `reportService.summary` parameters in `nexo-web/src/services/api.ts`**

Ensure `summary` function can take optional params or no params to fetch all-time summary:

```typescript
summary: async (params?: { startDate?: string; endDate?: string }): Promise<SummaryReport> => {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return request<SummaryReport>(`/reports/summary${query}`, {
    method: 'GET',
  });
},
```

- [ ] **Step 2: Add `allTimeSummary` state and update `fetchDashboardData` in `Dashboard.tsx`**

In `Dashboard.tsx`:

```typescript
const [summary, setSummary] = useState<SummaryReport | null>(null);
const [allTimeSummary, setAllTimeSummary] = useState<SummaryReport | null>(null);

const fetchDashboardData = async (monthStr: string) => {
  try {
    setLoading(true);
    setError(null);

    const m = moment(monthStr, 'YYYY-MM');
    const startOfMonth = m.startOf('month').format('YYYY-MM-DD');
    const endOfMonth = m.endOf('month').format('YYYY-MM-DD');
    const dateFilters = { startDate: startOfMonth, endDate: endOfMonth };
    const targetParams = { month: m.month() + 1, year: m.year() };

    const [summaryData, allTimeData, breakdownData, transactionsData, categoriesData, targetData] =
      await Promise.all([
        api.reports.summary(dateFilters),
        api.reports.summary(), // All-time summary without date bounds
        api.reports.categoryBreakdown(dateFilters),
        api.transactions.list(dateFilters),
        api.categories.list(),
        api.targets.getSummary(targetParams).catch(() => null),
      ]);

    setSummary(summaryData);
    setAllTimeSummary(allTimeData);
    setCategoryBreakdown(breakdownData.items || []);
    setCategories(categoriesData.items || []);
    setAllTransactions(transactionsData.items || []);
    setTargetSummary(targetData);
  } catch (err: any) {
    setError(err.message || 'Failed to fetch dashboard analytics');
  } finally {
    setLoading(false);
  }
};
```

---

### Task 2: Create All-Time Section and Restructure Dashboard Components

**Files:**

- Modify: `nexo-web/src/components/Dashboard.tsx`
- Modify: `nexo-web/src/components/Dashboard.css`

- [ ] **Step 1: Add All-Time Section and Group Monthly Section in `Dashboard.tsx`**

Render Section 1: **🏛️ Tổng quan Tích lũy (All-Time Assets & Investments)** with 2 hero cards:

1. **Tổng Tài sản tích lũy** (`allTimeSummary?.netBalance ?? 0`)
2. **Đầu tư từ trước tới giờ** (`allTimeSummary?.totalInvestment ?? 0`)

Render Section 2: **📅 Kết quả Tài chính Tháng** with monthly cards (Thu nhập, Chi tiêu, Đầu tư tháng, Số dư ròng tháng).

- [ ] **Step 2: Add styling rules in `Dashboard.css` for section titles, headers, and card highlights**

Add CSS rules:

```css
.dashboard-section {
  margin-bottom: 2rem;
}

.dashboard-section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-main);
}

.alltime-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.25rem;
}

.summary-card.alltime-assets {
  border-left: 4px solid #8b5cf6;
}

.summary-card.alltime-investment {
  border-left: 4px solid #3b82f6;
}
```

---

### Task 3: Build & Verification

**Files:**

- Verify build using Vite build command in `nexo-web`.

- [ ] **Step 1: Run TypeScript check and build verification**

Run `npm run build` inside `nexo-web` directory to confirm zero build errors or TypeScript issues.
