/**
 * Seed — the minimum a fresh database needs to render the site.
 *
 * Idempotent: it upserts, so running it twice changes nothing. It never
 * creates an admin account — the first SUPER_ADMIN is made through /setup
 * so that the password is never written down in a file.
 */
import { EditionPhase, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * What /about answers on a database nobody has edited yet. The team owns every
 * one of these from the back office — this is a starting set, not a fixture, and
 * the same five entries migration 15 carries over from the version of the page
 * that had them written into it.
 *
 * Eligibility and how the panel is chosen are missing on purpose. They are the
 * team's own policy and nobody else can write them, and an entry has to carry an
 * answer — so rather than shipping an invented one, /admin/site names the two as
 * worth adding. Nudging the team where it can act beats showing a visitor a box
 * that says the site does not know.
 */
const STARTING_FAQ = [
  {
    questionLo: 'ໃຜສາມາດເສີນຊື່ໄດ້?',
    answerLo: 'ທຸກຄົນ — ບໍ່ຕ້ອງລົງທະບຽນ ແລະ ບໍ່ຕ້ອງບອກຊື່ຜູ້ສົ່ງ',
  },
  {
    questionLo: 'ຈຳນວນຄັ້ງທີ່ຖືກເສີນ ມີຜົນຕໍ່ຜົນລາງວັນບໍ?',
    answerLo: 'ບໍ່ມີ — ການເສີນຊື່ຊ່ວຍໃຫ້ທີມງານບໍ່ເບິ່ງຂ້າມໃຜ ແຕ່ຜູ້ຕັດສິນຄືຄະນະກຳມະການ',
  },
  {
    questionLo: 'ຢາກຮ່ວມເປັນສະປອນເຊີ ຕິດຕໍ່ໃສ?',
    answerLo: 'ຕິດຕໍ່ທີມງານຕາມຊ່ອງທາງໃນຫົວຂໍ້ “ຕິດຕໍ່ທີມງານ” ທ້າຍໜ້ານີ້',
  },
];

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
      faq: STARTING_FAQ,
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
