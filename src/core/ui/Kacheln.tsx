/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Kacheln.tsx                                │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Zählkacheln als Filter: Zahl, Label, Ton – eine Reihe, ein Klick      │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';
import styles from './Kacheln.module.css';

// ── §1 · Typen ───────────────────────────────────────────────────

export type KachelTon = 'neutral' | 'signal' | 'ok' | 'danger' | 'mute';

export interface Kachel {
  id: string;
  label: string;
  zahl: number | string;
  /** Färbt die Zahl – Signal für «hier liegt Arbeit», Danger für «überfällig». */
  ton?: KachelTon;
  hinweis?: string;
  icon?: LucideIcon;
}

interface KachelnProps {
  kacheln: readonly Kachel[];
  /** Aktive Kachel (Filter); fehlt sie, sind die Kacheln reine Sprungmarken. */
  aktiv?: string | null;
  onWahl: (id: string) => void;
  label: string;
  /** Grosse Kacheln für das Dashboard. */
  gross?: boolean;
  className?: string;
}

// ── §2 · Komponente ──────────────────────────────────────────────

// jh› Die Zahl ist der Filter: wer «13 fehlend» liest, klickt auf die 13 – kein zweites
//     Bedienelement, kein Dropdown. Dasselbe Muster in Rapporte, Aufträge, Kunden, Lager.
export function Kacheln({ kacheln, aktiv, onWahl, label, gross = false, className }: KachelnProps) {
  const filter = aktiv !== undefined;
  return (
    <div className={cx(styles.kacheln, gross && styles.gross, className)} role={filter ? 'tablist' : 'group'} aria-label={label}>
      {kacheln.map((kachel) => {
        const Icon = kachel.icon;
        const istAktiv = filter && aktiv === kachel.id;
        return (
          <button
            key={kachel.id}
            type="button"
            role={filter ? 'tab' : undefined}
            aria-selected={filter ? istAktiv : undefined}
            className={cx(styles.kachel, istAktiv && styles.aktiv, kachel.ton && kachel.ton !== 'neutral' && styles[kachel.ton])}
            title={kachel.hinweis}
            onClick={() => onWahl(kachel.id)}
          >
            <span className={styles.zahl}>
              {Icon && <Icon size={gross ? 20 : 16} strokeWidth={1.5} aria-hidden className={styles.icon} />}
              {kachel.zahl}
            </span>
            <span className={styles.label}>{kachel.label}</span>
            {gross && kachel.hinweis && <span className={styles.hinweis}>{kachel.hinweis}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ◆ jh · eof */
