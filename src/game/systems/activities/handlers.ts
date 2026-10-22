import type { ActivityHandler } from './handler';
import { jobHandler } from '../jobs/handler';
import { listingHandler } from '../market/handler';

/** Registry: activity kind → completion handler. New systems register here. */
export const ACTIVITY_HANDLERS: Record<string, ActivityHandler> = {
  job: jobHandler,
  'market-listing': listingHandler,
};
