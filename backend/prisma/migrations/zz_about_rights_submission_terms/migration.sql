-- Two new /about sections after the intro, requested by the team:
-- "ຂໍ້ສະຫງວນສິດຂອງມ່ວນອາວອດສ໌" and "ເງື່ອນໄຂການສະເໜີຊື່". Nullable, same as
-- aboutHistoryLo, so /about shows an explicit placeholder until the team
-- writes them.
ALTER TABLE `site_settings` ADD COLUMN `aboutRightsLo` TEXT NULL;
ALTER TABLE `site_settings` ADD COLUMN `aboutSubmissionTermsLo` TEXT NULL;
