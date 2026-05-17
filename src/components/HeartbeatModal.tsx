import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { sfx } from '../lib/effects';

const RESPONSE_WINDOW_MS = 90_000;

export function HeartbeatModal() {
  const pending = useStore((s) => s.pendingHeartbeat);
  const resolve = useStore((s) => s.resolveHeartbeat);
  const pushToast = useStore((s) => s.pushToast);
  const [secLeft, setSecLeft] = useState(90);

  useEffect(() => {
    if (!pending) return;
    sfx.coin();
    const start = pending.pingedAt;
    const tick = () => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, Math.ceil((RESPONSE_WINDOW_MS - elapsed) / 1000));
      setSecLeft(left);
      if (left <= 0) {
        resolve(pending.id, 'miss');
        pushToast({ title: '✋ Missade heartbeat', body: 'Pinget gick obesvarat i 90 sek.', kind: 'warn' });
      }
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [pending, resolve, pushToast]);

  if (!pending) return null;

  function handleClick() {
    resolve(pending!.id, 'hit');
    pushToast({ title: '🟢 Heartbeat OK', body: 'Trust + bonus.', kind: 'success' });
  }

  return (
    <div className="heartbeat-overlay" onClick={handleClick}>
      <div className="heartbeat-card" onClick={(e) => e.stopPropagation()}>
        <div className="heartbeat-pulse">🟢</div>
        <div className="heartbeat-title">Är du där?</div>
        <div className="heartbeat-sub">Klicka inom 90 sek för att bekräfta att du är vid datorn.</div>
        <div className="heartbeat-timer">{secLeft}s</div>
        <button className="success big" onClick={handleClick}>Ja, jag är här</button>
      </div>
    </div>
  );
}
