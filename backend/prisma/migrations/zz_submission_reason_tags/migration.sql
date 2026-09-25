-- The free-text "why should they win" box on /submit became a fixed set of
-- checkboxes (SUBMISSION_REASON_TAGS in the frontend) — still in UAT, so the
-- old free-text column is dropped rather than kept alongside the new one.
ALTER TABLE `public_submissions` DROP COLUMN `reason`;
ALTER TABLE `public_submissions` ADD COLUMN `reasonTags` JSON NULL;
