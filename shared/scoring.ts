import type { ActivitySample, FocusScore, OfflineActivity } from './types';
import { detect } from './detector';

export interface ScoringInput {
  clockedMinutes: number;
  samples: ActivitySample[];
  offline?: OfflineActivity[];
  tasksTotal?: number;
  tasksDone?: number;
}

export function computeFocusScore(input: ScoringInput): FocusScore {
  const r = detect({
    samples: input.samples,
    clockedMinutes: input.clockedMinutes,
    offline: input.offline,
    tasksTotal: input.tasksTotal,
    tasksDone: input.tasksDone,
  });
  return {
    clockedMinutes: r.clockedMinutes,
    activeMinutes: r.activeMinutes,
    workCategoryMinutes: r.workCategoryMinutes,
    funCategoryMinutes: r.funCategoryMinutes,
    focusFactor: r.focusFactor,
    finalScore: r.finalScore,
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
