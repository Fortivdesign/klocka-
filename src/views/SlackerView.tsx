import { useMemo } from 'react';
import { useStore } from '../store';
import { startOfWeek, weekKey } from '../lib/time';
import { pickRoastTitle } from '@shared/scoring';
import { detect, type DetectorResult, type Signal } from '@shared/detector';
import { Avatar } from '../components/Avatar';
import { RoleBadges } from '../components/RoleBadges';

export function SlackerView() {
  const team = useStore((s) => s.team);
  const sessions = useStore((s) => s.sessions);
  const offline = useStore((s) => s.offlineActivities);
  const tasks = useStore((s) => s.tasks);

  const rows = useMemo(() => {
    const weekStart = startOfWeek().getTime();
    const wk = weekKey();
    return team.map((m) => {
      const userSessions = sessions.filter((s) => s.userId === m.id && s.start >= weekStart);
      const samples = userSessions.flatMap((s) => s.samples);
      const userOffline = offline.filter((o) => o.userId === m.id && o.start >= weekStart);
      const clockedMinutes = userSessions.reduce((acc, s) => acc + (s.end - s.start) / 60_000, 0);
      const myTasks = tasks.filter((t) => t.userId === m.id && t.weekStart === wk);
      const result = detect({
        samples,
        clockedMinutes,
        offline: userOffline,
        tasksTotal: myTasks.length,
        tasksDone: myTasks.filter((t) => t.status === 'done').length,
      });
      return { member: m, result, clockedMinutes };
    }).sort((a, b) => a.result.finalScore - b.result.finalScore);
  }, [team, sessions, offline, tasks]);

  const loser = rows[0];
  const roast = loser ? pickRoastTitle(loser.member.id + new Date().toISOString().slice(0, 10)) : null;

  return (
    <>
      <h1 className="h1">🦥 Veckans Slacker</h1>
      <p className="subtitle">Roligt utmärkelse med riktig evidens — detektorn visar varför.</p>

      {loser && roast && (
        <div className="slacker-card">
          <div className="slacker-emoji">{roast.emoji}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '8px 0' }}>
            <Avatar member={loser.member} size={44} />
            <div className="slacker-title">{loser.member.name} — {roast.title}</div>
          </div>
          <div className="slacker-roast">"{roast.roast}"</div>
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 24, color: 'var(--muted)', flexWrap: 'wrap' }}>
            <Stat label="Klockat" value={`${(loser.clockedMinutes / 60).toFixed(1)}h`} />
            <Stat label="Aktivt" value={`${(loser.result.activeMinutes / 60).toFixed(1)}h`} />
            <Stat label="Spöke-tid" value={`${Math.round(loser.result.passiveMinutes)} min`} hi={loser.result.passiveMinutes > 15} />
            <Stat label="App-byten/h" value={Math.round(loser.result.contextSwitchesPerHour).toString()} hi={loser.result.fragmentation === 'high'} />
            <Stat label="Fokus" value={`${Math.round(loser.result.focusFactor * 100)}%`} />
            <Stat label="Trust" value={`${Math.round(loser.result.trustScore * 100)}%`} hi={loser.result.trustScore < 0.7} />
          </div>
          {loser.result.signals.length > 0 && (
            <div className="evidence-list">
              {loser.result.signals.filter((s) => s.kind !== 'good').map((s, i) => (
                <SignalChip key={i} signal={s} />
              ))}
            </div>
          )}
        </div>
      )}

      <h2 style={{ marginTop: 28, fontSize: 18 }}>📂 Detektivens kartotek — hela teamet</h2>
      <div className="detective-grid">
        {rows.map((r) => (
          <div key={r.member.id} className={`card detective-card trust-${trustClass(r.result.trustScore)}`}>
            <div className="detective-head">
              <Avatar member={r.member} size={42} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{r.member.name}</div>
                <RoleBadges roles={r.member.roles} size="sm" />
              </div>
              <div className="detective-score">
                <div style={{ fontWeight: 800, fontSize: 22 }}>{r.result.finalScore}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>pts</div>
              </div>
            </div>

            <div className="detective-bars">
              <BarStat label="Fokus" value={r.result.focusFactor} color="var(--accent)" />
              <BarStat label="Trust" value={r.result.trustScore} color={r.result.trustScore < 0.7 ? 'var(--warn)' : 'var(--accent-2)'} />
              <BarStat
                label="Plan"
                value={r.result.planCompletion ?? 0}
                color={(r.result.planCompletion ?? 0) >= 0.6 ? 'var(--accent-2)' : 'var(--danger)'}
              />
            </div>

            <div className="detective-grid-stats">
              <Mini label="Aktiv" value={`${Math.round(r.result.activeMinutes / 60 * 10) / 10}h`} />
              <Mini label="Jobb-app" value={`${Math.round(r.result.workCategoryMinutes / 60 * 10) / 10}h`} />
              <Mini label="Skoj" value={`${Math.round(r.result.funCategoryMinutes)} min`} kind={r.result.funCategoryMinutes > 60 ? 'bad' : 'ok'} />
              <Mini label="Spöke" value={`${Math.round(r.result.passiveMinutes)} min`} kind={r.result.passiveMinutes > 15 ? 'bad' : 'ok'} />
              <Mini label="App/h" value={Math.round(r.result.contextSwitchesPerHour).toString()} kind={r.result.fragmentation === 'high' ? 'bad' : 'ok'} />
              <Mini label="Flow-block" value={r.result.deepFocusBlocks.toString()} kind={r.result.deepFocusBlocks >= 2 ? 'good' : 'ok'} />
            </div>

            {r.result.signals.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12, fontStyle: 'italic', marginTop: 10 }}>
                Inga starka signaler — ren och fin vecka.
              </div>
            ) : (
              <div className="evidence-list compact">
                {r.result.signals.map((s, i) => (<SignalChip key={i} signal={s} />))}
              </div>
            )}

            {r.result.workApps.length > 0 && (
              <details className="detective-details">
                <summary>App-fördelning</summary>
                <div className="app-bars">
                  {[...r.result.workApps.slice(0, 5), ...r.result.funApps.slice(0, 3)].map((a) => (
                    <div key={a.name} className="app-bar-row">
                      <span className="app-bar-name">{a.name}</span>
                      <div className="app-bar-track">
                        <div
                          className="app-bar-fill"
                          style={{
                            width: `${Math.min(100, (a.minutes / 60) * 100)}%`,
                            background: r.result.workApps.includes(a) ? 'var(--accent-2)' : 'var(--danger)',
                          }}
                        />
                      </div>
                      <span className="app-bar-time">{a.minutes >= 60 ? `${(a.minutes / 60).toFixed(1)}h` : `${Math.round(a.minutes)}m`}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value, hi }: { label: string; value: string; hi?: boolean }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: hi ? 'var(--danger)' : 'var(--text)' }}>{value}</div>
    </div>
  );
}

function SignalChip({ signal }: { signal: Signal }) {
  return (
    <div className={`signal signal-${signal.kind}`} title={signal.detail}>
      <span style={{ fontSize: 16 }}>{signal.emoji}</span>
      <div>
        <div style={{ fontWeight: 600 }}>{signal.label}</div>
        <div style={{ color: 'var(--muted)', fontSize: 11 }}>{signal.detail}</div>
      </div>
    </div>
  );
}

function BarStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bar-stat">
      <div className="bar-stat-head">
        <span>{label}</span>
        <span style={{ color: 'var(--muted)' }}>{Math.round(value * 100)}%</span>
      </div>
      <div className="bar-stat-track">
        <div className="bar-stat-fill" style={{ width: `${value * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function Mini({ label, value, kind = 'ok' }: { label: string; value: string; kind?: 'good' | 'bad' | 'ok' }) {
  return (
    <div className={`mini mini-${kind}`}>
      <div className="mini-value">{value}</div>
      <div className="mini-label">{label}</div>
    </div>
  );
}

function trustClass(t: number): string {
  if (t < 0.5) return 'low';
  if (t < 0.75) return 'med';
  return 'high';
}

export type { DetectorResult };
