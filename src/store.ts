import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ActivitySample, FocusScore, WeeklyPlan, WeeklyDelivery, SlackerAward } from '@shared/types';
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
}

const demoTeam: TeamMember[] = [
  { id: 'u_teo',     name: 'Teo',     avatarEmoji: '🦊', color: '#7c5cff' },
  { id: 'u_oscar',   name: 'Oscar',   avatarEmoji: '🐼', color: '#29d398' },
  { id: 'u_freddie', name: 'Freddie', avatarEmoji: '🦁', color: '#f5a524' },
  { id: 'u_viktor',  name: 'Viktor',  avatarEmoji: '🐧', color: '#ff6b6b' },
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
      setUser: (u) => set({ currentUser: u }),
      setTeam: (t) => set({ team: t }),
      setClockedIn: (b, sessionStart = null) => set({ clockedIn: b, sessionStart }),
      setLiveSamples: (s) => set({ liveSamples: s }),
      setDailyGoalMinutes: (m) => set({ dailyGoalMinutes: m }),
      recordSession: ({ start, end, samples, userId, note }) => {
        const clockedMinutes = (end - start) / 60_000;
        const score = computeFocusScore({ clockedMinutes, samples });
        const rec: SessionRecord = {
          id: `s_${start}`,
          userId,
          start,
          end,
          samples,
          score,
          note,
        };
        set((st) => ({ sessions: [...st.sessions, rec] }));
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
    }),
    {
      name: 'klocka-store',
      storage: createJSONStorage(() => localStorage),
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
      }),
    },
  ),
);

export function generateDemoData() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60_000;
  const team = useStore.getState().team;
  const store = useStore.getState();
  team.forEach((member, i) => {
    for (let d = 5; d >= 1; d--) {
      const start = now - d * dayMs - 8 * 3600_000;
      const hours = 4 + Math.random() * 5;
      const end = start + hours * 3600_000;
      const sampleCount = Math.floor((end - start) / 30_000);
      const workBias =
        member.id === 'u_oscar' ? 0.85 :
        member.id === 'u_viktor' ? 0.25 :
        member.id === 'u_teo' ? 0.7 :
        0.55 + (i % 3) * 0.1;
      const samples: ActivitySample[] = Array.from({ length: sampleCount }).map((_, k) => {
        const r = Math.random();
        const idle = r > 0.92;
        const isWork = !idle && Math.random() < workBias;
        const isFun = !idle && !isWork && Math.random() < (1 - workBias) * 0.6;
        return {
          timestamp: start + k * 30_000,
          activeAppName: isWork ? 'Visual Studio Code' : isFun ? 'FIFA 24' : 'Slack',
          activeWindowTitle: isWork ? 'Klocka — index.ts' : isFun ? 'Career Mode' : '#general',
          category: isWork ? 'work' : isFun ? 'fun' : 'communication',
          keystrokes: isWork ? Math.floor(Math.random() * 80) : 0,
          mouseClicks: Math.floor(Math.random() * 10),
          isIdle: idle,
        };
      });
      store.recordSession({ start, end, samples, userId: member.id });
    }
  });
}
