import type { ActivityHandler } from '../activities/handler';
import { finishExperience } from './logic';

export const experienceHandler: ActivityHandler = {
  complete(d, a) {
    finishExperience(d, String(a.payload.defId));
  },
};
