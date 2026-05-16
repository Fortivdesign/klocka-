import { ROLES, type RoleId } from '@shared/roles';

export function RoleBadges({ roles, size = 'sm' }: { roles: RoleId[]; size?: 'sm' | 'md' }) {
  return (
    <div className={`role-badges role-badges-${size}`}>
      {roles.map((r) => {
        const def = ROLES[r];
        if (!def) return null;
        return (
          <span key={r} className="role-badge" title={def.label}>
            <span className="role-badge-emoji">{def.emoji}</span>
            <span className="role-badge-label">{def.short}</span>
          </span>
        );
      })}
    </div>
  );
}
