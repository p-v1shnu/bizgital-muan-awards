-- Sponsor groups stop being an enum of six and become the year's own data, so a
-- year can sell a group nobody thought of when this was written. The six Lao
-- names lived in the front-end code, not the database — the column only held
-- GOLD — so this is also the moment they become editable at all.
CREATE TABLE `edition_sponsor_tiers` (
  `id` VARCHAR(191) NOT NULL,
  `editionId` VARCHAR(191) NOT NULL,
  `nameLo` VARCHAR(191) NOT NULL,
  `nameEn` VARCHAR(191) NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `edition_sponsor_tiers_editionId_sortOrder_idx`(`editionId`, `sortOrder`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `edition_sponsor_tiers`
  ADD CONSTRAINT `edition_sponsor_tiers_editionId_fkey`
  FOREIGN KEY (`editionId`) REFERENCES `editions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- One group per (year, tier) pair that a sponsor actually uses — a year that
-- never sold a media package does not get an empty media group to look at. The
-- id is derived from the pair so the update below can find it again, and the
-- order is the order the year page has always drawn them in.
INSERT INTO `edition_sponsor_tiers` (`id`, `editionId`, `nameLo`, `sortOrder`)
SELECT
  CONCAT('tier_', MD5(CONCAT(s.`editionId`, '_', s.`tier`))),
  s.`editionId`,
  CASE s.`tier`
    WHEN 'TITLE' THEN 'ຜູ້ສະໜັບສະໜູນຫຼັກ'
    WHEN 'GOLD' THEN 'ລະດັບຄຳ'
    WHEN 'SILVER' THEN 'ລະດັບເງິນ'
    WHEN 'SUPPORTER' THEN 'ຜູ້ສະໜັບສະໜູນ'
    WHEN 'PARTNER' THEN 'ພາດເນີ'
    ELSE 'ສື່ມວນຊົນ'
  END,
  CASE s.`tier`
    WHEN 'TITLE' THEN 0
    WHEN 'GOLD' THEN 1
    WHEN 'SILVER' THEN 2
    WHEN 'SUPPORTER' THEN 3
    WHEN 'PARTNER' THEN 4
    ELSE 5
  END
FROM `edition_sponsors` s
GROUP BY s.`editionId`, s.`tier`;

ALTER TABLE `edition_sponsors` ADD COLUMN `tierId` VARCHAR(191) NULL;

UPDATE `edition_sponsors`
SET `tierId` = CONCAT('tier_', MD5(CONCAT(`editionId`, '_', `tier`)));

-- Required from here on: a logo with no group would be one the year page never
-- draws, which is the failure this whole change is meant to make impossible.
ALTER TABLE `edition_sponsors` MODIFY COLUMN `tierId` VARCHAR(191) NOT NULL;

-- The new index goes in before the old one comes out. MySQL uses the leftmost
-- column of (editionId, tier, sortOrder) to enforce the foreign key on editionId,
-- so dropping it while it is the only such index is refused outright — which is
-- exactly how this migration failed the first time it ran.
CREATE INDEX `edition_sponsors_editionId_tierId_sortOrder_idx`
  ON `edition_sponsors`(`editionId`, `tierId`, `sortOrder`);

DROP INDEX `edition_sponsors_editionId_tier_sortOrder_idx` ON `edition_sponsors`;
ALTER TABLE `edition_sponsors` DROP COLUMN `tier`;

-- RESTRICT is the backstop under the back office's own check: deleting a group
-- that still holds logos asks where to move them first.
ALTER TABLE `edition_sponsors`
  ADD CONSTRAINT `edition_sponsors_tierId_fkey`
  FOREIGN KEY (`tierId`) REFERENCES `edition_sponsor_tiers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
