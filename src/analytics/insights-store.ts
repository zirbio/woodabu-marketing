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

export class InsightsStore {
  constructor(private readonly dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  save(report: InsightReport): void {
    const filename = `${report.date}-${report.type}.json`;
    const filepath = path.join(this.dir, filename);
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
      return JSON.parse(content) as InsightReport;
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
