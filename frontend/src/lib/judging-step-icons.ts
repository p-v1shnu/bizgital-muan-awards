import {
  Award,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Eye,
  FileText,
  Gavel,
  Megaphone,
  Scale,
  Search,
  ShieldCheck,
  Star,
  ThumbsUp,
  Trophy,
  Users,
  Vote,
  type LucideIcon,
} from 'lucide-react';

/**
 * The fixed set of icons a judging step can pick from, mirrored by hand in
 * backend/src/modules/site-settings/dto/site-settings.dto.ts
 * (JUDGING_STEP_ICON_NAMES) — the backend only needs to know these keys are
 * valid, not what they draw, so the lucide-react component lives here alone.
 */
export const JUDGING_STEP_ICONS: Record<string, LucideIcon> = {
  'clipboard-list': ClipboardList,
  megaphone: Megaphone,
  users: Users,
  gavel: Gavel,
  scale: Scale,
  eye: Eye,
  search: Search,
  'check-circle': CheckCircle,
  star: Star,
  award: Award,
  trophy: Trophy,
  calendar: CalendarDays,
  'file-text': FileText,
  vote: Vote,
  'thumbs-up': ThumbsUp,
  'shield-check': ShieldCheck,
};

export const JUDGING_STEP_ICON_NAMES = Object.keys(JUDGING_STEP_ICONS);

/** Looks up a step's preset icon component, or null for an unset/unknown key. */
export function judgingStepIcon(name: string | null | undefined): LucideIcon | null {
  return (name && JUDGING_STEP_ICONS[name]) || null;
}
