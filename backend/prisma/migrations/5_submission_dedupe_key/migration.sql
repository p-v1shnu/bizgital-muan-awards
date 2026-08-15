-- The once-a-day rule was a read followed by a write: two identical entries
-- sent at the same instant both looked new and both were stored. This holds
-- one value per (category, name, address, Lao day) so the database decides.
ALTER TABLE `public_submissions` ADD COLUMN `dedupeKey` VARCHAR(64) NULL;
CREATE UNIQUE INDEX `public_submissions_dedupeKey_key` ON `public_submissions`(`dedupeKey`);
