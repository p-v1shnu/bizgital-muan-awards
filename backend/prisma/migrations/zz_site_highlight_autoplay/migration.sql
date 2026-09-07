-- Whether the homepage highlight video plays on its own, muted, once
-- scrolled into view, instead of waiting for a click. Off by default: an
-- existing video already set up as a click-to-play thumbnail keeps behaving
-- exactly as it did before this column existed.
--
-- Named `zz_` for the reason the migrations before it are: this directory is
-- applied in lexicographic order and its numbers are unpadded, so 9_ runs
-- after 19_. A `zz_` prefix is the only way to be certain a file runs last.
ALTER TABLE `site_settings` ADD COLUMN `homeHighlightAutoplay` BOOLEAN NOT NULL DEFAULT false;
