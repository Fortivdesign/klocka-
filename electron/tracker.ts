import { powerMonitor } from 'electron';
import type { ActivitySample } from '../shared/types';
import { categorize } from '../shared/types';

const SAMPLE_INTERVAL_MS = 30_000;
const IDLE_THRESHOLD_SEC = 90;

type ActiveWinFn = () => Promise<{ owner: { name: string }; title: string } | undefined>;

let activeWin: ActiveWinFn | null = null;
async function getActiveWin(): Promise<ActiveWinFn> {
  if (activeWin) return activeWin;
  try {
    const mod = await import('active-win');
    activeWin = (mod.default ?? mod) as ActiveWinFn;
    return activeWin;
  } catch {
    activeWin = async () => undefined;
    return activeWin;
  }
}

export class ActivityTracker {
  private samples: ActivitySample[] = [];
  private timer: NodeJS.Timeout | null = null;
  private keystrokes = 0;
  private mouseClicks = 0;
  private forcedIdle = false;

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.sample().catch(() => {}), SAMPLE_INTERVAL_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  markIdle(idle: boolean) { this.forcedIdle = idle; }

  registerKeystroke() { this.keystrokes += 1; }
  registerMouseClick() { this.mouseClicks += 1; }

  private async sample() {
    const aw = await getActiveWin();
    const info = await aw().catch(() => undefined);
    const appName = info?.owner?.name ?? 'unknown';
    const title = info?.title ?? '';
    const systemIdleSec = (() => {
      try { return powerMonitor.getSystemIdleTime(); } catch { return 0; }
    })();
    const idle = this.forcedIdle || systemIdleSec > IDLE_THRESHOLD_SEC;

    const sample: ActivitySample = {
      timestamp: Date.now(),
      activeAppName: appName,
      activeWindowTitle: title,
      category: categorize(appName, title),
      keystrokes: this.keystrokes,
      mouseClicks: this.mouseClicks,
      isIdle: idle,
    };
    this.samples.push(sample);
    this.keystrokes = 0;
    this.mouseClicks = 0;
  }

  peek(): ActivitySample[] { return [...this.samples]; }
  sampleCount(): number { return this.samples.length; }
  flush(): ActivitySample[] {
    const out = this.samples;
    this.samples = [];
    return out;
  }
}
