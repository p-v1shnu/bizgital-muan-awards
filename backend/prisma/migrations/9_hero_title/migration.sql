-- The homepage's hero heading, previously hardcoded in the page itself.
-- The default matches what was hardcoded, so the existing singleton row
-- reads the same on the homepage right after this runs.
ALTER TABLE `site_settings` ADD COLUMN `heroTitleLo` VARCHAR(191) NOT NULL DEFAULT 'ມ່ວນ ອະວອດ';
