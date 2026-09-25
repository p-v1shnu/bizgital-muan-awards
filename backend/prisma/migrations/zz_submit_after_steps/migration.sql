-- "What happens after a name is sent in" on /submit becomes a real list
-- (edited with the same add/reorder/delete EntryListEditor as the FAQ),
-- not one newline-separated string. Still UAT, so dropped rather than
-- migrated in place, same as the earlier UAT-only schema changes.
ALTER TABLE `site_settings` DROP COLUMN `submitAfterLo`;
ALTER TABLE `site_settings` ADD COLUMN `submitAfterSteps` JSON NULL;
