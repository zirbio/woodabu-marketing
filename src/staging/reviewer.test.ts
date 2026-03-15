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
