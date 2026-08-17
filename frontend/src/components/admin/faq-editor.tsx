'use client';

import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

import { Field, Input, Textarea } from '@/components/ui/field';
import type { FaqItem } from '@/types/api';

/**
 * The /about FAQ: the team writes the questions as well as the answers, adds and
 * removes entries, and decides the order.
 *
 * Order moves one step at a time rather than by dragging, the same as
 * GalleryEditor — the list is short, and arrows work identically on a phone,
 * from a keyboard and through a screen reader.
 *
 * An entry with a question but no answer is dropped when saved, because on the
 * page it would be a heading that opens onto nothing. The hint says so where the
 * person typing will see it rather than leaving them to find out.
 */
export function FaqEditor({
  items,
  onChange,
}: {
  items: FaqItem[];
  onChange: (next: FaqItem[]) => void;
}) {
  function edit(index: number, patch: Partial<FaqItem>) {
    onChange(items.map((item, at) => (at === index ? { ...item, ...patch } : item)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <>
      <ol className="space-y-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="rounded-[var(--radius-ui-sm)] border border-rule bg-panel-2/40 p-3"
          >
            <div className="mb-2 flex items-center gap-1">
              <span className="text-[11px] font-semibold text-ink-3">ຂໍ້ {index + 1}</span>
              <button
                type="button"
                aria-label="ຍ້າຍຂຶ້ນ"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="ml-2 text-ink-3 hover:text-ink disabled:opacity-30"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                aria-label="ຍ້າຍລົງ"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
                className="text-ink-3 hover:text-ink disabled:opacity-30"
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                aria-label="ລຶບຄຳຖາມນີ້"
                onClick={() => onChange(items.filter((_, at) => at !== index))}
                className="ml-auto text-ink-3 hover:text-stop"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            <Field label="ຄຳຖາມ">
              <Input
                value={item.questionLo}
                placeholder="ຄຸນສົມບັດຂອງຜູ້ເຂົ້າຊິງມີຫຍັງແດ່?"
                onChange={(event) => edit(index, { questionLo: event.target.value })}
              />
            </Field>
            <Field label="ຄຳຕອບ" help="ແຍກແຕ່ລະຫຍໍ້ໜ້າດ້ວຍການຂຶ້ນແຖວໃໝ່">
              <Textarea
                className="min-h-24"
                value={item.answerLo}
                onChange={(event) => edit(index, { answerLo: event.target.value })}
              />
            </Field>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => onChange([...items, { questionLo: '', answerLo: '' }])}
        className="mt-3 w-full rounded-[var(--radius-ui-sm)] border-[1.5px] border-dashed border-rule bg-panel-2 py-2.5 text-[12.5px] text-ink-3 hover:border-brand hover:text-ink"
      >
        ເພີ່ມຄຳຖາມ
      </button>
    </>
  );
}
