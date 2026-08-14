-- Signing out used to clear the cookie and nothing else: the refresh token
-- inside it stayed valid for a week. This rides in both tokens so a logout or
-- a password change ends every session that was issued before it.
ALTER TABLE `admin_users` ADD COLUMN `tokenVersion` INT NOT NULL DEFAULT 0;
