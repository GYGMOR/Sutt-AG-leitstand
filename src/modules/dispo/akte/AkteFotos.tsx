/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/akte/AkteFotos.tsx                   │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Fotos im 4er-Raster (Mock-Kacheln) mit Lightbox                       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FOTO_MOTIV_LABEL } from '../../../core/domain/auftrag';
import type { Foto, FotoMotiv } from '../../../core/domain/auftrag';
import { formatZeitpunkt } from '../../../core/format';
import { IconButton } from '../../../core/ui/Button';
import { cx } from '../../../core/ui/cx';
import { Dialog } from '../../../core/ui/Dialog';
import styles from './AkteFotos.module.css';

// ── §1 · Mock-Kachel ─────────────────────────────────────────────

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

function FotoKachel({ foto, gross = false }: { foto: Foto; gross?: boolean }) {
  return (
    <svg viewBox="0 0 80 72" className={cx(styles.kachel, gross && styles.kachelGross)} role="img" aria-label={FOTO_MOTIV_LABEL[foto.motiv]}>
      <rect width="80" height="72" className={styles.kachelGrund} />
      <g className={styles.kachelStrich}>
        <Motiv motiv={foto.motiv} />
      </g>
    </svg>
  );
}

// ── §2 · Komponente ──────────────────────────────────────────────

interface AkteFotosProps {
  fotos: readonly Foto[];
}

export function AkteFotos({ fotos }: AkteFotosProps) {
  const [offen, setOffen] = useState<number | null>(null);
  const aktuell = offen !== null ? fotos[offen] : undefined;

  if (fotos.length === 0) {
    return (
      <p className={styles.leer}>
        <Camera size={16} strokeWidth={1.5} aria-hidden /> Noch keine Fotos – der Techniker fotografiert vor Ort Typenschild und Schadenbild.
      </p>
    );
  }

  return (
    <>
      <ul className={styles.raster}>
        {fotos.map((foto, index) => (
          <li key={foto.id}>
            <button type="button" className={styles.foto} onClick={() => setOffen(index)} title={`${FOTO_MOTIV_LABEL[foto.motiv]} · ${formatZeitpunkt(foto.aufgenommenAm)}`}>
              <FotoKachel foto={foto} />
              <span className={styles.beschriftung}>{FOTO_MOTIV_LABEL[foto.motiv]}</span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={aktuell !== undefined} onClose={() => setOffen(null)} titel={aktuell ? FOTO_MOTIV_LABEL[aktuell.motiv] : ''} untertitel={aktuell ? `${formatZeitpunkt(aktuell.aufgenommenAm)} · ${aktuell.technikerKuerzel}` : undefined} breite="md">
        {aktuell && offen !== null && (
          <div className={styles.lightbox}>
            <IconButton icon={ChevronLeft} label="Vorheriges Foto" onClick={() => setOffen((offen + fotos.length - 1) % fotos.length)} disabled={fotos.length < 2} />
            <FotoKachel foto={aktuell} gross />
            <IconButton icon={ChevronRight} label="Nächstes Foto" onClick={() => setOffen((offen + 1) % fotos.length)} disabled={fotos.length < 2} />
            <span className={styles.zaehler}>
              {offen + 1} / {fotos.length}
            </span>
            <span className={styles.schliessenHinweis}>
              <X size={16} strokeWidth={1.5} aria-hidden /> Esc
            </span>
          </div>
        )}
      </Dialog>
    </>
  );
}

/* ◆ jh · eof */
