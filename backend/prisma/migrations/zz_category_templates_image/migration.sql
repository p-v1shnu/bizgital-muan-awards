-- The template half of zz_category_image, moved here so it runs after the
-- table exists. Databases that already ran the old zz_category_image have the
-- column, so this only adds it where it is missing.
SET @has_column := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'category_templates' AND COLUMN_NAME = 'imageKey'
);
SET @statement := IF(
  @has_column = 0,
  'ALTER TABLE `category_templates` ADD COLUMN `imageKey` VARCHAR(191) NULL',
  'SELECT 1'
);
PREPARE add_column FROM @statement;
EXECUTE add_column;
DEALLOCATE PREPARE add_column;
