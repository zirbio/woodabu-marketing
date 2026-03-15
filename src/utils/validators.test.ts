import { describe, it, expect } from 'vitest';
import {
  validateHeadline,
  validateDescription,
  validateRsaBatch,
} from './validators.js';

describe('validateHeadline', () => {
  it('accepts headline within 30 char limit', () => {
    expect(validateHeadline('Muebles hechos a mano')).toEqual({
      valid: true,
      value: 'Muebles hechos a mano',
      charCount: 21,
    });
  });

  it('rejects headline exceeding 30 chars', () => {
    const long = 'Este es un headline que supera el límite';
    const result = validateHeadline(long);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('30');
  });

  it('counts Spanish characters as single characters', () => {
    const headline = 'Diseño español único aquí';
    const result = validateHeadline(headline);
    expect(result.valid).toBe(true);
    expect(result.charCount).toBe(25);
  });

  it('rejects empty headline', () => {
    expect(validateHeadline('')).toEqual({
      valid: false,
      value: '',
      charCount: 0,
      error: 'Headline cannot be empty',
    });
  });

  it('warns when close to limit', () => {
    const headline = 'Madera maciza hecha a mano ya';
    const result = validateHeadline(headline);
    expect(result.valid).toBe(true);
    expect(result.warning).toContain('close to limit');
  });
});

describe('validateDescription', () => {
  it('accepts description within 90 char limit', () => {
    const desc = 'Muebles de madera maciza hechos a mano en Madrid. Garantía de por vida.';
    expect(validateDescription(desc).valid).toBe(true);
  });

  it('rejects description exceeding 90 chars', () => {
    const desc = 'A'.repeat(91);
    expect(validateDescription(desc).valid).toBe(false);
  });
});

describe('validateRsaBatch', () => {
  it('validates a complete RSA batch (15 headlines + 4 descriptions)', () => {
    const headlines = Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`);
    const descriptions = Array.from({ length: 4 }, (_, i) => `Description number ${i + 1} here`);
    const result = validateRsaBatch(headlines, descriptions);
    expect(result.valid).toBe(true);
    expect(result.headlines).toHaveLength(15);
    expect(result.descriptions).toHaveLength(4);
  });

  it('rejects batch with wrong headline count', () => {
    const headlines = Array.from({ length: 10 }, (_, i) => `H ${i}`);
    const descriptions = Array.from({ length: 4 }, (_, i) => `D ${i}`);
    const result = validateRsaBatch(headlines, descriptions);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('15');
  });

  it('collects individual validation errors', () => {
    const headlines = Array.from({ length: 15 }, () => 'A'.repeat(35));
    const descriptions = Array.from({ length: 4 }, (_, i) => `D ${i}`);
    const result = validateRsaBatch(headlines, descriptions);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('validateHeadline — boundary values', () => {
  it('exactly 30 chars → valid: true, with warning', () => {
    const h = 'A'.repeat(30);
    const result = validateHeadline(h);
    expect(result.valid).toBe(true);
    expect(result.charCount).toBe(30);
    expect(result.warning).toBeDefined();
  });

  it('exactly 28 chars → valid: true, with warning', () => {
    const h = 'A'.repeat(28);
    const result = validateHeadline(h);
    expect(result.valid).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it('exactly 27 chars → valid: true, no warning', () => {
    const h = 'A'.repeat(27);
    const result = validateHeadline(h);
    expect(result.valid).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('exactly 1 char → valid: true, no warning', () => {
    const result = validateHeadline('A');
    expect(result.valid).toBe(true);
    expect(result.charCount).toBe(1);
    expect(result.warning).toBeUndefined();
  });

  it('whitespace-only string → valid: true', () => {
    const result = validateHeadline(' ');
    expect(result.valid).toBe(true);
    expect(result.charCount).toBe(1);
  });

  it('emoji counts as 1 char: "🌿" has charCount 1', () => {
    const result = validateHeadline('🌿');
    expect(result.valid).toBe(true);
    expect(result.charCount).toBe(1);
  });

  it('flag emoji counts correctly: "🇪🇸"', () => {
    const result = validateHeadline('🇪🇸');
    expect(result.valid).toBe(true);
    // Flag emoji is 2 regional indicator symbols via spread
    expect(result.charCount).toBe(2);
  });

  it('accented vowels: á é í ó ú ñ ü each count as 1', () => {
    const text = 'áéíóúñü';
    const result = validateHeadline(text);
    expect(result.charCount).toBe(7);
  });
});

describe('validateDescription — boundary values', () => {
  it('exactly 90 chars → valid: true, with warning', () => {
    const d = 'A'.repeat(90);
    const result = validateDescription(d);
    expect(result.valid).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it('exactly 88 chars → valid: true, with warning', () => {
    const d = 'A'.repeat(88);
    const result = validateDescription(d);
    expect(result.valid).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it('exactly 87 chars → valid: true, no warning', () => {
    const d = 'A'.repeat(87);
    const result = validateDescription(d);
    expect(result.valid).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('exactly 91 chars → invalid', () => {
    const d = 'A'.repeat(91);
    const result = validateDescription(d);
    expect(result.valid).toBe(false);
  });
});

describe('validateRsaBatch — count validation', () => {
  it('wrong description count: expects 4, got 2', () => {
    const h = Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`);
    const d = ['Desc 1', 'Desc 2'];
    const result = validateRsaBatch(h, d);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('4 descriptions'))).toBe(true);
  });

  it('wrong both counts: 10 headlines, 2 descriptions → 2 count errors', () => {
    const h = Array.from({ length: 10 }, (_, i) => `H ${i}`);
    const d = ['D1', 'D2'];
    const result = validateRsaBatch(h, d);
    expect(result.valid).toBe(false);
    expect(result.errors.filter(e => e.includes('Expected')).length).toBe(2);
  });

  it('0 headlines, 0 descriptions → errors for both counts', () => {
    const result = validateRsaBatch([], []);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('15 headlines'))).toBe(true);
    expect(result.errors.some(e => e.includes('4 descriptions'))).toBe(true);
  });

  it('errors array contains individual validation errors for invalid items', () => {
    const h = [...Array.from({ length: 14 }, (_, i) => `H ${i}`), 'A'.repeat(35)];
    const d = Array.from({ length: 4 }, (_, i) => `D ${i}`);
    const result = validateRsaBatch(h, d);
    expect(result.errors.some(e => e.includes('Headline') && e.includes('exceeds'))).toBe(true);
  });

  it('error field contains first error only', () => {
    const result = validateRsaBatch([], []);
    expect(result.error).toBeDefined();
    expect(result.error).toBe(result.errors[0]);
  });

  it('valid batch → errors array empty, error undefined', () => {
    const h = Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`);
    const d = Array.from({ length: 4 }, (_, i) => `Description number ${i + 1} here`);
    const result = validateRsaBatch(h, d);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.error).toBeUndefined();
  });
});
