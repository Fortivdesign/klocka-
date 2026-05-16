import type { ActivitySample, FocusScore, OfflineActivity } from './types';

export interface ScoringInput {
  clockedMinutes: number;
  samples: ActivitySample[];
  offline?: OfflineActivity[];
}

const SAMPLE_INTERVAL_SECONDS = 30;

export function computeFocusScore({ clockedMinutes, samples, offline = [] }: ScoringInput): FocusScore {
  const activeSamples = samples.filter((s) => !s.isIdle);
  const workSamples = activeSamples.filter((s) => s.category === 'work');
  const funSamples = activeSamples.filter((s) => s.category === 'fun');

  const toMin = (count: number) => (count * SAMPLE_INTERVAL_SECONDS) / 60;
  const offlineMinutes = offline.reduce((a, o) => a + (o.end - o.start) / 60_000, 0);
  const offlineWorkMinutes = offline
    .filter((o) => o.countsAs === 'work')
    .reduce((a, o) => a + (o.end - o.start) / 60_000, 0);

  const activeMinutes = toMin(activeSamples.length) + offlineMinutes;
  const workCategoryMinutes = toMin(workSamples.length) + offlineWorkMinutes;
  const funCategoryMinutes = toMin(funSamples.length);

  const effectiveDenominator = Math.max(clockedMinutes, activeMinutes);
  const activeRatio = effectiveDenominator > 0 ? activeMinutes / effectiveDenominator : 0;
  const workRatio = activeMinutes > 0 ? workCategoryMinutes / activeMinutes : 0;
  const funPenalty = activeMinutes > 0 ? funCategoryMinutes / activeMinutes : 0;

  const focusFactor = Math.max(
    0,
    Math.min(1, 0.4 * activeRatio + 0.7 * workRatio - 0.5 * funPenalty + 0.1),
  );

  const finalScore = Math.round(Math.max(clockedMinutes, activeMinutes) * focusFactor);

  return {
    clockedMinutes,
    activeMinutes,
    workCategoryMinutes,
    funCategoryMinutes,
    focusFactor,
    finalScore,
  };
}

export const SLACKER_TITLES = [
  { emoji: '🎮', title: 'FIFA-Mästaren', roast: 'Vann turneringen men förlorade sprinten.' },
  { emoji: '📱', title: 'Scroll Sensei', roast: 'Tummen är i bättre form än kodbasen.' },
  { emoji: '☕', title: 'Kaffepausens Konung', roast: 'Espressomaskinen har fler commits än den här personen.' },
  { emoji: '🥊', title: 'UFC Champion', roast: 'Slog ut alla — utom sin egen att-göra-lista.' },
  { emoji: '😴', title: 'Power-Napparen', roast: 'Drömde om sprintmål istället för att leverera dem.' },
  { emoji: '🍕', title: 'Lunchförlängaren', roast: 'Tog en 4-timmars lunch. Respekt? Nej.' },
  { emoji: '🪑', title: 'Stol-värmaren', roast: 'Var här i 50h. Jobbade i 4.' },
];

export function pickRoastTitle(seed: string): { emoji: string; title: string; roast: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % SLACKER_TITLES.length;
  return SLACKER_TITLES[idx];
}
