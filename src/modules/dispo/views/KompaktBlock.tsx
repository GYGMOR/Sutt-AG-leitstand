/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/KompaktBlock.tsx               │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Kompakter Einsatz (Zeit · Ort · Kunde) für Mehrtages- und Kalender    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useDraggable } from '@dnd-kit/core';
import { isMovable } from '../../../core/domain/einsatz';
import { formatZeit } from '../../../core/format';
import { useHoverIntent } from '../../../core/hooks/useHoverIntent';
import { cx } from '../../../core/ui/cx';
import type { DragPayload } from '../drag/DispoDnd';
import type { FarbeNach } from '../dispo.types';
import { useHovercard } from '../hover/HovercardContext';
import type { EinsatzView } from '../store/dispo.selectors';
import { describeEinsatz } from './EinsatzBlock';
import { farbKlasse } from './farbe';
import styles from './KompaktBlock.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface KompaktBlockProps {
  view: EinsatzView;
  farbeNach: FarbeNach;
  ausgewaehlt: boolean;
  markiert: boolean;
  onSelect: (einsatzId: string) => void;
  /** Kalender-Monat: nur Zeit + Kunde in einer Zeile. */
  pille?: boolean;
}

export function KompaktBlock({ view, farbeNach, ausgewaehlt, markiert, onSelect, pille = false }: KompaktBlockProps) {
  const { einsatz, liegenschaft, kunde, auftrag } = view;
  const ziehbar = isMovable(einsatz.status);
  const hovercard = useHovercard();
  const hover = useHoverIntent((anker) => hovercard.zeigen({ auftragId: auftrag.id, einsatzId: einsatz.id, anker }), hovercard.verbergen);
  const payload: DragPayload = { art: 'einsatz', einsatzId: einsatz.id, auftragId: auftrag.id, technikerId: einsatz.technikerId, dauerMin: einsatz.dauerMin, titel: kunde.kurzname };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `kompakt:${einsatz.id}`, data: payload, disabled: !ziehbar });

  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        data-einsatz-id={einsatz.id}
        className={cx(
          styles.block,
          farbKlasse(view, farbeNach),
          pille && styles.pille,
          view.dringend && styles.dringend,
          !view.imFilter && styles.abgeblendet,
          einsatz.status === 'erledigt' && styles.erledigt,
          ausgewaehlt && styles.ausgewaehlt,
          markiert && styles.markiert,
          isDragging && styles.gezogen,
        )}
        title={describeEinsatz(view)}
        onClick={() => onSelect(einsatz.id)}
        {...attributes}
        {...listeners}
        aria-pressed={ausgewaehlt}
        onPointerEnter={hover.onPointerEnter}
        onPointerLeave={hover.onPointerLeave}
        onFocus={hover.onFocus}
        onBlur={hover.onBlur}
        onPointerDown={(event) => {
          hover.onPointerDown();
          listeners?.['onPointerDown']?.(event);
        }}
      >
        <span className={styles.zeit}>{formatZeit(einsatz.startMin)}</span>
        {!pille && <span className={styles.ort}>{liegenschaft.adresse.ort}</span>}
        <span className={styles.kunde}>{kunde.kurzname}</span>
      </button>
    </li>
  );
}

/* ◆ jh · eof */
