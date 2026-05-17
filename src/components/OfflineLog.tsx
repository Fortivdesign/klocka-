import { useState } from 'react';
import { useStore } from '../store';
import type { OfflineActivity } from '@shared/types';

const PRESETS: { type: OfflineActivity['type']; emoji: string; label: string; minutes: number; counts: OfflineActivity['countsAs'] }[] = [
  { type: 'call',           emoji: '📞', label: 'Säljsamtal',     minutes: 30, counts: 'work' },
  { type: 'meeting',        emoji: '🤝', label: 'Möte',            minutes: 60, counts: 'work' },
  { type: 'customer-visit', emoji: '🚗', label: 'Kundbesök',       minutes: 120, counts: 'work' },
  { type: 'workshop',       emoji: '🧠', label: 'Workshop',        minutes: 90, counts: 'work' },
  { type: 'planning',       emoji: '🗺',  label: 'Planering',       minutes: 45, counts: 'work' },
  { type: 'phone-break',    emoji: '📱', label: 'Mobil-paus',      minutes: 10, counts: 'fun' },
];

export function OfflineLog() {
  const user = useStore((s) => s.currentUser);
  const offline = useStore((s) => s.offlineActivities);
  const addOffline = useStore((s) => s.addOfflineActivity);
  const removeOffline = useStore((s) => s.removeOfflineActivity);
  const pushToast = useStore((s) => s.pushToast);

  const [customMin, setCustomMin] = useState(30);
  const [customDesc, setCustomDesc] = useState('');

  if (!user) return null;
  const mine = offline.filter((o) => o.userId === user.id).sort((a, b) => b.start - a.start).slice(0, 6);

  function logPreset(preset: typeof PRESETS[number]) {
    if (!user) return;
    const end = Date.now();
    const start = end - preset.minutes * 60_000;
    addOffline({
      userId: user.id,
      start,
      end,
      type: preset.type,
      description: preset.label,
      countsAs: preset.counts,
    });
    const label = preset.counts === 'work' ? 'jobb' : preset.counts === 'fun' ? 'skoj-tid (ärlighet skyddar trust)' : 'kommunikation';
    pushToast({
      title: `${preset.emoji} ${preset.label} loggat`,
      body: `${preset.minutes} min räknas som ${label}.`,
      kind: preset.counts === 'fun' ? 'info' : 'success',
    });
  }

  function logCustom() {
    if (!user || customMin <= 0) return;
    const end = Date.now();
    const start = end - customMin * 60_000;
    addOffline({
      userId: user.id,
      start,
      end,
      type: 'other',
      description: customDesc || 'Off-screen arbete',
      countsAs: 'work',
    });
    pushToast({
      title: `📝 ${customDesc || 'Aktivitet'} loggad`,
      body: `${customMin} min räknat som jobb.`,
      kind: 'success',
    });
    setCustomDesc('');
    setCustomMin(30);
  }

  return (
    <div className="card offline-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div className="stat-label">Off-screen arbete</div>
          <h3 style={{ marginTop: 4 }}>Logga möten, samtal, IRL-grejer</h3>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>Räknas in i din fokus-score</span>
      </div>

      <div className="offline-presets">
        {PRESETS.map((p) => (
          <button key={p.type} className="offline-preset" onClick={() => logPreset(p)}>
            <span style={{ fontSize: 22 }}>{p.emoji}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600 }}>{p.label}</div>
              <div style={{ color: 'var(--muted)', fontSize: 11 }}>{p.minutes} min</div>
            </div>
          </button>
        ))}
      </div>

      <div className="offline-custom">
        <input
          placeholder="Annat (ex: kundlunch)"
          value={customDesc}
          onChange={(e) => setCustomDesc(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && logCustom()}
          style={{ flex: 1 }}
        />
        <input
          type="number"
          min={5}
          max={480}
          value={customMin}
          onChange={(e) => setCustomMin(parseInt(e.target.value) || 30)}
          style={{ width: 90 }}
        />
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>min</span>
        <button className="primary" onClick={logCustom}>Logga</button>
      </div>

      {mine.length > 0 && (
        <div className="offline-list">
          <div className="section-label" style={{ padding: '12px 0 6px' }}>Senast loggat</div>
          {mine.map((o) => (
            <div key={o.id} className="offline-row">
              <span style={{ fontSize: 16 }}>{iconFor(o.type)}</span>
              <span style={{ flex: 1 }}>{o.description}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                {Math.round((o.end - o.start) / 60_000)} min · {new Date(o.start).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button onClick={() => removeOffline(o.id)} style={{ padding: '4px 8px', fontSize: 11 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function iconFor(type: OfflineActivity['type']): string {
  return {
    call: '📞', meeting: '🤝', 'customer-visit': '🚗', workshop: '🧠', planning: '🗺', 'phone-break': '📱', other: '📝',
  }[type];
}
