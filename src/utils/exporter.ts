import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ExportResult {
  filePath: string;
  type: string;
  createdAt: string;
}

type OutputType = 'rsa' | 'meta-ads' | 'social' | 'email' | 'campaign' | 'analytics';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function saveOutput(
  type: OutputType,
  name: string,
  content: string,
  format: 'md' | 'html' = 'md',
  baseDir: string = path.resolve('output'),
): ExportResult {
  const slug = slugify(name);
  if (!slug) {
    throw new Error(`Cannot slugify name "${name}" — results in empty string`);
  }

  const today = new Date().toISOString().split('T')[0];
  const dir = path.join(baseDir, today);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${type}-${slug}.${format}`;
  const filePath = path.join(dir, filename);

  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    filePath,
    type,
    createdAt: new Date().toISOString(),
  };
}
