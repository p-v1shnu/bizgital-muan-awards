'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

import { ErrorNote } from '@/components/ui/feedback';
import { imagePublicUrl, uploadImage, type Folder } from '@/components/admin/image-upload';

/**
 * A set of images kept in display order. Two places need one: the homepage
 * gallery the team curates (PRD §6.1.1 §8) and the photos of the night on a
 * year page (§6.1.2 §8) — the only difference is which folder they land in.
 *
 * Order is moved one step at a time rather than by dragging: the list is short,
 * and arrows work the same on a phone, with a keyboard, and through a screen
 * reader without any of the machinery dragging would need.
 */
export function GalleryEditor({
  keys,
  onChange,
  folder,
}: {
  keys: string[];
  onChange: (next: string[]) => void;
  folder: Folder;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    try {
      const uploaded = await Promise.all([...files].map((file) => uploadImage(file, folder)));
      onChange([...keys, ...uploaded]);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= keys.length) return;
    const next = [...keys];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {keys.map((key, index) => (
          <figure key={key} className="overflow-hidden rounded-[var(--radius-ui-sm)] border border-rule">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePublicUrl(key) ?? ''} alt="" className="h-28 w-full bg-panel-2 object-cover" />
            <figcaption className="flex items-center gap-1 bg-panel px-1.5 py-1">
              <button
                type="button"
                aria-label="ຍ້າຍໄປຊ້າຍ"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="text-ink-3 hover:text-ink disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-[11px] text-ink-3">{index + 1}</span>
              <button
                type="button"
                aria-label="ຍ້າຍໄປຂວາ"
                disabled={index === keys.length - 1}
                onClick={() => move(index, 1)}
                className="text-ink-3 hover:text-ink disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
              <button
                type="button"
                aria-label="ເອົາຮູບອອກ"
                onClick={() => onChange(keys.filter((candidate) => candidate !== key))}
                className="ml-auto text-ink-3 hover:text-stop"
              >
                <Trash2 className="size-3.5" />
              </button>
            </figcaption>
          </figure>
        ))}

        <label
          className={`flex h-full min-h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-ui-sm)] border-[1.5px] border-dashed border-rule bg-panel-2 px-3 text-center text-[12.5px] text-ink-3 hover:border-brand ${
            busy ? 'opacity-60' : ''
          }`}
        >
          {busy ? 'ກຳລັງອັບໂຫລດ…' : 'ເພີ່ມຮູບ'}
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
      </div>

      {error != null && (
        <div className="mt-3">
          <ErrorNote error={error} />
        </div>
      )}
    </>
  );
}
