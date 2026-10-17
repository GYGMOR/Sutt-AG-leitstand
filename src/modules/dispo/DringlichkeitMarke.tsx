/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/DringlichkeitMarke.tsx               │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Dringlichkeit als Versal-Marke, Signal nur bei Notfall/Hoch           │
   └────────────────────────────────────────────────────────────────────────┘ */

import { DRINGLICHKEIT_LABEL, isDringend } from '../../core/domain/auftrag';
import type { Dringlichkeit } from '../../core/domain/auftrag';
import { cx } from '../../core/ui/cx';
import styles from './DringlichkeitMarke.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface DringlichkeitMarkeProps {
  dringlichkeit: Dringlichkeit;
}

export function DringlichkeitMarke({ dringlichkeit }: DringlichkeitMarkeProps) {
  return (
    <span
      className={cx(styles.marke, isDringend(dringlichkeit) && styles.signal, dringlichkeit === 'notfall' && styles.notfall)}
      title={`Dringlichkeit: ${DRINGLICHKEIT_LABEL[dringlichkeit]}`}
    >
      <span className={styles.quadrat} aria-hidden />
      {DRINGLICHKEIT_LABEL[dringlichkeit]}
    </span>
  );
}

/* ◆ jh · eof */
