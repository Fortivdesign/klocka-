import type { NativeImage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ScreenshotMeta } from '../shared/types';

interface Opts {
  outputDir: string;
  capture: () => Promise<NativeImage | null>;
  intervalMinMs?: number;
  intervalMaxMs?: number;
}

export class ScreenshotService {
  private timer: NodeJS.Timeout | null = null;
  private pending: ScreenshotMeta[] = [];
  private readonly opts: Required<Opts>;

  constructor(opts: Opts) {
    this.opts = {
      intervalMinMs: 25 * 60_000,
      intervalMaxMs: 55 * 60_000,
      ...opts,
    } as Required<Opts>;
  }

  start() {
    if (this.timer) return;
    this.scheduleNext();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private scheduleNext() {
    const { intervalMinMs, intervalMaxMs } = this.opts;
    const delay = intervalMinMs + Math.random() * (intervalMaxMs - intervalMinMs);
    this.timer = setTimeout(async () => {
      await this.captureNow();
      this.scheduleNext();
    }, delay);
  }

  async captureNow(): Promise<ScreenshotMeta | null> {
    const img = await this.opts.capture();
    if (!img) return null;
    const id = randomUUID();
    const fileName = `${id}.png`;
    const fullPath = path.join(this.opts.outputDir, fileName);
    const buf = img.toPNG();
    await fs.writeFile(fullPath, buf);
    const meta: ScreenshotMeta = {
      id,
      userId: '',
      timestamp: Date.now(),
      thumbnailPath: fullPath,
      uploaded: false,
      approvedByUser: false,
      blurred: false,
    };
    this.pending.push(meta);
    return meta;
  }

  listPending(): ScreenshotMeta[] { return [...this.pending]; }

  markApproved(id: string, approved: boolean): boolean {
    const s = this.pending.find((x) => x.id === id);
    if (!s) return false;
    s.approvedByUser = approved;
    return true;
  }

  flushPending(): ScreenshotMeta[] {
    const out = this.pending;
    this.pending = [];
    return out;
  }
}
