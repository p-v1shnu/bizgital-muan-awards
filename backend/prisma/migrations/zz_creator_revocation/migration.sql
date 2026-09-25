-- Lets the team strike a creator's nomination/winner history from the
-- public site after the fact (a rule violation found later) without
-- touching the nominations themselves — separate from deletedAt, which
-- only ever applies to a creator with zero history.
ALTER TABLE `creators` ADD COLUMN `revokedAt` DATETIME(3) NULL;
ALTER TABLE `creators` ADD COLUMN `revokedReason` TEXT NULL;

CREATE INDEX `creators_revokedAt_idx` ON `creators`(`revokedAt`);
