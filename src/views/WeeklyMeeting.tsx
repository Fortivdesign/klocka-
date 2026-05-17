import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { weekKey } from '../lib/time';
import { Avatar } from '../components/Avatar';
import type { TaskStatus } from '@shared/types';

const STATUS_EMOJI: Record<TaskStatus, string> = {
  open: '⚪', 'in-progress': '🟡', blocked: '🔴', done: '✅',
};

export function WeeklyMeeting() {
  const user = useStore((s) => s.currentUser);
  const team = useStore((s) => s.team);
  const tasks = useStore((s) => s.tasks);
  const deliveries = useStore((s) => s.weeklyDeliveries);
  const addDelivery = useStore((s) => s.addDelivery);

  const wk = weekKey();
  const [presentation, setPresentation] = useState<string | null>(null);
  const [openMember, setOpenMember] = useState<string | null>(user?.id ?? null);

  const memberStats = useMemo(() => {
    return team.map((m) => {
      const mine = tasks.filter((t) => t.userId === m.id && t.weekStart === wk);
      const done = mine.filter((t) => t.status === 'done').length;
      const inProgress = mine.filter((t) => t.status === 'in-progress').length;
      const blocked = mine.filter((t) => t.status === 'blocked').length;
      const open = mine.filter((t) => t.status === 'open').length;
      return {
        member: m,
        tasks: mine.sort((a, b) => {
          const ord = { 'done': 3, 'blocked': 0, 'in-progress': 1, 'open': 2 };
          return ord[a.status] - ord[b.status];
        }),
        total: mine.length,
        done,
        inProgress,
        blocked,
        open,
        progress: mine.length > 0 ? (done / mine.length) * 100 : 0,
      };
    });
  }, [team, tasks, wk]);

  async function pickPresentation() {
    const api = window.klocka;
    if (!api) return;
    const path = await api.dialog.selectFile();
    if (path) setPresentation(path);
  }

  function submitDelivery() {
    if (!user) return;
    const myTasks = tasks.filter((t) => t.userId === user.id && t.weekStart === wk);
    const delivered = myTasks.filter((t) => t.status === 'done').map((t) => t.title);
    addDelivery({
      userId: user.id,
      weekStart: wk,
      delivered,
      presentationUrl: presentation ?? undefined,
      submittedAt: Date.now(),
    });
    setPresentation(null);
  }

  const myDelivery = deliveries.find((d) => d.userId === user?.id && d.weekStart === wk);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">📅 Veckomöte</h1>
          <p className="subtitle">Allas plan + status, sida vid sida. Bocka av i din veckoplan; här ses summan.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 28 }}>🎤</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>Bifoga din presentation för veckomötet</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>
              {myDelivery?.presentationUrl
                ? `Bifogad: ${myDelivery.presentationUrl.split('/').pop()}`
                : 'PDF, Keynote eller PowerPoint. Levereras tillsammans med dina avbockade uppgifter.'}
            </div>
          </div>
          <button onClick={pickPresentation}>📎 Välj fil</button>
          {presentation && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{presentation.split('/').pop()}</span>}
          <button className="success" onClick={submitDelivery}>Skicka leverans</button>
        </div>
      </div>

      <div className="team-plans">
        {memberStats.map((s) => {
          const isOpen = openMember === s.member.id;
          return (
            <div key={s.member.id} className="card team-plan-card">
              <button className="team-plan-head" onClick={() => setOpenMember(isOpen ? null : s.member.id)}>
                <Avatar member={s.member} size={42} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{s.member.name}</div>
                </div>
                <div className="team-plan-stats">
                  <span className="pill work">{s.done} klart</span>
                  {s.inProgress > 0 && <span className="pill">{s.inProgress} pågår</span>}
                  {s.blocked > 0 && <span className="pill fun">{s.blocked} blockerad</span>}
                  {s.open > 0 && <span className="pill">{s.open} öppen</span>}
                </div>
                <div className="team-plan-progress">
                  <div className="progress" style={{ width: 120 }}>
                    <div className="progress-fill" style={{ width: `${s.progress}%` }} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 38, textAlign: 'right' }}>
                    {Math.round(s.progress)}%
                  </span>
                </div>
                <span className="team-plan-chevron">{isOpen ? '▾' : '▸'}</span>
              </button>

              {isOpen && (
                <div className="team-plan-tasks">
                  {s.tasks.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>
                      Inga uppgifter inlagda för veckan än.
                    </div>
                  ) : (
                    s.tasks.map((t) => (
                      <div key={t.id} className={`team-task status-${t.status}`}>
                        <span style={{ fontSize: 16 }}>{STATUS_EMOJI[t.status]}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: t.status === 'done' ? 400 : 600, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--muted)' : 'var(--text)' }}>
                            {t.title}
                          </div>
                          {t.updates.length > 0 && (
                            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
                              💬 {t.updates[t.updates.length - 1].text || `${t.updates.length} statusbyten`}
                            </div>
                          )}
                        </div>
                        {t.updates.length > 0 && (
                          <span className="pill" style={{ fontSize: 10 }}>{t.updates.length} updates</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
