export interface JudgingStepEntry {
  titleLo: string;
  bodyLo: string;
  iconName?: string | null;
  iconImageKey?: string | null;
}

/**
 * Trims every step and drops one with no title or body behind it, same rule
 * as `cleanEntries` — but not built on it: `cleanEntries` drops an entry if
 * *any* field is blank, and a step legitimately has no icon at all, which
 * would otherwise prune a perfectly good step for the crime of not having
 * one set.
 *
 * The icon fields pass through as `null` rather than dropped when unset —
 * mutual exclusivity (an uploaded icon wins over a preset one) is read at
 * render time, not enforced here.
 */
// Prisma's Json column wants InputJsonObject, which requires a string index
// signature — a named interface does not carry one, so the array is typed as
// Record<string, string | null> rather than JudgingStepEntry, same fix
// cleanHomeCards uses for the same reason.
export function cleanJudgingSteps(entries?: JudgingStepEntry[]): Record<string, string | null>[] | undefined {
  if (!entries) return undefined;
  return entries
    .map((entry) => ({
      titleLo: entry.titleLo.trim(),
      bodyLo: entry.bodyLo.trim(),
      iconName: entry.iconName?.trim() || null,
      iconImageKey: entry.iconImageKey?.trim() || null,
    }))
    .filter((entry) => entry.titleLo !== '' && entry.bodyLo !== '');
}
