import { describe, it, expect, vi, afterEach } from 'vitest';
import { parsePeriod, parseCompareArg } from './date-parser.js';

describe('parsePeriod', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses explicit date range YYYY-MM-DD:YYYY-MM-DD', () => {
    const result = parsePeriod('2026-02-01:2026-02-28');
    expect(result).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('parses "last-week" alias', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    const result = parsePeriod('last-week');
    expect(result).toEqual({ start: '2026-03-02', end: '2026-03-08' });
  });

  it('parses "last-month" alias', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    const result = parsePeriod('last-month');
    expect(result).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('rejects invalid format', () => {
    expect(() => parsePeriod('not-a-date')).toThrow('Invalid period format');
  });
});

describe('parseCompareArg', () => {
  it('parses "period1 vs period2"', () => {
    const result = parseCompareArg('2026-02-01:2026-02-28 vs 2026-01-01:2026-01-31');
    expect(result).toEqual({
      period1: { start: '2026-02-01', end: '2026-02-28' },
      period2: { start: '2026-01-01', end: '2026-01-31' },
    });
  });

  it('parses aliases "last-month vs last-quarter"', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    const result = parseCompareArg('last-month vs last-quarter');
    expect(result.period1).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(result.period2.start).toBe('2025-10-01');
  });

  it('rejects missing "vs" separator', () => {
    expect(() => parseCompareArg('2026-01-01:2026-01-31')).toThrow('vs');
  });
});

describe('parsePeriod — last-quarter alias', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Q1 (March): last-quarter → Oct-Dec previous year', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    const result = parsePeriod('last-quarter');
    expect(result).toEqual({ start: '2025-10-01', end: '2025-12-31' });
  });

  it('Q2 (June): last-quarter → Jan-Mar same year', () => {
    vi.setSystemTime(new Date('2026-06-15'));
    const result = parsePeriod('last-quarter');
    expect(result).toEqual({ start: '2026-01-01', end: '2026-03-31' });
  });

  it('Q3 (September): last-quarter → Apr-Jun same year', () => {
    vi.setSystemTime(new Date('2026-09-15'));
    const result = parsePeriod('last-quarter');
    expect(result).toEqual({ start: '2026-04-01', end: '2026-06-30' });
  });

  it('Q4 (December): last-quarter → Jul-Sep same year', () => {
    vi.setSystemTime(new Date('2026-12-15'));
    const result = parsePeriod('last-quarter');
    expect(result).toEqual({ start: '2026-07-01', end: '2026-09-30' });
  });
});

describe('parsePeriod — last-year alias', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns full previous year', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    const result = parsePeriod('last-year');
    expect(result).toEqual({ start: '2025-01-01', end: '2025-12-31' });
  });
});

describe('parsePeriod — whitespace handling', () => {
  it('trims leading/trailing whitespace', () => {
    const result = parsePeriod('  2026-01-01:2026-01-31  ');
    expect(result).toEqual({ start: '2026-01-01', end: '2026-01-31' });
  });
});

describe('parsePeriod — edge cases', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('explicit range with same start and end date', () => {
    const result = parsePeriod('2026-03-15:2026-03-15');
    expect(result.start).toBe(result.end);
  });

  it('last-month at January → December previous year', () => {
    vi.setSystemTime(new Date('2026-01-15'));
    const result = parsePeriod('last-month');
    expect(result).toEqual({ start: '2025-12-01', end: '2025-12-31' });
  });

  it('last-week when today is Monday', () => {
    vi.setSystemTime(new Date('2026-03-16')); // Monday
    const result = parsePeriod('last-week');
    expect(result).toEqual({ start: '2026-03-09', end: '2026-03-15' });
  });

  it('last-week when today is Sunday', () => {
    vi.setSystemTime(new Date('2026-03-15')); // Sunday
    const result = parsePeriod('last-week');
    expect(result).toEqual({ start: '2026-03-02', end: '2026-03-08' });
  });
});

describe('parseCompareArg — edge cases', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mixed alias and explicit: "last-month vs 2026-01-01:2026-01-31"', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    const result = parseCompareArg('last-month vs 2026-01-01:2026-01-31');
    expect(result.period1).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(result.period2).toEqual({ start: '2026-01-01', end: '2026-01-31' });
  });

  it('trims whitespace around vs', () => {
    const result = parseCompareArg('2026-01-01:2026-01-31  vs  2026-02-01:2026-02-28');
    expect(result.period1.start).toBe('2026-01-01');
    expect(result.period2.start).toBe('2026-02-01');
  });
});
