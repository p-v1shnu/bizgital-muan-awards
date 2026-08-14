import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * Built against the locked tokens rather than pulled from shadcn: shadcn ships
 * its own `--background`/`--foreground` scale, and running two token systems
 * side by side would make it unclear which one a colour came from.
 */
export const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 font-medium leading-tight whitespace-nowrap ' +
    'border transition-colors disabled:opacity-45 disabled:pointer-events-none ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
  {
    variants: {
      variant: {
        primary: 'bg-brand-deep text-white border-transparent hover:bg-brand',
        quiet: 'bg-panel text-ink-2 border-rule hover:bg-panel-2 hover:text-ink',
        ghost: 'bg-transparent text-ink-2 border-transparent hover:bg-panel-2 hover:text-ink',
        danger: 'bg-transparent text-stop border-rule hover:bg-stop-soft hover:border-stop',
      },
      size: {
        md: 'text-[13px] px-4 py-2.5 rounded-[var(--radius-ui)]',
        sm: 'text-xs px-3 py-1.5 rounded-[var(--radius-ui-sm)]',
      },
    },
    defaultVariants: { variant: 'quiet', size: 'md' },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & VariantProps<typeof buttonStyles>;

export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
