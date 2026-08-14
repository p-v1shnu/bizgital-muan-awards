/** Mirrors prisma/schema.prisma. Keep the two in step by hand until M2. */

export type EditionPhase = 'DRAFT' | 'PUBLISHED' | 'NOMINEES_ANNOUNCED' | 'WINNERS_ANNOUNCED';
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

export interface Edition {
  id: string;
  year: number;
  slug: string;
  titleLo: string;
  titleEn: string | null;
  descriptionLo: string | null;
  phase: EditionPhase;
  submissionsOpen: boolean;
  submissionsCloseAt: string | null;
  eventDate: string | null;
  venueLo: string | null;
  heroImageKey: string | null;
  ticketUrl: string | null;
  voteUrl: string | null;
}

export interface Category {
  id: string;
  editionId: string;
  slug: string;
  nameLo: string;
  nameEn: string | null;
  groupLo: string | null;
  sortOrder: number;
  isFeatured: boolean;
}

export interface Creator {
  id: string;
  slug: string;
  nameLo: string;
  nameEn: string | null;
  avatarKey: string | null;
  socialLinks: Record<string, string> | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}
