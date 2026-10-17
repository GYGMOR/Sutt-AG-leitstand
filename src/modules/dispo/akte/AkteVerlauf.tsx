/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/akte/AkteVerlauf.tsx                 │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Verlauf: angefragt → disponiert → unterwegs → vor Ort → erledigt      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { cx } from '../../../core/ui/cx';
import type { PhasenSchritt } from '../store/dispo.selectors';
import styles from './AkteVerlauf.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface AkteVerlaufProps {
  phasen: readonly PhasenSchritt[];
}

// jh? Phasen so richtig? Evtl. fehlt «offeriert» (Kostenvoranschlag) oder «verrechnet».
export function AkteVerlauf({ phasen }: AkteVerlaufProps) {
  const naechste = phasen.findIndex((schritt) => !schritt.erreicht);
  return (
    <ol className={styles.verlauf}>
      {phasen.map((schritt, index) => (
        <li key={schritt.phase} className={cx(styles.schritt, schritt.erreicht && styles.erreicht, index === naechste && styles.naechster)} aria-current={index === naechste ? 'step' : undefined}>
          <span className={styles.marke} aria-hidden />
          <span className={styles.label}>{schritt.label}</span>
          <span className={styles.zeit}>{schritt.zeit ?? '—'}</span>
          {schritt.detail && <span className={styles.detail}>{schritt.detail}</span>}
        </li>
      ))}
    </ol>
  );
}

/* ◆ jh · eof */
