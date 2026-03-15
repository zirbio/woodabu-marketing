export interface DateRange {
  start: string;
  end: string;
}

const DATE_RANGE_REGEX = /^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/;

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export function parsePeriod(input: string): DateRange {
  const trimmed = input.trim();

  const rangeMatch = trimmed.match(DATE_RANGE_REGEX);
  if (rangeMatch) {
    return { start: rangeMatch[1], end: rangeMatch[2] };
  }

  const raw = new Date();
  // Normalize to local midnight to avoid UTC offset issues
  const now = new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());

  switch (trimmed) {
    case 'last-week': {
      const thisMonday = getMonday(now);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastSunday.getDate() + 6);
      return { start: formatDate(lastMonday), end: formatDate(lastSunday) };
    }
    case 'last-month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: formatDate(firstDay), end: formatDate(lastDay) };
    }
    case 'last-quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      let startMonth: number;
      let startYear = now.getFullYear();
      if (currentQuarter === 0) {
        startMonth = 9; // October
        startYear = now.getFullYear() - 1;
      } else {
        startMonth = (currentQuarter - 1) * 3;
      }
      const prevQuarterStart = new Date(startYear, startMonth, 1);
      const prevQuarterEnd = new Date(startYear, startMonth + 3, 0);
      return { start: formatDate(prevQuarterStart), end: formatDate(prevQuarterEnd) };
    }
    case 'last-year': {
      const year = now.getFullYear() - 1;
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    }
    default:
      throw new Error(`Invalid period format: "${input}". Use YYYY-MM-DD:YYYY-MM-DD or aliases: last-week, last-month, last-quarter, last-year`);
  }
}

export function parseCompareArg(input: string): { period1: DateRange; period2: DateRange } {
  if (!input.includes(' vs ')) {
    throw new Error('Compare format requires "vs" separator. Example: last-month vs last-quarter');
  }

  const [left, right] = input.split(' vs ').map((s) => s.trim());
  return {
    period1: parsePeriod(left),
    period2: parsePeriod(right),
  };
}
