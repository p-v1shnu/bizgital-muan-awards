/**
 * Seed — the minimum a fresh database needs to render the site.
 *
 * Idempotent: it upserts, so running it twice changes nothing. It never
 * creates an admin account — the first SUPER_ADMIN is made through /setup
 * so that the password is never written down in a file.
 */
import { EditionPhase, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // The homepage reads its evergreen copy from here (PRD §6.1.1), so the row
  // has to exist before anything renders.
  await prisma.siteSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      brandStatementLo: 'ລາງວັນສຳລັບຜູ້ສ້າງສັນຄອນເທັນລາວ',
      aboutSummaryLo:
        'ມ່ວນ ອະວອດ ຄືເວທີປະຈຳປີທີ່ຍ້ອງຍໍຜົນງານຂອງຜູ້ສ້າງສັນຄອນເທັນລາວ ໃນທຸກຮູບແບບ.',
    },
  });

  const edition = await prisma.edition.upsert({
    where: { year: 2026 },
    update: {},
    create: {
      year: 2026,
      slug: '2026',
      titleLo: 'ມ່ວນ ອະວອດ 2026',
      titleEn: 'Muan Awards 2026',
      // Left as a draft on purpose: the team walks it forward once the real
      // content is in (PRD §4.3).
      phase: EditionPhase.DRAFT,
    },
  });

  const categories = [
    { slug: 'creator-of-the-year', nameLo: 'ຜູ້ສ້າງສັນແຫ່ງປີ', isFeatured: true },
    { slug: 'video-of-the-year', nameLo: 'ວິດີໂອແຫ່ງປີ', isFeatured: true },
    { slug: 'rising-star', nameLo: 'ດາວຮຸ່ງ', isFeatured: true },
    { slug: 'comedy', nameLo: 'ຄອນເທັນຕະຫຼົກ' },
    { slug: 'food', nameLo: 'ຄອນເທັນອາຫານ' },
    { slug: 'travel', nameLo: 'ຄອນເທັນທ່ອງທ່ຽວ' },
  ];

  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { editionId_slug: { editionId: edition.id, slug: category.slug } },
      update: {},
      create: { ...category, editionId: edition.id, sortOrder: index },
    });
  }

  console.log(`Seeded site settings and ${categories.length} categories for ${edition.year}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
