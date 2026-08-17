-- The two /about FAQ answers the team owns — who may be nominated, and how the
-- panel is chosen — which had no fields and showed a placeholder instead. The
-- remaining answers describe rules the code enforces and stay in the page.
-- Nullable: each question keeps its placeholder until the answer is written.
ALTER TABLE `site_settings`
  ADD COLUMN `faqEligibilityLo` TEXT NULL,
  ADD COLUMN `faqJudgesLo` TEXT NULL;
