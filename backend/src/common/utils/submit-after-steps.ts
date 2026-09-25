import { cleanEntries } from './entries';

/** One step in "what happens after a name is sent in", as stored in SiteSetting.submitAfterSteps. */
export interface SubmitAfterStepEntry {
  bodyLo: string;
}

/** A step the team started and left blank is dropped, same rule as the FAQ. */
export function cleanSubmitAfterSteps(entries?: SubmitAfterStepEntry[]) {
  return cleanEntries(entries);
}
