import { cn } from '@/lib/utils';

export function Field({
  label,
  hint,
  help,
  error,
  children,
  className,
}: {
  label?: string;
  /** Shown next to the label, for "optional" and the like. */
  hint?: string;
  /** Explains what the value does. Sits under the control. */
  help?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 last:mb-0', className)}>
      {label && (
        <label className="mb-1.5 block text-xs font-semibold text-ink-2">
          {label}
          {hint && <span className="ml-1 font-normal text-ink-3">{hint}</span>}
        </label>
      )}
      {children}
      {/* An error replaces the help text rather than stacking under it. */}
      {error ? (
        <p className="mt-1.5 text-xs text-stop">{error}</p>
      ) : (
        help && <p className="mt-1.5 text-xs text-ink-3">{help}</p>
      )}
    </div>
  );
}

const controlStyles =
  'w-full bg-white border border-rule rounded-[var(--radius-ui-sm)] px-3 py-2 text-[13px] ' +
  'text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-0 ' +
  'focus-visible:outline-brand disabled:bg-panel-2 disabled:text-ink-3';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlStyles, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlStyles, 'min-h-20 resize-y leading-relaxed', className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlStyles, 'cursor-pointer', className)} {...props} />;
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:opacity-45',
        checked ? 'bg-brand-deep' : 'bg-rule',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-[left]',
          checked ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  );
}
