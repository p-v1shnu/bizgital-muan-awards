-- The copy on the homepage's two entry cards, and the "what happens next" list
-- on /submit. Both were written into the pages, so the team could not touch a
-- word of either.
ALTER TABLE `site_settings`
  ADD COLUMN `homeCards` JSON NULL,
  ADD COLUMN `submitAfterLo` TEXT NULL;

-- Backfilled with exactly what the pages say today. The team edits what is
-- already there rather than filling in empty boxes and guessing what it replaced;
-- a value left blank still falls back to the page's own wording.
UPDATE `site_settings`
SET
  `homeCards` = JSON_OBJECT(
    'noYear', JSON_OBJECT('titleLo', 'ງານປີຕໍ່ໄປ', 'bodyLo', 'ຈະປະກາດໃນໄວໆນີ້'),
    'draft', JSON_OBJECT('titleLo', 'ກຳລັງກຽມ', 'bodyLo', ''),
    'published', JSON_OBJECT('titleLo', 'ເປີດແລ້ວ', 'bodyLo', 'ເບິ່ງສາຂາ ແລະ ລາຍລະອຽດຂອງງານປີນີ້'),
    'nominees', JSON_OBJECT('titleLo', 'ປະກາດນອມິນີແລ້ວ', 'bodyLo', 'ເບິ່ງລາຍຊື່ຜູ້ເຂົ້າຊິງທຸກສາຂາ'),
    'winners', JSON_OBJECT('titleLo', 'ປະກາດຜົນແລ້ວ', 'bodyLo', 'ເບິ່ງຜູ້ຊະນະທຸກສາຂາຂອງປີນີ້'),
    'entriesOpen', JSON_OBJECT(
      'titleLo', 'ເປີດຮັບເສີນຊື່ແລ້ວ',
      'bodyLo', 'ສົ່ງຊື່ຜູ້ສ້າງສັນທີ່ທ່ານຄິດວ່າສົມຄວນໄດ້ຮັບລາງວັນ'
    ),
    'hallOfWinners', JSON_OBJECT('bodyLo', 'ຜູ້ຊະນະທຸກສາຂາ ທຸກປີ ນັບແຕ່ປີທຳອິດ')
  ),
  `submitAfterLo` = CONCAT_WS(
    CHAR(10),
    'ທີມງານກວດທຸກລາຍຊື່ດ້ວຍມື',
    'ຊື່ທີ່ຖືກສົ່ງຫຼາຍຄັ້ງຈະຖືກລວມເປັນລາຍການດຽວ ບໍ່ນັບເປັນຄະແນນ',
    'ຄະນະກຳມະການເປັນຜູ້ຕັດສິນ ບໍ່ແມ່ນຈຳນວນຄັ້ງທີ່ຖືກເສີນ'
  )
WHERE `homeCards` IS NULL;
