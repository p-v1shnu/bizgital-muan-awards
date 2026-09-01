'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  Clock,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  ListOrdered,
  Star,
  Tag,
  Users,
  UserCog,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useApi } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Only super admins see these. */
  superAdminOnly?: boolean;
  /** Key into /admin/submissions/counts, shown as a pill when non-zero. */
  badgeCount?: 'PENDING';
}

const SECTIONS: { heading?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: '/admin', label: 'ພາບລວມ', icon: LayoutGrid },
      { href: '/admin/editions', label: 'ປີທີ່ຈັດງານ', icon: ListOrdered },
    ],
  },
  {
    heading: 'ຄັງຂໍ້ມູນ',
    items: [
      { href: '/admin/categories', label: 'ຄັງສາຂາ', icon: Tag },
      { href: '/admin/creators', label: 'ຄັງຄຣີເອເຕີ', icon: Users },
      { href: '/admin/judges', label: 'ຄັງກຳມະການ', icon: Star },
      { href: '/admin/sponsor-tiers', label: 'ຄັງຜູ້ສະໜັບສະໜູນ', icon: Heart },
      {
        href: '/admin/submissions',
        label: 'ຄິວລາຍຊື່',
        icon: ClipboardList,
        badgeCount: 'PENDING',
      },
    ],
  },
  {
    heading: 'ຕັ້ງຄ່າ',
    items: [
      { href: '/admin/site', label: 'ເນື້ອຫາເວັບ', icon: ImageIcon },
      { href: '/admin/users', label: 'ຜູ້ໃຊ້ຫຼັງບ້ານ', icon: UserCog, superAdminOnly: true },
      { href: '/admin/audit', label: 'ປະຫວັດການແກ້ໄຂ', icon: Clock, superAdminOnly: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: counts } = useApi<Record<string, number>>('/admin/submissions/counts');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <aside className="hidden w-[236px] shrink-0 flex-col gap-0.5 bg-ink p-3.5 text-[#e8e1d7] md:flex">
      <Link href="/admin" className="flex items-center gap-2.5 px-2 pt-1.5 pb-4">
        <span className="foil size-6.5 shrink-0 rounded-[7px]" />
        <span>
          <span className="block font-serif text-base leading-tight">ມ່ວນອາວອດສ໌</span>
          <span className="block text-[10px] uppercase tracking-[0.16em] text-[#9d9184]">Admin</span>
        </span>
      </Link>

      {SECTIONS.map((section, index) => (
        <div key={section.heading ?? index}>
          {section.heading && (
            <p className="px-2.5 pt-4 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#b4a898]">
              {section.heading}
            </p>
          )}
          {section.items
            .filter((item) => !item.superAdminOnly || isSuperAdmin)
            .map((item) => {
              // Only /admin itself matches exactly; the rest match their subtree.
              const active =
                item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              const pending = item.badgeCount ? (counts?.[item.badgeCount] ?? 0) : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded-[var(--radius-ui-sm)] px-2.5 py-2 text-[13px] leading-tight',
                    active ? 'bg-[#332b26] text-white' : 'text-[#cfc5b8] hover:bg-[#2b2420]',
                  )}
                >
                  {active && <span className="foil absolute left-0 h-[18px] w-[3px] rounded-sm" />}
                  <item.icon className="size-[15px] shrink-0" />
                  {item.label}
                  {pending > 0 && (
                    <span className="ml-auto rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                      {pending}
                    </span>
                  )}
                </Link>
              );
            })}
        </div>
      ))}

      <div className="mt-auto flex items-center gap-2.5 border-t border-[#3a322c] pt-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#4a4038] text-[11px] font-bold">
          {user?.name?.trim().charAt(0) ?? '·'}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12.5px] font-semibold leading-tight">{user?.name}</span>
          <span className="block text-[10.5px] text-[#9d9184]">
            {isSuperAdmin ? 'Super Admin' : 'Admin'}
          </span>
        </span>
        <button
          type="button"
          onClick={() => void logout()}
          className="ml-auto text-[11px] text-[#9d9184] underline-offset-2 hover:text-white hover:underline"
        >
          ອອກ
        </button>
      </div>
    </aside>
  );
}
