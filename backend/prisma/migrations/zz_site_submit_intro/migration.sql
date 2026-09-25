-- The line under the "ສະເໜີຊື່ຄຣີເອເຕີ" heading on /submit was hardcoded on the
-- page ("ໃຜກໍສົ່ງໄດ້ ບໍ່ຕ້ອງລົງທະບຽນ · ສົ່ງໄດ້ຫຼາຍຄົນ ຫຼາຍສາຂາ"); the team asked to
-- type it themselves like every other page's copy in this table.
ALTER TABLE `site_settings` ADD COLUMN `submitIntroLo` VARCHAR(191) NULL;

-- Seed it with the line the page already carried, so existing rows show the
-- same text they always have rather than going blank on this deploy. Guarded,
-- so re-running cannot overwrite what the team has since typed.
UPDATE `site_settings`
SET `submitIntroLo` = 'ໃຜກໍສົ່ງໄດ້ ບໍ່ຕ້ອງລົງທະບຽນ · ສົ່ງໄດ້ຫຼາຍຄົນ ຫຼາຍສາຂາ'
WHERE `submitIntroLo` IS NULL;
