-- Named `zz_` rather than `21_` on purpose. Prisma applies migrations in
-- lexicographic order, and this project's folders are not zero-padded, so the
-- real order is 0, 1, 10 … 19, 2, 20, 3 … 9 — `9_hero_title`, which creates
-- heroTitleLo, runs last of all. A `21_` name would have this file run before
-- the column it edits exists, which is exactly how the first attempt failed.
-- Anything that must run after everything else needs a name that sorts after
-- everything else.
--
-- Round one of the Lao copy review: nine words the project owner corrected in
-- docs/lao-review/00-glossary.md. The code and the seed carry the new spellings
-- already; this is the same edit applied to the text a running database is
-- holding, so an installation that has been live since before the review does
-- not keep serving the old words.
--
--   ມ່ວນ ອະວອດ  → ມ່ວນອາວອດສ໌      (brand name, now written as one word)
--   ນອມິນີ      → ຜູ້ເຂົ້າຊີງ        (the loanword dropped for the Lao term)
--   ເຂົ້າຊິງ     → ເຂົ້າຊີງ           (spelling)
--   ຄອນເທັນ     → ຄອນເທັ້ນ         (spelling)
--   ສະປອນເຊີ    → ຜູ້ສະໜັບສະໜູນ    (one word for sponsor, not two)
--   ປີການປະກວດ  → ປີທີ່ຈັດງານ
--   ເສີນ        → ສະເໜີ
--   ໜ້າແຮກ      → ໜ້າຫຼັກ
--
-- REPLACE rather than overwriting each value: the team owns this text and may
-- have rewritten any of it since launch. Substituting one word inside whatever
-- is there keeps their wording and fixes only the misspelling. Rows that never
-- contained these words are left byte-identical.
--
-- Creator, judge and sponsor names are deliberately not touched — those are
-- people's and companies' own names, not this project's vocabulary.

UPDATE `site_settings`
SET
  `heroCaptionLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`heroCaptionLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `heroTitleLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`heroTitleLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `brandStatementLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`brandStatementLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `aboutTitleLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`aboutTitleLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `aboutSummaryLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`aboutSummaryLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `ctaTitleLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`ctaTitleLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `ctaBodyLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`ctaBodyLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `aboutHistoryLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`aboutHistoryLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `submitAfterLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`submitAfterLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `footerLocationLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`footerLocationLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `faq` = CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CAST(`faq` AS CHAR), 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ') AS JSON),
  `judgingSteps` = CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CAST(`judgingSteps` AS CHAR), 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ') AS JSON),
  `homeCards` = CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CAST(`homeCards` AS CHAR), 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ') AS JSON),
  `pageSeo` = CAST(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CAST(`pageSeo` AS CHAR), 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ') AS JSON);

UPDATE `editions`
SET
  `titleLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`titleLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `descriptionLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`descriptionLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `venueLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`venueLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `activitiesLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`activitiesLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ');

UPDATE `categories`
SET
  `nameLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`nameLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `descriptionLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`descriptionLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ'),
  `groupLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`groupLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ');

UPDATE `edition_sponsor_tiers`
SET
  `nameLo` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`nameLo`, 'ມ່ວນ ອະວອດ', 'ມ່ວນອາວອດສ໌'), 'ອະວອດ', 'ອາວອດສ໌'), 'ນອມິນີ', 'ຜູ້ເຂົ້າຊີງ'), 'ເຂົ້າຊິງ', 'ເຂົ້າຊີງ'), 'ຄອນເທັນ', 'ຄອນເທັ້ນ'), 'ສະປອນເຊີ', 'ຜູ້ສະໜັບສະໜູນ'), 'ປີການປະກວດ', 'ປີທີ່ຈັດງານ'), 'ເສີນ', 'ສະເໜີ'), 'ໜ້າແຮກ', 'ໜ້າຫຼັກ');

-- The two columns whose DEFAULT still spelled the brand the old way, so a row
-- inserted after this migration starts from the corrected name.
ALTER TABLE `site_settings`
  ALTER `heroTitleLo` SET DEFAULT 'ມ່ວນອາວອດສ໌',
  ALTER `aboutTitleLo` SET DEFAULT 'ມ່ວນອາວອດສ໌ ຄືຫຍັງ';
