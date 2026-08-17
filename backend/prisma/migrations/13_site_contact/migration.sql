-- How to reach the team, for the contact box on /about — which had no fields
-- behind it at all and showed an explicit placeholder instead, while the
-- privacy section on the same page was already telling submitters to write in.
-- Nullable: the placeholder stays until the team fills at least one channel in.
-- The Facebook page is not here on purpose; the box uses socialLinks.facebook.
ALTER TABLE `site_settings`
  ADD COLUMN `contactEmail` VARCHAR(191) NULL,
  ADD COLUMN `contactPhone` VARCHAR(191) NULL;
