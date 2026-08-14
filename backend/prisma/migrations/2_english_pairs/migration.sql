-- Every content field gets its English pair (PRD §8 rule 5). The site ships in
-- Lao only, but the point of the rule is that turning English on later is a
-- content job, not a schema migration — so the columns exist from the start.
ALTER TABLE `editions` ADD COLUMN `activitiesEn` TEXT NULL;
ALTER TABLE `categories` ADD COLUMN `descriptionEn` TEXT NULL;
ALTER TABLE `creators` ADD COLUMN `bioEn` TEXT NULL;
ALTER TABLE `judges` ADD COLUMN `bioEn` TEXT NULL;
ALTER TABLE `site_settings` ADD COLUMN `heroCaptionEn` VARCHAR(191) NULL;
ALTER TABLE `site_settings` ADD COLUMN `brandStatementEn` TEXT NULL;
ALTER TABLE `site_settings` ADD COLUMN `aboutSummaryEn` TEXT NULL;
