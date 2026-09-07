-- A homepage video the team can set independently of any year's own
-- highlight film (editions.highlightUrl) — a recap across several years, or
-- anything else they want to show, swappable whenever they like.
--
-- The thumbnail is a separate, optional column rather than something derived
-- at render time for every source: YouTube has a stable no-auth thumbnail
-- URL, but Facebook does not, so a column the team can fill in either way was
-- the one path that works for both.
--
-- Named `zz_` for the reason the migrations before it are: this directory is
-- applied in lexicographic order and its numbers are unpadded, so 9_ runs
-- after 19_. A `zz_` prefix is the only way to be certain a file runs last.
ALTER TABLE `site_settings` ADD COLUMN `homeHighlightVideoUrl` VARCHAR(191) NULL;
ALTER TABLE `site_settings` ADD COLUMN `homeHighlightThumbnailKey` VARCHAR(191) NULL;
