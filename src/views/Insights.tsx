import { useMemo } from 'react';
import { useStore } from '../store';
import { Avatar } from '../components/Avatar';
import { startOfDay, startOfWeek } from '../lib/time';
import { computeFocusScore } from '@shared/scoring';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const dayLabels = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const COLORS = {
  work: '#29d398', communication: '#5cc8ff', fun: '#ff6b6b', idle: '#3a4054', unknown: '#6b748a',
};

export function Insights() {
  const user = useStore((s) => s.currentUser);
  const team = useStore((s) => s.team);
  const sessions = useStore((s) => s.sessions);

  const weekBars = useMemo(() => {
    if (!user) return [];
    const weekStart = startOfWeek().getTime();
    return Array.from({ length: 7 }).map((_, i) => {
      const dayStart = weekStart + i * 24 * 3600_000;
      const dayEnd = dayStart + 24 * 3600_000;
      const todays = sessions.filter((s) => s.userId === user.id && s.start >= dayStart && s.start < dayEnd);
      const samples = todays.flatMap((s) => s.samples);
      const min = (cat: string) =>
        samples.filter((x) => !x.isIdle && x.category === cat).length * 30 / 60;
      const idleMin = samples.filter((x) => x.isIdle).length * 30 / 60;
      return {
        day: dayLabels[i],
        Jobb: +min('work').toFixed(1),
        Kommunikation: +min('communication').toFixed(1),
        Skoj: +min('fun').toFixed(1),
        Idle: +idleMin.toFixed(1),
      };
    });
  }, [user, sessions]);

  const focusLine = useMemo(() => {
    if (!user) return [];
    const today = startOfDay().getTime();
    return Array.from({ length: 14 }).map((_, i) => {
      const dayStart = today - (13 - i) * 24 * 3600_000;
      const dayEnd = dayStart + 24 * 3600_000;
      const todays = sessions.filter((s) => s.userId === user.id && s.start >= dayStart && s.start < dayEnd);
      const samples = todays.flatMap((s) => s.samples);
      const clocked = todays.reduce((a, s) => a + (s.end - s.start) / 60_000, 0);
      const score = computeFocusScore({ clockedMinutes: clocked, samples });
      const d = new Date(dayStart);
      return {
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        Fokus: Math.round(score.focusFactor * 100),
        Score: score.finalScore,
      };
    });
  }, [user, sessions]);

  const categoryPie = useMemo(() => {
    if (!user) return [];
    const weekStart = startOfWeek().getTime();
    const samples = sessions
      .filter((s) => s.userId === user.id && s.start >= weekStart)
      .flatMap((s) => s.samples);
    const counts = { work: 0, communication: 0, fun: 0, idle: 0, unknown: 0 };
    samples.forEach((s) => {
      if (s.isIdle) counts.idle += 1;
      else counts[s.category] += 1;
    });
    const labels: Record<string, string> = {
      work: 'Jobb', communication: 'Kommunikation', fun: 'Skoj', idle: 'Idle', unknown: 'Övrigt',
    };
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: labels[k], value: +(v * 30 / 60).toFixed(1), key: k }));
  }, [user, sessions]);

  const teamBars = useMemo(() => {
    const weekStart = startOfWeek().getTime();
    return team.map((m) => {
      const userSessions = sessions.filter((s) => s.userId === m.id && s.start >= weekStart);
      const samples = userSessions.flatMap((s) => s.samples);
      const clocked = userSessions.reduce((a, s) => a + (s.end - s.start) / 60_000, 0);
      const score = computeFocusScore({ clockedMinutes: clocked, samples });
      return {
        name: m.name,
        Score: score.finalScore,
        Klockat: Math.round(clocked / 60 * 10) / 10,
        color: m.color,
      };
    }).sort((a, b) => b.Score - a.Score);
  }, [team, sessions]);

  const heatmap = useMemo(() => {
    if (!user) return [];
    const buckets = Array.from({ length: 24 }).map(() => 0);
    sessions.filter((s) => s.userId === user.id).forEach((s) => {
      s.samples.filter((x) => !x.isIdle && x.category === 'work').forEach((x) => {
        const h = new Date(x.timestamp).getHours();
        buckets[h] += 1;
      });
    });
    const max = Math.max(1, ...buckets);
    return buckets.map((c, h) => ({ h, intensity: c / max, count: c }));
  }, [user, sessions]);

  if (!user) return null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">📊 Insikter</h1>
          <p className="subtitle">Din vecka i siffror, {user.name}.</p>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Veckans timmar per kategori</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={weekBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1d2333" />
                <XAxis dataKey="day" stroke="#8b94a7" fontSize={11} />
                <YAxis stroke="#8b94a7" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Jobb" stackId="a" fill={COLORS.work} radius={[0,0,0,0]} />
                <Bar dataKey="Kommunikation" stackId="a" fill={COLORS.communication} />
                <Bar dataKey="Skoj" stackId="a" fill={COLORS.fun} />
                <Bar dataKey="Idle" stackId="a" fill={COLORS.idle} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Fokus över 14 dagar</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={focusLine}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1d2333" />
                <XAxis dataKey="date" stroke="#8b94a7" fontSize={11} />
                <YAxis stroke="#8b94a7" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="Fokus" stroke="#7c5cff" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Veckans tidsfördelning</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {categoryPie.map((entry) => (
                    <Cell key={entry.key} fill={(COLORS as Record<string, string>)[entry.key] ?? '#999'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} min`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Teamet i veckan</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={teamBars} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1d2333" />
                <XAxis type="number" stroke="#8b94a7" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#8b94a7" fontSize={12} width={70} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="Score" radius={[0, 6, 6, 0]}>
                  {teamBars.map((row) => (<Cell key={row.name} fill={row.color} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>🔥 Dina mest produktiva timmar</h3>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 0 }}>Baserat på jobb-kategori-aktivitet hela perioden.</p>
        <div className="heatmap-row">
          {heatmap.map((b) => (
            <div key={b.h} className="heatmap-cell" title={`kl ${b.h}:00 — ${b.count} aktiv-samples`}>
              <div
                className="heatmap-square"
                style={{
                  background: b.intensity > 0
                    ? `rgba(124, 92, 255, ${0.15 + b.intensity * 0.85})`
                    : '#181c28',
                }}
              />
              <div className="heatmap-label">{b.h.toString().padStart(2, '0')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        {team.filter((m) => m.id !== user.id).slice(0, 4).map((m) => (
          <div key={m.id} className="card mini-team-card">
            <Avatar member={m} size={42} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{m.name}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                {teamBars.find((r) => r.name === m.name)?.Score ?? 0} pts denna vecka
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const tooltipStyle = {
  background: '#1c2130',
  border: '1px solid #262d3e',
  borderRadius: 10,
  fontSize: 12,
  color: '#e7ecf3',
};
