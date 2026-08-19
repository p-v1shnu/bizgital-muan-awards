-- Round two of the Lao copy review: the homepage's closing call to action and
-- two of the cards under the hero, rewritten by the project owner.
--
--   ຮູ້ຈັກຜູ້ສ້າງສັນທີ່ຄູ່ຄວນບໍ?              → ຢາກສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານມັກບໍ່?
--   ສົ່ງຊື່ເຂົ້າມາໄດ້ ບໍ່ຈຳເປັນຕ້ອງບອກຊື່ຜູ້ສົ່ງ    → ສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານມັກເຂົ້າມາໄດ້ເລີຍ
--   ກຳລັງກຽມ                            → ກຳລັງຕຽມການ
--   ສົ່ງຊື່ຜູ້ສ້າງສັນທີ່ທ່ານຄິດວ່າສົມຄວນໄດ້ຮັບລາງວັນ → ສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານຄິດວ່າສົມຄວນໄດ້ຮັບລາງວັນ
--
-- Guarded on the old value rather than replacing inside it, unlike round one.
-- These are whole sentences the team owns and edits at /admin/site, so a row
-- that no longer says exactly what the site shipped is a row somebody has
-- rewritten — and their sentence wins over this one.
--
-- Sorted after zz_lao_glossary_round_one by name for the reason that file
-- explains: Prisma orders migrations lexicographically and this project never
-- zero-padded them, so 9_hero_title runs last of the numbered ones.
UPDATE `site_settings`
SET `ctaTitleLo` = 'ຢາກສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານມັກບໍ່?'
WHERE `ctaTitleLo` = 'ຮູ້ຈັກຜູ້ສ້າງສັນທີ່ຄູ່ຄວນບໍ?';

UPDATE `site_settings`
SET `ctaBodyLo` = 'ສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານມັກເຂົ້າມາໄດ້ເລີຍ'
WHERE `ctaBodyLo` = 'ສົ່ງຊື່ເຂົ້າມາໄດ້ ບໍ່ຈຳເປັນຕ້ອງບອກຊື່ຜູ້ສົ່ງ';

UPDATE `site_settings`
SET `homeCards` = JSON_SET(`homeCards`, '$.draft.titleLo', 'ກຳລັງຕຽມການ')
WHERE JSON_UNQUOTE(JSON_EXTRACT(`homeCards`, '$.draft.titleLo')) = 'ກຳລັງກຽມ';

UPDATE `site_settings`
SET `homeCards` = JSON_SET(`homeCards`, '$.entriesOpen.bodyLo', 'ສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານຄິດວ່າສົມຄວນໄດ້ຮັບລາງວັນ')
WHERE JSON_UNQUOTE(JSON_EXTRACT(`homeCards`, '$.entriesOpen.bodyLo')) = 'ສົ່ງຊື່ຜູ້ສ້າງສັນທີ່ທ່ານຄິດວ່າສົມຄວນໄດ້ຮັບລາງວັນ';

-- The two columns whose DEFAULT carried the old wording.
ALTER TABLE `site_settings`
  ALTER `ctaTitleLo` SET DEFAULT 'ຢາກສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານມັກບໍ່?',
  ALTER `ctaBodyLo` SET DEFAULT 'ສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານມັກເຂົ້າມາໄດ້ເລີຍ';
