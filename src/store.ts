import { create } from 'zustand';
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
  setUser: (u: TeamMember) => void;
  setTeam: (t: TeamMember[]) => void;
  setClockedIn: (b: boolean, sessionStart?: number | null) => void;
  setLiveSamples: (s: ActivitySample[]) => void;
  recordSession: (rec: { start: number; end: number; samples: ActivitySample[]; userId: string; note?: string }) => SessionRecord;
  addPlan: (p: WeeklyPlan) => void;
  addDelivery: (d: WeeklyDelivery) => void;
  addAward: (a: SlackerAward) => void;
}

const demoTeam: TeamMember[] = [
  { id: 'u_viktor', name: 'Viktor', avatarEmoji: '🦊' },
  { id: 'u_anna',   name: 'Anna',   avatarEmoji: '🐼' },
  { id: 'u_jonas',  name: 'Jonas',  avatarEmoji: '🦁' },
  { id: 'u_sara',   name: 'Sara',   avatarEmoji: '🦄' },
  { id: 'u_emil',   name: 'Emil',   avatarEmoji: '🐧' },
];

export const useStore = create<State>((set) => ({
  currentUser: demoTeam[0],
  team: demoTeam,
  clockedIn: false,
  sessionStart: null,
  sessions: [],
  liveSamples: [],
  weeklyPlans: [],
  weeklyDeliveries: [],
  awards: [],
  setUser: (u) => set({ currentUser: u }),
  setTeam: (t) => set({ team: t }),
  setClockedIn: (b, sessionStart = null) => set({ clockedIn: b, sessionStart }),
  setLiveSamples: (s) => set({ liveSamples: s }),
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
  addPlan: (p) => set((st) => ({ weeklyPlans: [...st.weeklyPlans, p] })),
  addDelivery: (d) => set((st) => ({ weeklyDeliveries: [...st.weeklyDeliveries, d] })),
  addAward: (a) => set((st) => ({ awards: [...st.awards, a] })),
}));

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
      const workBias = member.id === 'u_anna' ? 0.85 : member.id === 'u_viktor' ? 0.25 : 0.55 + (i % 3) * 0.1;
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
