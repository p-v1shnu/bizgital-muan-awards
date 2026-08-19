-- Round three: one word for the people this site is about.
--
-- The site had been calling them ຜູ້ສ້າງສັນ on the public pages and ຄຣີເອເຕີ in
-- the admin, and describing their work with the loanword ຄອນເທັ້ນ. The project
-- owner settled both: ຄຣີເອເຕີ when speaking to a visitor (it is the word people
-- type into a search box), ຜູ້ສ້າງສັນເນື້ອຫາ for the award's own name and formal
-- copy, and ເນື້ອຫາ everywhere ຄອນເທັ້ນ used to be.
--
-- The taglines also stop saying ລາວ about the person. Eligibility follows the
-- language of the work, not the nationality of whoever made it — someone living
-- in Laos making Lao-language work qualifies — and "ຄຣີເອເຕີລາວ" reads as a rule
-- the awards do not have.
--
-- Whole sentences are guarded on their old value (the team may have rewritten
-- them at /admin/site); the single word ຄອນເທັ້ນ is replaced inside whatever the
-- column holds, which also catches category names the team typed themselves.

UPDATE `site_settings`
SET `brandStatementLo` = 'ລາງວັນປະຈຳປີສຳລັບຄຣີເອເຕີ ແລະ ຜູ້ສ້າງສັນເນື້ອຫາ'
WHERE `brandStatementLo` IN ('ລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນຄອນເທັ້ນລາວ', 'ລາງວັນສຳລັບຜູ້ສ້າງສັນຄອນເທັ້ນລາວ');

UPDATE `site_settings`
SET `pageSeo` = JSON_SET(`pageSeo`, '$.home.descriptionLo', 'ລາງວັນປະຈຳປີສຳລັບຄຣີເອເຕີ ແລະ ຜູ້ສ້າງສັນເນື້ອຫາ')
WHERE JSON_UNQUOTE(JSON_EXTRACT(`pageSeo`, '$.home.descriptionLo')) = 'ລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນຄອນເທັ້ນລາວ';

UPDATE `site_settings`
SET `pageSeo` = JSON_SET(`pageSeo`, '$.submit.descriptionLo', 'ສະເໜີຊື່ຄຣີເອເຕີທີ່ທ່ານຄິດວ່າຄູ່ຄວນໄດ້ລາງວັນ')
WHERE JSON_UNQUOTE(JSON_EXTRACT(`pageSeo`, '$.submit.descriptionLo')) = 'ສະເໜີຊື່ຜູ້ສ້າງສັນຄອນເທັ້ນລາວທີ່ທ່ານຄິດວ່າຄູ່ຄວນໄດ້ລາງວັນ';

-- The award keeps the formal name, and gains the ເນື້ອຫາ the old site used.
UPDATE `categories`
SET `nameLo` = 'ຜູ້ສ້າງສັນເນື້ອຫາແຫ່ງປີ'
WHERE `nameLo` = 'ຜູ້ສ້າງສັນແຫ່ງປີ';

UPDATE `site_settings`
SET
  `heroCaptionLo` = REPLACE(`heroCaptionLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `heroTitleLo` = REPLACE(`heroTitleLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `brandStatementLo` = REPLACE(`brandStatementLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `aboutTitleLo` = REPLACE(`aboutTitleLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `aboutSummaryLo` = REPLACE(`aboutSummaryLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `ctaTitleLo` = REPLACE(`ctaTitleLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `ctaBodyLo` = REPLACE(`ctaBodyLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `aboutHistoryLo` = REPLACE(`aboutHistoryLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `submitAfterLo` = REPLACE(`submitAfterLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `footerLocationLo` = REPLACE(`footerLocationLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `faq` = CAST(REPLACE(CAST(`faq` AS CHAR), 'ຄອນເທັ້ນ', 'ເນື້ອຫາ') AS JSON),
  `judgingSteps` = CAST(REPLACE(CAST(`judgingSteps` AS CHAR), 'ຄອນເທັ້ນ', 'ເນື້ອຫາ') AS JSON),
  `homeCards` = CAST(REPLACE(CAST(`homeCards` AS CHAR), 'ຄອນເທັ້ນ', 'ເນື້ອຫາ') AS JSON),
  `pageSeo` = CAST(REPLACE(CAST(`pageSeo` AS CHAR), 'ຄອນເທັ້ນ', 'ເນື້ອຫາ') AS JSON);

UPDATE `editions`
SET
  `titleLo` = REPLACE(`titleLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `descriptionLo` = REPLACE(`descriptionLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `venueLo` = REPLACE(`venueLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `activitiesLo` = REPLACE(`activitiesLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ');

UPDATE `categories`
SET
  `nameLo` = REPLACE(`nameLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `descriptionLo` = REPLACE(`descriptionLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ'),
  `groupLo` = REPLACE(`groupLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ');

UPDATE `edition_sponsor_tiers`
SET
  `nameLo` = REPLACE(`nameLo`, 'ຄອນເທັ້ນ', 'ເນື້ອຫາ');
