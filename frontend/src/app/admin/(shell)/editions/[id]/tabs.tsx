'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';

export type EditionTab = 'details' | 'categories' | 'nominees' | 'judges' | 'sponsors';

const TABS: { key: EditionTab; label: string }[] = [
  { key: 'details', label: 'ຂໍ້ມູນງານ' },
  { key: 'categories', label: 'ສາຂາ' },
  { key: 'nominees', label: 'ຜູ້ເຂົ້າຊີງ' },
  { key: 'judges', label: 'ກຳມະການ' },
  { key: 'sponsors', label: 'ຜູ້ສະໜັບສະໜູນ' },
];

/**
 * The tab lives in the query string so a link from the dashboard can point
 * straight at the one that needs work, and a reload keeps the reader in place.
 */
export function EditionTabs({ counts }: { counts: Partial<Record<EditionTab, number>> }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = (params.get('tab') as EditionTab | null) ?? 'details';

  return (
    <div className="flex gap-0.5 overflow-x-auto border-b border-rule bg-panel px-6">
      {TABS.map((tab) => {
        const on = tab.key === active;
        const count = counts[tab.key];

        return (
          <Link
            key={tab.key}
            href={tab.key === 'details' ? pathname : `${pathname}?tab=${tab.key}`}
            aria-current={on ? 'page' : undefined}
            className={cn(
              '-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-[2.5px] px-3.5 py-2.5 text-[13px] font-semibold',
              on ? 'border-brand text-ink' : 'border-transparent text-ink-3 hover:text-ink-2',
            )}
          >
            {tab.label}
            {count !== undefined && (
              <span
                className={cn(
                  'rounded-full border px-1.5 text-[10.5px] font-bold',
                  on ? 'border-brand-edge bg-brand-soft text-brand-deep' : 'border-rule bg-panel-2 text-ink-3',
                )}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
