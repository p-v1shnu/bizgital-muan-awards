-- Judges get their own public profile page, the same slug-based shape
-- Creator already has (`/judges/[slug]`, ahead of `/creators/[slug]`).
--
-- No judge has ever had a slug before, so existing rows get a generated
-- placeholder rather than one derived from `nameLo` — that column is Lao
-- script, and there is no honest way to turn it into a URL segment. The
-- admin form makes the field editable like Creator's, so the team can swap
-- these for real ones.

ALTER TABLE `judges` ADD COLUMN `slug` VARCHAR(191) NULL;

UPDATE `judges` SET `slug` = CONCAT('judge-', SUBSTRING(MD5(`id`), 1, 8)) WHERE `slug` IS NULL;

ALTER TABLE `judges` MODIFY COLUMN `slug` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `judges_slug_key` ON `judges`(`slug`);
