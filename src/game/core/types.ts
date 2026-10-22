/** Cross-cutting types shared by all systems. */

export const SKILLS = ['produktion', 'technik', 'organisation', 'netzwerk', 'business'] as const;
export type SkillId = (typeof SKILLS)[number];

export const LEDGER_CATEGORIES = [
  'job',
  'market',
  'equipment',
  'upkeep',
  'goal',
  'event',
  'merch',
  'crew',
  'vehicle',
  'supply',
  'property',
  'music',
  'network',
  'other',
] as const;
export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];

export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'discovery';

export type ActivityChannel = 'job' | 'explore' | 'studio' | 'workshop' | 'errand' | 'event' | 'market';

/** Data-driven requirement. Every condition can describe itself for the UI. */
export type Condition =
  | { t: 'money'; gte: number }
  | { t: 'rep'; gte: number }
  | { t: 'skill'; skill: SkillId; gte: number }
  | { t: 'item'; item: string; count?: number }
  | { t: 'itemTag'; tag: string; count?: number }
  | { t: 'stat'; stat: string; gte: number; label?: string }
  | { t: 'flag'; flag: string; label?: string }
  | { t: 'unlocked'; id: string; label?: string }
  | { t: 'goal'; id: string }
  | { t: 'day'; gte: number }
  | { t: 'all'; of: Condition[] }
  | { t: 'any'; of: Condition[] }
  | { t: 'not'; c: Condition; label?: string };

/** Data-driven consequence. */
export type Effect =
  | { t: 'money'; amount: number; category: LedgerCategory; label?: string }
  | { t: 'xp'; skill: SkillId; amount: number }
  | { t: 'rep'; amount: number }
  | { t: 'item'; item: string; qty?: number; condition?: number }
  | { t: 'flag'; flag: string; value?: number }
  | { t: 'unlock'; id: string; label?: string }
  | { t: 'notify'; tone: Tone; title: string; text?: string };

export type Reason = string | null;
