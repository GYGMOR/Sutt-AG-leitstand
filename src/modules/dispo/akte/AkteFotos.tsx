/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/akte/AkteFotos.tsx                   │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Fotos im 4er-Raster mit Lightbox                                      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import { Camera } from 'lucide-react';
import { FOTO_MOTIV_LABEL } from '../../../core/domain/auftrag';
import type { Foto } from '../../../core/domain/auftrag';
import { formatZeitpunkt } from '../../../core/format';
import { FotoKachel } from '../../../core/ui/FotoKachel';
import { FotoLightbox } from '../../../core/ui/FotoLightbox';
import styles from './AkteFotos.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface AkteFotosProps {
  fotos: readonly Foto[];
}

export function AkteFotos({ fotos }: AkteFotosProps) {
  const [offen, setOffen] = useState<number | null>(null);

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

      <FotoLightbox fotos={fotos} offen={offen} onWechsel={setOffen} onClose={() => setOffen(null)} />
    </>
  );
}

/* ◆ jh · eof */
