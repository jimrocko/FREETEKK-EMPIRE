import type { GameSystem } from './core/simulation';
import { activitiesSystem } from './systems/activities/system';
import { financeSystem } from './systems/finance/system';
import { inventorySystem } from './systems/inventory/system';
import { marketSystem } from './systems/market/system';
import { goalsSystem } from './systems/goals/system';
import { mapSystem } from './systems/map/system';
import { spotsSystem } from './systems/spots/system';
import { peopleSystem } from './systems/people/system';
import { messagesSystem } from './systems/messages/system';
import { musicSystem } from './systems/music/system';
import { crewSystem } from './systems/crew/system';
import { soundSystem } from './systems/sound/system';
import { transportSystem } from './systems/transport/system';
import { eventsSystem } from './systems/events/system';
import { merchSystem } from './systems/merch/system';
import { rivalsSystem } from './systems/rivals/system';
import { happeningsSystem } from './systems/happenings/system';
import { projectsSystem } from './systems/projects/system';
import { lifestyleSystem } from './systems/lifestyle/system';

/**
 * All simulation systems in processing order.
 * Order matters for day starts: finance books costs before the market refreshes.
 */
export const SYSTEMS: readonly GameSystem[] = [
  activitiesSystem,
  financeSystem,
  inventorySystem,
  mapSystem,
  spotsSystem,
  peopleSystem,
  messagesSystem,
  musicSystem,
  crewSystem,
  soundSystem,
  transportSystem,
  rivalsSystem,
  eventsSystem,
  merchSystem,
  happeningsSystem,
  projectsSystem,
  lifestyleSystem,
  marketSystem,
  goalsSystem,
];
