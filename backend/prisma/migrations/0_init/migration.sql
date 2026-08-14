-- CreateTable
CREATE TABLE `editions` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `titleLo` VARCHAR(191) NOT NULL,
    `titleEn` VARCHAR(191) NULL,
    `descriptionLo` TEXT NULL,
    `descriptionEn` TEXT NULL,
    `phase` ENUM('DRAFT', 'PUBLISHED', 'NOMINEES_ANNOUNCED', 'WINNERS_ANNOUNCED') NOT NULL DEFAULT 'DRAFT',
    `submissionsOpen` BOOLEAN NOT NULL DEFAULT false,
    `submissionsCloseAt` DATETIME(3) NULL,
    `eventDate` DATETIME(3) NULL,
    `venueLo` VARCHAR(191) NULL,
    `venueEn` VARCHAR(191) NULL,
    `heroImageKey` VARCHAR(191) NULL,
    `galleryImageKeys` JSON NULL,
    `ticketUrl` VARCHAR(191) NULL,
    `voteUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `editions_year_key`(`year`),
    UNIQUE INDEX `editions_slug_key`(`slug`),
    INDEX `editions_phase_year_idx`(`phase`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `editionId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nameLo` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NULL,
    `descriptionLo` TEXT NULL,
    `groupLo` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `categories_editionId_sortOrder_idx`(`editionId`, `sortOrder`),
    UNIQUE INDEX `categories_editionId_slug_key`(`editionId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `creators` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `nameLo` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NULL,
    `bioLo` TEXT NULL,
    `avatarKey` VARCHAR(191) NULL,
    `socialLinks` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `creators_slug_key`(`slug`),
    INDEX `creators_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `judges` (
    `id` VARCHAR(191) NOT NULL,
    `nameLo` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NULL,
    `positionLo` VARCHAR(191) NOT NULL,
    `positionEn` VARCHAR(191) NULL,
    `bioLo` TEXT NULL,
    `avatarKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `judges_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `edition_judges` (
    `id` VARCHAR(191) NOT NULL,
    `editionId` VARCHAR(191) NOT NULL,
    `judgeId` VARCHAR(191) NOT NULL,
    `role` ENUM('CHAIR', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `edition_judges_editionId_sortOrder_idx`(`editionId`, `sortOrder`),
    UNIQUE INDEX `edition_judges_editionId_judgeId_key`(`editionId`, `judgeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `edition_sponsors` (
    `id` VARCHAR(191) NOT NULL,
    `editionId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `logoKey` VARCHAR(191) NULL,
    `websiteUrl` VARCHAR(191) NULL,
    `tier` ENUM('TITLE', 'GOLD', 'SILVER', 'SUPPORTER', 'PARTNER', 'MEDIA') NOT NULL DEFAULT 'SUPPORTER',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `edition_sponsors_editionId_tier_sortOrder_idx`(`editionId`, `tier`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nominations` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `creatorId` VARCHAR(191) NOT NULL,
    `isWinner` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `nominations_categoryId_sortOrder_idx`(`categoryId`, `sortOrder`),
    INDEX `nominations_creatorId_idx`(`creatorId`),
    UNIQUE INDEX `nominations_categoryId_creatorId_key`(`categoryId`, `creatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `public_submissions` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `creatorNameRaw` VARCHAR(191) NOT NULL,
    `creatorLink` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `submitterName` VARCHAR(191) NULL,
    `submitterEmail` VARCHAR(191) NULL,
    `ipHash` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'MERGED') NOT NULL DEFAULT 'PENDING',
    `matchedCreatorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `public_submissions_categoryId_status_idx`(`categoryId`, `status`),
    INDEX `public_submissions_ipHash_createdAt_idx`(`ipHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `heroImageKey` VARCHAR(191) NULL,
    `heroCaptionLo` VARCHAR(191) NULL,
    `brandStatementLo` TEXT NOT NULL,
    `aboutSummaryLo` TEXT NOT NULL,
    `galleryImageKeys` JSON NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN') NOT NULL DEFAULT 'ADMIN',
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `admin_users_email_key`(`email`),
    INDEX `admin_users_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    INDEX `audit_logs_targetType_targetId_idx`(`targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_editionId_fkey` FOREIGN KEY (`editionId`) REFERENCES `editions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edition_judges` ADD CONSTRAINT `edition_judges_editionId_fkey` FOREIGN KEY (`editionId`) REFERENCES `editions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edition_judges` ADD CONSTRAINT `edition_judges_judgeId_fkey` FOREIGN KEY (`judgeId`) REFERENCES `judges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edition_sponsors` ADD CONSTRAINT `edition_sponsors_editionId_fkey` FOREIGN KEY (`editionId`) REFERENCES `editions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nominations` ADD CONSTRAINT `nominations_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nominations` ADD CONSTRAINT `nominations_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `creators`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `public_submissions` ADD CONSTRAINT `public_submissions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `public_submissions` ADD CONSTRAINT `public_submissions_matchedCreatorId_fkey` FOREIGN KEY (`matchedCreatorId`) REFERENCES `creators`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

