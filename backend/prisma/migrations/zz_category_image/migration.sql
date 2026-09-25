-- A 1:1 photo shown beside a category's description, on both the template
-- (the library's own copy) and the category itself (the per-edition copy,
-- kept in sync with the template the same way descriptionLo already is).
ALTER TABLE `categories` ADD COLUMN `imageKey` VARCHAR(191) NULL;
ALTER TABLE `category_templates` ADD COLUMN `imageKey` VARCHAR(191) NULL;
