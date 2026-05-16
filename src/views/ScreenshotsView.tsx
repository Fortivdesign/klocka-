import { useEffect, useState } from 'react';
import type { ScreenshotMeta } from '@shared/types';

export function ScreenshotsView() {
  const [pending, setPending] = useState<ScreenshotMeta[]>([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const api = window.klocka;
    if (!api) return;
    api.screenshot.pending().then(setPending);
  }, [refresh]);

  async function captureNow() {
    const api = window.klocka;
    if (!api) return;
    await api.screenshot.captureNow();
    setRefresh((x) => x + 1);
  }

  async function approve(id: string, ok: boolean) {
    const api = window.klocka;
    if (!api) return;
    await api.screenshot.approve(id, ok);
    setRefresh((x) => x + 1);
  }

  return (
    <>
      <h1 className="h1">📸 Screenshots</h1>
      <p className="subtitle">
        Slumpvisa screenshots tas medan du är inklockad. <b>Inget laddas upp utan att du godkänt.</b>
      </p>

      <div style={{ marginBottom: 14 }}>
        <button onClick={captureNow}>📷 Ta screenshot nu (test)</button>
        <span style={{ marginLeft: 12, color: 'var(--muted)', fontSize: 12 }}>
          Intervall i prod: 25–55 min slumpvis när du är inklockad
        </span>
      </div>

      {pending.length === 0 ? (
        <div className="card" style={{ color: 'var(--muted)' }}>Inga screenshots väntar på granskning.</div>
      ) : (
        <div className="grid cols-2">
          {pending.map((s) => (
            <div key={s.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {new Date(s.timestamp).toLocaleString('sv-SE')}
                </span>
                <span className="pill">{s.approvedByUser ? 'Godkänd' : 'Väntar'}</span>
              </div>
              <div style={{
                background: '#000', borderRadius: 8, padding: 8,
                fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)',
                wordBreak: 'break-all',
              }}>
                {s.thumbnailPath}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="success" onClick={() => approve(s.id, true)}>👍 Godkänn för upload</button>
                <button className="danger" onClick={() => approve(s.id, false)}>🗑️ Radera</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
