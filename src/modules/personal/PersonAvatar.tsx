/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/personal/PersonAvatar.tsx                  │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Avatar und Zelle für Mitarbeitende – Techniker farbig, Büro neutral   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { FUNKTION_LABEL, mitarbeiterName } from '../../core/domain/personal';
import type { Mitarbeiter } from '../../core/domain/personal';
import type { Techniker } from '../../core/domain/stammdaten';
import { Avatar } from '../../core/ui/Avatar';
import { cx } from '../../core/ui/cx';
import styles from './Personal.module.css';

// ── §1 · Avatar ──────────────────────────────────────────────────

interface PersonAvatarProps {
  mitarbeiter: Mitarbeiter;
  techniker?: Techniker | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// jh› Techniker behalten ihre Planfarbe – Büro und Leitung tragen Anthrazit, damit die Farben im Plan eindeutig bleiben.
export function PersonAvatar({ mitarbeiter, techniker, size = 'md', className }: PersonAvatarProps) {
  if (techniker) return <Avatar techniker={techniker} size={size} className={className} />;
  return (
    <span className={cx(styles.avatar, styles[size], className)} title={mitarbeiterName(mitarbeiter)}>
      {mitarbeiter.kuerzel}
    </span>
  );
}

// ── §2 · Zelle ───────────────────────────────────────────────────

interface PersonZelleProps {
  mitarbeiter: Mitarbeiter;
  techniker?: Techniker | undefined;
  /** Zweite Zeile – Standard ist die Funktion. */
  meta?: string;
}

export function PersonZelle({ mitarbeiter, techniker, meta }: PersonZelleProps) {
  return (
    <span className={styles.personZelle}>
      <PersonAvatar mitarbeiter={mitarbeiter} techniker={techniker} size="sm" />
      <span className={styles.personText}>
        <span className={styles.personName}>{mitarbeiterName(mitarbeiter)}</span>
        <span className={styles.personMeta}>{meta ?? FUNKTION_LABEL[mitarbeiter.funktion]}</span>
      </span>
    </span>
  );
}

/* ◆ jh · eof */
