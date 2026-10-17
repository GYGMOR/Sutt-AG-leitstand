/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/DetailZeile.tsx                            │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Detailzeile: Icon · Wert · kleines Label darunter (Muster Akte)       │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';
import styles from './DetailZeile.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface DetailZeileProps {
  icon: LucideIcon;
  label: string;
  /** Hauptwert – Text oder eigene Struktur (z. B. Typenschild). */
  wert: ReactNode;
  /** Zusatz unter dem Wert, neben dem Label. */
  zusatz?: ReactNode;
  mono?: boolean;
  /** Knöpfe rechts (Kopieren, Anrufen, SMS …). */
  aktionen?: ReactNode;
  className?: string;
}

export function DetailZeile({ icon: Icon, label, wert, zusatz, mono = false, aktionen, className }: DetailZeileProps) {
  return (
    <div className={cx(styles.zeile, className)}>
      <Icon size={16} strokeWidth={1.5} aria-hidden className={styles.icon} />
      <div className={styles.text}>
        <div className={cx(styles.wert, mono && styles.mono)}>{wert}</div>
        <div className={styles.label}>
          <span>{label}</span>
          {zusatz && <span className={styles.zusatz}>{zusatz}</span>}
        </div>
      </div>
      {aktionen && <div className={styles.aktionen}>{aktionen}</div>}
    </div>
  );
}

/* ◆ jh · eof */
