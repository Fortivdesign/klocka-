import { useMemo } from 'react';
import { useStore } from '../store';
import { startOfWeek } from '../lib/time';
import { computeFocusScore, pickRoastTitle } from '@shared/scoring';

export function SlackerView() {
  const team = useStore((s) => s.team);
  const sessions = useStore((s) => s.sessions);

  const rows = useMemo(() => {
    const weekStart = startOfWeek().getTime();
    return team.map((m) => {
      const userSessions = sessions.filter((s) => s.userId === m.id && s.start >= weekStart);
      const samples = userSessions.flatMap((s) => s.samples);
      const clockedMinutes = userSessions.reduce((acc, s) => acc + (s.end - s.start) / 60_000, 0);
      const score = computeFocusScore({ clockedMinutes, samples });
      return { member: m, score, clockedMinutes };
    }).sort((a, b) => a.score.finalScore - b.score.finalScore);
  }, [team, sessions]);

  const loser = rows[0];
  const roast = loser ? pickRoastTitle(loser.member.id + new Date().toISOString().slice(0, 10)) : null;

  return (
    <>
      <h1 className="h1">🦥 Veckans Slacker</h1>
      <p className="subtitle">Skojig utmärkelse — vinnaren bjuder på fika nästa måndag.</p>

      {loser && roast && (
        <div className="slacker-card">
          <div className="slacker-emoji">{roast.emoji}</div>
          <div className="slacker-title">{loser.member.avatarEmoji} {loser.member.name} — {roast.title}</div>
          <div className="slacker-roast">"{roast.roast}"</div>
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 24, color: 'var(--muted)' }}>
            <div>
              <div className="stat-label">Klockat</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{(loser.clockedMinutes / 60).toFixed(1)}h</div>
            </div>
            <div>
              <div className="stat-label">Faktiskt jobbat</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{(loser.score.workCategoryMinutes / 60).toFixed(1)}h</div>
            </div>
            <div>
              <div className="stat-label">Fokus</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{Math.round(loser.score.focusFactor * 100)}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 22 }}>
        <h3 style={{ marginTop: 0 }}>Hela slacker-listan</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Person</th>
              <th>Klockat</th>
              <th>Skoj-tid</th>
              <th>Fokus</th>
              <th>Roast</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const roast2 = pickRoastTitle(r.member.id + new Date().toISOString().slice(0, 10));
              return (
                <tr key={r.member.id}>
                  <td>{i + 1}</td>
                  <td>{r.member.avatarEmoji} {r.member.name}</td>
                  <td>{(r.clockedMinutes / 60).toFixed(1)}h</td>
                  <td>{(r.score.funCategoryMinutes / 60).toFixed(1)}h</td>
                  <td>{Math.round(r.score.focusFactor * 100)}%</td>
                  <td>{roast2.emoji} {roast2.title}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
