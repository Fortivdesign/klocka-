import { useEffect, useState } from 'react';
import type { ScreenshotMeta } from '@shared/types';

export function ScreenshotsView() {
  const [pending, setPending] = useState<ScreenshotMeta[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    const api = window.klocka;
    if (!api) return;
    api.screenshot.pending().then(async (list) => {
      setPending(list);
      const entries = await Promise.all(
        list.map(async (s) => [s.id, await api.screenshot.dataUrl(s.thumbnailPath)] as const),
      );
      const map: Record<string, string> = {};
      entries.forEach(([id, url]) => { if (url) map[id] = url; });
      setPreviews(map);
    });
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
        Slumpvisa skärmdumpar tas medan du är inklockad. <b>Inget laddas upp utan att du godkänt.</b>
      </p>

      <div className="screenshot-toolbar">
        <button className="primary" onClick={captureNow}>📷 Ta screenshot nu</button>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          I prod: slumpvis var 25–55:e min när du är inklockad
        </span>
      </div>

      {pending.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48 }}>🌤</div>
          <div style={{ fontWeight: 700, marginTop: 10 }}>Inga screenshots väntar</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            Klocka in och vänta — eller klicka "Ta screenshot nu" för att testa.
          </div>
        </div>
      ) : (
        <div className="grid cols-2">
          {pending.map((s) => (
            <div key={s.id} className="card screenshot-card">
              <div className="screenshot-meta">
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {new Date(s.timestamp).toLocaleString('sv-SE')}
                </span>
                <span className={`pill ${s.approvedByUser ? 'work' : ''}`}>
                  {s.approvedByUser ? '✓ Godkänd' : 'Väntar granskning'}
                </span>
              </div>
              <div className="screenshot-frame">
                {previews[s.id] ? (
                  <img src={previews[s.id]} alt="Screenshot" />
                ) : (
                  <div className="screenshot-placeholder">Laddar...</div>
                )}
              </div>
              <div className="screenshot-actions">
                <button className="success" onClick={() => approve(s.id, true)}>👍 Godkänn upload</button>
                <button className="danger" onClick={() => approve(s.id, false)}>🗑 Radera</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
