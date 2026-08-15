import Link from 'next/link';
import type { Metadata } from 'next';
import { Facebook, Instagram, Youtube } from 'lucide-react';

import { Avatar, Section } from '@/components/site/primitives';
import { NOT_FOUND_TITLE } from '@/components/site/not-found-body';
import { safeHttpUrl } from '@/lib/utils';
import { getPublic, getPublicOrNotFound, tryGetPublic } from '@/lib/api/server';
import { JsonLd, creatorJsonLd } from '@/lib/structured-data';
import { imageUrl } from '@/lib/images';
import type { PublicProfile } from '@/types/public';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await tryGetPublic<PublicProfile>(`/creators/${slug}`);
  // The 404 page's title, not a wording of its own — see the year page.
  if (!profile) return { title: NOT_FOUND_TITLE };

  return {
    title: profile.nameLo,
    description: profile.bioLo ?? undefined,
    alternates: { canonical: `/creators/${profile.slug}` },
    openGraph: {
      title: profile.nameLo,
      images: imageUrl(profile.avatarKey) ? [imageUrl(profile.avatarKey) as string] : undefined,
    },
  };
}

const SOCIAL_ICON = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
} as const;

/**
 * The history here is assembled from nominations, so it is right by
 * construction — nobody maintains a per-creator page. Years that have not
 * announced yet are filtered out server-side, so a profile cannot reveal
 * that someone is in the running.
 */
export default async function CreatorPage({ params }: PageProps) {
  const { slug } = await params;
  const profile = await getPublicOrNotFound<PublicProfile>(`/creators/${slug}`);

  const wins = profile.appearances.filter((appearance) => appearance.isWinner).length;
  // Anything that is not a web address is dropped rather than linked.
  const socials = Object.entries(profile.socialLinks ?? {}).flatMap(([platform, url]) => {
    const safe = safeHttpUrl(url);
    return safe ? [[platform, safe] as const] : [];
  });

  return (
    <Section>
      <JsonLd
        data={creatorJsonLd({
          nameLo: profile.nameLo,
          nameEn: profile.nameEn,
          slug: profile.slug,
          bioLo: profile.bioLo,
          avatarUrl: imageUrl(profile.avatarKey),
          appearances: profile.appearances,
        })}
      />
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Avatar creator={profile} size="lg" />
        <div className="min-w-0">
          <h1 className="font-serif text-4xl leading-tight text-ink">{profile.nameLo}</h1>
          {profile.nameEn && <p className="mt-1 text-[14px] text-ink-3">{profile.nameEn}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-2">
            <span>
              ເຂົ້າຊິງ {profile.appearances.length} ຄັ້ງ
              {wins > 0 && <> · ຊະນະ {wins} ລາງວັນ</>}
            </span>
            {socials.length > 0 && (
              <span className="flex items-center gap-1.5">
                {socials.map(([platform, url]) => {
                  const Icon = SOCIAL_ICON[platform as keyof typeof SOCIAL_ICON];
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={platform}
                      className="grid size-8 place-items-center rounded-full border border-rule text-ink-2 hover:border-brand hover:text-brand-deep"
                    >
                      {Icon ? <Icon className="size-4" /> : platform.charAt(0).toUpperCase()}
                    </a>
                  );
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {profile.bioLo && (
        <p className="mt-8 max-w-2xl text-[15px] leading-[1.85] text-ink-2">{profile.bioLo}</p>
      )}

      <h2 className="mt-12 text-[10.5px] font-bold uppercase tracking-[0.22em] text-ink-3">
        ປະຫວັດການເຂົ້າຊິງ
      </h2>

      {profile.appearances.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius-box)] border border-rule bg-panel px-6 py-10 text-center text-[14px] text-ink-2">
          ຍັງບໍ່ມີປະຫວັດທີ່ປະກາດແລ້ວ
        </p>
      ) : (
        <ol className="mt-4 overflow-hidden rounded-[var(--radius-box)] border border-rule bg-panel">
          {profile.appearances.map((appearance) => (
            <li
              key={`${appearance.editionSlug}-${appearance.categorySlug}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline px-5 py-4 last:border-b-0"
            >
              <span className="font-serif text-2xl text-ink">{appearance.year}</span>
              <Link
                href={`/awards/${appearance.editionSlug}/${appearance.categorySlug}`}
                className="text-[14px] text-ink-2 hover:text-ink hover:underline"
              >
                {appearance.categoryNameLo}
              </Link>
              {appearance.isWinner ? (
                <span className="ml-auto rounded-full border border-brand-edge bg-brand-soft px-2.5 py-0.5 text-[10.5px] font-bold text-brand-deep">
                  ຜູ້ຊະນະ
                </span>
              ) : (
                <span className="ml-auto text-[11.5px] text-ink-3">ນອມິນີ</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
