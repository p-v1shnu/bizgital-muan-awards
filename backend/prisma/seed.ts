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

/**
 * How the awards are judged, as the homepage band and /about both render it.
 * One list for the two pages — they used to hold a copy each, and the copies had
 * already drifted apart in three of the four steps.
 */
const STARTING_JUDGING_STEPS = [
  { titleLo: 'ເສີນຊື່', bodyLo: 'ເປີດໃຫ້ທຸກຄົນສົ່ງຊື່ຜ່ານໜ້າ “ສົ່ງລາຍຊື່”' },
  {
    titleLo: 'ຄັດກອງ',
    bodyLo: 'ທີມງານກວດຄຸນສົມບັດ ແລະ ຜົນງານຕະຫຼອດປີ ແລ້ວສະຫຼຸບເປັນລາຍຊື່ນອມິນີ',
  },
  { titleLo: 'ກຳມະການລົງຄະແນນ', bodyLo: 'ຄະນະກຳມະການຂອງປີນັ້ນລົງຄະແນນເປັນເອກະລາດ' },
  { titleLo: 'ປະກາດຜົນ', bodyLo: 'ປະກາດນອມິນີກ່ອນ ແລ້ວປະກາດຜູ້ຊະນະໃນງານ' },
];

/**
 * The two cards under the homepage hero, and what /submit says happens next.
 * Both were written into the pages; these are the same words, now as a starting
 * point the team can edit. A key left out falls back to the page's own wording.
 */
const STARTING_HOME_CARDS = {
  noYear: { titleLo: 'ງານປີຕໍ່ໄປ', bodyLo: 'ຈະປະກາດໃນໄວໆນີ້' },
  draft: { titleLo: 'ກຳລັງກຽມ' },
  published: { titleLo: 'ເປີດແລ້ວ', bodyLo: 'ເບິ່ງສາຂາ ແລະ ລາຍລະອຽດຂອງງານປີນີ້' },
  nominees: { titleLo: 'ປະກາດນອມິນີແລ້ວ', bodyLo: 'ເບິ່ງລາຍຊື່ຜູ້ເຂົ້າຊິງທຸກສາຂາ' },
  winners: { titleLo: 'ປະກາດຜົນແລ້ວ', bodyLo: 'ເບິ່ງຜູ້ຊະນະທຸກສາຂາຂອງປີນີ້' },
  entriesOpen: {
    titleLo: 'ເປີດຮັບເສີນຊື່ແລ້ວ',
    bodyLo: 'ສົ່ງຊື່ຜູ້ສ້າງສັນທີ່ທ່ານຄິດວ່າສົມຄວນໄດ້ຮັບລາງວັນ',
  },
  hallOfWinners: { bodyLo: 'ຜູ້ຊະນະທຸກສາຂາ ທຸກປີ ນັບແຕ່ປີທຳອິດ' },
};

const STARTING_SUBMIT_AFTER = [
  'ທີມງານກວດທຸກລາຍຊື່ດ້ວຍມື',
  'ຊື່ທີ່ຖືກສົ່ງຫຼາຍຄັ້ງຈະຖືກລວມເປັນລາຍການດຽວ ບໍ່ນັບເປັນຄະແນນ',
  'ຄະນະກຳມະການເປັນຜູ້ຕັດສິນ ບໍ່ແມ່ນຈຳນວນຄັ້ງທີ່ຖືກເສີນ',
].join('\n');

/**
 * What the browser tab and a search result say for the pages that have no year
 * or person behind them. The same words the pages carried in code, so a fresh
 * install reads the way it always did — and the team can change them.
 */
const STARTING_PAGE_SEO = {
  home: {
    titleLo: 'ມ່ວນ ອະວອດ · Muan Awards',
    descriptionLo: 'ລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນຄອນເທັນລາວ',
  },
  about: {
    titleLo: 'ກ່ຽວກັບງານ',
    descriptionLo: 'ທີ່ມາຂອງມ່ວນ ອະວອດ, ເກນການຕັດສິນ ແລະ ຄຳຖາມທີ່ພົບເລື້ອຍ',
  },
  submit: {
    titleLo: 'ສົ່ງລາຍຊື່',
    descriptionLo: 'ເສີນຊື່ຜູ້ສ້າງສັນຄອນເທັນລາວທີ່ທ່ານຄິດວ່າຄູ່ຄວນໄດ້ລາງວັນ',
  },
  winners: {
    titleLo: 'ທຳນຽບຜູ້ຊະນະ',
    descriptionLo: 'ຜູ້ຊະນະທຸກສາຂາ ທຸກປີ ຂອງມ່ວນ ອະວອດ',
  },
};

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
      judgingSteps: STARTING_JUDGING_STEPS,
      homeCards: STARTING_HOME_CARDS,
      submitAfterLo: STARTING_SUBMIT_AFTER,
      pageSeo: STARTING_PAGE_SEO,
      footerLocationLo: 'ນະຄອນຫຼວງວຽງຈັນ, ສປປ ລາວ',
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
