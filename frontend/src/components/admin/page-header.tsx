import Link from 'next/link';

import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  href?: string;
}

/** The bar across the top of every admin page: where you are, and what you can do here. */
export function PageHeader({
  crumbs,
  status,
  actions,
  className,
}: {
  crumbs: Crumb[];
  /** A phase badge or similar, sitting right after the trail. */
  status?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-center gap-3 border-b border-rule bg-panel px-6 py-3',
        className,
      )}
    >
      <nav aria-label="ເສັ້ນທາງ" className="text-[12.5px] text-ink-3">
        {crumbs.map((crumb, index) => (
          <span key={crumb.label}>
            {index > 0 && <span className="mx-1.5 text-rule">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-ink hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-semibold text-ink">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      {status}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function PageBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex min-w-0 flex-col gap-5 p-6', className)} {...props} />;
}
