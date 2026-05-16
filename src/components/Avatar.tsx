import type { TeamMember } from '../store';

interface Props {
  member: TeamMember;
  size?: number;
  showRing?: boolean;
  active?: boolean;
}

export function Avatar({ member, size = 36, showRing = false, active = false }: Props) {
  const initials = member.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className={`avatar ${showRing ? 'ring' : ''} ${active ? 'active' : ''}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${member.color}, ${shade(member.color, -25)})`,
        boxShadow: showRing ? `0 0 0 2px ${member.color}55` : undefined,
        fontSize: size * 0.42,
      }}
      title={member.name}
    >
      <span>{initials}</span>
      {active && <span className="avatar-pulse" />}
    </div>
  );
}

function shade(hex: string, percent: number): string {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return hex;
  const [r, g, b] = m.map((x) => parseInt(x, 16));
  const adj = (v: number) => Math.max(0, Math.min(255, Math.round(v + (percent / 100) * 255)));
  return `#${[adj(r), adj(g), adj(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
