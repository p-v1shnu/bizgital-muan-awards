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
 * Eligibility and how the panel is chosen were left out at first, as policy
 * nobody but the team could write. The team asked for them anyway, so they are
 * drafted here out of what the project has already committed to in writing —
 * §1 and the judging steps in the PRD, and the criteria on the approved /about
 * mockup — rather than invented. Both are listed in docs/lao-copy-review.md as
 * wording the team still has to confirm, because a wrong answer here is a rule
 * the site appears to be announcing.
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
    questionLo: 'ຄຸນສົມບັດຂອງຜູ້ເຂົ້າຊິງມີຫຍັງແດ່?',
    answerLo:
      'ເປັນຜູ້ສ້າງສັນຄອນເທັນລາວ ຫຼື ຜູ້ທີ່ສ້າງຜົນງານເປັນພາສາລາວ ແລະ ມີຜົນງານເຜີຍແຜ່ໃນຮອບປີທີ່ຕັດສິນ — ບໍ່ຈຳກັດແພລດຟອມ ແລະ ບໍ່ຕ້ອງສະໝັກເອງ\n' +
      'ທີມງານກວດຄຸນສົມບັດ ແລະ ຜົນງານຕະຫຼອດປີໃນຂັ້ນຕອນຄັດກອງ · ບາງສາຂາອາດມີເງື່ອນໄຂສະເພາະຂອງຕົນ ເບິ່ງໄດ້ໃນຄຳອະທິບາຍຂອງສາຂານັ້ນໃນໜ້າຂອງແຕ່ລະປີ',
  },
  {
    questionLo: 'ຄະນະກຳມະການເລືອກມາແນວໃດ?',
    answerLo:
      'ທີມງານມ່ວນ ອະວອດ ເປັນຜູ້ເຊີນຄະນະກຳມະການຂອງແຕ່ລະປີ ຈາກຜູ້ມີປະສົບການໃນວົງການສ້າງສັນ ແລະ ສື່ຂອງລາວ · ຄະນະກຳມະການບໍ່ຄືກັນທຸກປີ ລາຍຊື່ ແລະ ຕຳແໜ່ງຂອງປີນັ້ນຂຶ້ນຢູ່ໜ້າຂອງປີ\n' +
      'ທຸກສາຂາຕັດສິນໂດຍຄະນະກຳມະການ ບໍ່ແມ່ນການໂຫວດຂອງປະຊາຊົນ · ຄະນະກຳມະການພິຈາລະນາຈາກຄຸນນະພາບຂອງຜົນງານ ຄວາມສະໝ່ຳສະເໝີໃນການສ້າງເນື້ອຫາ ແລະ ຜົນກະທົບຕໍ່ຜູ້ຮັບຊົມ',
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
