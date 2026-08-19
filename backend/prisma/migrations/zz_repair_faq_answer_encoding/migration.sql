-- Repairs the two FAQ answers that 16_faq_policy_answers stored as binary.
--
-- That migration built each answer with CONCAT('…', CHAR(10), '…'). Bare CHAR()
-- returns a *binary* string, CONCAT with a binary argument returns binary, and
-- JSON_OBJECT given a binary value stores it as a JSON opaque scalar — which
-- serialises as the literal text "base64:type15:4LuA4Lqb…". So /about and
-- /admin/site have been showing that string where the answer should be:
--
--   SELECT JSON_OBJECT('a', CONCAT('ກ', CHAR(10), 'ຂ'));
--     → {"a": "base64:type15:4LqBCuC6gg=="}
--   SELECT JSON_OBJECT('a', CONCAT('ກ', CHAR(10 USING utf8mb4), 'ຂ'));
--     → {"a": "ກ\nຂ"}
--
-- Only databases that already held a site_settings row when 16 ran are affected;
-- a fresh install has no row for it to update and takes its FAQ from the seed,
-- which was always correct. 16 itself is left exactly as it is — an applied
-- migration is history, and Prisma checksums the file.
--
-- 18_home_cards_submit_after uses bare CHAR(10) too, but assigns to a TEXT
-- column rather than into JSON: the bytes are UTF-8 either way and land intact
-- (verified — HEX() of the stored value and the newline position both check out).
-- Nothing to repair there.
--
-- Each answer is found by its question rather than by position, because the
-- arrows in /admin/site let the team reorder the list, and rewritten only where
-- it still holds the broken value — an answer the team has since typed over is
-- theirs. COALESCE keeps the path expression valid on a row that has no such
-- question, so the WHERE simply excludes it.

UPDATE `site_settings`
SET `faq` = JSON_SET(
  `faq`,
  COALESCE(
    REPLACE(
      JSON_UNQUOTE(JSON_SEARCH(`faq`, 'one', '%ຄຸນສົມບັດ%', NULL, '$[*].questionLo')),
      'questionLo', 'answerLo'
    ),
    '$."__no_such_key"'
  ),
  CONCAT(
    'ເປັນຜູ້ສ້າງສັນເນື້ອຫາລາວ ຫຼື ຜູ້ທີ່ສ້າງຜົນງານເປັນພາສາລາວ ແລະ ມີຜົນງານເຜີຍແຜ່ໃນຮອບປີທີ່ຕັດສິນ — ບໍ່ຈຳກັດແພລດຟອມ ແລະ ບໍ່ຕ້ອງສະໝັກເອງ',
    CHAR(10 USING utf8mb4),
    'ທີມງານກວດຄຸນສົມບັດ ແລະ ຜົນງານຕະຫຼອດປີໃນຂັ້ນຕອນຄັດກອງ · ບາງສາຂາອາດມີເງື່ອນໄຂສະເພາະຂອງຕົນ ເບິ່ງໄດ້ໃນຄຳອະທິບາຍຂອງສາຂານັ້ນໃນໜ້າຂອງແຕ່ລະປີ'
  )
)
WHERE JSON_UNQUOTE(JSON_EXTRACT(
  `faq`,
  COALESCE(
    REPLACE(
      JSON_UNQUOTE(JSON_SEARCH(`faq`, 'one', '%ຄຸນສົມບັດ%', NULL, '$[*].questionLo')),
      'questionLo', 'answerLo'
    ),
    '$."__no_such_key"'
  )
)) LIKE 'base64:%';

UPDATE `site_settings`
SET `faq` = JSON_SET(
  `faq`,
  COALESCE(
    REPLACE(
      JSON_UNQUOTE(JSON_SEARCH(`faq`, 'one', '%ຄະນະກຳມະການເລືອກ%', NULL, '$[*].questionLo')),
      'questionLo', 'answerLo'
    ),
    '$."__no_such_key"'
  ),
  CONCAT(
    'ທີມງານມ່ວນອາວອດສ໌ ເປັນຜູ້ເຊີນຄະນະກຳມະການຂອງແຕ່ລະປີ ຈາກຜູ້ມີປະສົບການໃນວົງການສ້າງສັນ ແລະ ສື່ຂອງລາວ · ຄະນະກຳມະການບໍ່ຄືກັນທຸກປີ ລາຍຊື່ ແລະ ຕຳແໜ່ງຂອງປີນັ້ນຂຶ້ນຢູ່ໜ້າຂອງປີ',
    CHAR(10 USING utf8mb4),
    'ທຸກສາຂາຕັດສິນໂດຍຄະນະກຳມະການ ບໍ່ແມ່ນການໂຫວດຂອງປະຊາຊົນ · ຄະນະກຳມະການພິຈາລະນາຈາກຄຸນນະພາບຂອງຜົນງານ ຄວາມສະໝ່ຳສະເໝີໃນການສ້າງເນື້ອຫາ ແລະ ຜົນກະທົບຕໍ່ຜູ້ຮັບຊົມ'
  )
)
WHERE JSON_UNQUOTE(JSON_EXTRACT(
  `faq`,
  COALESCE(
    REPLACE(
      JSON_UNQUOTE(JSON_SEARCH(`faq`, 'one', '%ຄະນະກຳມະການເລືອກ%', NULL, '$[*].questionLo')),
      'questionLo', 'answerLo'
    ),
    '$."__no_such_key"'
  )
)) LIKE 'base64:%';
