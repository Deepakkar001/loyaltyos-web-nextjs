export type DashboardDateRange = {
  from: string;
  to: string;
};

export type DashboardPeriodPreset = "today" | "7d" | "1m" | "3m" | "6m" | "1y" | "custom";

export const DASHBOARD_MAX_RANGE_DAYS = 366;
export const DASHBOARD_TOP_REFERRERS_LIMIT = 5;

export const PRESET_DAY_COUNTS: Record<Exclude<DashboardPeriodPreset, "custom">, number> = {
  today: 1,
  "7d": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

export const PRESET_LABELS: Record<DashboardPeriodPreset, string> = {
  today: "Today",
  "7d": "7 days",
  "1m": "1 month",
  "3m": "3 months",
  "6m": "6 months",
  "1y": "1 year",
  custom: "Date filter",
};

export const DASHBOARD_PERIOD_OPTIONS: Exclude<DashboardPeriodPreset, "custom">[] = [
  "today",
  "7d",
  "1m",
  "3m",
  "6m",
  "1y",
];

export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Inclusive rolling window ending on `end` (defaults to today in local time). */
export function rollingDateRangeInclusive(
  dayCount: number,
  end: Date = new Date()
): DashboardDateRange {
  const to = toLocalIsoDate(end);
  const fromDate = new Date(end);
  fromDate.setDate(fromDate.getDate() - (dayCount - 1));
  return { from: toLocalIsoDate(fromDate), to };
}

export function getPresetDateRange(
  preset: Exclude<DashboardPeriodPreset, "custom">
): DashboardDateRange {
  return rollingDateRangeInclusive(PRESET_DAY_COUNTS[preset]);
}

export function getTodayDateRange(): DashboardDateRange {
  return getPresetDateRange("today");
}

export function getSevenDayDateRange(): DashboardDateRange {
  return getPresetDateRange("7d");
}

export function countDaysInRange(from: string, to: string): number {
  const start = parseLocalIsoDate(from);
  const end = parseLocalIsoDate(to);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / 86_400_000) + 1;
}

export function isTodayRange(from: string, to: string): boolean {
  const today = toLocalIsoDate(new Date());
  return from === today && to === today;
}

export function validateDashboardDateRange(
  from: string,
  to: string,
  maxDate: string
): string | null {
  if (!from || !to) return "Select both start and end dates";
  if (from > to) return "Start date must be on or before end date";
  if (to > maxDate) return "End date cannot be in the future";
  const days = countDaysInRange(from, to);
  if (days > DASHBOARD_MAX_RANGE_DAYS) {
    return `Date range cannot exceed ${DASHBOARD_MAX_RANGE_DAYS} days`;
  }
  return null;
}

export function formatDisplayDate(isoDate: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseLocalIsoDate(isoDate));
}

export function formatPeriodRangeLabel(
  from: string,
  to: string,
  locale?: string
): string {
  if (from === to) {
    if (isTodayRange(from, to)) return PRESET_LABELS.today;
    return formatDisplayDate(from, locale);
  }
  return `${formatDisplayDate(from, locale)} – ${formatDisplayDate(to, locale)}`;
}

export function formatChartAxisLabel(isoDate: string, rangeDayCount: number): string {
  const date = parseLocalIsoDate(isoDate);
  if (rangeDayCount <= 90) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" }).format(date);
}

export function enumerateIsoDatesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = parseLocalIsoDate(from);
  const end = parseLocalIsoDate(to);
  while (current.getTime() <= end.getTime()) {
    dates.push(toLocalIsoDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** Ensures every day in the range has a point (zeros when no ledger activity). */
export function fillVolumeSeriesForRange<
  T extends { date: string; issued: number; redeemed: number },
>(series: T[], from: string, to: string): T[] {
  const byDate = new Map(series.map((point) => [point.date, point]));
  return enumerateIsoDatesInRange(from, to).map((date) => {
    const existing = byDate.get(date);
    if (existing) return existing;
    return { date, issued: 0, redeemed: 0 } as T;
  });
}

export function fillReferralTrendPointsForRange<
  T extends { periodStart: string; referrals: number; rewarded: number },
>(trends: T[], from: string, to: string): T[] {
  const byDate = new Map(trends.map((point) => [point.periodStart.slice(0, 10), point]));
  return enumerateIsoDatesInRange(from, to).map((date) => {
    const existing = byDate.get(date);
    if (existing) return existing;
    return { periodStart: date, referrals: 0, rewarded: 0 } as T;
  });
}

export function getPeriodTriggerLabel(
  preset: DashboardPeriodPreset,
  appliedRange: DashboardDateRange
): string {
  if (preset === "custom") {
    return formatPeriodRangeLabel(appliedRange.from, appliedRange.to);
  }
  return PRESET_LABELS[preset];
}
