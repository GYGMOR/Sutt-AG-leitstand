/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/FotoKachel.tsx                             │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Mock-Fotokachel: Strichzeichnung je Motiv, optional echtes Bild       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { FOTO_MOTIV_LABEL } from '../domain/auftrag';
import type { Foto, FotoMotiv } from '../domain/auftrag';
import { cx } from './cx';
import styles from './FotoKachel.module.css';

// ── §1 · Motive ──────────────────────────────────────────────────

// jh› Keine Fremdbilder im Mock: jedes Motiv ist eine Strichzeichnung in
//     Grautönen – erkennbar als Platzhalter, aber nicht hässlich.
function Motiv({ motiv }: { motiv: FotoMotiv }) {
  switch (motiv) {
    case 'typenschild':
      return (
        <g>
          <rect x="14" y="20" width="52" height="30" rx="2" />
          <line x1="20" y1="29" x2="48" y2="29" />
          <line x1="20" y1="36" x2="58" y2="36" />
          <line x1="20" y1="43" x2="40" y2="43" />
        </g>
      );
    case 'schaden':
      return (
        <g>
          <rect x="18" y="14" width="44" height="44" rx="2" />
          <path d="M26 42 L34 30 L40 38 L46 24 L54 44" />
          <circle cx="50" cy="26" r="3" />
        </g>
      );
    case 'anschluss':
      return (
        <g>
          <path d="M16 50 L34 50 L34 30 L46 30 L46 20" />
          <circle cx="46" cy="16" r="4" />
          <rect x="56" y="40" width="10" height="14" rx="1" />
          <line x1="16" y1="58" x2="64" y2="58" />
        </g>
      );
    case 'einbau':
      return (
        <g>
          <rect x="12" y="12" width="56" height="48" rx="1" />
          <rect x="18" y="20" width="20" height="36" rx="1" />
          <circle cx="28" cy="40" r="7" />
          <line x1="44" y1="20" x2="62" y2="20" />
          <line x1="44" y1="28" x2="62" y2="28" />
        </g>
      );
    default:
      return (
        <g>
          <rect x="12" y="16" width="56" height="40" rx="1" />
          <path d="M14 52 L30 36 L40 46 L50 34 L66 52" />
          <circle cx="54" cy="26" r="4" />
        </g>
      );
  }
}

// ── §2 · Kachel ──────────────────────────────────────────────────

interface FotoKachelProps {
  foto: Foto;
  gross?: boolean;
  /** Echtes Bild (Object-URL aus der Kamera) – im Mock nicht persistiert. */
  quelle?: string;
  className?: string;
}

export function FotoKachel({ foto, gross = false, quelle, className }: FotoKachelProps) {
  if (quelle) {
    return <img src={quelle} alt={FOTO_MOTIV_LABEL[foto.motiv]} className={cx(styles.kachel, styles.bild, gross && styles.kachelGross, className)} />;
  }
  return (
    <svg viewBox="0 0 80 72" className={cx(styles.kachel, gross && styles.kachelGross, className)} role="img" aria-label={FOTO_MOTIV_LABEL[foto.motiv]}>
      <rect width="80" height="72" className={styles.kachelGrund} />
      <g className={styles.kachelStrich}>
        <Motiv motiv={foto.motiv} />
      </g>
    </svg>
  );
}

/* ◆ jh · eof */
