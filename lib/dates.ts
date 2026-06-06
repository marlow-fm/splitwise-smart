export function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function monthLabel(date = new Date()): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** YYYY-MM-DD for <input type="date"> */
export function toDateInputValue(date: Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ISO string from YYYY-MM-DD date input */
export function dateFromDateInput(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

/** @deprecated use toDateInputValue */
export function toMonthInputValue(date: Date): string {
  return toDateInputValue(date).slice(0, 7);
}

/** @deprecated use dateFromDateInput */
export function dateFromMonthInput(value: string): string {
  return dateFromDateInput(`${value}-15`);
}

const MONTH_BY_NAME: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const MONTH_PATTERN =
  'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec';

function parseMonthName(raw: string): number | null {
  return MONTH_BY_NAME[raw.toLowerCase()] ?? null;
}

function inferYear(monthIndex: number, now: Date): number {
  const y = now.getFullYear();
  if (monthIndex > now.getMonth()) return y - 1;
  return y;
}

function calendarDate(year: number, monthIndex: number, day = 1): Date {
  return new Date(year, monthIndex, day, 12, 0, 0);
}

function monthDate(year: number, monthIndex: number): Date {
  return calendarDate(year, monthIndex, 1);
}

export function extractExpenseMonth(
  text: string,
  now = new Date(),
): { date: Date | null; remaining: string } {
  let remaining = text;

  const patterns: { re: RegExp; pick: (m: RegExpMatchArray) => Date | null }[] = [
    // 2026-03-15 or 2026/03/15
    {
      re: /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/,
      pick: (m) => calendarDate(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)),
    },
    // 3/15/2026 or 03-15-26
    {
      re: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
      pick: (m) => {
        let year = parseInt(m[3], 10);
        if (year < 100) year += 2000;
        return calendarDate(year, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
      },
    },
    // March 15, 2026 / March 15 2026
    {
      re: new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?\\b`, 'i'),
      pick: (m) => {
        const month = parseMonthName(m[1]);
        if (month === null) return null;
        const day = parseInt(m[2], 10);
        const year = m[3] ? parseInt(m[3], 10) : inferYear(month, now);
        return calendarDate(year, month, day);
      },
    },
    // for March 2026 (not "for everyone")
    {
      re: new RegExp(
        `\\bfor\\s+(?!everyone|everybody|the\\s+whole\\s+house)(${MONTH_PATTERN})(?:\\s+(\\d{4}))?\\b`,
        'i',
      ),
      pick: (m) => {
        const month = parseMonthName(m[1]);
        if (month === null) return null;
        const year = m[2] ? parseInt(m[2], 10) : inferYear(month, now);
        return monthDate(year, month);
      },
    },
    // Sep – Oct 2025 / Mar-Apr 2026 → first month in range
    {
      re: new RegExp(
        `\\b(?:for\\s+)?(${MONTH_PATTERN})\\s*[–\\-]\\s*(?:${MONTH_PATTERN})\\s+(\\d{4})\\b`,
        'i',
      ),
      pick: (m) => {
        const month = parseMonthName(m[1]);
        if (month === null) return null;
        return monthDate(parseInt(m[2], 10), month);
      },
    },
    // 3/2026 or 03-2026 (month + year, day defaults to 1st)
    {
      re: /\b(\d{1,2})[\/\-](\d{4})\b/,
      pick: (m) => {
        const month = parseInt(m[1], 10) - 1;
        if (month < 0 || month > 11) return null;
        return monthDate(parseInt(m[2], 10), month);
      },
    },
    // September 2025 electric / March 2026 rent
    {
      re: new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{4})\\b`, 'i'),
      pick: (m) => {
        const month = parseMonthName(m[1]);
        if (month === null) return null;
        return monthDate(parseInt(m[2], 10), month);
      },
    },
    // March electric / September rent (no year)
    {
      re: new RegExp(
        `\\b(${MONTH_PATTERN})\\s+(?:rent|electric|utilities|wifi|water|bill|insurance|gas)\\b`,
        'i',
      ),
      pick: (m) => {
        const month = parseMonthName(m[1]);
        if (month === null) return null;
        return monthDate(inferYear(month, now), month);
      },
    },
    // backlog / backdated for March
    {
      re: new RegExp(`\\b(?:backlog|backdated?)\\s+(?:for\\s+)?(${MONTH_PATTERN})(?:\\s+(\\d{4}))?\\b`, 'i'),
      pick: (m) => {
        const month = parseMonthName(m[1]);
        if (month === null) return null;
        const year = m[2] ? parseInt(m[2], 10) : inferYear(month, now);
        return monthDate(year, month);
      },
    },
  ];

  for (const { re, pick } of patterns) {
    const m = remaining.match(re);
    if (!m) continue;
    const date = pick(m);
    if (!date) continue;
    remaining = remaining.replace(m[0], ' ');
    return { date, remaining };
  }

  return { date: null, remaining };
}
