-- Two more homepage headings that were hardcoded in the page itself: the
-- "what this is" section title, and the closing call-to-action's heading and
-- body. Defaults match what was hardcoded, so existing rows read the same on
-- the homepage right after this runs.
ALTER TABLE `site_settings` ADD COLUMN `aboutTitleLo` VARCHAR(191) NOT NULL DEFAULT 'ມ່ວນ ອະວອດ ຄືຫຍັງ';
ALTER TABLE `site_settings` ADD COLUMN `ctaTitleLo` VARCHAR(191) NOT NULL DEFAULT 'ຮູ້ຈັກຜູ້ສ້າງສັນທີ່ຄູ່ຄວນບໍ?';
ALTER TABLE `site_settings` ADD COLUMN `ctaBodyLo` VARCHAR(191) NOT NULL DEFAULT 'ສົ່ງຊື່ເຂົ້າມາໄດ້ ບໍ່ຈຳເປັນຕ້ອງບອກຊື່ຜູ້ສົ່ງ';
