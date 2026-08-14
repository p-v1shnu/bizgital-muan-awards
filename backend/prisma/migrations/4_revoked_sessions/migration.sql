-- Signing out has to end one session without ending the others, so a logout
-- leaves a note naming the session it cancelled. Nothing is written on sign-in;
-- rows disappear once the token they cancel would have expired on its own.
CREATE TABLE `revoked_sessions` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `revoked_sessions_expiresAt_idx`(`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
