-- The two questions the FAQ has carried unanswered since the page was written:
-- who may be nominated, and how the panel is chosen. Drafted out of what the
-- project has already committed to in writing — ข้อ 1 and the judging steps in
-- the PRD, and the criteria on the approved /about mockup — rather than
-- invented, and appended to whatever the team already has in the list.
--
-- Guarded by the question text rather than by position: a database that answers
-- either question already, in these words or the team's own, is left untouched.
-- Appended at the end because the team may have reordered the list; the arrows
-- in /admin/site move an entry wherever it belongs.
UPDATE `site_settings`
SET `faq` = JSON_ARRAY_APPEND(
  COALESCE(`faq`, JSON_ARRAY()),
  '$',
  JSON_OBJECT(
    'questionLo', 'ຄຸນສົມບັດຂອງຜູ້ເຂົ້າຊິງມີຫຍັງແດ່?',
    'answerLo', CONCAT(
      'ເປັນຜູ້ສ້າງສັນຄອນເທັນລາວ ຫຼື ຜູ້ທີ່ສ້າງຜົນງານເປັນພາສາລາວ ແລະ ມີຜົນງານເຜີຍແຜ່ໃນຮອບປີທີ່ຕັດສິນ — ບໍ່ຈຳກັດແພລດຟອມ ແລະ ບໍ່ຕ້ອງສະໝັກເອງ',
      CHAR(10),
      'ທີມງານກວດຄຸນສົມບັດ ແລະ ຜົນງານຕະຫຼອດປີໃນຂັ້ນຕອນຄັດກອງ · ບາງສາຂາອາດມີເງື່ອນໄຂສະເພາະຂອງຕົນ ເບິ່ງໄດ້ໃນຄຳອະທິບາຍຂອງສາຂານັ້ນໃນໜ້າຂອງແຕ່ລະປີ'
    )
  )
)
WHERE JSON_SEARCH(COALESCE(`faq`, JSON_ARRAY()), 'one', '%ຄຸນສົມບັດ%', NULL, '$[*].questionLo') IS NULL;

UPDATE `site_settings`
SET `faq` = JSON_ARRAY_APPEND(
  COALESCE(`faq`, JSON_ARRAY()),
  '$',
  JSON_OBJECT(
    'questionLo', 'ຄະນະກຳມະການເລືອກມາແນວໃດ?',
    'answerLo', CONCAT(
      'ທີມງານມ່ວນ ອະວອດ ເປັນຜູ້ເຊີນຄະນະກຳມະການຂອງແຕ່ລະປີ ຈາກຜູ້ມີປະສົບການໃນວົງການສ້າງສັນ ແລະ ສື່ຂອງລາວ · ຄະນະກຳມະການບໍ່ຄືກັນທຸກປີ ລາຍຊື່ ແລະ ຕຳແໜ່ງຂອງປີນັ້ນຂຶ້ນຢູ່ໜ້າຂອງປີ',
      CHAR(10),
      'ທຸກສາຂາຕັດສິນໂດຍຄະນະກຳມະການ ບໍ່ແມ່ນການໂຫວດຂອງປະຊາຊົນ · ຄະນະກຳມະການພິຈາລະນາຈາກຄຸນນະພາບຂອງຜົນງານ ຄວາມສະໝ່ຳສະເໝີໃນການສ້າງເນື້ອຫາ ແລະ ຜົນກະທົບຕໍ່ຜູ້ຮັບຊົມ'
    )
  )
)
WHERE JSON_SEARCH(COALESCE(`faq`, JSON_ARRAY()), 'one', '%ຄະນະກຳມະການເລືອກ%', NULL, '$[*].questionLo') IS NULL;
