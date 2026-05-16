export function formatHM(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function formatHMS(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function startOfWeek(d: Date = new Date()): Date {
  const out = new Date(d);
  const day = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function weekKey(d: Date = new Date()): string {
  return startOfWeek(d).toISOString().slice(0, 10);
}
