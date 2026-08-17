'use client';

import { useRef, useState } from 'react';
import { Trash2, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ErrorNote, Spinner } from '@/components/ui/feedback';
import { getAccessToken, refreshAccessToken } from '@/lib/api/client';
import { cn } from '@/lib/utils';

export type Folder = 'creators' | 'judges' | 'sponsors' | 'editions' | 'site';

interface UploadResult {
  key: string;
  publicUrl: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export function imagePublicUrl(key: string | null | undefined) {
  if (!key) return null;
  const base = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? '').replace(/\/$/, '');
  return `${base}/${key}`;
}

/**
 * Sends the file itself to the API, which writes it to storage.
 *
 * The first design had the browser PUT straight to a signed URL, bytes never
 * touching this container. That cannot make the file readable afterward:
 * DigitalOcean Spaces drops the ACL grant a signed URL carries in its query
 * string when the signing key is scoped to one bucket, even though that same
 * key grants the identical ACL when it makes the write itself — the two
 * authentication styles are evidently not treated alike here, confirmed
 * against the real bucket rather than assumed. Only the API can make that
 * second kind of request, so the file goes through it.
 */
export async function uploadImage(file: File, folder: Folder) {
  const body = new FormData();
  body.append('file', file);
  body.append('folder', folder);

  const send = () =>
    fetch(`${API_BASE}/admin/uploads`, {
      method: 'POST',
      body,
      headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : undefined,
      credentials: 'include',
    });

  // The API can be unreachable while nothing in the form itself is wrong —
  // signing used to be arithmetic that never touched the bucket, and now the
  // request never even leaves the browser. Either way the fetch itself throws,
  // which reached the team as an untranslated "Failed to fetch" before this.
  let response: Response;
  try {
    response = await send();
    if (response.status === 401 && (await refreshAccessToken())) {
      response = await send();
    }
  } catch {
    // English, like the other back-office failures: the team reads it, it
    // appears only when something is broken, and an unreviewable Lao sentence
    // helps nobody. What a visitor sees stays in Lao.
    throw new Error(
      'Could not reach image storage. Pictures elsewhere on the site may be missing too — tell whoever runs the server.',
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? `Upload was refused (HTTP ${response.status}).`);
  }
  return (payload?.data as UploadResult).key;
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
