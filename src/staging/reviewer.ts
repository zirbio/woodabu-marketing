import { HEADLINE_MAX, DESCRIPTION_MAX } from '../utils/validators.js';

export interface StagedItem {
  id: string;
  content: string;
}

export interface ReviewDecision {
  id: string;
  action: 'approve' | 'edit' | 'skip' | 'regenerate';
  newContent?: string;
}

export interface PostPreviewInput {
  copy: string;
  hashtags: string[];
  scheduledTime: string;
  imageUrl: string | null;
}

export interface EmailSummaryInput {
  subjects: string[];
  segment: string;
  productCount: number;
  preheader: string;
}

export function formatAdTable(items: string[], type: 'headline' | 'description'): string {
  const maxChars = type === 'headline' ? HEADLINE_MAX : DESCRIPTION_MAX;
  const header = `| # | ${type === 'headline' ? 'Headline' : 'Description'} | Chars | Status |`;
  const separator = '|---|' + '-'.repeat(Math.max(type.length + 2, 12)) + '|-------|--------|';

  const rows = items.map((item, i) => {
    const charCount = [...item].length;
    const status = charCount > maxChars ? 'OVER' : charCount >= maxChars - 2 ? 'WARN' : 'OK';
    return `| ${i + 1} | ${item} | ${charCount} | ${status} |`;
  });

  return [header, separator, ...rows].join('\n');
}

export function formatPostPreview(input: PostPreviewInput): string {
  const lines = [
    '---',
    `**Copy:** ${input.copy}`,
    `**Hashtags:** ${input.hashtags.join(' ')}`,
    `**Scheduled:** ${input.scheduledTime}`,
  ];
  if (input.imageUrl) {
    lines.push(`**Image:** ${input.imageUrl}`);
  }
  lines.push('---');
  return lines.join('\n');
}

export function formatEmailSummary(input: EmailSummaryInput): string {
  const lines = [
    '## Email Campaign Summary',
    '',
    '**Subject line variants:**',
    ...input.subjects.map((s, i) => `  ${i + 1}. ${s}`),
    '',
    `**Preheader:** ${input.preheader}`,
    `**Segment:** ${input.segment}`,
    `**Includes:** ${input.productCount} products`,
  ];
  return lines.join('\n');
}

export function applyDecisions(items: StagedItem[], decisions: ReviewDecision[]): StagedItem[] {
  const decisionMap = new Map(decisions.map((d) => [d.id, d]));

  return items
    .map((item) => {
      const decision = decisionMap.get(item.id);
      if (!decision || decision.action === 'skip') return null;
      if (decision.action === 'edit' && decision.newContent) {
        return { ...item, content: decision.newContent };
      }
      if (decision.action === 'approve') return item;
      return null;
    })
    .filter((item): item is StagedItem => item !== null);
}
