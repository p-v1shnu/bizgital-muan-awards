-- A library for category identity, the same shape Creator and Judge already
-- have: pick from here when a year's category is the same award as some
-- other year's, so the slug is copied rather than retyped (and so a category
-- that already exists cannot be re-created by accident under a slightly
-- different slug). Each `categories` row keeps its own copy of slug/nameLo —
-- this table is what that copy is stamped from, not a live read of it, for
-- the same reason `edition_sponsor_tiers` is not shared either: renaming an
-- award later must not silently rewrite what a past year's page already said.
CREATE TABLE `category_templates` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nameLo` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `category_templates_slug_key`(`slug`),
    INDEX `category_templates_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- One template per distinct slug already in use, named after the newest
-- edition that used it — existing categories are not touched by this, only
-- linked, so nothing a past year's page says changes today. Categories whose
-- slug already drifted across years (the exact problem this table exists to
-- stop happening again) land as separate templates, same as they are today;
-- nothing here can guess which of those were meant to be the same award.
INSERT INTO `category_templates` (`id`, `slug`, `nameLo`, `nameEn`, `createdAt`, `updatedAt`)
SELECT
  CONCAT('tmpl_', MD5(ranked.`slug`)),
  ranked.`slug`,
  ranked.`nameLo`,
  ranked.`nameEn`,
  NOW(3),
  NOW(3)
FROM (
  SELECT
    c.`slug`,
    c.`nameLo`,
    c.`nameEn`,
    ROW_NUMBER() OVER (PARTITION BY c.`slug` ORDER BY e.`year` DESC) AS rn
  FROM `categories` c
  INNER JOIN `editions` e ON e.`id` = c.`editionId`
) ranked
WHERE ranked.rn = 1;

ALTER TABLE `categories` ADD COLUMN `templateId` VARCHAR(191) NULL;

UPDATE `categories` c
INNER JOIN `category_templates` t ON t.`slug` = c.`slug`
SET c.`templateId` = t.`id`;

CREATE INDEX `categories_templateId_idx` ON `categories`(`templateId`);

-- SET NULL rather than RESTRICT: the category service already refuses to
-- delete a template that is still assigned (mirrors how Creator and Judge
-- guard their own libraries), so this is only a backstop against a template
-- removed by hand outside that check — the category keeps its own name and
-- slug either way, it just stops pointing anywhere.
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_templateId_fkey`
  FOREIGN KEY (`templateId`) REFERENCES `category_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
