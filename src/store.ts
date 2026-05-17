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
      version: 6,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted) => {
        const p = persisted as Partial<State> & { team?: TeamMember[] };
        return {
          ...(p as Partial<State>),
          sessions: [],
          offlineActivities: [],
          tasks: [],
          heartbeats: [],
          purchases: [],
          completedChallenges: [],
          unlockedAchievements: {},
          coins: {},
          weeklyPlans: [],
          weeklyDeliveries: [],
          awards: [],
          team: demoTeam,
          currentUser: demoTeam.find((m) => m.id === p.currentUser?.id) ?? demoTeam[0],
          demoSeeded: true,
        } as Partial<State>;
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

