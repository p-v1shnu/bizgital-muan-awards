/** Mirrors backend/prisma/schema.prisma. Keep the two in step by hand. */

export type EditionPhase = 'DRAFT' | 'PUBLISHED' | 'NOMINEES_ANNOUNCED' | 'WINNERS_ANNOUNCED';
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';
export type JudgeRole = 'CHAIR' | 'MEMBER';
export type SubmissionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MERGED';

export interface Edition {
  id: string;
  year: number;
  slug: string;
  titleLo: string;
  titleEn: string | null;
  descriptionLo: string | null;
  descriptionEn: string | null;
  phase: EditionPhase;
  submissionsOpen: boolean;
  submissionsCloseAt: string | null;
  eventDate: string | null;
  venueLo: string | null;
  venueEn: string | null;
  /** Free text, one activity per line (PRD §6.1.2 §5). */
  activitiesLo: string | null;
  heroImageKey: string | null;
  galleryImageKeys: string[] | null;
  ticketUrl: string | null;
  voteUrl: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only on the dashboard payload: both switches resolved together. */
  acceptingSubmissions?: boolean;
}

export interface Category {
  id: string;
  editionId: string;
  slug: string;
  nameLo: string;
  nameEn: string | null;
  descriptionLo: string | null;
  groupLo: string | null;
  sortOrder: number;
  isFeatured: boolean;
  _count?: { nominations: number };
  /** Only ever the winner, when the list endpoint includes it. */
  nominations?: Nomination[];
}

export interface Creator {
  id: string;
  slug: string;
  nameLo: string;
  nameEn: string | null;
  bioLo: string | null;
  avatarKey: string | null;
  socialLinks: Record<string, string> | null;
  _count?: { nominations: number };
}

export interface Judge {
  id: string;
  nameLo: string;
  nameEn: string | null;
  positionLo: string;
  positionEn: string | null;
  bioLo: string | null;
  avatarKey: string | null;
  _count?: { editions: number };
}

export interface EditionJudge {
  id: string;
  editionId: string;
  judgeId: string;
  role: JudgeRole;
  sortOrder: number;
  judge: Judge;
}

/** A sponsor group of one year — named by the team, not a fixed list. */
export interface SponsorTier {
  id: string;
  editionId: string;
  nameLo: string;
  nameEn: string | null;
  sortOrder: number;
  _count?: { sponsors: number };
}

export interface Sponsor {
  id: string;
  editionId: string;
  tierId: string;
  name: string;
  logoKey: string | null;
  websiteUrl: string | null;
  sortOrder: number;
}

export interface Nomination {
  id: string;
  categoryId: string;
  creatorId: string;
  isWinner: boolean;
  sortOrder: number;
  creator: Creator;
}

export interface SubmissionEntry {
  id: string;
  categoryId: string;
  creatorNameRaw: string;
  /** Set when the team folded this entry into another spelling (PRD §7.2). */
  originalNameRaw: string | null;
  creatorLink: string | null;
  reason: string | null;
  submitterName: string | null;
  status: SubmissionStatus;
  createdAt: string;
}

export interface SubmissionGroup {
  key: string;
  creatorNameRaw: string;
  category: Category & { edition: Edition };
  /** Every time this name was sent in — may exceed `entries.length`. */
  count: number;
  latestAt: string;
  /** The most recent few only; a name sent in 200 times does not ship 200. */
  entries: SubmissionEntry[];
}

/** One /about question and its answer, written by the team. */
export interface FaqItem {
  questionLo: string;
  /** One paragraph per line. */
  answerLo: string;
}

/** One step of "how this is judged", shown on the homepage and on /about. */
export interface JudgingStep {
  titleLo: string;
  bodyLo: string;
}

/**
 * Copy for the cards under the homepage hero, keyed by what the site can say
 * right now. Any key or field left out falls back to the page's own wording.
 */
export interface HomeCards {
  noYear?: { titleLo?: string; bodyLo?: string };
  draft?: { titleLo?: string; bodyLo?: string };
  published?: { titleLo?: string; bodyLo?: string };
  nominees?: { titleLo?: string; bodyLo?: string };
  winners?: { titleLo?: string; bodyLo?: string };
  entriesOpen?: { titleLo?: string; bodyLo?: string };
  /** No title: that card's heading is the name of the page it leads to. */
  hallOfWinners?: { bodyLo?: string };
}

/** Tab title and search-result description, for the pages that have no record. */
export interface PageSeo {
  titleLo?: string;
  descriptionLo?: string;
}

export interface SiteSettings {
  id: string;
  heroImageKey: string | null;
  heroCaptionLo: string | null;
  heroTitleLo: string;
  brandStatementLo: string;
  aboutTitleLo: string;
  aboutSummaryLo: string;
  ctaTitleLo: string;
  ctaBodyLo: string;
  galleryImageKeys: string[] | null;
  socialLinks: Record<string, string> | null;
  aboutHistoryLo: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  faq: FaqItem[] | null;
  judgingSteps: JudgingStep[] | null;
  homeCards: HomeCards | null;
  submitAfterLo: string | null;
  pageSeo: Partial<Record<'home' | 'about' | 'submit' | 'winners', PageSeo>> | null;
  footerLocationLo: string | null;
  updatedAt: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminUser extends AuthenticatedUser {
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

/** What /admin/dashboard returns. */
export interface DashboardTask {
  key: string;
  severity: 'blocking' | 'attention' | 'info';
  blocks: EditionPhase | null;
  count: number;
}

export interface DashboardOverview {
  edition: Edition | null;
  stats: {
    pendingSubmissions: number;
    categories: number;
    featuredCategories: number;
    nominations: number;
    judges: number;
    sponsors: number;
  } | null;
  tasks: DashboardTask[];
  categories: {
    id: string;
    nameLo: string;
    slug: string;
    isFeatured: boolean;
    nominationCount: number;
    winner: Creator | null;
  }[];
}
