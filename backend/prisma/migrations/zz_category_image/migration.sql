-- A 1:1 photo shown beside a category's description, on both the template
-- (the library's own copy) and the category itself (the per-edition copy,
-- kept in sync with the template the same way descriptionLo already is).
--
-- The template half lives in zz_category_templates_image: this folder sorts
-- before zz_category_templates, so on a fresh database the table it altered
-- did not exist yet and every new install failed here.
ALTER TABLE `categories` ADD COLUMN `imageKey` VARCHAR(191) NULL;
