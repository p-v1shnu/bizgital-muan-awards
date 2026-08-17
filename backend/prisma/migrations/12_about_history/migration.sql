-- The "where this came from and what it's for" paragraphs on /about, which
-- had no field at all — the page showed an explicit placeholder instead.
-- Nullable: existing rows keep showing that placeholder until the team fills
-- this in through /admin/site.
ALTER TABLE `site_settings` ADD COLUMN `aboutHistoryLo` TEXT NULL;
