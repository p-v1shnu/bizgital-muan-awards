-- A team-uploaded tile that replaces the built-in CSS "weave" section
-- divider. Object storage key, never a full URL — unset keeps the CSS
-- pattern.
--
-- Named `zz_` for the reason the migrations before it are: this directory is
-- applied in lexicographic order and its numbers are unpadded, so 9_ runs
-- after 19_. A `zz_` prefix is the only way to be certain a file runs last.
ALTER TABLE `site_settings` ADD COLUMN `dividerPatternKey` VARCHAR(191) NULL;
