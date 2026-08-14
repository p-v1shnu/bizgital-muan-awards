import type { Metadata } from 'next';
import { Bodoni_Moda, DM_Sans, Noto_Sans_Lao, Noto_Serif_Lao } from 'next/font/google';

import './globals.css';

/**
 * Four families, two roles (PRD §6.0.2): a serif pair for names and headings,
 * a sans pair for anything a visitor presses, fills in or scans. The Lao faces
 * are loaded alongside the Latin ones so a mixed line keeps one texture.
 */
const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  variable: '--font-bodoni',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const notoSerifLao = Noto_Serif_Lao({
  subsets: ['lao'],
  variable: '--font-noto-serif-lao',
  display: 'swap',
  weight: ['400', '500', '600'],
});

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

export const metadata: Metadata = {
  title: {
    default: 'ມ່ວນ ອະວອດ · Muan Awards',
    template: '%s · ມ່ວນ ອະວອດ',
  },
  description: 'ລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນຄອນເທັນລາວ',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muanawards.com'),
  // Most visitors arrive from a Facebook post (PRD §10), and a share with no
  // picture is a share nobody opens. Pages with their own image — a year, a
  // category, a creator — override this; everything else falls back to the
  // brand card, so no link is ever posted bare.
  openGraph: {
    type: 'website',
    siteName: 'ມ່ວນ ອະວອດ · Muan Awards',
    images: [{ url: '/brand/og-default.png', width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVariables = [
    bodoni.variable,
    notoSerifLao.variable,
    dmSans.variable,
    notoSansLao.variable,
  ].join(' ');

  return (
    <html lang="lo" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
