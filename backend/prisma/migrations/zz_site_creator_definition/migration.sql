-- A new homepage section explaining what a Muan Awards "creator" is —
-- team feedback that the "ກ່ຽວກັບງານ" band alone left visitors unclear on
-- who the awards are actually for.
--
-- Same shape as aboutTitleLo/aboutSummaryLo: the title gets a default so
-- the existing singleton row shows something coherent immediately, the
-- body starts empty and the page shows a placeholder until the team
-- writes it.
ALTER TABLE `site_settings` ADD COLUMN `creatorDefinitionTitleLo` VARCHAR(191) NOT NULL DEFAULT 'ຄຣີເອເຕີຂອງມ່ວນອາວອດສ໌ແມ່ນຫຍັງ?';
ALTER TABLE `site_settings` ADD COLUMN `creatorDefinitionBodyLo` TEXT NULL;
