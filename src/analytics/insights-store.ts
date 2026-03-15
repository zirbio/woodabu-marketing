import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ChannelInsight {
  top_performers: Array<{ id: string; headline?: string; text?: string; ctr?: number; roas?: number; engagement_rate?: number; reach?: number }>;
  patterns: string[];
}

export interface InsightReport {
  date: string;
  type: 'weekly' | 'channel' | 'product' | 'compare';
  channels: Record<string, ChannelInsight>;
  recommendations: Array<{ action: string; target: string; reason: string }>;
}

const MAX_REPORTS = 12;

function isInsightReport(obj: unknown): obj is InsightReport {
  if (typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    typeof record.date === 'string' &&
    typeof record.type === 'string' &&
    typeof record.channels === 'object' &&
    Array.isArray(record.recommendations)
  );
}

export class InsightsStore {
  constructor(private readonly dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  save(report: InsightReport): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(report.date)) {
      throw new Error(`Invalid date format: ${report.date}. Expected YYYY-MM-DD.`);
    }
    const validTypes = ['weekly', 'channel', 'product', 'compare'];
    if (!validTypes.includes(report.type)) {
      throw new Error(`Invalid report type: ${report.type}`);
    }

    const filename = `${report.date}-${report.type}.json`;
    const filepath = path.resolve(this.dir, filename);

    // Ensure resolved path is within the expected directory
    if (!filepath.startsWith(path.resolve(this.dir))) {
      throw new Error('Invalid file path: outside of insights directory');
    }

    const tmpPath = `${filepath}.tmp`;

    fs.writeFileSync(tmpPath, JSON.stringify(report, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filepath);

    this.enforceRetention();
  }

  getLatest(count: number): InsightReport[] {
    const files = fs
      .readdirSync(this.dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, count);

    return files.map((f) => {
      const content = fs.readFileSync(path.join(this.dir, f), 'utf-8');
      const parsed: unknown = JSON.parse(content);
      if (!isInsightReport(parsed)) {
        throw new Error(`Invalid insight report format in file: ${f}`);
      }
      return parsed;
    });
  }

  private enforceRetention(): void {
    const files = fs
      .readdirSync(this.dir)
      .filter((f) => f.endsWith('.json'))
      .sort();

    while (files.length > MAX_REPORTS) {
      const oldest = files.shift()!;
      fs.unlinkSync(path.join(this.dir, oldest));
    }
  }
}
