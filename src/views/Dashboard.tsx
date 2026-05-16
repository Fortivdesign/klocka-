import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { calcStreak, formatHM, formatHMS, startOfDay } from '../lib/time';
import { computeFocusScore } from '@shared/scoring';
import type { ActivitySample } from '@shared/types';
import { todaysChallenge } from '../lib/challenges';
import { celebrate, sfx } from '../lib/effects';
import { pushSession } from '../lib/sync';

export function Dashboard() {
  const user = useStore((s) => s.currentUser);
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
  const liveScore = computeFocusScore({ clockedMinutes, samples: liveSamples });

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

  const challenge = todaysChallenge();
  const todayKey = new Date().toISOString().slice(0, 10);
  const challengeDone = user
    ? completedChallenges.some((c) => c.userId === user.id && c.challengeId === challenge.id && c.date === todayKey)
    : false;
  const onFire = liveScore.focusFactor > 0.8 && clockedMinutes > 30;
  const myCoins = user ? coins[user.id] ?? 0 : 0;

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
    </>
  );
}
