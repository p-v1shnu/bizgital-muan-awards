-- The FAQ becomes a list the team owns outright: it writes the questions too,
-- and adds or removes entries without anyone touching the schema. Migration 14
-- gave two named answers a column each, which cannot answer a question nobody
-- thought of first.
ALTER TABLE `site_settings` ADD COLUMN `faq` JSON NULL;

-- Carry the page's five entries over, so nothing that was on /about disappears:
-- the three that were hardcoded there, plus whatever the team had already typed
-- into the two columns from migration 14. JSON_MERGE_PRESERVE concatenates the
-- arrays in the order given, which is the order the questions appear in.
UPDATE `site_settings`
SET `faq` = JSON_MERGE_PRESERVE(
  JSON_ARRAY(
    JSON_OBJECT(
      'questionLo', 'ໃຜສາມາດເສີນຊື່ໄດ້?',
      'answerLo', 'ທຸກຄົນ — ບໍ່ຕ້ອງລົງທະບຽນ ແລະ ບໍ່ຕ້ອງບອກຊື່ຜູ້ສົ່ງ'
    ),
    JSON_OBJECT(
      'questionLo', 'ຈຳນວນຄັ້ງທີ່ຖືກເສີນ ມີຜົນຕໍ່ຜົນລາງວັນບໍ?',
      'answerLo', 'ບໍ່ມີ — ການເສີນຊື່ຊ່ວຍໃຫ້ທີມງານບໍ່ເບິ່ງຂ້າມໃຜ ແຕ່ຜູ້ຕັດສິນຄືຄະນະກຳມະການ'
    )
  ),
  IF(
    `faqEligibilityLo` IS NOT NULL AND TRIM(`faqEligibilityLo`) <> '',
    JSON_ARRAY(
      JSON_OBJECT('questionLo', 'ຄຸນສົມບັດຂອງຜູ້ເຂົ້າຊິງມີຫຍັງແດ່?', 'answerLo', `faqEligibilityLo`)
    ),
    JSON_ARRAY()
  ),
  IF(
    `faqJudgesLo` IS NOT NULL AND TRIM(`faqJudgesLo`) <> '',
    JSON_ARRAY(
      JSON_OBJECT('questionLo', 'ຄະນະກຳມະການເລືອກມາແນວໃດ?', 'answerLo', `faqJudgesLo`)
    ),
    JSON_ARRAY()
  ),
  JSON_ARRAY(
    JSON_OBJECT(
      'questionLo', 'ຢາກຮ່ວມເປັນສະປອນເຊີ ຕິດຕໍ່ໃສ?',
      'answerLo', 'ຕິດຕໍ່ທີມງານຕາມຊ່ອງທາງໃນຫົວຂໍ້ “ຕິດຕໍ່ທີມງານ” ທ້າຍໜ້ານີ້'
    )
  )
)
WHERE `faq` IS NULL;

ALTER TABLE `site_settings`
  DROP COLUMN `faqEligibilityLo`,
  DROP COLUMN `faqJudgesLo`;
