/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Avatar.tsx                                 │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Techniker-Avatar: Kürzel im Farbkreis, optional mit Live-Puls         │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { ReactNode } from 'react';
import { fullName } from '../domain/stammdaten';
import type { Techniker } from '../domain/stammdaten';
import { cx } from './cx';
import { technikerKlasse } from './farben';
import styles from './Avatar.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface AvatarProps {
  techniker: Techniker;
  size?: 'sm' | 'md' | 'lg';
  /** Statuspunkt unten rechts (Live-Puls). */
  puls?: ReactNode;
  className?: string;
}

export function Avatar({ techniker, size = 'md', puls, className }: AvatarProps) {
  return (
    <span className={cx(styles.avatar, styles[size], technikerKlasse(techniker.farbe), className)} title={fullName(techniker)}>
      <span className={styles.kuerzel}>{techniker.kuerzel}</span>
      {puls}
    </span>
  );
}

/* ◆ jh · eof */
