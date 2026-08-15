/** Shapes returned by the public read API (backend PublicSiteService). */
import type { EditionPhase, JudgeRole, SponsorTier } from './api';

export interface PublicCreator {
  id: string;
  slug: string;
  nameLo: string;
  nameEn: string | null;
  avatarKey: string | null;
  socialLinks: Record<string, string> | null;
}

export interface PublicNominee {
  id: string;
  /** Already gated by phase server-side; never derived here. */
  isWinner: boolean;
  creator: PublicCreator;
}

export interface PublicEditionSummary {
  id: string;
  year: number;
  slug: string;
  titleLo: string;
  titleEn: string | null;
  descriptionLo: string | null;
  phase: EditionPhase;
  eventDate: string | null;
  venueLo: string | null;
  /** Free text, one activity per line (PRD §6.1.2 §5). */
  activitiesLo: string | null;
  heroImageKey: string | null;
  galleryImageKeys: string[] | null;
  ticketUrl: string | null;
  voteUrl: string | null;
  /**
   * The second switch of PRD §4, decided server-side. Three states, not two:
   * accepting · closed after having been open · never opened at all, which a
   * backfilled year must stay silent about.
   */
  acceptingSubmissions: boolean;
  submissionsCloseAt: string | null;
  submissionsHaveOpened: boolean;
}

export interface PublicCategory {
  id: string;
  slug: string;
  nameLo: string;
  nameEn: string | null;
  descriptionLo: string | null;
  groupLo: string | null;
  isFeatured: boolean;
  nominees: PublicNominee[];
}

export interface PublicEdition extends PublicEditionSummary {
  /** Set only when the year is visible because of a preview (PRD §4.3.2). */
  preview: { phase: EditionPhase } | null;
  categories: PublicCategory[];
  judges: {
    id: string;
    role: JudgeRole;
    nameLo: string;
    nameEn: string | null;
    positionLo: string;
    bioLo: string | null;
    avatarKey: string | null;
  }[];
  sponsors: {
    id: string;
    name: string;
    logoKey: string | null;
    websiteUrl: string | null;
    tier: SponsorTier;
  }[];
}

export interface PublicCategoryPage extends PublicCategory {
  edition: PublicEditionSummary;
}

export interface WinnersYear extends PublicEditionSummary {
  categories: {
    id: string;
    slug: string;
    nameLo: string;
    isFeatured: boolean;
    winner: PublicCreator;
  }[];
}

export interface PublicProfile extends PublicCreator {
  bioLo: string | null;
  appearances: {
    year: number;
    editionSlug: string;
    categorySlug: string;
    categoryNameLo: string;
    isWinner: boolean;
  }[];
}

/**
 * Three answers, not two (PRD §4.2). A bare null could not tell a visitor who
 * arrived the day after the deadline from one who arrived before anything had
 * opened, and both were told to come back later.
 */
export interface OpenSubmissionForm {
  state: 'open';
  edition: PublicEditionSummary;
  closesAt: string | null;
  categories: {
    id: string;
    slug: string;
    nameLo: string;
    groupLo: string | null;
    descriptionLo: string | null;
  }[];
}

export type SubmissionForm =
  | OpenSubmissionForm
  | { state: 'closed'; edition: PublicEditionSummary; closedAt: string | null }
  | { state: 'never-opened' };
