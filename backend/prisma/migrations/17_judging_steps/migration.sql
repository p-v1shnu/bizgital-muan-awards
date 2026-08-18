-- The four judging steps, which the homepage and /about each held their own
-- copy of — already drifted apart in three of the four. One list now, read by
-- both pages and edited in /admin/site.
ALTER TABLE `site_settings` ADD COLUMN `judgingSteps` JSON NULL;

-- The wording carried over is /about's, the fuller of the two: it says what
-- screening produces and what is announced first, which the homepage's shorter
-- copy left out. Nothing on either page loses a sentence this way.
UPDATE `site_settings`
SET `judgingSteps` = JSON_ARRAY(
  JSON_OBJECT('titleLo', 'ເສີນຊື່', 'bodyLo', 'ເປີດໃຫ້ທຸກຄົນສົ່ງຊື່ຜ່ານໜ້າ “ສົ່ງລາຍຊື່”'),
  JSON_OBJECT('titleLo', 'ຄັດກອງ', 'bodyLo', 'ທີມງານກວດຄຸນສົມບັດ ແລະ ຜົນງານຕະຫຼອດປີ ແລ້ວສະຫຼຸບເປັນລາຍຊື່ນອມິນີ'),
  JSON_OBJECT('titleLo', 'ກຳມະການລົງຄະແນນ', 'bodyLo', 'ຄະນະກຳມະການຂອງປີນັ້ນລົງຄະແນນເປັນເອກະລາດ'),
  JSON_OBJECT('titleLo', 'ປະກາດຜົນ', 'bodyLo', 'ປະກາດນອມິນີກ່ອນ ແລ້ວປະກາດຜູ້ຊະນະໃນງານ')
)
WHERE `judgingSteps` IS NULL;
