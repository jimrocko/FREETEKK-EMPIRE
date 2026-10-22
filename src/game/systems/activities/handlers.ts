import type { ActivityHandler } from './handler';
import { jobHandler } from '../jobs/handler';
import { listingHandler } from '../market/handler';
import { exploreHandler, rumorHandler, visitHandler } from '../map/handlers';
import { spotCheckHandler } from '../spots/handler';

/** Registry: activity kind → completion handler. New systems register here. */
export const ACTIVITY_HANDLERS: Record<string, ActivityHandler> = {
  job: jobHandler,
  'market-listing': listingHandler,
  explore: exploreHandler,
  visit: visitHandler,
  rumor: rumorHandler,
  'spot-check': spotCheckHandler,
};
