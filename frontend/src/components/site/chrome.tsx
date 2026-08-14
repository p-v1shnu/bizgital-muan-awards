import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getPublic } from '@/lib/api/server';
import type { Edition, SiteSettings } from '@/types/api';

/**
 * The nav is deliberately year-free except for one label: the awards link
 * carries the latest year so a visitor knows the site is current, but nothing
 * else on the chrome goes stale if a year passes untouched (PRD §6.1.1).
 */
export async function SiteHeader() {
  const [latest, openEdition] = await Promise.all([
    getPublic<Edition>('/editions/latest'),
    getPublic<Edition | null>('/editions/accepting-submissions'),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-rule/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="foil size-7 rounded-lg" aria-hidden />
          <span className="font-serif text-lg leading-none text-ink">ມ່ວນ ອະວອດ</span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 text-[13px]">
          <NavLink href={latest ? `/awards/${latest.slug}` : '/awards/latest'}>
            ງານປີ {latest?.year ?? ''}
          </NavLink>
          <NavLink href="/winners">ທຳນຽບຜູ້ຊະນະ</NavLink>
          <NavLink href="/about" className="hidden sm:inline-flex">
            ກ່ຽວກັບງານ
          </NavLink>

          {/* Only shown while the form is genuinely open (PRD §4.2). */}
          {openEdition && (
            <Link
              href="/submit"
              className="ml-2 rounded-[var(--radius-btn)] bg-brand-deep px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand"
            >
              ສົ່ງລາຍຊື່
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-[var(--radius-sm)] px-3 py-2 text-ink-2 hover:bg-panel-2 hover:text-ink',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export async function SiteFooter() {
  const site = await getPublic<SiteSettings>('/site');

  return (
    <footer className="mt-24 bg-ink text-[#e8e1d7]">
      <div className="foil h-[3px]" aria-hidden />
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="foil size-7 rounded-lg" aria-hidden />
              <span className="font-serif text-xl">ມ່ວນ ອະວອດ</span>
            </div>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-[#a89c8e]">
              {site?.brandStatementLo || 'ລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນຄອນເທັນລາວ'}
            </p>
          </div>

          <FooterColumn
            title="ລາງວັນ"
            links={[
              { href: '/awards/latest', label: 'ງານປີລ່າສຸດ' },
              { href: '/winners', label: 'ທຳນຽບຜູ້ຊະນະ' },
              { href: '/submit', label: 'ສົ່ງລາຍຊື່' },
            ]}
          />
          <FooterColumn
            title="ກ່ຽວກັບ"
            links={[
              { href: '/about', label: 'ກ່ຽວກັບງານ' },
              { href: '/about#judging', label: 'ວິທີການຕັດສິນ' },
              { href: '/about#faq', label: 'ຄຳຖາມທີ່ພົບເລື້ອຍ' },
            ]}
          />
          <FooterColumn
            title="ຕິດຕໍ່"
            links={[
              { href: '/about#contact', label: 'ຕິດຕໍ່ທີມງານ' },
              { href: '/about#sponsor', label: 'ຮ່ວມເປັນສະປອນເຊີ' },
            ]}
          />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#3a322c] pt-6 text-[11.5px] text-[#8a7f72]">
          <span>© {new Date().getFullYear()} Muan Awards</span>
          <span>ນະຄອນຫຼວງວຽງຈັນ, ສປປ ລາວ</span>
          <a href="#top" className="ml-auto inline-flex items-center gap-1 hover:text-white">
            ຂຶ້ນເທິງສຸດ <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a7f72]">{title}</p>
      <ul className="mt-3 space-y-2 text-[13px]">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-[#cfc5b8] hover:text-white hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
