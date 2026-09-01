-- A shared sponsor-tier library, the same "assign, don't retype" shape
-- Judge/EditionJudge already has — one name lives here, and every edition
-- that sold that tier reads it live. Existing per-edition tier names are
-- grouped into one template per distinct name, keeping the newest edition's
-- spelling.
CREATE TABLE `sponsor_tier_templates` (
    `id` VARCHAR(191) NOT NULL,
    `nameLo` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `sponsor_tier_templates_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `sponsor_tier_templates` (`id`, `nameLo`, `nameEn`, `createdAt`, `updatedAt`)
SELECT
  CONCAT('sptier_', MD5(ranked.`nameLo`)),
  ranked.`nameLo`,
  ranked.`nameEn`,
  NOW(3),
  NOW(3)
FROM (
  SELECT
    t.`nameLo`,
    t.`nameEn`,
    ROW_NUMBER() OVER (PARTITION BY t.`nameLo` ORDER BY e.`year` DESC) AS rn
  FROM `edition_sponsor_tiers` t
  INNER JOIN `editions` e ON e.`id` = t.`editionId`
) ranked
WHERE ranked.rn = 1;

ALTER TABLE `edition_sponsor_tiers` ADD COLUMN `templateId` VARCHAR(191) NULL;

UPDATE `edition_sponsor_tiers` t
INNER JOIN `sponsor_tier_templates` st ON st.`nameLo` = t.`nameLo`
SET t.`templateId` = st.`id`;

-- Two tiers in one edition sharing a name was never forbidden before this,
-- so any pair has to be merged before the new (editionId, templateId)
-- uniqueness below can hold — the same "move the logos first" the back
-- office already asks for when a group is deleted by hand.
UPDATE `edition_sponsors` s
INNER JOIN `edition_sponsor_tiers` t ON t.`id` = s.`tierId`
INNER JOIN (
  SELECT `editionId`, `templateId`, MIN(`id`) AS keepId
  FROM `edition_sponsor_tiers`
  GROUP BY `editionId`, `templateId`
) keep ON keep.`editionId` = t.`editionId` AND keep.`templateId` = t.`templateId`
SET s.`tierId` = keep.`keepId`
WHERE t.`id` <> keep.`keepId`;

DELETE t FROM `edition_sponsor_tiers` t
INNER JOIN (
  SELECT `editionId`, `templateId`, MIN(`id`) AS keepId
  FROM `edition_sponsor_tiers`
  GROUP BY `editionId`, `templateId`
) keep ON keep.`editionId` = t.`editionId` AND keep.`templateId` = t.`templateId`
WHERE t.`id` <> keep.`keepId`;

ALTER TABLE `edition_sponsor_tiers` MODIFY COLUMN `templateId` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `edition_sponsor_tiers_editionId_templateId_key` ON `edition_sponsor_tiers`(`editionId`, `templateId`);

ALTER TABLE `edition_sponsor_tiers`
  ADD CONSTRAINT `edition_sponsor_tiers_templateId_fkey`
  FOREIGN KEY (`templateId`) REFERENCES `sponsor_tier_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `edition_sponsor_tiers` DROP COLUMN `nameLo`;
ALTER TABLE `edition_sponsor_tiers` DROP COLUMN `nameEn`;
