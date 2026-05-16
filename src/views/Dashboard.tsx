import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { formatHMS } from '../lib/time';
import { computeFocusScore } from '@shared/scoring';
import type { ActivitySample } from '@shared/types';

export function Dashboard() {
  const user = useStore((s) => s.currentUser);
  const clockedIn = useStore((s) => s.clockedIn);
  const sessionStart = useStore((s) => s.sessionStart);
  const setClockedIn = useStore((s) => s.setClockedIn);
  const recordSession = useStore((s) => s.recordSession);
  const liveSamples = useStore((s) => s.liveSamples);
  const setLiveSamples = useStore((s) => s.setLiveSamples);

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

  const elapsed = clockedIn && sessionStart ? now - sessionStart : 0;
  const clockedMinutes = elapsed / 60_000;
  const liveScore = computeFocusScore({ clockedMinutes, samples: liveSamples });

  async function handleClockIn() {
    if (!user) return;
    const api = window.klocka;
    if (api) {
      const evt = await api.clock.in(user.id, note);
      setClockedIn(true, evt.timestamp);
    } else {
      setClockedIn(true, Date.now());
    }
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
    recordSession({ start: sessionStart, end, samples, userId: user.id, note: note || undefined });
    setClockedIn(false, null);
    setLiveSamples([]);
    setNote('');
  }

  return (
    <>
      <h1 className="h1">Hej {user?.avatarEmoji} {user?.name}!</h1>
      <p className="subtitle">
        {clockedIn ? 'Du är på kontoret. Skickliga händer = poäng.' : 'Inte inklockad än. Dags att börja jobba?'}
      </p>

      <div className="clock-hero">
        <div>
          <div className="stat-label">{clockedIn ? 'Tid på kontoret' : 'Senast utklockad'}</div>
          <div className="clock-time">{formatHMS(elapsed)}</div>
          <div style={{ marginTop: 8, color: 'var(--muted)' }}>
            {clockedIn ? `Fokus: ${Math.round(liveScore.focusFactor * 100)}% • Score: ${liveScore.finalScore} pts` : 'Klocka in för att börja räkna.'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 280 }}>
          <input
            placeholder={clockedIn ? 'Vad har du jobbat på?' : 'Vad ska du jobba med idag?'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {clockedIn ? (
            <button className="danger" onClick={handleClockOut}>Klocka ut</button>
          ) : (
            <button className="success" onClick={handleClockIn} disabled={!user}>Klocka in</button>
          )}
        </div>
      </div>

      <div className="grid cols-3">
        <div className="card">
          <div className="stat-label">Aktiv tid</div>
          <div className="stat-value">{Math.round(liveScore.activeMinutes)} min</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>av {Math.round(clockedMinutes)} min klockat</div>
        </div>
        <div className="card">
          <div className="stat-label">Jobb-kategori</div>
          <div className="stat-value" style={{ color: 'var(--accent-2)' }}>{Math.round(liveScore.workCategoryMinutes)} min</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>kod, design, dokument</div>
        </div>
        <div className="card">
          <div className="stat-label">Skoj-kategori</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{Math.round(liveScore.funCategoryMinutes)} min</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>spel, video, sociala medier</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="stat-label">Fokus-faktor</div>
        <div className="score-bar" style={{ marginTop: 8 }}>
          <div style={{ width: `${liveScore.focusFactor * 100}%` }} />
        </div>
        <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 12 }}>
          Räknas ut från andel aktiv tid, andel jobb-kategori och avdrag för skoj-kategori.
        </div>
      </div>
    </>
  );
}
