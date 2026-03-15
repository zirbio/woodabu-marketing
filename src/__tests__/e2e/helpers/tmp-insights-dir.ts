import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

let tmpDir: string | null = null;

export function createTmpInsightsDir(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insights-e2e-'));
  return tmpDir;
}

export function cleanupTmpInsightsDir(): void {
  if (tmpDir) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  }
}
