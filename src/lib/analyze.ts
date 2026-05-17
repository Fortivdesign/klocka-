import { detect, type DetectorResult } from '@shared/detector';
import type { ActivitySample, OfflineActivity, WeeklyTask, Heartbeat } from '@shared/types';
import { weekKey } from './time';

export interface AnalyzeOpts {
  userId: string;
  samples: ActivitySample[];
  clockedMinutes: number;
  offline: OfflineActivity[];
  tasks: WeeklyTask[];
  heartbeats?: Heartbeat[];
  weekStart?: string;
  sessionStart?: number;
}

export function analyze({ userId, samples, clockedMinutes, offline, tasks, heartbeats = [], weekStart, sessionStart }: AnalyzeOpts): DetectorResult {
  const wk = weekStart ?? weekKey();
  const my = tasks.filter((t) => t.userId === userId && t.weekStart === wk);
  const myOffline = offline.filter((o) => o.userId === userId);
  const myHb = sessionStart != null
    ? heartbeats.filter((h) => h.userId === userId && h.sessionStart === sessionStart)
    : heartbeats.filter((h) => h.userId === userId);
  return detect({
    samples,
    clockedMinutes,
    offline: myOffline,
    heartbeats: myHb,
    tasksTotal: my.length,
    tasksDone: my.filter((t) => t.status === 'done').length,
    sessionStart,
  });
}
