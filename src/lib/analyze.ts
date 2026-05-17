import { detect, type DetectorResult } from '@shared/detector';
import type { ActivitySample, OfflineActivity, WeeklyTask } from '@shared/types';
import { weekKey } from './time';

export interface AnalyzeOpts {
  userId: string;
  samples: ActivitySample[];
  clockedMinutes: number;
  offline: OfflineActivity[];
  tasks: WeeklyTask[];
  weekStart?: string;
}

export function analyze({ userId, samples, clockedMinutes, offline, tasks, weekStart }: AnalyzeOpts): DetectorResult {
  const wk = weekStart ?? weekKey();
  const my = tasks.filter((t) => t.userId === userId && t.weekStart === wk);
  const myOffline = offline.filter((o) => o.userId === userId);
  return detect({
    samples,
    clockedMinutes,
    offline: myOffline,
    tasksTotal: my.length,
    tasksDone: my.filter((t) => t.status === 'done').length,
  });
}
