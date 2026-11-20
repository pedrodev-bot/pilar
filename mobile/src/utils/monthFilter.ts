export interface MonthKey {
  year: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
}

export function getCurrentMonthKey(): MonthKey {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function isSameMonth(a: MonthKey, b: MonthKey): boolean {
  return a.year === b.year && a.month === b.month;
}

export function toMonthId(m: MonthKey): string {
  return `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
}

export function fromMonthId(id: string): MonthKey | null {
  const match = id.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return { year, month };
}

export function matchesMonth(dateStr: string, target: MonthKey): boolean {
  const d = new Date(dateStr);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === target.year && d.getMonth() === target.month;
}

export function formatMonthLabel(target: MonthKey, locale: string, currentYear = new Date().getFullYear()): string {
  const sample = new Date(target.year, target.month, 15);
  const rawMonth = sample.toLocaleString(locale, { month: 'long' });
  const capitalized = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);
  return target.year === currentYear ? capitalized : `${capitalized} ${target.year}`;
}

export function getAvailableMonthTimeline(dates: string[]): {
  activeMonths: MonthKey[];
  allMonthsInRange: (MonthKey & { hasTransactions: boolean })[];
} {
  const current = getCurrentMonthKey();
  const activeSet = new Set<string>([toMonthId(current)]);
  let minYear = current.year;
  let minMonth = current.month;

  for (const dateStr of dates) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const m = d.getMonth();

    // Ignore future months beyond current month
    if (y > current.year || (y === current.year && m > current.month)) continue;

    activeSet.add(toMonthId({ year: y, month: m }));

    if (y < minYear || (y === minYear && m < minMonth)) {
      minYear = y;
      minMonth = m;
    }
  }

  const allMonthsInRange: (MonthKey & { hasTransactions: boolean })[] = [];
  const activeMonths: MonthKey[] = [];

  let cursorYear = current.year;
  let cursorMonth = current.month;

  while (cursorYear > minYear || (cursorYear === minYear && cursorMonth >= minMonth)) {
    const key: MonthKey = { year: cursorYear, month: cursorMonth };
    const hasTransactions = activeSet.has(toMonthId(key));

    allMonthsInRange.push({ ...key, hasTransactions });
    if (hasTransactions) {
      activeMonths.push(key);
    }

    if (cursorMonth === 0) {
      cursorYear -= 1;
      cursorMonth = 11;
    } else {
      cursorMonth -= 1;
    }
  }

  // Sort ascending (oldest -> current) so left goes back and right goes forward
  allMonthsInRange.reverse();
  activeMonths.reverse();

  return { activeMonths, allMonthsInRange };
}