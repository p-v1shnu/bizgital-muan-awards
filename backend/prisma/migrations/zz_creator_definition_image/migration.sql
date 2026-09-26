-- A photo shown beside the homepage's "what is a creator" section, next to
-- creatorDefinitionBodyLo — object storage key, never a full URL.
ALTER TABLE `site_settings` ADD COLUMN `creatorDefinitionImageKey` VARCHAR(191) NULL;
