/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Chip.tsx                                   │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Chip: Kategorie (getönt), Status, Hinweis, Schloss                    │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';
import styles from './Chip.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

export type ChipTone = 'neutral' | 'tint' | 'signal' | 'danger' | 'ok' | 'mute';

interface ChipProps {
  children: ReactNode;
  icon?: LucideIcon;
  /** `tint` nutzt --sl-tint/--sl-edge einer Farbklasse im className. */
  tone?: ChipTone;
  size?: 'sm' | 'md';
  title?: string;
  className?: string;
}

export function Chip({ children, icon: Icon, tone = 'neutral', size = 'sm', title, className }: ChipProps) {
  return (
    <span className={cx(styles.chip, styles[tone], styles[size], className)} title={title}>
      {Icon && <Icon size={16} strokeWidth={1.5} aria-hidden />}
      <span className={styles.text}>{children}</span>
    </span>
  );
}

/* ◆ jh · eof */
