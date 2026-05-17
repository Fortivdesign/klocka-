import type { ActivitySample, FocusScore, OfflineActivity } from './types';

const SAMPLE_SEC = 30;
const DEEP_FOCUS_MIN_MINUTES = 20;
const PASSIVE_MIN_MINUTES = 5;
const HIGH_SWITCH_RATE = 25;
const MEDIUM_SWITCH_RATE = 12;

export interface DetectorInput {
  samples: ActivitySample[];
  clockedMinutes: number;
  offline?: OfflineActivity[];
  tasksDone?: number;
  tasksTotal?: number;
}

export type SignalKind = 'good' | 'bad' | 'warn' | 'info';

export interface Signal {
  kind: SignalKind;
  emoji: string;
  label: string;
  detail: string;
}

export interface AppTime { name: string; minutes: number; }

export interface DetectorResult extends FocusScore {
  passiveMinutes: number;
  deepFocusBlocks: number;
  longestDeepFocusMinutes: number;
  contextSwitchesPerHour: number;
  appSwitches: number;
  fragmentation: 'low' | 'medium' | 'high';
  trustScore: number;
  signals: Signal[];
  topApp: string | null;
  workApps: AppTime[];
  funApps: AppTime[];
  commApps: AppTime[];
  planCompletion?: number;
  hourlyHeat: number[];
}

interface Run {
  app: string;
  category: string;
  samples: ActivitySample[];
  isIdle: boolean;
}

export function detect(input: DetectorInput): DetectorResult {
  const samples = [...input.samples].sort((a, b) => a.timestamp - b.timestamp);
  const N = samples.length;
  if (N === 0) return emptyResult(input.clockedMinutes, input);

  const activeSamples = samples.filter((s) => !s.isIdle);
  const workSamples = activeSamples.filter((s) => s.category === 'work');
  const funSamples = activeSamples.filter((s) => s.category === 'fun');

  const toMin = (n: number) => (n * SAMPLE_SEC) / 60;

  const offlineMin = (input.offline ?? []).reduce((a, o) => a + (o.end - o.start) / 60_000, 0);
  const offlineWorkMin = (input.offline ?? [])
    .filter((o) => o.countsAs === 'work')
    .reduce((a, o) => a + (o.end - o.start) / 60_000, 0);

  const activeMinutes = toMin(activeSamples.length) + offlineMin;
  const workCategoryMinutes = toMin(workSamples.length) + offlineWorkMin;
  const funCategoryMinutes = toMin(funSamples.length);

  const runs: Run[] = [];
  let cur: Run | null = null;
  for (const s of samples) {
    const key = s.isIdle ? '__idle' : s.activeAppName;
    if (!cur || cur.app !== key) {
      if (cur) runs.push(cur);
      cur = { app: key, category: s.category, samples: [s], isIdle: s.isIdle };
    } else {
      cur.samples.push(s);
    }
  }
  if (cur) runs.push(cur);

  const deepRuns = runs.filter(
    (r) => !r.isIdle && r.category === 'work' && toMin(r.samples.length) >= DEEP_FOCUS_MIN_MINUTES,
  );
  const deepFocusBlocks = deepRuns.length;
  const longestDeepFocusMinutes = deepRuns.reduce((m, r) => Math.max(m, toMin(r.samples.length)), 0);

  const nonIdleRuns = runs.filter((r) => !r.isIdle);
  const appSwitches = Math.max(0, nonIdleRuns.length - 1);
  const elapsedHours = (N * SAMPLE_SEC) / 3600;
  const contextSwitchesPerHour = elapsedHours > 0 ? appSwitches / elapsedHours : 0;

  let fragmentation: 'low' | 'medium' | 'high' = 'low';
  if (contextSwitchesPerHour > HIGH_SWITCH_RATE) fragmentation = 'high';
  else if (contextSwitchesPerHour > MEDIUM_SWITCH_RATE) fragmentation = 'medium';

  const passiveRuns = runs.filter((r) => {
    if (r.isIdle || r.category !== 'work') return false;
    if (toMin(r.samples.length) < PASSIVE_MIN_MINUTES) return false;
    const totalKeys = r.samples.reduce((a, s) => a + s.keystrokes, 0);
    const totalClicks = r.samples.reduce((a, s) => a + s.mouseClicks, 0);
    const titleChanges = new Set(r.samples.map((s) => s.activeWindowTitle)).size;
    return totalKeys === 0 && totalClicks === 0 && titleChanges <= 1;
  });
  const passiveMinutes = passiveRuns.reduce((m, r) => m + toMin(r.samples.length), 0);

  const appAgg = new Map<string, { minutes: number; category: string }>();
  for (const s of activeSamples) {
    const e = appAgg.get(s.activeAppName) ?? { minutes: 0, category: s.category };
    e.minutes += SAMPLE_SEC / 60;
    appAgg.set(s.activeAppName, e);
  }
  const workApps = byMinutes(appAgg, 'work');
  const funApps = byMinutes(appAgg, 'fun');
  const commApps = byMinutes(appAgg, 'communication');
  const topApp = [...appAgg.entries()].sort((a, b) => b[1].minutes - a[1].minutes)[0]?.[0] ?? null;

  const hourlyHeat = new Array(24).fill(0) as number[];
  for (const s of workSamples) {
    const h = new Date(s.timestamp).getHours();
    hourlyHeat[h] += 1;
  }

  const planCompletion =
    input.tasksTotal && input.tasksTotal > 0 ? (input.tasksDone ?? 0) / input.tasksTotal : undefined;

  const denom = Math.max(input.clockedMinutes, activeMinutes, 1);
  const activeRatio = activeMinutes / denom;
  const workRatio = activeMinutes > 0 ? workCategoryMinutes / activeMinutes : 0;
  const funPenalty = activeMinutes > 0 ? funCategoryMinutes / activeMinutes : 0;
  const passivePenalty = workCategoryMinutes > 0 ? passiveMinutes / workCategoryMinutes : 0;
  const deepBonus = Math.min(0.18, deepFocusBlocks * 0.04 + (longestDeepFocusMinutes > 60 ? 0.04 : 0));
  const fragmentationPenalty = fragmentation === 'high' ? 0.15 : fragmentation === 'medium' ? 0.06 : 0;
  const planBonus = planCompletion !== undefined ? planCompletion * 0.10 : 0;

  const focusFactor = clamp(
    0.30 * activeRatio
      + 0.30 * workRatio
      - 0.35 * funPenalty
      - 0.25 * passivePenalty
      + deepBonus
      - fragmentationPenalty
      + planBonus
      + 0.10,
    0,
    1,
  );

  let trust = 1.0;
  const totalKeys = samples.reduce((a, s) => a + s.keystrokes, 0);
  const totalClicks = samples.reduce((a, s) => a + s.mouseClicks, 0);
  const idleMinutes = toMin(samples.filter((s) => s.isIdle).length);
  const veryLowSwitchRate = activeMinutes > 60 && appSwitches < 5;
  const neverIdleLong = idleMinutes < 2 && activeMinutes > 180;
  const zeroInput = totalKeys + totalClicks === 0 && activeMinutes > 30;
  if (veryLowSwitchRate) trust -= 0.15;
  if (neverIdleLong) trust -= 0.20;
  if (zeroInput) trust -= 0.25;
  trust = clamp(trust, 0, 1);

  const signals: Signal[] = [];

  if (deepFocusBlocks >= 2) {
    signals.push({
      kind: 'good', emoji: '🧘',
      label: `${deepFocusBlocks} deep-focus block`,
      detail: `Längsta: ${Math.round(longestDeepFocusMinutes)} min utan att byta app.`,
    });
  } else if (deepFocusBlocks === 1) {
    signals.push({
      kind: 'good', emoji: '🧘',
      label: 'Deep focus',
      detail: `${Math.round(longestDeepFocusMinutes)} min sammanhängande i ${topApp ?? 'jobb-app'}.`,
    });
  }
  if (longestDeepFocusMinutes >= 60) {
    signals.push({ kind: 'good', emoji: '🔥', label: 'Flow state', detail: `${Math.round(longestDeepFocusMinutes)} min utan distraktion.` });
  }
  if (workRatio > 0.8 && workCategoryMinutes > 60) {
    signals.push({ kind: 'good', emoji: '🎯', label: 'Laser-fokus', detail: `${Math.round(workRatio * 100)}% av aktiv tid i jobb-appar.` });
  }
  if (planCompletion !== undefined && planCompletion >= 0.8 && (input.tasksTotal ?? 0) >= 3) {
    signals.push({ kind: 'good', emoji: '✅', label: 'Leverans-mästare', detail: `${input.tasksDone}/${input.tasksTotal} uppgifter klara.` });
  }

  if (funPenalty > 0.3 && funCategoryMinutes > 15) {
    signals.push({
      kind: 'bad', emoji: '🎮',
      label: 'Skoj-överdos',
      detail: `${Math.round(funCategoryMinutes)} min i ${funApps[0]?.name ?? 'skoj-appar'} (${Math.round(funPenalty * 100)}% av tiden).`,
    });
  }
  if (passiveMinutes >= 15) {
    signals.push({
      kind: 'bad', emoji: '👻',
      label: 'Spöket',
      detail: `${Math.round(passiveMinutes)} min med jobb-app öppen men ingen interaktion eller fil-byte.`,
    });
  }
  if (fragmentation === 'high') {
    signals.push({
      kind: 'bad', emoji: '🪟',
      label: 'Snabb-swishare',
      detail: `${Math.round(contextSwitchesPerHour)} app-byten per timme — fokus omöjligt.`,
    });
  }
  if (input.clockedMinutes >= 120 && activeMinutes / input.clockedMinutes < 0.5) {
    signals.push({
      kind: 'bad', emoji: '🪑',
      label: 'Stol-värmare',
      detail: `Klockad ${fmtH(input.clockedMinutes)} men aktiv bara ${fmtH(activeMinutes)}.`,
    });
  }
  if (planCompletion !== undefined && planCompletion < 0.3 && (input.tasksTotal ?? 0) >= 3) {
    signals.push({
      kind: 'bad', emoji: '📋',
      label: 'Plan-svik',
      detail: `Bara ${input.tasksDone}/${input.tasksTotal} klart denna vecka.`,
    });
  }

  if (trust < 0.7) {
    signals.push({
      kind: 'warn', emoji: '🤖',
      label: 'Misstänkt aktivitet',
      detail:
        zeroInput
          ? 'Aktiv app i timmar utan att en enda tangent eller klick registrerats. Mouse-jiggler?'
          : neverIdleLong
            ? `Aldrig idle på ${fmtH(activeMinutes)} klockad tid. Ovanligt.`
            : 'Få app-byten över lång tid — påminner om automation.',
    });
  }

  const finalScore = Math.round(Math.max(input.clockedMinutes, activeMinutes) * focusFactor * trust);

  return {
    clockedMinutes: input.clockedMinutes,
    activeMinutes,
    workCategoryMinutes,
    funCategoryMinutes,
    focusFactor,
    finalScore,
    passiveMinutes,
    deepFocusBlocks,
    longestDeepFocusMinutes,
    contextSwitchesPerHour,
    appSwitches,
    fragmentation,
    trustScore: trust,
    signals,
    topApp,
    workApps,
    funApps,
    commApps,
    planCompletion,
    hourlyHeat,
  };
}

function emptyResult(clocked: number, input: DetectorInput): DetectorResult {
  const planCompletion =
    input.tasksTotal && input.tasksTotal > 0 ? (input.tasksDone ?? 0) / input.tasksTotal : undefined;
  return {
    clockedMinutes: clocked,
    activeMinutes: 0,
    workCategoryMinutes: 0,
    funCategoryMinutes: 0,
    focusFactor: 0,
    finalScore: 0,
    passiveMinutes: 0,
    deepFocusBlocks: 0,
    longestDeepFocusMinutes: 0,
    contextSwitchesPerHour: 0,
    appSwitches: 0,
    fragmentation: 'low',
    trustScore: 1,
    signals: [],
    topApp: null,
    workApps: [],
    funApps: [],
    commApps: [],
    planCompletion,
    hourlyHeat: new Array(24).fill(0),
  };
}

function byMinutes(agg: Map<string, { minutes: number; category: string }>, category: string): AppTime[] {
  return [...agg.entries()]
    .filter(([, v]) => v.category === category)
    .map(([name, v]) => ({ name, minutes: +v.minutes.toFixed(1) }))
    .sort((a, b) => b.minutes - a.minutes);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function fmtH(min: number): string {
  return `${(min / 60).toFixed(1)}h`;
}
