import type { Metadata } from 'next';
import { DM_Sans, Noto_Sans_Lao, Noto_Sans_Lao_Looped } from 'next/font/google';

import './globals.css';

/**
 * Three families, two roles (PRD §6.0.2): DM Sans carries both names/headings
 * and anything a visitor presses, fills in or scans — the team dropped the
 * separate serif (Bodoni Moda) once it clashed against the Lao faces beside
 * it, and one Latin face reading as one texture next to Lao text was the
 * whole point. The Lao faces are loaded alongside the Latin ones so a mixed
 * line keeps one texture.
 *
 * Lao never falls back to a serif face — the team asked for the loop-free
 * "Sans Lao" on headings and the friendlier "Sans Lao Looped" on body copy
 * instead, so Noto Serif Lao is gone entirely too.
 */
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const notoSansLao = Noto_Sans_Lao({
  subsets: ['lao'],
  variable: '--font-noto-sans-lao',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const notoSansLaoLooped = Noto_Sans_Lao_Looped({
  subsets: ['lao'],
  variable: '--font-noto-sans-lao-looped',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'ມ່ວນອາວອດສ໌ · Muan Awards',
    template: '%s · ມ່ວນອາວອດສ໌',
  },
  description: 'ລາງວັນປະຈຳປີສຳລັບຄຣີເອເຕີ ແລະ ຜູ້ສ້າງສັນເນື້ອຫາ',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muanawards.com'),
  // Most visitors arrive from a Facebook post (PRD §10), and a share with no
  // picture is a share nobody opens. Pages with their own image — a year, a
  // category, a creator — override this; everything else falls back to the
  // brand card, so no link is ever posted bare.
  openGraph: {
    type: 'website',
    siteName: 'ມ່ວນອາວອດສ໌ · Muan Awards',
    images: [{ url: '/brand/og-default.png', width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVariables = [dmSans.variable, notoSansLao.variable, notoSansLaoLooped.variable].join(' ');

  return (
    <html lang="lo" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
