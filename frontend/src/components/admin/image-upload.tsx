'use client';

import { useRef, useState } from 'react';
import { Trash2, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ErrorNote, Spinner } from '@/components/ui/feedback';
import { apiFetch } from '@/lib/api/client';
import { cn } from '@/lib/utils';

export type Folder = 'creators' | 'judges' | 'sponsors' | 'editions' | 'site';

interface UploadTicket {
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

export function imagePublicUrl(key: string | null | undefined) {
  if (!key) return null;
  const base = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? '').replace(/\/$/, '');
  return `${base}/${key}`;
}

/**
 * Asks the API for a short-lived signed URL, then PUTs the file straight to
 * object storage — the bytes never pass through the API container.
 */
export async function uploadImage(file: File, folder: Folder) {
  const ticket = await apiFetch<UploadTicket>('/admin/uploads', {
    method: 'POST',
    body: { folder, contentType: file.type, sizeBytes: file.size },
  });

  // The API can hand out a signed URL while storage itself is unreachable —
  // signing is arithmetic and never touches the bucket. With MinIO stopped the
  // browser threw its own "Failed to fetch", which reached the team untranslated
  // and blamed the wrong thing.
  let response: Response;
  try {
    response = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
  } catch {
    throw new Error('ຕິດຕໍ່ບ່ອນເກັບຮູບບໍ່ໄດ້ — ຮູບອື່ນໆໃນເວັບກໍ່ອາດຈະບໍ່ຂຶ້ນຄືກັນ ກະລຸນາແຈ້ງຜູ້ດູແລລະບົບ');
  }
  if (!response.ok) throw new Error(`ອັບໂຫລດຮູບບໍ່ສຳເລັດ (${response.status})`);
  return ticket.key;
}

export function ImageUpload({
  value,
  onChange,
  folder,
  label,
  hint,
  aspect = 'wide',
}: {
  value: string | null;
  onChange: (key: string | null) => void;
  folder: Folder;
  label?: string;
  hint?: string;
  aspect?: 'wide' | 'square';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await uploadImage(file, folder));
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }

  const preview = imagePublicUrl(value);

  return (
    <div>
      {label && <p className="mb-1.5 text-xs font-semibold text-ink-2">{label}</p>}

      {preview ? (
        <div className="flex items-start gap-3">
          {/* Object storage is not a Next.js image host in every environment,
              so this stays a plain img rather than next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className={cn(
              'rounded-[var(--radius-ui-sm)] border border-rule bg-panel-2 object-cover',
              aspect === 'wide' ? 'h-24 w-44' : 'size-20',
            )}
          />
          <div className="flex flex-col gap-2">
            <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              ປ່ຽນຮູບ
            </Button>
            <Button type="button" size="sm" variant="danger" onClick={() => onChange(null)} disabled={busy}>
              <Trash2 className="size-3.5" /> ເອົາອອກ
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={cn(
            'flex w-full flex-col items-center gap-1 rounded-[var(--radius-ui-sm)] border-[1.5px] border-dashed',
            'border-rule bg-panel-2 px-5 py-6 text-center transition-colors hover:border-brand',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            busy && 'opacity-60',
          )}
        >
          {busy ? (
            <Spinner />
          ) : (
            <UploadCloud className="size-5 text-ink-3" />
          )}
          <span className="text-[12.5px] text-ink-3">
            {busy ? 'ກຳລັງອັບໂຫລດ…' : (
              <>
                ລາກຮູບມາວາງ ຫຼື <span className="font-semibold text-brand-deep">ເລືອກໄຟລ໌</span>
              </>
            )}
          </span>
          {hint && <span className="text-[11px] text-ink-3">{hint}</span>}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {error != null && (
        <div className="mt-2">
          <ErrorNote error={error} />
        </div>
      )}
    </div>
  );
}
