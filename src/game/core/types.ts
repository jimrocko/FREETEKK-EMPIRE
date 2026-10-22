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

export type ActivityChannel = 'job' | 'explore' | 'social' | 'studio' | 'workshop' | 'errand' | 'event' | 'market';

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
  | { t: 'districtExplored'; district: string; gte: number }
  | { t: 'spotKnown'; spot: string }
  | { t: 'spotsKnown'; gte: number }
  | { t: 'poiKnown'; poi: string }
  | { t: 'knows'; person: string }
  | { t: 'trust'; person: string; gte: number }
  | { t: 'contacts'; gte: number }
  | { t: 'knowsRole'; role: string; count?: number }
  | { t: 'trusted'; count: number; trust: number }
  | { t: 'crewFounded' }
  | { t: 'crewSize'; gte: number }
  | { t: 'systemReach'; gte: number }
  | { t: 'systemQuality'; gte: number }
  | { t: 'channelFree'; channel: ActivityChannel }
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
  | { t: 'notify'; tone: Tone; title: string; text?: string }
  | { t: 'revealSpot'; spot: string; intel?: number }
  | { t: 'revealPoi'; poi: string }
  | { t: 'rumor'; rumor: string }
  /** '$from' targets the sender of the message being answered. */
  | { t: 'trust'; person: string; amount: number }
  | { t: 'relation'; person: string; amount: number }
  | { t: 'favor'; person: string; amount: number }
  | { t: 'meet'; person: string }
  | { t: 'meetSomeone'; roles?: string[] }
  | { t: 'message'; template: string; from?: string; delayMin?: number }
  | { t: 'task'; channel: ActivityChannel; minutes: number; label: string; effects: Effect[] }
  | { t: 'explore'; district: string; amount: number };

export type Reason = string | null;
