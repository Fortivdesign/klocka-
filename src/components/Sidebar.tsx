import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Avatar } from './Avatar';
import { formatHMS } from '../lib/time';
import { isCloudEnabled } from '../lib/sync';

export type View = 'dashboard' | 'plan' | 'leaderboard' | 'insights' | 'weekly' | 'slacker' | 'shop' | 'screenshots' | 'achievements';

const items: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard',    label: 'Dashboard',         icon: '⏱' },
  { id: 'plan',         label: 'Min veckoplan',     icon: '🗒' },
  { id: 'leaderboard',  label: 'Leaderboard',       icon: '🏆' },
  { id: 'insights',     label: 'Insikter',          icon: '📊' },
  { id: 'weekly',       label: 'Veckomöte',         icon: '📅' },
  { id: 'slacker',      label: 'Veckans Slacker',   icon: '🦥' },
  { id: 'shop',         label: 'Shop',              icon: '🪙' },
  { id: 'screenshots',  label: 'Screenshots',       icon: '📸' },
  { id: 'achievements', label: 'Achievements',      icon: '🎖' },
];

export function Sidebar({ current, onChange }: { current: View; onChange: (v: View) => void }) {
  const user = useStore((s) => s.currentUser);
  const team = useStore((s) => s.team);
  const setUser = useStore((s) => s.setUser);
  const clockedIn = useStore((s) => s.clockedIn);
  const sessionStart = useStore((s) => s.sessionStart);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!clockedIn) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [clockedIn]);
  const elapsed = clockedIn && sessionStart ? now - sessionStart : 0;

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-dot" />
        Klocka
        <span className={`cloud-badge ${isCloudEnabled() ? 'on' : 'off'}`} title={isCloudEnabled() ? 'Synkar med Supabase' : 'Endast lokal data'}>
          {isCloudEnabled() ? '☁️' : '💾'}
        </span>
      </div>

      {user && (
        <div className="me-card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Avatar member={user} size={40} showRing active={clockedIn} />
            <div style={{ minWidth: 0 }}>
              <div className="me-name">{user.name}</div>
              <div className="me-status">
                {clockedIn ? (
                  <><span className="dot dot-green" /> {formatHMS(elapsed)}</>
                ) : (
                  <><span className="dot dot-grey" /> Utklockad</>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="nav-section">
        {items.map((it) => (
          <button
            key={it.id}
            className={`nav-item ${current === it.id ? 'active' : ''}`}
            onClick={() => onChange(it.id)}
          >
            <span className="nav-icon">{it.icon}</span>
            {it.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div className="team-section">
        <div className="section-label">Teamet</div>
        {team.map((t) => (
          <button
            key={t.id}
            className={`team-row ${user?.id === t.id ? 'me' : ''}`}
            onClick={() => setUser(t)}
            title={`Logga in som ${t.name}`}
          >
            <Avatar member={t} size={26} />
            <span>{t.name}</span>
            {user?.id === t.id && <span className="pill-tiny">du</span>}
          </button>
        ))}
      </div>
    </aside>
  );
}
