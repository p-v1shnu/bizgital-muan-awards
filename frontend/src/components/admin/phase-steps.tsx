import { Check, Circle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { EditionPhase } from '@/types/api';

export const PHASE_ORDER: EditionPhase[] = [
  'DRAFT',
  'PUBLISHED',
  'NOMINEES_ANNOUNCED',
  'WINNERS_ANNOUNCED',
];

const STEP_TEXT: Record<EditionPhase, { title: string; blurb: string }> = {
  DRAFT: { title: 'ຮ່າງ', blurb: 'ຄົນນອກຍັງບໍ່ເຫັນ' },
  PUBLISHED: { title: 'ເຜີຍແຜ່', blurb: 'ໜ້າປີເປີດໃຫ້ເຫັນ' },
  NOMINEES_ANNOUNCED: { title: 'ປະກາດນອມິນີ', blurb: 'ລາຍຊື່ຂຶ້ນໜ້າສາຂາ' },
  WINNERS_ANNOUNCED: { title: 'ປະກາດຜູ້ຊະນະ', blurb: 'ຜູ້ຊະນະຂຶ້ນທຳນຽບ' },
};

/**
 * The four phases as a ladder. Drawn left to right because the move is
 * one-way once an edition has left DRAFT — there is no step back to show.
 */
export function PhaseSteps({ current }: { current: EditionPhase }) {
  const index = PHASE_ORDER.indexOf(current);

  return (
    <ol className="flex overflow-hidden rounded-[var(--radius-ui-sm)] border border-rule bg-panel-2">
      {PHASE_ORDER.map((phase, position) => {
        const done = position < index;
        const now = position === index;

        return (
          <li
            key={phase}
            aria-current={now ? 'step' : undefined}
            className={cn(
              'min-w-0 flex-1 border-r border-rule px-3 py-2 last:border-r-0',
              done && 'bg-panel',
              now && 'bg-white shadow-[inset_0_-3px_0_var(--color-brand)]',
              // A step still to come used to be faded with opacity, which took
              // its text down to 2:1 against the panel — readable to whoever
              // designed it and to nobody else. It reads as "later" from the
              // words and the dotted rule instead.
              !done && !now && 'border-dashed bg-panel-2/60',
            )}
          >
            <p
              className={cn(
                'flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em]',
                done && 'text-ok',
                now && 'text-brand-deep',
                !done && !now && 'text-ink-3',
              )}
            >
              {done && <Check className="size-3" />}
              {now && <Circle className="size-3 fill-current" />}
              {done ? 'ຜ່ານແລ້ວ' : now ? 'ຢູ່ບ່ອນນີ້' : 'ຕໍ່ໄປ'}
            </p>
            <p className={cn('mt-0.5 truncate text-[12.5px]', now ? 'font-semibold text-ink' : 'text-ink-2')}>
              {STEP_TEXT[phase].title}
              <span className="hidden text-ink-3 lg:inline"> · {STEP_TEXT[phase].blurb}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
