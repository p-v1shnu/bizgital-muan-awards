-- Keeps the spelling an entry arrived with when the team folds it into another
-- group, so merging two spellings of one person loses nothing (PRD §7.2).
ALTER TABLE `public_submissions` ADD COLUMN `originalNameRaw` VARCHAR(191) NULL;
