import { useStore } from '../store';

export type View = 'dashboard' | 'leaderboard' | 'weekly' | 'slacker' | 'screenshots' | 'achievements';

const items: { id: View; label: string; emoji: string }[] = [
  { id: 'dashboard',    label: 'Dashboard',         emoji: '⏱️' },
  { id: 'leaderboard',  label: 'Leaderboard',       emoji: '🏆' },
  { id: 'weekly',       label: 'Veckomöte',         emoji: '📅' },
  { id: 'slacker',      label: 'Veckans Slacker',   emoji: '🦥' },
  { id: 'screenshots',  label: 'Screenshots',       emoji: '📸' },
  { id: 'achievements', label: 'Achievements',      emoji: '🎖️' },
];

export function Sidebar({ current, onChange }: { current: View; onChange: (v: View) => void }) {
  const user = useStore((s) => s.currentUser);
  const team = useStore((s) => s.team);
  const setUser = useStore((s) => s.setUser);

  return (
    <aside className="sidebar">
      <div className="brand">Klocka</div>
      {items.map((it) => (
        <button
          key={it.id}
          className={`nav-item ${current === it.id ? 'active' : ''}`}
          onClick={() => onChange(it.id)}
        >
          <span style={{ fontSize: 16 }}>{it.emoji}</span>
          {it.label}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Inloggad som
        </div>
        <select
          value={user?.id ?? ''}
          onChange={(e) => {
            const u = team.find((t) => t.id === e.target.value);
            if (u) setUser(u);
          }}
          style={{
            width: '100%', background: 'var(--panel)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px',
          }}
        >
          {team.map((t) => (
            <option key={t.id} value={t.id}>{t.avatarEmoji} {t.name}</option>
          ))}
        </select>
      </div>
    </aside>
  );
}
