-- The queue reads by status and groups by (category, name). With ten thousand
-- entries the grouping was scanning every row of the status; this is the index
-- that grouping wants.
CREATE INDEX `public_submissions_status_categoryId_creatorNameRaw_idx`
  ON `public_submissions`(`status`, `categoryId`, `creatorNameRaw`);
