'use client';

import { useEffect, useRef } from 'react';

import { Button } from './button';
import { cn } from '@/lib/utils';

/**
 * Built on <dialog>, so focus trapping, Escape and the backdrop come from the
 * platform instead of being re-implemented.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100vw-2rem)] rounded-[var(--radius-box)] border border-rule bg-panel p-0',
        'text-ink backdrop:bg-ink/35',
        width === 'lg' ? 'max-w-2xl' : 'max-w-md',
      )}
    >
      <div className="border-b border-rule px-5 py-4">
        <h2 className="font-serif text-xl">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-ink-3">{description}</p>}
      </div>

      {children && <div className="px-5 py-4">{children}</div>}

      <div className="flex justify-end gap-2 border-t border-rule px-5 py-3">
        {footer ?? (
          <Button type="button" onClick={onClose}>
            ປິດ
          </Button>
        )}
      </div>
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'ຢືນຢັນ',
  pending,
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  pending?: boolean;
  danger?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={pending}>
            ຍົກເລີກ
          </Button>
          <Button
            type="button"
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'ກຳລັງດຳເນີນການ…' : confirmLabel}
          </Button>
        </>
      }
    />
  );
}
