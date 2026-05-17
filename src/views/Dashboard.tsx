import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { calcStreak, formatHM, formatHMS, startOfDay } from '../lib/time';
import { computeFocusScore } from '@shared/scoring';
import type { ActivitySample } from '@shared/types';
import { todaysChallenge } from '../lib/challenges';
import { celebrate, sfx } from '../lib/effects';
import { pushSession } from '../lib/sync';
import { ROLES } from '@shared/roles';
import { OfflineLog } from '../components/OfflineLog';
import { RoleBadges } from '../components/RoleBadges';
import { weekKey } from '../lib/time';
import { analyze } from '../lib/analyze';
import type { View } from '../components/Sidebar';

export function Dashboard({ onNavigate }: { onNavigate?: (v: View) => void }) {
  const user = useStore((s) => s.currentUser);
  const tasks = useStore((s) => s.tasks);
  const updateTaskStatus = useStore((s) => s.updateTaskStatus);
  const clockedIn = useStore((s) => s.clockedIn);
  const sessionStart = useStore((s) => s.sessionStart);
  const setClockedIn = useStore((s) => s.setClockedIn);
  const recordSession = useStore((s) => s.recordSession);
  const liveSamples = useStore((s) => s.liveSamples);
  const setLiveSamples = useStore((s) => s.setLiveSamples);
  const sessions = useStore((s) => s.sessions);
  const dailyGoal = useStore((s) => s.dailyGoalMinutes);
  const pushToast = useStore((s) => s.pushToast);
  const coins = useStore((s) => s.coins);
  const addCoins = useStore((s) => s.addCoins);
  const completeChallenge = useStore((s) => s.completeChallenge);
  const completedChallenges = useStore((s) => s.completedChallenges);

  const [now, setNow] = useState(Date.now());
  const [note, setNote] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!clockedIn) return;
    const api = window.klocka;
    if (!api) return;
    const t = setInterval(async () => {
      const samples = await api.tracker.samples();
      setLiveSamples(samples);
    }, 5000);
    return () => clearInterval(t);
  }, [clockedIn, setLiveSamples]);

  useEffect(() => {
    const handler = () => {
      if (clockedIn) void handleClockOut(); else void handleClockIn();
    };
    window.addEventListener('klocka:toggle-clock', handler);
    return () => window.removeEventListener('klocka:toggle-clock', handler);
  });

  const elapsed = clockedIn && sessionStart ? now - sessionStart : 0;
  const clockedMinutes = elapsed / 60_000;
  const offline = useStore((s) => s.offlineActivities);
  const heartbeats = useStore((s) => s.heartbeats);
  const liveDetector = useMemo(
    () => user ? analyze({
      userId: user.id,
      samples: liveSamples,
      clockedMinutes,
      offline,
      tasks,
      heartbeats,
      sessionStart: sessionStart ?? undefined,
    }) : null,
    [user, liveSamples, clockedMinutes, offline, tasks, heartbeats, sessionStart],
  );
  const liveScore = liveDetector ?? computeFocusScore({ clockedMinutes, samples: liveSamples });

  const todayStats = useMemo(() => {
    if (!user) return null;
    const todayStart = startOfDay().getTime();
    const todays = sessions.filter((s) => s.userId === user.id && s.start >= todayStart);
    const totalMin = todays.reduce((a, s) => a + (s.end - s.start) / 60_000, 0) + clockedMinutes;
    const workMin = todays.reduce((a, s) => a + s.score.workCategoryMinutes, 0) + liveScore.workCategoryMinutes;
    const score = todays.reduce((a, s) => a + s.score.finalScore, 0) + liveScore.finalScore;
    return { totalMin, workMin, score, sessions: todays.length };
  }, [user, sessions, clockedMinutes, liveScore]);

  const streak = useMemo(() => {
    if (!user) return 0;
    const starts = sessions.filter((s) => s.userId === user.id).map((s) => s.start);
    return calcStreak(starts);
  }, [user, sessions]);

  const goalPct = todayStats ? Math.min(100, (todayStats.totalMin / dailyGoal) * 100) : 0;

  async function handleClockIn() {
    if (!user) return;
    const api = window.klocka;
    let timestamp = Date.now();
    if (api) {
      try {
        const evt = await api.clock.in(user.id, note);
        timestamp = evt.timestamp;
      } catch (e) {
        pushToast({ title: 'Kunde inte klocka in', body: String(e), kind: 'warn' });
        return;
      }
    }
    setClockedIn(true, timestamp);
    sfx.clockIn();
    pushToast({
      title: `Inklockad! ${user.avatarEmoji}`,
      body: note ? `Plan: ${note}` : 'Lycka till idag!',
      kind: 'success',
    });
    setNote('');
  }

  async function handleClockOut() {
    if (!user || !sessionStart) return;
    const api = window.klocka;
    let samples: ActivitySample[] = liveSamples;
    let end = Date.now();
    if (api) {
      const r = await api.clock.out(user.id, note);
      samples = r.session.samples;
      end = r.session.end ?? Date.now();
    }
    const rec = recordSession({ start: sessionStart, end, samples, userId: user.id, note: note || undefined });
    void pushSession(rec).catch(() => {});
    setClockedIn(false, null);
    setLiveSamples([]);
    setNote('');
    const earnedCoins = Math.floor(rec.score.finalScore / 10);
    if (earnedCoins > 0) addCoins(user.id, earnedCoins);
    sfx.clockOut();
    if (rec.score.focusFactor > 0.75) celebrate({ intensity: rec.score.focusFactor > 0.9 ? 'huge' : 'normal' });
    pushToast({
      title: `Utklockad efter ${formatHM(end - sessionStart)}`,
      body: `Score: ${rec.score.finalScore} pts • +${earnedCoins} 🪙 • Fokus: ${Math.round(rec.score.focusFactor * 100)}%`,
      kind: rec.score.focusFactor > 0.7 ? 'celebrate' : 'info',
    });
  }

  const challenge = useMemo(() => {
    if (!user || !user.roles.length) return todaysChallenge();
    const pool = user.roles.flatMap((r) => ROLES[r]?.challenges.map((c) => ({ ...c, id: `${r}:${c.title}` })) ?? []);
    if (!pool.length) return todaysChallenge();
    const key = `${user.id}-${new Date().toISOString().slice(0, 10)}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    return pool[Math.abs(hash) % pool.length];
  }, [user]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const challengeDone = user
    ? completedChallenges.some((c) => c.userId === user.id && c.challengeId === challenge.id && c.date === todayKey)
    : false;
  const onFire = liveScore.focusFactor > 0.8 && clockedMinutes > 30;
  const myCoins = user ? coins[user.id] ?? 0 : 0;

  const wk = weekKey();
  const myTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter((t) => t.userId === user.id && t.weekStart === wk);
  }, [tasks, user, wk]);
  const taskStats = useMemo(() => ({
    total: myTasks.length,
    done: myTasks.filter((t) => t.status === 'done').length,
    inProgress: myTasks.filter((t) => t.status === 'in-progress').length,
    blocked: myTasks.filter((t) => t.status === 'blocked').length,
  }), [myTasks]);
  const upNext = useMemo(() => {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    return [...myTasks]
      .filter((t) => t.status !== 'done')
      .sort((a, b) => {
        if (a.status === 'blocked' && b.status !== 'blocked') return 1;
        if (a.status !== 'blocked' && b.status === 'blocked') return -1;
        if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
        if (a.status !== 'in-progress' && b.status === 'in-progress') return 1;
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 3);
  }, [myTasks]);

  function quickToggle(taskId: string, currentStatus: typeof myTasks[number]['status']) {
    if (!user) return;
    const isDone = currentStatus === 'done';
    updateTaskStatus(taskId, isDone ? 'open' : 'done');
    if (!isDone) {
      addCoins(user.id, 15);
      sfx.coin();
      celebrate({ intensity: 'mini' });
      pushToast({ title: 'Uppgift klar! ✅', body: '+15 🪙', kind: 'celebrate' });
    }
  }

  function claimChallenge() {
    if (!user) return;
    const ok = completeChallenge(user.id, challenge.id, todayKey);
    if (ok) {
      addCoins(user.id, challenge.rewardCoins);
      sfx.coin();
      celebrate({ intensity: 'mini' });
      pushToast({ title: `Utmaning klar! ${challenge.emoji}`, body: `+${challenge.rewardCoins} 🪙`, kind: 'celebrate' });
    }
  }

  if (!user) return null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Hej {user.name} 👋</h1>
          <p className="subtitle">
            {clockedIn ? 'Du är inklockad. Fokus är allt.' : 'Inte inklockad. Dags att börja jobba?'}
          </p>
          <RoleBadges roles={user.roles} size="md" />
        </div>
        <div className="head-stats">
          {onFire && (
            <div className="head-stat on-fire">
              <div className="head-stat-value">🔥</div>
              <div className="head-stat-label">On Fire!</div>
            </div>
          )}
          <div className="head-stat">
            <div className="head-stat-value">{streak}🔥</div>
            <div className="head-stat-label">Streak</div>
          </div>
          <div className="head-stat">
            <div className="head-stat-value" style={{ color: 'var(--gold)' }}>{myCoins}</div>
            <div className="head-stat-label">🪙 Mynt</div>
          </div>
          <div className="head-stat">
            <div className="head-stat-value">{todayStats?.score ?? 0}</div>
            <div className="head-stat-label">Pts idag</div>
          </div>
        </div>
      </div>

      <div className="clock-hero">
        <div>
          <div className="stat-label">{clockedIn ? 'Tid på kontoret' : 'Klart att starta'}</div>
          <div className="clock-time">{formatHMS(elapsed)}</div>
          {clockedIn && (
            <div className="live-row">
              <span className={`live-dot`} />
              <span>Live</span>
              <span className="sep">•</span>
              <span>Fokus {Math.round(liveScore.focusFactor * 100)}%</span>
              <span className="sep">•</span>
              <span>{liveScore.finalScore} pts</span>
            </div>
          )}
        </div>
        <div className="hero-actions">
          <input
            placeholder={clockedIn ? 'Vad har du jobbat på?' : 'Vad ska du jobba med?'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (clockedIn ? handleClockOut() : handleClockIn())}
          />
          {clockedIn ? (
            <button className="danger big" onClick={handleClockOut}>Klocka ut</button>
          ) : (
            <button className="success big" onClick={handleClockIn}>Klocka in</button>
          )}
        </div>
      </div>

      <div className="card challenge-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 44, lineHeight: 1 }}>{challenge.emoji}</div>
          <div style={{ flex: 1 }}>
            <div className="stat-label">Dagens utmaning</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{challenge.title}</div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>{challenge.description}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: 8 }}>+{challenge.rewardCoins} 🪙</div>
            {challengeDone ? (
              <span className="pill work">✓ Klar</span>
            ) : (
              <button className="primary" onClick={claimChallenge}>Markera klar</button>
            )}
          </div>
        </div>
      </div>

      <div className="card plan-mini-card">
        <div className="plan-mini-head">
          <div>
            <div className="stat-label">Veckans plan</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginTop: 2 }}>
              {taskStats.total === 0
                ? 'Lägg till uppgifter denna vecka'
                : `${taskStats.done} av ${taskStats.total} klart`}
              {taskStats.inProgress > 0 && (
                <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                  · {taskStats.inProgress} pågår
                </span>
              )}
              {taskStats.blocked > 0 && (
                <span style={{ color: 'var(--danger)', fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                  · {taskStats.blocked} blockerad
                </span>
              )}
            </div>
          </div>
          <button onClick={() => onNavigate?.('plan')}>Öppna →</button>
        </div>
        {taskStats.total > 0 && (
          <div className="progress" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${(taskStats.done / taskStats.total) * 100}%` }} />
          </div>
        )}
        {upNext.length > 0 && (
          <div className="plan-mini-list">
            {upNext.map((t) => (
              <div key={t.id} className={`plan-mini-row status-${t.status}`}>
                <button
                  className="task-checkbox-small"
                  onClick={() => quickToggle(t.id, t.status)}
                  title="Markera som klar"
                >⚪</button>
                <span className="plan-mini-title">{t.title}</span>
                <span className="pill" style={{ fontSize: 10 }}>
                  {t.status === 'in-progress' ? '🟡 Pågår' : t.status === 'blocked' ? '🔴 Blockerad' : '⚪ Öppen'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card goal-card" style={{ marginTop: 16 }}>
        <div className="goal-head">
          <div>
            <div className="stat-label">Dagligt mål</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {formatHM((todayStats?.totalMin ?? 0) * 60_000)} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>av {formatHM(dailyGoal * 60_000)}</span>
            </div>
          </div>
          <div className="goal-pct">{Math.round(goalPct)}%</div>
        </div>
        <div className="progress">
          <div className="progress-fill" style={{ width: `${goalPct}%` }} />
        </div>
      </div>

      <div className="grid cols-3" style={{ marginTop: 16 }}>
        <div className="card stat-card">
          <div className="stat-label">Aktiv tid</div>
          <div className="stat-value">{Math.round(liveScore.activeMinutes)}<span className="unit"> min</span></div>
          <div className="stat-foot">av {Math.round(clockedMinutes)} min klockat</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Jobb-kategori</div>
          <div className="stat-value" style={{ color: 'var(--accent-2)' }}>
            {Math.round(liveScore.workCategoryMinutes)}<span className="unit"> min</span>
          </div>
          <div className="stat-foot">VS Code, Figma, dokument…</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Skoj-kategori</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {Math.round(liveScore.funCategoryMinutes)}<span className="unit"> min</span>
          </div>
          <div className="stat-foot">FIFA, TikTok, YouTube…</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="stat-label">Fokus-faktor</div>
        <div className="score-bar" style={{ marginTop: 10 }}>
          <div style={{ width: `${liveScore.focusFactor * 100}%` }} />
        </div>
        <div className="stat-foot" style={{ marginTop: 8 }}>
          {liveScore.focusFactor > 0.75 ? '🚀 Hög fokus, du flyger!'
            : liveScore.focusFactor > 0.5 ? '💪 Schysst tempo.'
            : liveScore.focusFactor > 0.25 ? '😬 Lite distraherad.'
            : '🦥 Hmm. Dags att rensa flikar?'}
        </div>
      </div>

      {liveDetector && liveDetector.signals.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="stat-label">Live-signaler från detektorn</div>
          <div className="evidence-list compact" style={{ marginTop: 10 }}>
            {liveDetector.signals.map((s, i) => (
              <div key={i} className={`signal signal-${s.kind}`} title={s.detail}>
                <span style={{ fontSize: 16 }}>{s.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.label}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <OfflineLog />
      </div>

      {clockedIn && (
        <div style={{ marginTop: 12, color: 'var(--muted-2)', fontSize: 11, textAlign: 'right' }}>
          <button
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => useStore.getState().triggerHeartbeat()}
          >
            🟢 Testa heartbeat-ping
          </button>
        </div>
      )}
    </>
  );
}
