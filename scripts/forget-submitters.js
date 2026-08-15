/**
 * Clears the personal details of old entries.
 *
 * The site tells people their name and email are removed within twelve months
 * of that year's awards (see /about#privacy), and a promise with nothing
 * behind it is worse than no promise. This is what carries it out; run it from
 * cron once a month:
 *
 *   0 4 1 * *  docker compose exec -T backend node scripts/forget-submitters.js
 *
 * The nomination itself, the name that was put forward and the result all
 * stay — those are the record of the awards. Only the sender's own details go.
 */
const { PrismaClient } = require('@prisma/client');

const MONTHS = Number(process.env.FORGET_AFTER_MONTHS ?? 12);

(async () => {
  const prisma = new PrismaClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - MONTHS);

  const { count } = await prisma.publicSubmission.updateMany({
    where: {
      createdAt: { lt: cutoff },
      OR: [{ submitterName: { not: null } }, { submitterEmail: { not: null } }],
    },
    data: { submitterName: null, submitterEmail: null },
  });

  console.log(
    `${new Date().toISOString()} cleared sender details on ${count} entries older than ${MONTHS} months`,
  );
  await prisma.$disconnect();
})();
