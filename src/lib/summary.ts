import type { SessionRecord, TeamMember } from '../store';
import { startOfWeek } from './time';

export function summarizeWeek(member: TeamMember, sessions: SessionRecord[]): string {
  const weekStart = startOfWeek().getTime();
  const mine = sessions.filter((s) => s.userId === member.id && s.start >= weekStart);
  if (!mine.length) return `${member.name} klockade inte in alls den här veckan. 👻`;

  const clockedH = mine.reduce((a, s) => a + (s.end - s.start) / 3600_000, 0);
  const workH = mine.reduce((a, s) => a + s.score.workCategoryMinutes, 0) / 60;
  const funH = mine.reduce((a, s) => a + s.score.funCategoryMinutes, 0) / 60;
  const score = mine.reduce((a, s) => a + s.score.finalScore, 0);
  const avgFocus = mine.reduce((a, s) => a + s.score.focusFactor, 0) / mine.length;
  const longest = mine.reduce((m, s) => Math.max(m, (s.end - s.start) / 3600_000), 0);
  const apps = new Map<string, number>();
  mine.forEach((s) => s.samples.forEach((x) => {
    if (!x.isIdle) apps.set(x.activeAppName, (apps.get(x.activeAppName) ?? 0) + 1);
  }));
  const topApp = [...apps.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'okänd app';

  const flavor =
    avgFocus > 0.8 ? 'lasersam fokus' :
    avgFocus > 0.6 ? 'solid vecka' :
    avgFocus > 0.4 ? 'lite skakigt men ok' :
    'distraherad som en katt med laser';

  const funComment =
    funH > 5 ? ` Spelade också ${funH.toFixed(1)}h FIFA/TikTok/etc — kanske dra ner lite?` :
    funH > 2 ? ` ${funH.toFixed(1)}h på skoj-appar, inget alarmerande.` :
    ' Höll skoj-tiden låg. Bra!';

  return [
    `**${member.name}** hade en ${flavor}.`,
    `Klockade in ${mine.length} dagar, totalt ${clockedH.toFixed(1)}h.`,
    `Faktiskt jobbat: ${workH.toFixed(1)}h. Snitt-fokus: ${Math.round(avgFocus * 100)}%.`,
    `Längsta pass: ${longest.toFixed(1)}h. Mest använda app: ${topApp}.`,
    `Veckans score: **${score} pts**.${funComment}`,
  ].join(' ');
}

export function speakSummary(text: string): string {
  return text.replace(/\*\*/g, '');
}
