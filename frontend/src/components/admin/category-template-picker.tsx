'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { Spinner } from '@/components/ui/feedback';
import { Input } from '@/components/ui/field';
import { useApiPage } from '@/lib/api/hooks';
import { useDebounced } from '@/lib/use-debounced';
import type { CategoryTemplate } from '@/types/api';

/**
 * Search the category library to assign one into this edition. Creating a
 * new library entry happens on its own page (/admin/categories), not here —
 * one form for that, not two that can drift apart on which fields it asks
 * for (PRD: a category's slug is picked once and reused, never retyped).
 */
export function CategoryTemplatePicker({
  exclude,
  onPick,
}: {
  /** Template ids already assigned to this edition, greyed out rather than hidden. */
  exclude: Set<string>;
  onPick: (template: CategoryTemplate) => void;
}) {
  const [term, setTerm] = useState('');
  const debounced = useDebounced(term, 250);

  const { data, isFetching } = useApiPage<CategoryTemplate>(
    debounced.trim().length > 0
      ? `/admin/category-templates?perPage=8&q=${encodeURIComponent(debounced.trim())}`
      : null,
  );

  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <Input
          className="pl-9"
          placeholder="ຄົ້ນຫາສາຂາຈາກຄັງ…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
        {isFetching && <Spinner className="absolute right-3 top-1/2 -translate-y-1/2" />}
      </div>

      {debounced.trim() && data && (
        <ul className="mt-2 overflow-hidden rounded-[var(--radius-ui-sm)] border border-rule bg-white">
          {data.data.length === 0 ? (
            <li className="px-3 py-2.5 text-[12.5px] text-ink-3">
              ບໍ່ພົບ “{debounced}” ໃນຄັງ —{' '}
              <Link href="/admin/categories" className="text-brand-deep hover:underline">
                ໄປສ້າງໃນຄັງສາຂາ
              </Link>{' '}
              ກ່ອນແລ້ວກັບມາໃສ່
            </li>
          ) : (
            data.data.map((template) => {
              const already = exclude.has(template.id);
              return (
                <li key={template.id} className="border-b border-hairline last:border-b-0">
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => {
                      onPick(template);
                      setTerm('');
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-panel-2 disabled:opacity-45 disabled:hover:bg-transparent"
                  >
                    <span className="font-serif text-[15px] text-ink">{template.nameLo}</span>
                    <span className="text-[11.5px] text-ink-3">/{template.slug}</span>
                    {already && <span className="ml-auto text-[11px] text-ink-3">ຢູ່ໃນປີນີ້ແລ້ວ</span>}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </>
  );
}
