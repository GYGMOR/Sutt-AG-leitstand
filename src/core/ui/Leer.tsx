/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Leer.tsx                                   │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Leerzustand: Icon, Titel, Satz, optional ein Knopf                    │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';
import styles from './Leer.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface LeerProps {
  icon?: LucideIcon;
  titel: string;
  text?: string;
  children?: ReactNode;
  /** Füllt die Höhe des Elternelements (Dossier ohne Auswahl). */
  fuellend?: boolean;
}

export function Leer({ icon: Icon, titel, text, children, fuellend = false }: LeerProps) {
  return (
    <div className={cx(styles.leer, fuellend && styles.fuellend)}>
      {Icon && <Icon size={24} strokeWidth={1.5} aria-hidden className={styles.icon} />}
      <p className={styles.titel}>{titel}</p>
      {text && <p className={styles.text}>{text}</p>}
      {children}
    </div>
  );
}

/* ◆ jh · eof */
