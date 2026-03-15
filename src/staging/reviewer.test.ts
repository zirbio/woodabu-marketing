import { describe, it, expect } from 'vitest';
import {
  formatAdTable,
  formatPostPreview,
  formatEmailSummary,
  applyDecisions,
} from './reviewer.js';
import type { StagedItem, ReviewDecision } from './reviewer.js';

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

describe('applyDecisions', () => {
  it('filters to only approved items', () => {
    const items: StagedItem[] = [
      { id: '1', content: 'Item 1' },
      { id: '2', content: 'Item 2' },
      { id: '3', content: 'Item 3' },
    ];
    const decisions: ReviewDecision[] = [
      { id: '1', action: 'approve' },
      { id: '2', action: 'skip' },
      { id: '3', action: 'approve' },
    ];

    const approved = applyDecisions(items, decisions);
    expect(approved).toHaveLength(2);
    expect(approved.map((i) => i.id)).toEqual(['1', '3']);
  });

  it('applies edits to items', () => {
    const items: StagedItem[] = [{ id: '1', content: 'Original' }];
    const decisions: ReviewDecision[] = [{ id: '1', action: 'edit', newContent: 'Edited' }];

    const result = applyDecisions(items, decisions);
    expect(result[0].content).toBe('Edited');
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

describe('applyDecisions — edge cases', () => {
  it('returns empty array when all decisions are skip', () => {
    const items: StagedItem[] = [{ id: '1', content: 'A' }, { id: '2', content: 'B' }];
    const decisions: ReviewDecision[] = [{ id: '1', action: 'skip' }, { id: '2', action: 'skip' }];
    expect(applyDecisions(items, decisions)).toEqual([]);
  });

  it('handles item with no matching decision (filters out)', () => {
    const items: StagedItem[] = [{ id: '1', content: 'A' }, { id: '2', content: 'B' }];
    const decisions: ReviewDecision[] = [{ id: '1', action: 'approve' }];
    const result = applyDecisions(items, decisions);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('handles empty items array', () => {
    expect(applyDecisions([], [{ id: '1', action: 'approve' }])).toEqual([]);
  });

  it('handles empty decisions array', () => {
    expect(applyDecisions([{ id: '1', content: 'A' }], [])).toEqual([]);
  });

  it('handles regenerate action (returns null = excluded)', () => {
    const items: StagedItem[] = [{ id: '1', content: 'A' }];
    const decisions: ReviewDecision[] = [{ id: '1', action: 'regenerate' }];
    expect(applyDecisions(items, decisions)).toEqual([]);
  });

  it('edit without newContent returns null', () => {
    const items: StagedItem[] = [{ id: '1', content: 'A' }];
    const decisions: ReviewDecision[] = [{ id: '1', action: 'edit' }];
    expect(applyDecisions(items, decisions)).toEqual([]);
  });
});
