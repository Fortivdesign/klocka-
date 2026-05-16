import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ActivitySample, FocusScore, WeeklyPlan, WeeklyDelivery, SlackerAward, OfflineActivity } from '@shared/types';
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
    }),
    {
      name: 'klocka-store',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted) => {
        const p = persisted as Partial<State> & { team?: TeamMember[] };
        if (p?.team && p.team.some((m) => !('roles' in m) || !m.roles)) {
          return {
            ...p,
            team: demoTeam,
            currentUser: demoTeam.find((m) => m.id === p.currentUser?.id) ?? demoTeam[0],
            sessions: [],
            demoSeeded: false,
            offlineActivities: [],
          } as Partial<State>;
        }
        return p as Partial<State>;
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
      }),
    },
  ),
);

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
      const workBias =
        member.id === 'u_oscar' ? 0.78 :
        member.id === 'u_viktor' ? 0.40 :
        member.id === 'u_teo' ? 0.55 :
        member.id === 'u_freddie' ? 0.70 :
        0.6;
      const samples: ActivitySample[] = Array.from({ length: sampleCount }).map((_, k) => {
        const r = Math.random();
        const idle = r > 0.91;
        const isWork = !idle && Math.random() < workBias;
        const isFun = !idle && !isWork && Math.random() < (1 - workBias) * 0.55;
        const workChoice = apps.work[Math.floor(Math.random() * apps.work.length)];
        const funChoice = apps.fun[Math.floor(Math.random() * apps.fun.length)];
        return {
          timestamp: start + k * 30_000,
          activeAppName: isWork ? workChoice.app : isFun ? funChoice.app : 'Slack',
          activeWindowTitle: isWork ? workChoice.title : isFun ? funChoice.title : '#general',
          category: isWork ? 'work' : isFun ? 'fun' : 'communication',
          keystrokes: isWork ? Math.floor(Math.random() * 80) : 0,
          mouseClicks: Math.floor(Math.random() * 10),
          isIdle: idle,
        };
      });
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
    }
  });
}
