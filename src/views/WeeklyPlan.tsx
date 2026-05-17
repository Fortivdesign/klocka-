import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { weekKey } from '../lib/time';
import type { TaskStatus, WeeklyTask } from '@shared/types';
import { celebrate, sfx } from '../lib/effects';

const STATUS_LABEL: Record<TaskStatus, string> = {
  'open': 'Öppen',
  'in-progress': 'Pågår',
  'blocked': 'Blockerad',
  'done': 'Klar',
};

const STATUS_EMOJI: Record<TaskStatus, string> = {
  'open': '⚪',
  'in-progress': '🟡',
  'blocked': '🔴',
  'done': '✅',
};

const PRIORITY_DOT: Record<WeeklyTask['priority'], string> = {
  low: '🔽',
  normal: '◽',
  high: '🔺',
};

export function WeeklyPlan() {
  const user = useStore((s) => s.currentUser);
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const updateStatus = useStore((s) => s.updateTaskStatus);
  const addUpdate = useStore((s) => s.addTaskUpdate);
  const removeTask = useStore((s) => s.removeTask);
  const editTask = useStore((s) => s.editTask);
  const addCoins = useStore((s) => s.addCoins);
  const pushToast = useStore((s) => s.pushToast);

  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<WeeklyTask['priority']>('normal');
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const wk = weekKey();

  const myTasks = useMemo(() => {
    if (!user) return [];
    return tasks
      .filter((t) => t.userId === user.id && t.weekStart === wk)
      .filter((t) => filter === 'all' || t.status === filter)
      .sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        const pri = { high: 0, normal: 1, low: 2 };
        if (pri[a.priority] !== pri[b.priority]) return pri[a.priority] - pri[b.priority];
        return a.createdAt - b.createdAt;
      });
  }, [tasks, user, wk, filter]);

  const stats = useMemo(() => {
    if (!user) return { total: 0, done: 0, inProgress: 0, blocked: 0, open: 0 };
    const week = tasks.filter((t) => t.userId === user.id && t.weekStart === wk);
    return {
      total: week.length,
      done: week.filter((t) => t.status === 'done').length,
      inProgress: week.filter((t) => t.status === 'in-progress').length,
      blocked: week.filter((t) => t.status === 'blocked').length,
      open: week.filter((t) => t.status === 'open').length,
    };
  }, [tasks, user, wk]);

  function handleAdd() {
    if (!user) return;
    const title = newTitle.trim();
    if (!title) return;
    addTask({ userId: user.id, weekStart: wk, title, priority: newPriority });
    setNewTitle('');
    setNewPriority('normal');
  }

  function handleStatus(taskId: string, status: TaskStatus, prev: TaskStatus) {
    updateStatus(taskId, status);
    if (status === 'done' && prev !== 'done' && user) {
      addCoins(user.id, 15);
      sfx.coin();
      celebrate({ intensity: 'mini' });
      pushToast({ title: 'Uppgift klar!', body: '+15 🪙', kind: 'celebrate' });
    }
  }

  if (!user) return null;

  const progress = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">🗒 Min veckoplan</h1>
          <p className="subtitle">Vad ska du göra denna vecka? Bocka av och håll teamet uppdaterade.</p>
        </div>
        <div className="head-stats">
          <div className="head-stat">
            <div className="head-stat-value" style={{ color: 'var(--accent-2)' }}>{stats.done}/{stats.total}</div>
            <div className="head-stat-label">Klart</div>
          </div>
          <div className="head-stat">
            <div className="head-stat-value">{Math.round(progress)}%</div>
            <div className="head-stat-label">Framsteg</div>
          </div>
        </div>
      </div>

      <div className="card add-task-card">
        <div className="add-task-row">
          <input
            placeholder="Vad ska du göra denna vecka? (ex: Stänga avtalet med Acme)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as WeeklyTask['priority'])} style={{ width: 130 }}>
            <option value="low">🔽 Låg</option>
            <option value="normal">◽ Normal</option>
            <option value="high">🔺 Hög</option>
          </select>
          <button className="primary" onClick={handleAdd}>+ Lägg till</button>
        </div>
        {stats.total > 0 && (
          <div className="task-progress">
            <div className="progress" style={{ flex: 1 }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span style={{ color: 'var(--muted)', fontSize: 12, minWidth: 110, textAlign: 'right' }}>
              {stats.inProgress} pågår · {stats.blocked} blockerade
            </span>
          </div>
        )}
      </div>

      <div className="task-filters">
        {(['all', 'open', 'in-progress', 'blocked', 'done'] as const).map((f) => {
          const count = f === 'all' ? stats.total
            : f === 'open' ? stats.open
            : f === 'in-progress' ? stats.inProgress
            : f === 'blocked' ? stats.blocked
            : stats.done;
          return (
            <button
              key={f}
              className={`task-filter ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Alla' : `${STATUS_EMOJI[f]} ${STATUS_LABEL[f]}`}
              <span className="task-filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {myTasks.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48 }}>🗓</div>
          <div style={{ fontWeight: 700, marginTop: 10 }}>
            {filter === 'all' ? 'Inga uppgifter än denna vecka' : 'Inga uppgifter med detta filter'}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            {filter === 'all' ? 'Lägg till första uppgiften ovan.' : 'Byt filter för att se andra uppgifter.'}
          </div>
        </div>
      ) : (
        <div className="task-list">
          {myTasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onStatus={(s) => handleStatus(t.id, s, t.status)}
              onUpdate={(text) => addUpdate(t.id, text)}
              onRemove={() => removeTask(t.id)}
              onEdit={(patch) => editTask(t.id, patch)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function TaskRow({
  task, onStatus, onUpdate, onRemove, onEdit,
}: {
  task: WeeklyTask;
  onStatus: (s: TaskStatus) => void;
  onUpdate: (text: string) => void;
  onRemove: () => void;
  onEdit: (patch: Partial<Pick<WeeklyTask, 'title' | 'priority'>>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [updateText, setUpdateText] = useState('');

  const lastUpdate = task.updates[task.updates.length - 1];
  const isDone = task.status === 'done';

  return (
    <div className={`task-card status-${task.status} ${isDone ? 'task-done' : ''}`}>
      <div className="task-main">
        <button
          className="task-checkbox"
          onClick={() => onStatus(isDone ? 'open' : 'done')}
          title={isDone ? 'Markera som öppen' : 'Markera som klar'}
        >
          {isDone ? '✅' : '⚪'}
        </button>

        <div className="task-body" onClick={() => setExpanded((x) => !x)}>
          {editing ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => { onEdit({ title: editTitle.trim() || task.title }); setEditing(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { onEdit({ title: editTitle.trim() || task.title }); setEditing(false); }
                if (e.key === 'Escape') { setEditTitle(task.title); setEditing(false); }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="task-title-row">
              <span className="task-pri">{PRIORITY_DOT[task.priority]}</span>
              <span className="task-title">{task.title}</span>
              {task.updates.length > 0 && (
                <span className="task-update-count" title={`${task.updates.length} uppdateringar`}>
                  💬 {task.updates.length}
                </span>
              )}
            </div>
          )}
          {!editing && lastUpdate && (
            <div className="task-last-update">
              {lastUpdate.statusBefore && lastUpdate.statusAfter
                ? `${STATUS_EMOJI[lastUpdate.statusBefore]} → ${STATUS_EMOJI[lastUpdate.statusAfter]}`
                : '💬'}
              {' '}
              {lastUpdate.text || `${STATUS_LABEL[lastUpdate.statusAfter ?? task.status]}`}
              <span style={{ color: 'var(--muted-2)', marginLeft: 8 }}>
                {timeAgo(lastUpdate.at)}
              </span>
            </div>
          )}
        </div>

        <select
          value={task.status}
          onChange={(e) => onStatus(e.target.value as TaskStatus)}
          className={`task-status-select status-${task.status}`}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 130 }}
        >
          <option value="open">⚪ Öppen</option>
          <option value="in-progress">🟡 Pågår</option>
          <option value="blocked">🔴 Blockerad</option>
          <option value="done">✅ Klar</option>
        </select>
      </div>

      {expanded && (
        <div className="task-expanded">
          <div className="task-expanded-tools">
            <button onClick={() => setEditing(true)} style={{ fontSize: 11 }}>✏️ Redigera</button>
            <select
              value={task.priority}
              onChange={(e) => onEdit({ priority: e.target.value as WeeklyTask['priority'] })}
              style={{ width: 130 }}
            >
              <option value="low">🔽 Låg</option>
              <option value="normal">◽ Normal</option>
              <option value="high">🔺 Hög</option>
            </select>
            <div style={{ flex: 1 }} />
            <button onClick={onRemove} style={{ color: 'var(--danger)', fontSize: 11 }}>🗑 Ta bort</button>
          </div>

          {task.updates.length > 0 && (
            <div className="task-timeline">
              {task.updates.slice().reverse().map((u) => (
                <div key={u.id} className="task-timeline-item">
                  <div className="task-timeline-dot" />
                  <div style={{ flex: 1 }}>
                    {u.statusBefore && u.statusAfter && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
                        Status: {STATUS_EMOJI[u.statusBefore]} {STATUS_LABEL[u.statusBefore]} → {STATUS_EMOJI[u.statusAfter]} {STATUS_LABEL[u.statusAfter]}
                      </div>
                    )}
                    {u.text && <div>{u.text}</div>}
                    <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 2 }}>
                      {new Date(u.at).toLocaleString('sv-SE')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="task-update-input">
            <input
              placeholder="Skriv en uppdatering... (vad har du gjort, vad är nästa steg)"
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && updateText.trim()) {
                  onUpdate(updateText);
                  setUpdateText('');
                }
              }}
            />
            <button
              className="primary"
              onClick={() => {
                if (updateText.trim()) { onUpdate(updateText); setUpdateText(''); }
              }}
            >Posta</button>
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'nyss';
  if (min < 60) return `${min} min sen`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h sen`;
  const d = Math.floor(h / 24);
  return `${d}d sen`;
}
