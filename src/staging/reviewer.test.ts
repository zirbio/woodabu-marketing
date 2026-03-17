import { describe, it, expect } from 'vitest';
import {
  formatAdTable,
  formatPostPreview,
  formatEmailSummary,
} from './reviewer.js';

describe('formatAdTable', () => {
  it('formats headlines into a numbered table', () => {
    const headlines = ['Muebles hechos a mano', 'Madera maciza sostenible'];
    const output = formatAdTable(headlines, 'headline');
    expect(output).toContain('| 1 |');
    expect(output).toContain('Muebles hechos a mano');
    expect(output).toContain('21');
  });
});

describe('formatPostPreview', () => {
  it('formats a social post with copy, hashtags, and time', () => {
    const output = formatPostPreview({
      copy: 'Cada mesa tiene una historia.',
      hashtags: ['#woodabu', '#maderanatural'],
      scheduledTime: '2026-03-20 10:00',
      imageUrl: 'https://cdn.shopify.com/mesa.jpg',
    });
    expect(output).toContain('Cada mesa tiene una historia.');
    expect(output).toContain('#woodabu');
    expect(output).toContain('10:00');
    expect(output).toContain('mesa.jpg');
  });
});

describe('formatEmailSummary', () => {
  it('formats email summary with subject variants', () => {
    const output = formatEmailSummary({
      subjects: ['Subject A', 'Subject B', 'Subject C'],
      segment: 'Repeat buyers',
      productCount: 3,
      preheader: 'Preview text here',
    });
    expect(output).toContain('Subject A');
    expect(output).toContain('Repeat buyers');
    expect(output).toContain('3 products');
  });
});

describe('formatAdTable — headlines edge cases', () => {
  it('marks headline at exactly 30 chars as WARN (within threshold)', () => {
    const output = formatAdTable(['A'.repeat(30)], 'headline');
    expect(output).toContain('WARN');
    expect(output).toContain('30');
  });

  it('marks headline at 29 chars as WARN', () => {
    const output = formatAdTable(['A'.repeat(29)], 'headline');
    expect(output).toContain('WARN');
  });

  it('marks headline at 28 chars as WARN', () => {
    const output = formatAdTable(['A'.repeat(28)], 'headline');
    expect(output).toContain('WARN');
  });

  it('marks headline at 27 chars as OK (outside threshold)', () => {
    const output = formatAdTable(['A'.repeat(27)], 'headline');
    expect(output).toContain('OK');
    expect(output).not.toContain('WARN');
    expect(output).not.toContain('OVER');
  });

  it('marks headline at 31 chars as OVER', () => {
    const output = formatAdTable(['A'.repeat(31)], 'headline');
    expect(output).toContain('OVER');
  });

  it('handles empty items array', () => {
    const output = formatAdTable([], 'headline');
    expect(output).toContain('Headline');
    // Should only have header and separator, no data rows
  });

  it('handles Spanish accented characters in char count', () => {
    const text = 'Diseño artesanal único ñ';
    const output = formatAdTable([text], 'headline');
    expect(output).toContain(String([...text].length));
  });
});

describe('formatAdTable — descriptions', () => {
  it('marks description at exactly 90 chars as WARN', () => {
    const output = formatAdTable(['A'.repeat(90)], 'description');
    expect(output).toContain('WARN');
  });

  it('marks description at 89 chars as WARN', () => {
    const output = formatAdTable(['A'.repeat(89)], 'description');
    expect(output).toContain('WARN');
  });

  it('marks description at 91 chars as OVER', () => {
    const output = formatAdTable(['A'.repeat(91)], 'description');
    expect(output).toContain('OVER');
  });
});

describe('formatPostPreview — edge cases', () => {
  it('excludes Image line when imageUrl is null', () => {
    const output = formatPostPreview({
      copy: 'Test copy', hashtags: ['#test'], scheduledTime: '2026-03-20 10:00', imageUrl: null,
    });
    expect(output).not.toContain('Image');
  });

  it('handles empty hashtags array', () => {
    const output = formatPostPreview({
      copy: 'Test copy', hashtags: [], scheduledTime: '2026-03-20 10:00', imageUrl: null,
    });
    expect(output).toContain('Hashtags');
  });

  it('handles copy with special characters', () => {
    const output = formatPostPreview({
      copy: 'Diseño & arte <moderno>', hashtags: ['#test'], scheduledTime: '2026-03-20 10:00', imageUrl: null,
    });
    expect(output).toContain('Diseño & arte <moderno>');
  });
});

