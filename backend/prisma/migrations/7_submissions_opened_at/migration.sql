-- Remembers that a year once took entries, so the year page can tell
-- "closed" apart from "never opened" (PRD §4.2).
ALTER TABLE `editions` ADD COLUMN `submissionsOpenedAt` DATETIME(3) NULL;

-- Any year already collecting entries has plainly been opened. Years that
-- closed before this ran cannot be recovered — there is nothing recording it —
-- and they read as never opened, which is the quieter of the two mistakes.
UPDATE `editions` SET `submissionsOpenedAt` = COALESCE(`updatedAt`, NOW(3)) WHERE `submissionsOpen` = 1;
