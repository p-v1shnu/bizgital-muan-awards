-- The privacy section of /about was written into the page: five headings and
-- their paragraphs, stating what the site collects, how long submitter details
-- are kept, and what is never done with them. That is policy, and policy the
-- team cannot edit is policy that goes out of date silently — "deleted within
-- 12 months" was a promise only a deploy could keep or change, and the same
-- twelve months was repeated on the entry form with nothing tying them together.
ALTER TABLE `site_settings` ADD COLUMN `privacyBlocks` JSON NULL;

-- Backfilled with exactly what the page says today, so the team edits real
-- policy text rather than writing it again from an empty box. Blank falls back
-- to the same words, which the page still carries as its default.
--
-- `CHAR(10 USING utf8mb4)`, not `CHAR(10)`: bare CHAR() returns a *binary*
-- string, CONCAT() of it is binary too, and JSON_OBJECT then stores the whole
-- paragraph as an opaque blob — Prisma reads it back as the literal text
-- "base64:type15:…". Caught by reading the rows after migrating rather than
-- trusting that the statement succeeded.
--
-- Plain text, with the conventions /admin/site explains beside the field: a
-- blank line starts a new paragraph, a line beginning "- " is a bullet, and
-- *stars* mark emphasis. The page renders those as elements — nothing here is
-- ever treated as HTML.
UPDATE `site_settings`
SET `privacyBlocks` = JSON_ARRAY(
  JSON_OBJECT(
    'titleLo', 'ຕອນສົ່ງລາຍຊື່ ເຮົາເກັບຫຍັງແດ່',
    'bodyLo', CONCAT(
      '- *ຊື່ຜູ້ສ້າງສັນ, ສາຂາ, ລິງກ໌ ແລະ ເຫດຜົນ* ທີ່ທ່ານພິມມາ — ທີມງານໃຊ້ຄັດເລືອກນອມິນີ', CHAR(10 USING utf8mb4),
      '- *ຊື່ ແລະ ອີເມວຂອງທ່ານ* — *ບໍ່ບັງຄັບ* ບໍ່ໃສ່ກໍສົ່ງໄດ້ປົກກະຕິ ໃຊ້ສະເພາະເມື່ອທີມງານຕ້ອງຖາມກັບເທົ່ານັ້ນ', CHAR(10 USING utf8mb4),
      '- *ຮ່ອງຮອຍທາງເທັກນິກ* ເພື່ອກັນສະແປມ — ທີ່ຢູ່ IP ຖືກ *ປ່ຽນເປັນລະຫັດຫຍໍ້* ກ່ອນບັນທຶກ ຈຶ່ງອ່ານກັບເປັນເລກເດີມບໍ່ໄດ້'
    )
  ),
  JSON_OBJECT(
    'titleLo', 'ເກັບໄວ້ດົນປານໃດ',
    'bodyLo', 'ຊື່ ແລະ ອີເມວຂອງຜູ້ສົ່ງຖືກລຶບອອກ *ພາຍໃນ 12 ເດືອນ* ຫຼັງງານປີນັ້ນຈົບ · ສ່ວນຊື່ຜູ້ສ້າງສັນ ແລະ ຜົນລາງວັນ ເປັນບັນທຶກຂອງງານ ຈຶ່ງເກັບຖາວອນ'
  ),
  JSON_OBJECT(
    'titleLo', 'ເຮົາບໍ່ເຮັດຫຍັງກັບຂໍ້ມູນຂອງທ່ານ',
    'bodyLo', 'ບໍ່ຂາຍ ບໍ່ແລກປ່ຽນ ແລະ ບໍ່ສົ່ງອີເມວໂຄສະນາ · ຄົນທີ່ເຫັນຂໍ້ມູນຜູ້ສົ່ງມີສະເພາະທີມງານທີ່ມີບັນຊີຫຼັງບ້ານ ແລະ ທຸກຄັ້ງທີ່ມີການແກ້ໄຂຖືກບັນທຶກໄວ້'
  ),
  JSON_OBJECT(
    'titleLo', 'ສະຖິຕິການເຂົ້າຊົມ',
    'bodyLo', CONCAT(
      'ເວັບໃຊ້ *Google Analytics* ນັບຈຳນວນຜູ້ເຂົ້າຊົມ ແລະ ເບິ່ງວ່າໜ້າໃດຖືກເປີດຫຼາຍ · ເລີ່ມນັບ *ຕັ້ງແຕ່ທ່ານເປີດໜ້າ*', CHAR(10 USING utf8mb4), CHAR(10 USING utf8mb4),
      'ສິ່ງທີ່ຖືກນັບແມ່ນ *ໜ້າທີ່ເປີດ, ຊະນິດອຸປະກອນ, ພາສາ ແລະ ປະເທດໂດຍປະມານ* — *ບໍ່ແມ່ນຊື່ ຫຼື ອີເມວຂອງທ່ານ* ແລະ Google ບໍ່ໄດ້ບັນທຶກທີ່ຢູ່ IP ໄວ້ໃນລາຍງານ'
    )
  ),
  JSON_OBJECT(
    'titleLo', 'ຢາກໃຫ້ລຶບຂໍ້ມູນ',
    'bodyLo', 'ຂຽນມາຫາທີມງານຕາມຊ່ອງທາງຂ້າງລຸ່ມ ພ້ອມບອກຊື່ທີ່ທ່ານສົ່ງເຂົ້າມາ — ເຮົາຈະລຶບຂໍ້ມູນຜູ້ສົ່ງອອກໃຫ້'
  )
)
WHERE `privacyBlocks` IS NULL;
