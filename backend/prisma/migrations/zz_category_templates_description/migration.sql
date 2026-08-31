-- Lets a category's description be typed once in the library and copied down
-- by the admin UI the moment a template is picked, the same one-time entry
-- nameLo already gets — existing templates simply start with none, same as
-- every category created from them so far.
ALTER TABLE `category_templates` ADD COLUMN `descriptionLo` TEXT NULL;
