'use client';

import { Button } from '@/components/ui/button';
import type { PageMeta } from '@/lib/api/client';

export function Pager({ meta, onChange }: { meta: PageMeta; onChange: (page: number) => void }) {
  if (meta.totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-3 border-t border-rule px-4 py-2.5">
      <p className="text-[11.5px] text-ink-3">
        ໜ້າ {meta.page} ຈາກ {meta.totalPages} · ທັງໝົດ {meta.total}
      </p>
      <div className="ml-auto flex gap-2">
        <Button size="sm" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
          ກ່ອນໜ້າ
        </Button>
        <Button
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onChange(meta.page + 1)}
        >
          ຖັດໄປ
        </Button>
      </div>
    </div>
  );
}
