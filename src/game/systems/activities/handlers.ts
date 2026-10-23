import type { ActivityHandler } from './handler';
import { jobHandler } from '../jobs/handler';
import { listingHandler } from '../market/handler';
import { exploreHandler, rumorHandler, visitHandler } from '../map/handlers';
import { spotCheckHandler } from '../spots/handler';
import { meetupHandler } from '../people/handlers';
import { taskHandler } from './taskHandler';
import { repairHandler } from '../equipment/handler';
import { produceHandler } from '../music/handler';
import { eventTaskHandler } from '../events/handlers';
import { designHandler } from '../merch/handler';
import { rivalVisitHandler } from '../rivals/handler';

/** Registry: activity kind → completion handler. New systems register here. */
export const ACTIVITY_HANDLERS: Record<string, ActivityHandler> = {
  job: jobHandler,
  'market-listing': listingHandler,
  explore: exploreHandler,
  visit: visitHandler,
  rumor: rumorHandler,
  'spot-check': spotCheckHandler,
  meetup: meetupHandler,
  task: taskHandler,
  repair: repairHandler,
  produce: produceHandler,
  'event-task': eventTaskHandler,
  design: designHandler,
  'rival-visit': rivalVisitHandler,
};
