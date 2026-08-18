'use client';

import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

import { Field, Input, Textarea } from '@/components/ui/field';

/**
 * A list of short records the team owns outright: it writes every field, adds
 * and removes entries, and decides the order. Two lists on /admin/site are this
 * shape — the /about FAQ and the judging steps both pages show — so the parts
 * that are easy to get subtly different (the arrows, the delete, what "add"
 * appends) are settled here once.
 *
 * Order moves one step at a time rather than by dragging, the same as
 * GalleryEditor: the lists are short, and arrows work identically on a phone,
 * from a keyboard and through a screen reader.
 *
 * An entry with a blank field is dropped when saved, because on the page it
 * would be a heading with nothing under it. Each caller says so in its own hint,
 * where the person typing will see it.
 */
export function EntryListEditor<T extends Record<string, string>>({
  items,
  onChange,
  blank,
  fields,
  addLabel,
  entryLabel,
  removeLabel,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  /** What "add" appends — an entry with every field empty. */
  blank: T;
  fields: {
    key: keyof T & string;
    label: string;
    multiline?: boolean;
    placeholder?: string;
    help?: string;
  }[];
  addLabel: string;
  entryLabel: (position: number) => string;
  removeLabel: string;
}) {
  function edit(index: number, key: keyof T & string, value: string) {
    onChange(items.map((item, at) => (at === index ? { ...item, [key]: value } : item)));
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
              <span className="text-[11px] font-semibold text-ink-3">{entryLabel(index + 1)}</span>
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
                aria-label={removeLabel}
                onClick={() => onChange(items.filter((_, at) => at !== index))}
                className="ml-auto text-ink-3 hover:text-stop"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            {fields.map((field) => (
              <Field key={field.key} label={field.label} help={field.help}>
                {field.multiline ? (
                  <Textarea
                    className="min-h-24"
                    placeholder={field.placeholder}
                    value={item[field.key]}
                    onChange={(event) => edit(index, field.key, event.target.value)}
                  />
                ) : (
                  <Input
                    placeholder={field.placeholder}
                    value={item[field.key]}
                    onChange={(event) => edit(index, field.key, event.target.value)}
                  />
                )}
              </Field>
            ))}
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => onChange([...items, { ...blank }])}
        className="mt-3 w-full rounded-[var(--radius-ui-sm)] border-[1.5px] border-dashed border-rule bg-panel-2 py-2.5 text-[12.5px] text-ink-3 hover:border-brand hover:text-ink"
      >
        {addLabel}
      </button>
    </>
  );
}
