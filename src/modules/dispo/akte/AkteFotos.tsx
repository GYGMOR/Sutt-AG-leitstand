/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/akte/AkteFotos.tsx                   │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Fotos im 4er-Raster mit Lightbox                                      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FOTO_MOTIV_LABEL } from '../../../core/domain/auftrag';
import type { Foto } from '../../../core/domain/auftrag';
import { formatZeitpunkt } from '../../../core/format';
import { IconButton } from '../../../core/ui/Button';
import { Dialog } from '../../../core/ui/Dialog';
import { FotoKachel } from '../../../core/ui/FotoKachel';
import styles from './AkteFotos.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

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
