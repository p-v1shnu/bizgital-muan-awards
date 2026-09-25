-- The public form no longer asks senders for a name or email (the team
-- dropped both fields rather than merely making them optional) — still in
-- UAT, nobody has seen this table's data yet, so there is nothing to
-- preserve by keeping the columns around unused.
ALTER TABLE `public_submissions` DROP COLUMN `submitterName`;
ALTER TABLE `public_submissions` DROP COLUMN `submitterEmail`;
