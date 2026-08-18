-- The six sponsor tiers were an enum, which put the words in the code twice —
-- the back office select and the year page's headings each carried their own
-- copy of the same Lao list. A year that sold a tier the enum did not have
-- could not say so, and renaming one was a deploy.
--
-- Tiers become rows, owned by the edition rather than the site: what a year
-- sells changes with the year, and renaming this year's must not rewrite the
-- heading over a year already published.
CREATE TABLE `edition_sponsor_tiers` (
    `id` VARCHAR(191) NOT NULL,
    `editionId` VARCHAR(191) NOT NULL,
    `nameLo` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `edition_sponsor_tiers_editionId_nameLo_key`(`editionId`, `nameLo`),
    INDEX `edition_sponsor_tiers_editionId_sortOrder_idx`(`editionId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `edition_sponsor_tiers` ADD CONSTRAINT `edition_sponsor_tiers_editionId_fkey` FOREIGN KEY (`editionId`) REFERENCES `editions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Every existing year gets all six, in the enum's own order and with the words
-- the two pages already showed — including years that used only one of them.
-- The old select offered all six on every year, so seeding only the tiers in
-- use would quietly take options away; the team deletes what they do not sell.
--
-- Ids are built from the edition's, because a cuid needs the client and this
-- runs in SQL. They are unique by construction (an edition id is unique and
-- each suffix appears once per edition) and never shown to anyone.
INSERT INTO `edition_sponsor_tiers` (`id`, `editionId`, `nameLo`, `sortOrder`)
SELECT CONCAT(`e`.`id`, `t`.`suffix`), `e`.`id`, `t`.`nameLo`, `t`.`sortOrder`
FROM `editions` `e`
JOIN (
            SELECT 'TITLE'     AS `code`, '-tier-title'     AS `suffix`, 'ຜູ້ສະໜັບສະໜູນຫຼັກ' AS `nameLo`, 0 AS `sortOrder`
  UNION ALL SELECT 'GOLD'      AS `code`, '-tier-gold'      AS `suffix`, 'ລະດັບຄຳ'            AS `nameLo`, 1 AS `sortOrder`
  UNION ALL SELECT 'SILVER'    AS `code`, '-tier-silver'    AS `suffix`, 'ລະດັບເງິນ'           AS `nameLo`, 2 AS `sortOrder`
  UNION ALL SELECT 'SUPPORTER' AS `code`, '-tier-supporter' AS `suffix`, 'ຜູ້ສະໜັບສະໜູນ'      AS `nameLo`, 3 AS `sortOrder`
  UNION ALL SELECT 'PARTNER'   AS `code`, '-tier-partner'   AS `suffix`, 'ພາດເນີ'              AS `nameLo`, 4 AS `sortOrder`
  UNION ALL SELECT 'MEDIA'     AS `code`, '-tier-media'     AS `suffix`, 'ສື່ມວນຊົນ'           AS `nameLo`, 5 AS `sortOrder`
) `t`;

-- AlterTable — nullable first, so the rows can be pointed at their tier.
ALTER TABLE `edition_sponsors` ADD COLUMN `tierId` VARCHAR(191) NULL;

UPDATE `edition_sponsors` `s`
JOIN (
            SELECT 'TITLE'     AS `code`, 'ຜູ້ສະໜັບສະໜູນຫຼັກ' AS `nameLo`
  UNION ALL SELECT 'GOLD'      AS `code`, 'ລະດັບຄຳ'            AS `nameLo`
  UNION ALL SELECT 'SILVER'    AS `code`, 'ລະດັບເງິນ'           AS `nameLo`
  UNION ALL SELECT 'SUPPORTER' AS `code`, 'ຜູ້ສະໜັບສະໜູນ'      AS `nameLo`
  UNION ALL SELECT 'PARTNER'   AS `code`, 'ພາດເນີ'              AS `nameLo`
  UNION ALL SELECT 'MEDIA'     AS `code`, 'ສື່ມວນຊົນ'           AS `nameLo`
) `m` ON `m`.`code` = `s`.`tier`
JOIN `edition_sponsor_tiers` `t` ON `t`.`editionId` = `s`.`editionId` AND `t`.`nameLo` = `m`.`nameLo`
SET `s`.`tierId` = `t`.`id`;

-- If any sponsor were still unpointed, this fails on the NULL rather than
-- inventing a tier for it — the check is the migration, not a comment.
ALTER TABLE `edition_sponsors` MODIFY COLUMN `tierId` VARCHAR(191) NOT NULL;

-- The new index goes in before the old one comes out, and in that order only:
-- the `editionId` foreign key is served by whichever index starts with that
-- column, so dropping the last one first is refused outright.
CREATE INDEX `edition_sponsors_editionId_tierId_sortOrder_idx` ON `edition_sponsors`(`editionId`, `tierId`, `sortOrder`);
DROP INDEX `edition_sponsors_editionId_tier_sortOrder_idx` ON `edition_sponsors`;
ALTER TABLE `edition_sponsors` DROP COLUMN `tier`;

-- RESTRICT: deleting a tier must not take the logos with it. The service
-- refuses while it still holds sponsors, and this is the floor under that.
ALTER TABLE `edition_sponsors` ADD CONSTRAINT `edition_sponsors_tierId_fkey` FOREIGN KEY (`tierId`) REFERENCES `edition_sponsor_tiers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
