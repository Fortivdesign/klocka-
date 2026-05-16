import { useMemo } from 'react';
import { useStore } from '../store';
import { computeFocusScore } from '@shared/scoring';

interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  test: (ctx: { totalH: number; workH: number; focus: number; sessions: number }) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'early',     emoji: '🌅', title: 'Tidig Fågel',         description: 'Klockade in före 08:00 tre dagar i rad.', test: () => false },
  { id: 'marathon',  emoji: '🏃', title: 'Maratonlöparen',      description: 'Loggade 40+ timmar på en vecka.',         test: (c) => c.totalH >= 40 },
  { id: 'sniper',    emoji: '🎯', title: 'Fokus-Snipern',       description: 'Höll 85%+ fokus över en hel vecka.',      test: (c) => c.focus >= 0.85 },
  { id: 'committer', emoji: '💎', title: 'Hårdkommitterad',     description: 'Loggade 25+ timmar i jobb-kategorin.',     test: (c) => c.workH >= 25 },
  { id: 'consistent',emoji: '🧱', title: 'Konsekvent',          description: 'Klockat in 5 dagar i veckan.',             test: (c) => c.sessions >= 5 },
  { id: 'nightowl',  emoji: '🦉', title: 'Nattugglan',          description: 'Loggade aktiv tid efter 22:00.',           test: () => false },
  { id: 'rescuer',   emoji: '🚑', title: 'Brand-Räddaren',      description: 'Hjälpte fixa en prod-incident.',           test: () => false },
  { id: 'streak',    emoji: '🔥', title: 'Veckostreak',         description: 'Topp 3 på leaderboard 3 veckor i rad.',    test: () => false },
];

export function Achievements() {
  const user = useStore((s) => s.currentUser);
  const sessions = useStore((s) => s.sessions);

  const unlocked = useMemo(() => {
    if (!user) return new Set<string>();
    const userSessions = sessions.filter((s) => s.userId === user.id);
    const samples = userSessions.flatMap((s) => s.samples);
    const clockedMinutes = userSessions.reduce((acc, s) => acc + (s.end - s.start) / 60_000, 0);
    const score = computeFocusScore({ clockedMinutes, samples });
    const ctx = {
      totalH: clockedMinutes / 60,
      workH: score.workCategoryMinutes / 60,
      focus: score.focusFactor,
      sessions: userSessions.length,
    };
    return new Set(ACHIEVEMENTS.filter((a) => a.test(ctx)).map((a) => a.id));
  }, [user, sessions]);

  return (
    <>
      <h1 className="h1">🎖️ Achievements</h1>
      <p className="subtitle">Lås upp medaljer genom att jobba. Ja, riktigt jobba.</p>

      <div className="grid cols-3">
        {ACHIEVEMENTS.map((a) => {
          const open = unlocked.has(a.id);
          return (
            <div key={a.id} className="card" style={{ opacity: open ? 1 : 0.5 }}>
              <div style={{ fontSize: 40 }}>{open ? a.emoji : '🔒'}</div>
              <div style={{ fontWeight: 700, marginTop: 8 }}>{a.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{a.description}</div>
              <div style={{ marginTop: 10 }}>
                <span className={`pill ${open ? 'work' : ''}`}>{open ? 'Upplåst' : 'Låst'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
