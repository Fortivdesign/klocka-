import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ActivitySample, FocusScore, WeeklyPlan, WeeklyDelivery, SlackerAward, OfflineActivity, WeeklyTask, TaskStatus, TaskUpdate, Heartbeat } from '@shared/types';
import type { RoleId } from '@shared/roles';
import { roleWorkApps, roleTitlePatterns } from '@shared/roles';
import { categorizeForRole } from '@shared/types';
import { computeFocusScore } from '@shared/scoring';

export interface SessionRecord {
  id: string;
  userId: string;
  start: number;
  end: number;
  samples: ActivitySample[];
  score: FocusScore;
  note?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  avatarEmoji: string;
  color: string;
  roles: RoleId[];
}

export interface Toast {
  id: string;
  title: string;
  body?: string;
  kind: 'success' | 'info' | 'warn' | 'celebrate';
  createdAt: number;
}

export interface Purchase {
  id: string;
  userId: string;
  itemId: string;
  cost: number;
  at: number;
}

export interface ChallengeCompletion {
  userId: string;
  challengeId: string;
  date: string;
  at: number;
}

interface State {
  currentUser: TeamMember | null;
  team: TeamMember[];
  clockedIn: boolean;
  sessionStart: number | null;
  sessions: SessionRecord[];
  liveSamples: ActivitySample[];
  weeklyPlans: WeeklyPlan[];
  weeklyDeliveries: WeeklyDelivery[];
  awards: SlackerAward[];
  dailyGoalMinutes: number;
  toasts: Toast[];
  demoSeeded: boolean;
  coins: Record<string, number>;
  purchases: Purchase[];
  completedChallenges: ChallengeCompletion[];
  unlockedAchievements: Record<string, string[]>;
  offlineActivities: OfflineActivity[];
  tasks: WeeklyTask[];
  heartbeats: Heartbeat[];
  pendingHeartbeat: Heartbeat | null;
  setUser: (u: TeamMember) => void;
  setTeam: (t: TeamMember[]) => void;
  setClockedIn: (b: boolean, sessionStart?: number | null) => void;
  setLiveSamples: (s: ActivitySample[]) => void;
  setDailyGoalMinutes: (m: number) => void;
  recordSession: (rec: { start: number; end: number; samples: ActivitySample[]; userId: string; note?: string }) => SessionRecord;
  addPlan: (p: WeeklyPlan) => void;
  addDelivery: (d: WeeklyDelivery) => void;
  addAward: (a: SlackerAward) => void;
  pushToast: (t: Omit<Toast, 'id' | 'createdAt'>) => void;
  dismissToast: (id: string) => void;
  markDemoSeeded: () => void;
  addCoins: (userId: string, n: number) => void;
  buyItem: (userId: string, itemId: string, cost: number) => boolean;
  completeChallenge: (userId: string, challengeId: string, date: string) => boolean;
  unlockAchievement: (userId: string, achievementId: string) => boolean;
  addOfflineActivity: (a: Omit<OfflineActivity, 'id'>) => OfflineActivity;
  removeOfflineActivity: (id: string) => void;
  recategorizeSample: (sample: ActivitySample, member: TeamMember | null) => ActivitySample;
  addTask: (t: Pick<WeeklyTask, 'userId' | 'weekStart' | 'title'> & Partial<Pick<WeeklyTask, 'description' | 'priority' | 'attachment'>>) => WeeklyTask;
  updateTaskStatus: (taskId: string, status: TaskStatus, note?: string) => void;
  addTaskUpdate: (taskId: string, text: string) => TaskUpdate | null;
  removeTask: (taskId: string) => void;
  editTask: (taskId: string, patch: Partial<Pick<WeeklyTask, 'title' | 'description' | 'priority'>>) => void;
  triggerHeartbeat: () => Heartbeat | null;
  resolveHeartbeat: (id: string, status: 'hit' | 'miss') => void;
}

export function recategorizeForMember(sample: ActivitySample, member: TeamMember | null): ActivitySample {
  if (!member || !member.roles.length) return sample;
  const ctx = { workApps: roleWorkApps(member.roles), workTitlePatterns: roleTitlePatterns(member.roles) };
  const cat = categorizeForRole(sample.activeAppName, sample.activeWindowTitle, ctx);
  return { ...sample, category: cat };
}

const demoTeam: TeamMember[] = [
  { id: 'u_teo',     name: 'Teo',     avatarEmoji: '🦊', color: '#7c5cff', roles: ['vd', 'sales-chief', 'sales', 'junior-dev'] },
  { id: 'u_oscar',   name: 'Oscar',   avatarEmoji: '🐼', color: '#29d398', roles: ['vice-vd', 'senior-dev'] },
  { id: 'u_viktor',  name: 'Viktor',  avatarEmoji: '🐧', color: '#ff6b6b', roles: ['cmo'] },
  { id: 'u_freddie', name: 'Freddie', avatarEmoji: '🦁', color: '#f5a524', roles: ['cfo', 'junior-dev'] },
];

export const useStore = create<State>()(
  persist(
    (set) => ({
      currentUser: demoTeam[0],
      team: demoTeam,
      clockedIn: false,
      sessionStart: null,
      sessions: [],
      liveSamples: [],
      weeklyPlans: [],
      weeklyDeliveries: [],
      awards: [],
      dailyGoalMinutes: 360,
      toasts: [],
      demoSeeded: false,
      coins: {},
      purchases: [],
      completedChallenges: [],
      unlockedAchievements: {},
      offlineActivities: [],
      tasks: [],
      heartbeats: [],
      pendingHeartbeat: null,
      setUser: (u) => set({ currentUser: u }),
      setTeam: (t) => set({ team: t }),
      setClockedIn: (b, sessionStart = null) => set({ clockedIn: b, sessionStart }),
      setLiveSamples: (s) => set({ liveSamples: s }),
      setDailyGoalMinutes: (m) => set({ dailyGoalMinutes: m }),
      recordSession: ({ start, end, samples, userId, note }) => {
        const st = useStore.getState();
        const member = st.team.find((m) => m.id === userId) ?? null;
        const recategorized = samples.map((s) => recategorizeForMember(s, member));
        const offline = st.offlineActivities.filter((o) => o.userId === userId && o.start >= start && o.end <= end);
        const clockedMinutes = (end - start) / 60_000;
        const score = computeFocusScore({ clockedMinutes, samples: recategorized, offline });
        const rec: SessionRecord = {
          id: `s_${start}`,
          userId,
          start,
          end,
          samples: recategorized,
          score,
          note,
        };
        set((s2) => ({ sessions: [...s2.sessions, rec] }));
        return rec;
      },
      addPlan: (p) =>
        set((st) => ({
          weeklyPlans: [...st.weeklyPlans.filter((x) => !(x.userId === p.userId && x.weekStart === p.weekStart)), p],
        })),
      addDelivery: (d) =>
        set((st) => ({
          weeklyDeliveries: [...st.weeklyDeliveries.filter((x) => !(x.userId === d.userId && x.weekStart === d.weekStart)), d],
        })),
      addAward: (a) => set((st) => ({ awards: [...st.awards, a] })),
      pushToast: (t) => set((st) => ({
        toasts: [...st.toasts, { ...t, id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() }],
      })),
      dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((x) => x.id !== id) })),
      markDemoSeeded: () => set({ demoSeeded: true }),
      addCoins: (userId, n) =>
        set((st) => ({ coins: { ...st.coins, [userId]: (st.coins[userId] ?? 0) + n } })),
      buyItem: (userId, itemId, cost) => {
        const st = useStore.getState();
        if ((st.coins[userId] ?? 0) < cost) return false;
        set({
          coins: { ...st.coins, [userId]: (st.coins[userId] ?? 0) - cost },
          purchases: [...st.purchases, { id: `p_${Date.now()}`, userId, itemId, cost, at: Date.now() }],
        });
        return true;
      },
      completeChallenge: (userId, challengeId, date) => {
        const st = useStore.getState();
        const exists = st.completedChallenges.some(
          (c) => c.userId === userId && c.challengeId === challengeId && c.date === date,
        );
        if (exists) return false;
        set({
          completedChallenges: [...st.completedChallenges, { userId, challengeId, date, at: Date.now() }],
        });
        return true;
      },
      unlockAchievement: (userId, achievementId) => {
        const st = useStore.getState();
        const list = st.unlockedAchievements[userId] ?? [];
        if (list.includes(achievementId)) return false;
        set({ unlockedAchievements: { ...st.unlockedAchievements, [userId]: [...list, achievementId] } });
        return true;
      },
      addOfflineActivity: (a) => {
        const activity: OfflineActivity = { ...a, id: `o_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
        set((st) => ({ offlineActivities: [...st.offlineActivities, activity] }));
        return activity;
      },
      removeOfflineActivity: (id) =>
        set((st) => ({ offlineActivities: st.offlineActivities.filter((x) => x.id !== id) })),
      recategorizeSample: (sample, member) => recategorizeForMember(sample, member),
      addTask: (input) => {
        const task: WeeklyTask = {
          id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: input.userId,
          weekStart: input.weekStart,
          title: input.title,
          description: input.description,
          status: 'open',
          priority: input.priority ?? 'normal',
          createdAt: Date.now(),
          updates: [],
          attachment: input.attachment,
        };
        set((st) => ({ tasks: [...st.tasks, task] }));
        return task;
      },
      updateTaskStatus: (taskId, status, note) => {
        set((st) => ({
          tasks: st.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const update: TaskUpdate = {
              id: `tu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              at: Date.now(),
              text: note ?? '',
              statusBefore: t.status,
              statusAfter: status,
            };
            return {
              ...t,
              status,
              completedAt: status === 'done' ? Date.now() : undefined,
              updates: [...t.updates, update],
            };
          }),
        }));
      },
      addTaskUpdate: (taskId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return null;
        const update: TaskUpdate = {
          id: `tu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          at: Date.now(),
          text: trimmed,
        };
        set((st) => ({
          tasks: st.tasks.map((t) => (t.id === taskId ? { ...t, updates: [...t.updates, update] } : t)),
        }));
        return update;
      },
      removeTask: (taskId) => set((st) => ({ tasks: st.tasks.filter((t) => t.id !== taskId) })),
      editTask: (taskId, patch) =>
        set((st) => ({ tasks: st.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) })),
      triggerHeartbeat: () => {
        const st = useStore.getState();
        if (!st.currentUser || !st.clockedIn || !st.sessionStart || st.pendingHeartbeat) return null;
        const hb: Heartbeat = {
          id: `hb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: st.currentUser.id,
          sessionStart: st.sessionStart,
          pingedAt: Date.now(),
          status: 'pending',
        };
        set({ pendingHeartbeat: hb, heartbeats: [...st.heartbeats, hb] });
        return hb;
      },
      resolveHeartbeat: (id, status) => {
        set((st) => ({
          heartbeats: st.heartbeats.map((h) =>
            h.id === id ? { ...h, status, respondedAt: Date.now() } : h,
          ),
          pendingHeartbeat: st.pendingHeartbeat?.id === id ? null : st.pendingHeartbeat,
        }));
      },
    }),
    {
      name: 'klocka-store',
      version: 5,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, fromVersion) => {
        const p = persisted as Partial<State> & { team?: TeamMember[] };
        if (fromVersion < 5) {
          return {
            ...(p as Partial<State>),
            sessions: [],
            demoSeeded: false,
            offlineActivities: [],
            tasks: [],
            heartbeats: [],
            team: demoTeam,
            currentUser: demoTeam.find((m) => m.id === p.currentUser?.id) ?? demoTeam[0],
          } as Partial<State>;
        }
        return { ...(p as Partial<State>), heartbeats: p.heartbeats ?? [] };
      },
      partialize: (s) => ({
        currentUser: s.currentUser,
        team: s.team,
        sessions: s.sessions,
        weeklyPlans: s.weeklyPlans,
        weeklyDeliveries: s.weeklyDeliveries,
        awards: s.awards,
        dailyGoalMinutes: s.dailyGoalMinutes,
        demoSeeded: s.demoSeeded,
        coins: s.coins,
        purchases: s.purchases,
        completedChallenges: s.completedChallenges,
        unlockedAchievements: s.unlockedAchievements,
        offlineActivities: s.offlineActivities,
        tasks: s.tasks,
        heartbeats: s.heartbeats,
      }),
    },
  ),
);

interface DemoProfile {
  workBias: number;
  switchiness: number;
  passiveProb: number;
  idleProb: number;
  ghostBlockPct: number;
  jiggler?: boolean;
}

const DEMO_PROFILES: Record<string, DemoProfile> = {
  default:   { workBias: 0.60, switchiness: 0.10, passiveProb: 0.10, idleProb: 0.10, ghostBlockPct: 0.05 },
  u_oscar:   { workBias: 0.80, switchiness: 0.06, passiveProb: 0.05, idleProb: 0.10, ghostBlockPct: 0.00 },
  u_viktor:  { workBias: 0.40, switchiness: 0.28, passiveProb: 0.18, idleProb: 0.18, ghostBlockPct: 0.20 },
  u_teo:     { workBias: 0.55, switchiness: 0.20, passiveProb: 0.10, idleProb: 0.22, ghostBlockPct: 0.10 },
  u_freddie: { workBias: 0.72, switchiness: 0.08, passiveProb: 0.05, idleProb: 0.08, ghostBlockPct: 0.00, jiggler: true },
};

interface DemoAppEntry { app: string; title: string }

function generateSampleRun(
  start: number,
  count: number,
  apps: { work: DemoAppEntry[]; fun: DemoAppEntry[] },
  p: DemoProfile,
): ActivitySample[] {
  const result: ActivitySample[] = [];
  let currentAppIdx = 0;
  let currentCategory: 'work' | 'fun' | 'communication' = 'work';
  let runLength = 0;
  const ghostStart = Math.floor(count * (0.3 + Math.random() * 0.4));
  const ghostLen = Math.floor(count * p.ghostBlockPct);

  for (let k = 0; k < count; k++) {
    const inGhost = p.ghostBlockPct > 0 && k >= ghostStart && k < ghostStart + ghostLen;
    const idle = !inGhost && Math.random() < p.idleProb;

    if (runLength === 0 || Math.random() < p.switchiness) {
      const r = Math.random();
      currentCategory = inGhost ? 'work'
        : r < p.workBias ? 'work'
        : r < p.workBias + (1 - p.workBias) * 0.55 ? 'fun'
        : 'communication';
      currentAppIdx = Math.floor(Math.random() * (currentCategory === 'work' ? apps.work.length : currentCategory === 'fun' ? apps.fun.length : 1));
      runLength = 1;
    } else {
      runLength += 1;
    }

    const choice = currentCategory === 'work'
      ? apps.work[currentAppIdx]
      : currentCategory === 'fun'
        ? apps.fun[currentAppIdx % apps.fun.length]
        : { app: 'Slack', title: '#general' };

    const isPassive = inGhost || (currentCategory === 'work' && Math.random() < p.passiveProb && runLength > 4);

    result.push({
      timestamp: start + k * 30_000,
      activeAppName: idle ? choice.app : choice.app,
      activeWindowTitle: choice.title,
      category: idle ? currentCategory : currentCategory,
      keystrokes: idle ? 0 : isPassive ? 0 : currentCategory === 'work' ? Math.floor(Math.random() * 80) : Math.floor(Math.random() * 20),
      mouseClicks: idle ? 0 : isPassive ? 0 : p.jiggler ? 1 : Math.floor(Math.random() * 10),
      isIdle: idle,
    });
  }
  return result;
}

const ROLE_DEMO_APPS: Record<string, { work: { app: string; title: string }[]; fun: { app: string; title: string }[] }> = {
  'u_teo':     {
    work: [
      { app: 'HubSpot', title: 'Pipeline · Q2' },
      { app: 'Calendar', title: 'Customer demo · Acme AB' },
      { app: 'Mail', title: 'Re: Offert till kund' },
      { app: 'Notion', title: 'Board meeting agenda' },
      { app: 'zoom.us', title: 'Säljmöte' },
    ],
    fun: [{ app: 'Instagram', title: 'Reels' }, { app: 'YouTube', title: 'Highlights' }],
  },
  'u_oscar':   {
    work: [
      { app: 'Cursor', title: 'klocka — main.ts' },
      { app: 'Terminal', title: 'npm run dev' },
      { app: 'GitHub Desktop', title: 'PR #142' },
      { app: 'Linear', title: 'KLO-23' },
    ],
    fun: [{ app: 'Spotify', title: 'Focus playlist' }],
  },
  'u_viktor':  {
    work: [
      { app: 'Figma', title: 'Q2 kampanj · Hero' },
      { app: 'Canva', title: 'LinkedIn post' },
      { app: 'Notion', title: 'Marknadsplan' },
      { app: 'Buffer', title: 'Schemalägg posts' },
    ],
    fun: [{ app: 'TikTok', title: 'For you' }, { app: 'FIFA 24', title: 'Career Mode' }, { app: 'Instagram', title: 'Stories' }],
  },
  'u_freddie': {
    work: [
      { app: 'Numbers', title: 'Cashflow Q2.numbers' },
      { app: 'Fortnox', title: 'Fakturor · obetalda' },
      { app: 'Cursor', title: 'reports.ts' },
      { app: 'Google Sheets', title: 'Budget 2026' },
    ],
    fun: [{ app: 'YouTube', title: 'Excel tutorials' }],
  },
};

export function generateDemoData() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60_000;
  const team = useStore.getState().team;
  const store = useStore.getState();
  team.forEach((member) => {
    const apps = ROLE_DEMO_APPS[member.id] ?? ROLE_DEMO_APPS['u_oscar'];
    for (let d = 5; d >= 1; d--) {
      const start = now - d * dayMs - 8 * 3600_000;
      const hours = 4 + Math.random() * 5;
      const end = start + hours * 3600_000;
      const sampleCount = Math.floor((end - start) / 30_000);
      const profile = DEMO_PROFILES[member.id] ?? DEMO_PROFILES.default;
      const samples: ActivitySample[] = generateSampleRun(start, sampleCount, apps, profile);
      store.recordSession({ start, end, samples, userId: member.id });

      if (member.id === 'u_teo' && d <= 4) {
        const callStart = start + 2 * 3600_000;
        store.addOfflineActivity({
          userId: member.id,
          start: callStart,
          end: callStart + 45 * 60_000,
          type: 'call',
          description: 'Säljsamtal kund',
          countsAs: 'work',
        });
      }
      if (member.id === 'u_viktor' && d === 3) {
        const meetStart = start + 3 * 3600_000;
        store.addOfflineActivity({
          userId: member.id,
          start: meetStart,
          end: meetStart + 60 * 60_000,
          type: 'workshop',
          description: 'Kreativ workshop · Q2-kampanj',
          countsAs: 'work',
        });
      }
      if (member.id === 'u_viktor' && d === 2) {
        const xboxStart = start + 4 * 3600_000;
        const idleStart = Math.floor((xboxStart - start) / 30_000);
        const idleLen = Math.floor((45 * 60_000) / 30_000);
        const sessionId = `s_${start}`;
        const sess = store.sessions.find((s) => s.id === sessionId);
        if (sess) {
          for (let i = idleStart; i < idleStart + idleLen && i < sess.samples.length; i++) {
            sess.samples[i] = { ...sess.samples[i], isIdle: true };
          }
        }
      }
      if (member.id === 'u_teo' && d <= 3) {
        const sessionId = `s_${start}`;
        const sess = store.sessions.find((s) => s.id === sessionId);
        if (sess) {
          for (let burst = 0; burst < 4; burst++) {
            const burstStart = Math.floor((sess.samples.length / 5) * (burst + 1));
            for (let i = burstStart; i < burstStart + 16 && i < sess.samples.length; i++) {
              sess.samples[i] = { ...sess.samples[i], isIdle: true };
            }
          }
        }
      }
    }
  });

  const now2 = Date.now();
  const hbDemo: Array<{ userId: string; offset: number; status: 'hit' | 'miss' }> = [
    { userId: 'u_oscar',   offset: -2 * 3600_000, status: 'hit' },
    { userId: 'u_oscar',   offset: -4 * 3600_000, status: 'hit' },
    { userId: 'u_viktor',  offset: -3 * 3600_000, status: 'miss' },
    { userId: 'u_teo',     offset: -5 * 3600_000, status: 'miss' },
    { userId: 'u_freddie', offset: -2 * 3600_000, status: 'hit' },
  ];
  hbDemo.forEach((h) => {
    useStore.setState((st) => ({
      heartbeats: [
        ...st.heartbeats,
        {
          id: `hb_demo_${h.userId}_${h.offset}`,
          userId: h.userId,
          sessionStart: now2 + h.offset - 3600_000,
          pingedAt: now2 + h.offset,
          respondedAt: h.status === 'hit' ? now2 + h.offset + 30_000 : undefined,
          status: h.status,
        },
      ],
    }));
  });

  const wkStart = new Date();
  wkStart.setDate(wkStart.getDate() - ((wkStart.getDay() + 6) % 7));
  wkStart.setHours(0, 0, 0, 0);
  const wk = wkStart.toISOString().slice(0, 10);

  const DEMO_TASKS: { userId: string; title: string; status: 'open' | 'in-progress' | 'done' | 'blocked'; updates?: string[] }[] = [
    { userId: 'u_teo',     title: 'Stänga avtal med Acme AB',          status: 'in-progress', updates: ['Skickat reviderat avtal.', 'Väntar på signatur, ringer fredag.'] },
    { userId: 'u_teo',     title: 'Boka 8 demos',                       status: 'in-progress', updates: ['5 av 8 bokade.'] },
    { userId: 'u_teo',     title: 'Board-prep deck',                    status: 'open' },
    { userId: 'u_teo',     title: 'Q2-plan med teamet',                 status: 'done' },
    { userId: 'u_oscar',   title: 'Mergea PR #142 (klocka-skeleton)',  status: 'done' },
    { userId: 'u_oscar',   title: 'Refaktor av session-store',           status: 'in-progress', updates: ['Halva storen klar.'] },
    { userId: 'u_oscar',   title: 'Review av Freddies rapport-PR',      status: 'open' },
    { userId: 'u_oscar',   title: 'Sätt upp deploy-pipeline',            status: 'blocked', updates: ['Väntar på AWS-access från Freddie.'] },
    { userId: 'u_viktor',  title: 'Q2-kampanj hero-design',              status: 'in-progress', updates: ['Första utkast i Figma.'] },
    { userId: 'u_viktor',  title: '3 LinkedIn-posts',                    status: 'in-progress', updates: ['1 publicerad.'] },
    { userId: 'u_viktor',  title: 'Storyboard till video-reel',          status: 'open' },
    { userId: 'u_freddie', title: 'Stänga aprils bokföring',              status: 'done' },
    { userId: 'u_freddie', title: 'Cashflow-prognos Q2',                  status: 'in-progress' },
    { userId: 'u_freddie', title: 'Faktura-jakt — 12 obetalda',            status: 'open' },
  ];

  DEMO_TASKS.forEach((t) => {
    const task = store.addTask({ userId: t.userId, weekStart: wk, title: t.title });
    if (t.status !== 'open') {
      store.updateTaskStatus(task.id, t.status);
    }
    (t.updates ?? []).forEach((u) => store.addTaskUpdate(task.id, u));
  });
}
