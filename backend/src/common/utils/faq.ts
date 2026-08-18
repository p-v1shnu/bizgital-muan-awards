import { cleanEntries } from './entries';

/** An entry in the /about FAQ, as stored in SiteSetting.faq. */
export interface FaqEntry {
  questionLo: string;
  answerLo: string;
}

/** A question with no answer behind it never reaches the page. */
export function cleanFaq(entries?: FaqEntry[]) {
  return cleanEntries(entries);
}
