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
