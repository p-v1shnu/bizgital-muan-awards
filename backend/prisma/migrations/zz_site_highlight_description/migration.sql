-- What the homepage highlight video is, shown under the section's own
-- fixed title. Unlike the title, which stays the same whatever the team
-- swaps the video to, this is the one line that changes with it — so it is
-- data the team edits, not code.
--
-- Named `zz_` for the reason the migrations before it are: this directory is
-- applied in lexicographic order and its numbers are unpadded, so 9_ runs
-- after 19_. A `zz_` prefix is the only way to be certain a file runs last.
ALTER TABLE `site_settings` ADD COLUMN `homeHighlightDescriptionLo` TEXT NULL;
