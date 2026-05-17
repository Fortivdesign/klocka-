import { useMemo } from 'react';
import { useStore, type TeamMember } from '../store';
import { startOfWeek } from '../lib/time';
import { computeFocusScore } from '@shared/scoring';
import { Avatar } from '../components/Avatar';

interface Row {
  member: TeamMember;
  clockedH: number;
  workH: number;
  funH: number;
  focus: number;
  score: number;
}

export function Leaderboard() {
  const team = useStore((s) => s.team);
  const sessions = useStore((s) => s.sessions);
  const offline = useStore((s) => s.offlineActivities);

  const rows = useMemo<Row[]>(() => {
    const weekStart = startOfWeek().getTime();
    return team.map((m) => {
      const userSessions = sessions.filter((s) => s.userId === m.id && s.start >= weekStart);
      const samples = userSessions.flatMap((s) => s.samples);
      const userOffline = offline.filter((o) => o.userId === m.id && o.start >= weekStart);
      const clockedMinutes = userSessions.reduce((acc, s) => acc + (s.end - s.start) / 60_000, 0);
      const score = computeFocusScore({ clockedMinutes, samples, offline: userOffline });
      return {
        member: m,
        clockedH: clockedMinutes / 60,
        workH: score.workCategoryMinutes / 60,
        funH: score.funCategoryMinutes / 60,
        focus: score.focusFactor,
        score: score.finalScore,
      };
    }).sort((a, b) => b.score - a.score);
  }, [team, sessions, offline]);

  return (
    <>
      <h1 className="h1">🏆 Leaderboard</h1>
      <p className="subtitle">Veckans tävling. Score anpassas efter roll — säljarens HubSpot räknas som jobb, designerns Figma också, devens VS Code likaså.</p>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Person</th>
              <th>Klockat</th>
              <th>Jobb</th>
              <th>Skoj</th>
              <th>Fokus</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.member.id} className={i === 0 ? 'top-row' : ''}>
                <td className="rank-cell">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</td>
                <td>
                  <div className="user-cell">
                    <Avatar member={r.member} size={28} />
                    <span>{r.member.name}</span>
                  </div>
                </td>
                <td>{r.clockedH.toFixed(1)}h</td>
                <td><span className="pill work">{r.workH.toFixed(1)}h</span></td>
                <td><span className="pill fun">{r.funH.toFixed(1)}h</span></td>
                <td>
                  <div className="score-bar" style={{ width: 100 }}>
                    <div style={{ width: `${r.focus * 100}%` }} />
                  </div>
                </td>
                <td><b style={{ fontSize: 16 }}>{r.score}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>🎁 Veckans pris</h3>
          <p style={{ color: 'var(--muted)' }}>
            Vinnaren får välja hela teamets nästa lunch och en heders-emoji bredvid sitt namn under nästa vecka.
          </p>
          {rows[0] && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
              <Avatar member={rows[0].member} size={32} showRing />
              <span><b>{rows[0].member.name}</b> leder med <b>{rows[0].score}</b> pts.</span>
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>🪙 Bonuspoäng</h3>
          <ul style={{ color: 'var(--muted)' }}>
            <li>+50 pts: deploy till prod</li>
            <li>+30 pts: leverera enligt veckoplan</li>
            <li>+20 pts: hjälp en kollega (manuell tilldelning)</li>
            <li>-25 pts: missa veckomötet</li>
          </ul>
        </div>
      </div>
    </>
  );
}
