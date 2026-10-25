/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/FotoLightbox.tsx                           │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Lightbox für Fotos: blättern, Zähler, Esc – mit Platz für Kontext     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FOTO_MOTIV_LABEL } from '../domain/auftrag';
import type { Foto } from '../domain/auftrag';
import { formatZeitpunkt } from '../format';
import { IconButton } from './Button';
import { Dialog } from './Dialog';
import { FotoKachel } from './FotoKachel';
import styles from './FotoLightbox.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface FotoLightboxProps<T extends Foto> {
  fotos: readonly T[];
  /** Index des offenen Fotos; null = geschlossen. */
  offen: number | null;
  onWechsel: (index: number) => void;
  onClose: () => void;
  /** Kontext unter dem Bild: Auftrag, Gerät, Techniker – als Verweise. */
  kontext?: (foto: T) => ReactNode;
  quelle?: (foto: T) => string | undefined;
}

export function FotoLightbox<T extends Foto>({ fotos, offen, onWechsel, onClose, kontext, quelle }: FotoLightboxProps<T>) {
  const aktuell = offen !== null ? fotos[offen] : undefined;
  const anzahl = fotos.length;

  // jh› Pfeiltasten blättern – die Dialog-Komponente kennt nur Esc.
  useEffect(() => {
    if (offen === null || anzahl < 2) return undefined;
    const taste = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') onWechsel((offen + 1) % anzahl);
      if (event.key === 'ArrowLeft') onWechsel((offen + anzahl - 1) % anzahl);
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [offen, anzahl, onWechsel]);

  return (
    <Dialog open={aktuell !== undefined} onClose={onClose} titel={aktuell ? FOTO_MOTIV_LABEL[aktuell.motiv] : ''} untertitel={aktuell ? `${formatZeitpunkt(aktuell.aufgenommenAm)} · ${aktuell.technikerKuerzel}` : undefined} breite="md">
      {aktuell && offen !== null && (
        <div className={styles.lightbox}>
          <div className={styles.buehne}>
            <IconButton icon={ChevronLeft} label="Vorheriges Foto (←)" onClick={() => onWechsel((offen + anzahl - 1) % anzahl)} disabled={anzahl < 2} />
            <FotoKachel foto={aktuell} gross quelle={quelle?.(aktuell)} />
            <IconButton icon={ChevronRight} label="Nächstes Foto (→)" onClick={() => onWechsel((offen + 1) % anzahl)} disabled={anzahl < 2} />
          </div>
          {kontext && <div className={styles.kontext}>{kontext(aktuell)}</div>}
          <div className={styles.fuss}>
            <span className={styles.zaehler}>
              {offen + 1} / {anzahl}
            </span>
            <span className={styles.hinweis}>
              <X size={16} strokeWidth={1.5} aria-hidden /> Esc
            </span>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/* ◆ jh · eof */
