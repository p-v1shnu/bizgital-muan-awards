'use client';

import { ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';

import { Field, Input } from '@/components/ui/field';
import { ImageUpload } from '@/components/admin/image-upload';
import { RichTextarea } from '@/components/admin/rich-textarea';
import { JUDGING_STEP_ICON_NAMES, JUDGING_STEP_ICONS } from '@/lib/judging-step-icons';
import { cn } from '@/lib/utils';
import type { JudgingStep } from '@/types/api';

/**
 * The judging-steps list, the one entry in EntryListEditor's shape that grew
 * a field EntryListEditor cannot hold — an icon, either picked from a fixed
 * preset or a team-uploaded PNG — so this is its own editor rather than a
 * generic one, but keeps the same reorder/delete/add chrome so the two lists
 * on this page still feel like one pattern.
 *
 * The two icon fields are mutually exclusive by construction here: picking a
 * preset clears any uploaded key, and uploading a file clears the preset
 * name. Removing an uploaded icon resets to "no icon" rather than restoring
 * whatever preset was picked before it — the alternative is a choice the
 * picker no longer shows selected quietly reappearing on the page.
 */
export function StepsEditor({
  items,
  onChange,
}: {
  items: JudgingStep[];
  onChange: (next: JudgingStep[]) => void;
}) {
  function update(index: number, patch: Partial<JudgingStep>) {
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
        {items.map((item, index) => {
          const usingUpload = Boolean(item.iconImageKey);
          return (
            <li
              key={index}
              className="rounded-[var(--radius-ui-sm)] border border-rule bg-panel-2/40 p-3"
            >
              <div className="mb-2 flex items-center gap-1">
                <span className="text-[11px] font-semibold text-ink-3">ຂັ້ນ {index + 1}</span>
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
                  aria-label="ລຶບຂັ້ນຕອນນີ້"
                  onClick={() => onChange(items.filter((_, at) => at !== index))}
                  className="ml-auto text-ink-3 hover:text-stop"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <Field label="ຊື່ຂັ້ນຕອນ">
                <Input
                  placeholder="ຄັດກອງ"
                  value={item.titleLo}
                  onChange={(event) => update(index, { titleLo: event.target.value })}
                />
              </Field>
              <Field label="ຄຳອະທິບາຍ" help="ສັ້ນໆ 1 ປະໂຫຍກ — ໜ້າຫຼັກວາງເປັນ Card ແຄບ">
                <RichTextarea
                  className="min-h-24"
                  value={item.bodyLo}
                  onChange={(next) => update(index, { bodyLo: next })}
                />
              </Field>

              <p className="mb-1.5 text-xs font-semibold text-ink-2">
                ໄອຄອນ <span className="font-normal text-ink-3">— ບໍ່ບັງຄັບ</span>
              </p>
              <div
                className={cn(
                  'flex flex-wrap gap-1.5',
                  // A preset pick would be invisible while an uploaded icon is
                  // active — that one already wins at render time — so the grid
                  // dims to say so, rather than showing a selection that lies.
                  usingUpload && 'opacity-40',
                )}
              >
                <button
                  type="button"
                  aria-label="ບໍ່ມີໄອຄອນ"
                  aria-pressed={!item.iconName && !usingUpload}
                  disabled={usingUpload}
                  onClick={() => update(index, { iconName: null })}
                  className={cn(
                    'grid size-9 place-items-center rounded-[var(--radius-ui-sm)] border',
                    !item.iconName && !usingUpload
                      ? 'border-brand bg-brand-soft text-brand-deep'
                      : 'border-rule text-ink-3 hover:border-ink-3 hover:text-ink',
                  )}
                >
                  <X className="size-4" />
                </button>
                {JUDGING_STEP_ICON_NAMES.map((name) => {
                  const Icon = JUDGING_STEP_ICONS[name];
                  const selected = item.iconName === name && !usingUpload;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-label={name}
                      aria-pressed={selected}
                      disabled={usingUpload}
                      onClick={() => update(index, { iconName: name })}
                      className={cn(
                        'grid size-9 place-items-center rounded-[var(--radius-ui-sm)] border',
                        selected
                          ? 'border-brand bg-brand-soft text-brand-deep'
                          : 'border-rule text-ink-3 hover:border-ink-3 hover:text-ink',
                      )}
                    >
                      <Icon className="size-4" />
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <ImageUpload
                  label="ຫຼືອັບໂຫລດເປັນຮູບ PNG ຂອງທ່ານເອງ"
                  hint="PNG, ພື້ນຫຼັງໂປ່ງໃສ, ສີ່ຫຼ່ຽມຈັດຕຸລັດ — ຊະນະໄອຄອນທີ່ເລືອກໄວ້ຂ້າງເທິງ"
                  aspect="square"
                  accept="image/png"
                  folder="site"
                  value={item.iconImageKey ?? null}
                  onChange={(key) => update(index, { iconImageKey: key, iconName: key ? null : item.iconName })}
                />
              </div>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() =>
          onChange([...items, { titleLo: '', bodyLo: '', iconName: null, iconImageKey: null }])
        }
        className="mt-3 w-full rounded-[var(--radius-ui-sm)] border-[1.5px] border-dashed border-rule bg-panel-2 py-2.5 text-[12.5px] text-ink-3 hover:border-brand hover:text-ink"
      >
        ເພີ່ມຂັ້ນຕອນ
      </button>
    </>
  );
}
