-- The pill above the homepage hero heading, which the mockup writes as
-- "ຕັ້ງແຕ່ປີ 2023 · ນະຄອນຫຼວງວຽງຈັນ". The page worked that line out for itself
-- for one commit; the team asked to type it instead, which is right — the year
-- in it is a fact about the awards, not about the site's contents.
--
-- Named `zz_` for the reason the four migrations before it are: this directory
-- is applied in lexicographic order and its numbers are unpadded, so 9_ runs
-- after 19_. A `zz_` prefix is the only way to be certain a file runs last.
ALTER TABLE `site_settings` ADD COLUMN `heroKickerLo` VARCHAR(191) NULL;

-- The line the mockup carries, so the pill is there to be seen and edited
-- rather than waiting on someone noticing a new empty field. Guarded, so
-- re-running cannot overwrite what the team has since typed.
UPDATE `site_settings`
SET `heroKickerLo` = 'ຕັ້ງແຕ່ປີ 2023 · ນະຄອນຫຼວງວຽງຈັນ'
WHERE `heroKickerLo` IS NULL;
