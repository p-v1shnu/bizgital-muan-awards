import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[var(--radius-box)] border border-rule bg-panel', className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  aside,
  className,
}: {
  title: React.ReactNode;
  /** Sits at the far right — a count, a filter, a small action. */
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 border-b border-rule px-4 py-3', className)}>
      <h3 className="text-[13px] font-bold tracking-wide text-ink">{title}</h3>
      {aside && <div className="ml-auto flex items-center gap-2 text-xs text-ink-3">{aside}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}

/** The pink-purple foil, used as a 3px rule. Decoration only, never behind text. */
export function FoilRule({ className }: { className?: string }) {
  return <div className={cn('foil h-[3px] rounded-sm', className)} />;
}
