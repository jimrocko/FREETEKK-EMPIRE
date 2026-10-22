import type { PersonDef, Role } from '../../../game/content/types';

export const ROLE_COLORS: Partial<Record<Role, string>> = {
  dj: '#ff6bd8',
  producer: '#ff6bd8',
  artist: '#ff6bd8',
  technician: '#5ccbff',
  driver: '#ffb444',
  organizer: '#ffb444',
  booker: '#b8ff3c',
  promoter: '#b8ff3c',
  designer: '#c48cff',
  merch: '#c48cff',
  manager: '#c48cff',
  supplier: '#3dffa6',
  shopkeeper: '#3dffa6',
  landlord: '#e8e2c8',
  journalist: '#b8ff3c',
  security: '#5ccbff',
  scout: '#3dffa6',
};

export function personColor(def: PersonDef): string {
  return ROLE_COLORS[def.roles[0]] ?? '#a2a2b4';
}

export function initials(def: PersonDef): string {
  const base = def.nick ?? def.name;
  const parts = base.replace(/^DJ\s+/i, '').split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? '')).toUpperCase();
}

export function Avatar({ def, large, unknown }: { def?: PersonDef; large?: boolean; unknown?: boolean }) {
  if (!def || unknown) {
    return <span className={['avatar', 'avatar--unknown', large && 'avatar--lg'].filter(Boolean).join(' ')}>?</span>;
  }
  return (
    <span className={['avatar', large && 'avatar--lg'].filter(Boolean).join(' ')} style={{ background: personColor(def) }} aria-hidden>
      {initials(def)}
    </span>
  );
}
