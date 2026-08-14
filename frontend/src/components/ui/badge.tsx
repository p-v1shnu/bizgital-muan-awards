import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import type { EditionPhase } from '@/types/api';

const badgeStyles = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide',
  {
    variants: {
      tone: {
        neutral: 'bg-panel-2 text-ink-3 border-rule',
        brand: 'bg-brand-soft text-brand-deep border-brand-edge',
        ok: 'bg-ok-soft text-ok border-[#bcd6c6]',
        warn: 'bg-warn-soft text-warn border-[#e2cfa8]',
        stop: 'bg-stop-soft text-stop border-[#e4c1b7]',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

interface BadgeProps extends VariantProps<typeof badgeStyles> {
  children: React.ReactNode;
  /** A small filled circle before the label, for live/off states. */
  dot?: boolean;
  className?: string;
}

export function Badge({ tone, dot, children, className }: BadgeProps) {
  return (
    <span className={cn(badgeStyles({ tone }), className)}>
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const PHASE_LABEL: Record<EditionPhase, string> = {
  DRAFT: 'ຮ່າງ',
  PUBLISHED: 'ເຜີຍແຜ່ແລ້ວ',
  NOMINEES_ANNOUNCED: 'ປະກາດນອມິນີແລ້ວ',
  WINNERS_ANNOUNCED: 'ປະກາດຜູ້ຊະນະແລ້ວ',
};

const PHASE_TONE: Record<EditionPhase, 'neutral' | 'brand' | 'ok'> = {
  DRAFT: 'neutral',
  PUBLISHED: 'brand',
  NOMINEES_ANNOUNCED: 'brand',
  WINNERS_ANNOUNCED: 'ok',
};

export function PhaseBadge({ phase }: { phase: EditionPhase }) {
  return (
    <Badge tone={PHASE_TONE[phase]} dot>
      {PHASE_LABEL[phase]}
    </Badge>
  );
}
