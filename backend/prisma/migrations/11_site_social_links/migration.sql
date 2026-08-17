-- The organisation's own social accounts, for icon links in the footer —
-- distinct from a Creator's or Judge's own socialLinks column. Nullable: no
-- row has ever had this, and an empty footer icon row is the correct default.
ALTER TABLE `site_settings` ADD COLUMN `socialLinks` JSON NULL;
