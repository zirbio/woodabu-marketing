import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { saveOutput } from './exporter.js';

const TEST_OUTPUT_DIR = path.join(__dirname, '../../test-output');

afterEach(() => {
  if (fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
  }
});

describe('saveOutput', () => {
  it('creates output file in dated subdirectory', () => {
    const result = saveOutput('rsa', 'spring-comedor', '# RSA Content', 'md', TEST_OUTPUT_DIR);
    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(result.filePath).toContain('rsa-spring-comedor.md');
    expect(result.type).toBe('rsa');
  });

  it('creates directory if it does not exist', () => {
    saveOutput('analytics', 'weekly', '# Report', 'md', TEST_OUTPUT_DIR);
    const today = new Date().toISOString().split('T')[0];
    const dir = path.join(TEST_OUTPUT_DIR, today);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('slugifies name: lowercase, hyphens, strip accents', () => {
    const result = saveOutput('meta-ads', 'Campaña_Primavera Ñoño', 'content', 'md', TEST_OUTPUT_DIR);
    expect(result.filePath).toContain('meta-ads-campana-primavera-nono.md');
  });

  it('defaults format to md', () => {
    const result = saveOutput('social', 'test', 'content', undefined, TEST_OUTPUT_DIR);
    expect(result.filePath).toMatch(/\.md$/);
  });

  it('supports html format', () => {
    const result = saveOutput('email', 'welcome', '<html></html>', 'html', TEST_OUTPUT_DIR);
    expect(result.filePath).toMatch(/\.html$/);
  });

  it('returns createdAt as ISO string', () => {
    const result = saveOutput('rsa', 'test', 'content', 'md', TEST_OUTPUT_DIR);
    expect(() => new Date(result.createdAt)).not.toThrow();
  });

  it('throws on invalid name with only special characters', () => {
    expect(() => saveOutput('rsa', '!!!', 'content', 'md', TEST_OUTPUT_DIR)).toThrow();
  });

  it('writes content correctly', () => {
    const content = '# Test\n\nHello world';
    const result = saveOutput('rsa', 'test', content, 'md', TEST_OUTPUT_DIR);
    const written = fs.readFileSync(result.filePath, 'utf-8');
    expect(written).toBe(content);
  });
});
