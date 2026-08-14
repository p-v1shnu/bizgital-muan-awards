'use client';

import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api/client';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="ກຳລັງໂຫລດ"
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-rule border-t-brand-deep',
        className,
      )}
    />
  );
}

export function LoadingBlock({ label = 'ກຳລັງໂຫລດ…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 p-10 text-[13px] text-ink-3">
      <Spinner />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-[15px] text-ink">{title}</p>
      {description && <p className="max-w-sm text-[13px] text-ink-3">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * Shows what the server actually said. `details` carries the per-field
 * validation messages, which are usually the useful part.
 */
export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  const details = error instanceof ApiError && Array.isArray(error.details) ? error.details : null;

  return (
    <div
      role="alert"
      className="rounded-[var(--radius-ui-sm)] border border-[#e4c1b7] bg-stop-soft px-3 py-2 text-[13px] text-stop"
    >
      {message}
      {details && (
        <ul className="mt-1 list-inside list-disc text-xs opacity-90">
          {details.map((detail) => (
            <li key={String(detail)}>{String(detail)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Note({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'brand';
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        'rounded-[var(--radius-ui-sm)] border px-3 py-2.5 text-xs leading-relaxed',
        tone === 'brand'
          ? 'border-brand-edge bg-brand-soft text-ink-2'
          : 'border-rule bg-panel-2 text-ink-3',
      )}
    >
      {children}
    </p>
  );
}
