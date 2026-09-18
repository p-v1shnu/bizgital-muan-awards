-- How large a tier's logos render on a year page, relative to the other
-- tiers on it. Defaults to M — the size every existing tier already
-- rendered at before this column existed — so nothing already on a live
-- page changes size the moment this ships.
ALTER TABLE `sponsor_tier_templates` ADD COLUMN `logoSize` ENUM('S', 'M', 'L', 'XL') NOT NULL DEFAULT 'M';
