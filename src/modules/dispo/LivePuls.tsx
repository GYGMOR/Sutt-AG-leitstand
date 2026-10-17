/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/LivePuls.tsx                         │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Live-Puls: Punkt neben dem Namen – vor Ort, unterwegs, überzieht      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { cx, modulKlasse } from '../../core/ui/cx';
import type { Puls } from './store/dispo.selectors';
import styles from './LivePuls.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface LivePulsProps {
  puls: Puls;
  /** Nur Punkt (Avatar-Ecke) oder Punkt + Text. */
  kompakt?: boolean;
}

// jh› Der Mock tickt mit der Echtzeit (useNow, 30 s) – «vor Ort seit 25 min» wächst wirklich.
export function LivePuls({ puls, kompakt = false }: LivePulsProps) {
  return (
    <span className={cx(styles.puls, modulKlasse(styles, puls.art), kompakt && styles.kompakt)} title={puls.text}>
      <span className={styles.punkt} aria-hidden />
      {!kompakt && <span className={styles.text}>{puls.text}</span>}
    </span>
  );
}

/* ◆ jh · eof */
