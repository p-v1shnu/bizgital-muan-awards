-- The tab title and search-result description of the four pages that had them
-- written into the code, and the location line in the footer. What Google shows
-- for this site was the one piece of copy the team could not touch at all.
ALTER TABLE `site_settings`
  ADD COLUMN `pageSeo` JSON NULL,
  ADD COLUMN `footerLocationLo` VARCHAR(191) NULL;

-- Backfilled with exactly what the pages carry today, so the team edits real
-- text rather than empty boxes. A value left blank falls back to the page's own.
UPDATE `site_settings`
SET
  `pageSeo` = JSON_OBJECT(
    'home', JSON_OBJECT(
      'titleLo', 'ມ່ວນ ອະວອດ · Muan Awards',
      'descriptionLo', 'ລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນຄອນເທັນລາວ'
    ),
    'about', JSON_OBJECT(
      'titleLo', 'ກ່ຽວກັບງານ',
      'descriptionLo', 'ທີ່ມາຂອງມ່ວນ ອະວອດ, ເກນການຕັດສິນ ແລະ ຄຳຖາມທີ່ພົບເລື້ອຍ'
    ),
    'submit', JSON_OBJECT(
      'titleLo', 'ສົ່ງລາຍຊື່',
      'descriptionLo', 'ເສີນຊື່ຜູ້ສ້າງສັນຄອນເທັນລາວທີ່ທ່ານຄິດວ່າຄູ່ຄວນໄດ້ລາງວັນ'
    ),
    'winners', JSON_OBJECT(
      'titleLo', 'ທຳນຽບຜູ້ຊະນະ',
      'descriptionLo', 'ຜູ້ຊະນະທຸກສາຂາ ທຸກປີ ຂອງມ່ວນ ອະວອດ'
    )
  ),
  `footerLocationLo` = 'ນະຄອນຫຼວງວຽງຈັນ, ສປປ ລາວ'
WHERE `pageSeo` IS NULL;
