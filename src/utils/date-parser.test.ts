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
