/** An entry in the /about FAQ, as stored in SiteSetting.faq. */
export interface FaqEntry {
  questionLo: string;
  answerLo: string;
}

/**
 * Trims what the back office sends and drops anything with nothing in it.
 *
 * The DTO already rejects a missing field or an oversized one, so this is about
 * the shape a form produces rather than a hostile payload: a row the team added
 * and then left alone would otherwise be stored as an empty question with an
 * empty answer, and appear on /about as a heading that opens onto nothing.
 * Order is the array's own, which is what the editor moves entries around in.
 */
export function cleanFaq(entries?: FaqEntry[]) {
  if (!entries) return undefined;
  return entries
    .map((entry) => ({
      questionLo: entry.questionLo?.trim() ?? '',
      answerLo: entry.answerLo?.trim() ?? '',
    }))
    .filter((entry) => entry.questionLo !== '' && entry.answerLo !== '');
}
