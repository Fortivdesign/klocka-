export type AppCategory = 'work' | 'communication' | 'fun' | 'unknown';

export interface ActivitySample {
  timestamp: number;
  activeAppName: string;
  activeWindowTitle: string;
  category: AppCategory;
  keystrokes: number;
  mouseClicks: number;
  isIdle: boolean;
  systemIdleSec?: number;
}

export interface OfflineActivity {
  id: string;
  userId: string;
  start: number;
  end: number;
  type: 'meeting' | 'call' | 'customer-visit' | 'workshop' | 'planning' | 'other';
  description: string;
  countsAs: 'work' | 'communication';
}

export type TaskStatus = 'open' | 'in-progress' | 'blocked' | 'done';

export interface TaskUpdate {
  id: string;
  at: number;
  text: string;
  statusBefore?: TaskStatus;
  statusAfter?: TaskStatus;
}

export interface WeeklyTask {
  id: string;
  userId: string;
  weekStart: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: 'low' | 'normal' | 'high';
  createdAt: number;
  completedAt?: number;
  updates: TaskUpdate[];
  attachment?: { name: string; path: string };
}

export interface ClockEvent {
  userId: string;
  type: 'in' | 'out';
  timestamp: number;
  note?: string;
}

export interface ScreenshotMeta {
  id: string;
  userId: string;
  timestamp: number;
  thumbnailPath: string;
  uploaded: boolean;
  approvedByUser: boolean;
  blurred: boolean;
}

export interface FocusScore {
  clockedMinutes: number;
  activeMinutes: number;
  workCategoryMinutes: number;
  funCategoryMinutes: number;
  focusFactor: number;
  finalScore: number;
}

export interface WeeklyPlan {
  userId: string;
  weekStart: string;
  goals: string[];
  submittedAt: number;
}

export interface WeeklyDelivery {
  userId: string;
  weekStart: string;
  delivered: string[];
  presentationUrl?: string;
  submittedAt: number;
}

export interface SlackerAward {
  weekStart: string;
  userId: string;
  title: string;
  roast: string;
  emoji: string;
}

export const APP_CATEGORIES: Record<string, AppCategory> = {
  'Code': 'work',
  'Visual Studio Code': 'work',
  'Cursor': 'work',
  'WebStorm': 'work',
  'IntelliJ IDEA': 'work',
  'Xcode': 'work',
  'Figma': 'work',
  'Terminal': 'work',
  'iTerm2': 'work',
  'Notion': 'work',
  'Linear': 'work',
  'Jira': 'work',
  'Slack': 'communication',
  'Microsoft Teams': 'communication',
  'Discord': 'communication',
  'zoom.us': 'communication',
  'Mail': 'communication',
  'FIFA 24': 'fun',
  'EA SPORTS FC 24': 'fun',
  'EA SPORTS FC 25': 'fun',
  'UFC 5': 'fun',
  'Steam': 'fun',
  'Spotify': 'fun',
  'YouTube': 'fun',
  'TikTok': 'fun',
  'Instagram': 'fun',
  'Netflix': 'fun',
  'Twitch': 'fun',
};

export function categorize(appName: string, windowTitle: string): AppCategory {
  if (APP_CATEGORIES[appName]) return APP_CATEGORIES[appName];
  const t = (windowTitle || '').toLowerCase();
  if (/youtube|tiktok|instagram|netflix|twitch|reddit/.test(t)) return 'fun';
  if (/github|gitlab|stack ?overflow|jira|linear|notion|docs\.google/.test(t)) return 'work';
  if (/slack|teams|discord|zoom/.test(t)) return 'communication';
  return 'unknown';
}

export interface RoleCategorizeContext {
  workApps: Set<string>;
  workTitlePatterns: RegExp[];
}

export function categorizeForRole(
  appName: string,
  windowTitle: string,
  ctx: RoleCategorizeContext,
): AppCategory {
  if (ctx.workApps.has(appName)) return 'work';
  const t = (windowTitle || '').toLowerCase();
  if (ctx.workTitlePatterns.some((re) => re.test(t))) return 'work';
  return categorize(appName, windowTitle);
}
