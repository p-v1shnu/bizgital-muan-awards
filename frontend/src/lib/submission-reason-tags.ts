/**
 * The five reasons a sender can pick from on /submit, replacing what used to
 * be a free-text "why should they win" box. Shared with the admin submission
 * list, which reads the same keys back to show what was checked — one set of
 * Lao wording for both, rather than the two drifting apart.
 */
export const SUBMISSION_REASON_TAGS = [
  {
    key: 'creativity',
    titleLo: 'ຄວາມຄິດສ້າງສັນ',
    hintLo: 'ນຳສະເໜີແບບເປັນເອກະລັກຂອງໂຕເອງ, ແຕກຕ່າງ ແລະ ຈື່ໄດ້',
  },
  {
    key: 'relevance',
    titleLo: 'ຕົງກັບສິ່ງທີ່ຂ້ອຍສົນໃຈ',
    hintLo: 'ເນື້ອຫາໃຫ້ຂໍ້ມູນ, ຄຸນຄ່າ ຫຼື ປະໂຫຍດ ທີ່ກົງກັບຄວາມສົນໃຈຂອງຂ້ອຍ',
  },
  {
    key: 'quality',
    titleLo: 'ຄຸນນະພາບຂອງຄອນເທັນ',
    hintLo: 'ເລົ່າເລື່ອງເກັ່ງ, ພາບ/ສຽງ ຄົມຊັດ, ເບິ່ງແລ້ວຮູ້ສຶກມ່ວນ',
  },
  {
    key: 'consistency',
    titleLo: 'ຄວາມສະໝໍ່າສະເໝີ',
    hintLo: 'ລົງເນື້ອຫາຕໍ່ເນື່ອງ ຮັກສາຄຸນນະພາບໄດ້ຕະຫຼອດ ບໍ່ຂາດຊ່ວງ',
  },
  {
    key: 'engagement',
    titleLo: 'ໄດ້ປະໂຫຍດ ແລະ ຮູ້ສຶກມີສ່ວນຮ່ວມນຳ',
    hintLo:
      'ບໍ່ວ່າຈະໃຫ້ຄວາມຮູ້, ຄວາມມ່ວນຊື່ນ, ແຮງບັນດານໃຈ ຫຼື ຄຳແນະນຳ, ພ້ອມທັງມີການໂຕ້ຕອບກັບຜູ້ຕິດຕາມແທ້ໆ',
  },
] as const;

export type SubmissionReasonTagKey = (typeof SUBMISSION_REASON_TAGS)[number]['key'];
