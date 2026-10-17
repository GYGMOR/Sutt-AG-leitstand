/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/EinsatzBlock.tsx               │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Einsatzblock: 3/2/1 Zeilen je Breite, Kategoriefläche, Statusicon     │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Check, MapPin, PackageSearch, Truck } from 'lucide-react';
import { STATUS_LABEL, isMovable } from '../../../core/domain/einsatz';
import { formatAdresse, formatStrasseKurz } from '../../../core/domain/stammdaten';
import { formatZeitspanne } from '../../../core/format';
import { useHoverIntent } from '../../../core/hooks/useHoverIntent';
import { cx } from '../../../core/ui/cx';
import type { DragPayload } from '../drag/DispoDnd';
import type { FarbeNach } from '../dispo.types';
import { useHovercard } from '../hover/HovercardContext';
import { farbKlasse } from './farbe';
import type { EinsatzView } from '../store/dispo.selectors';
import styles from './EinsatzBlock.module.css';

// ── §1 · Tooltip & Statusicon ────────────────────────────────────

export function describeEinsatz(view: EinsatzView): string {
  const { einsatz, auftrag, kunde, liegenschaft, geraet } = view;
  const wohnung = auftrag.wohnung ? ` · ${auftrag.wohnung.nummer}` : '';
  return [
    `${auftrag.nummer} · ${formatZeitspanne(einsatz.startMin, einsatz.dauerMin)} · ${STATUS_LABEL[einsatz.status]}`,
    `${kunde.name} – ${auftrag.kontaktVorOrt.name}`,
    `${formatAdresse(liegenschaft.adresse)}${wohnung}`,
    `${geraet.marke} ${geraet.modell} · SN ${geraet.seriennummer}`,
    auftrag.fehlerbild,
  ].join('\n');
}

function StatusIcon({ view }: { view: EinsatzView }) {
  const { status } = view.einsatz;
  if (status === 'unterwegs') return <Truck size={16} strokeWidth={1.5} aria-label="unterwegs" className={styles.statusIcon} />;
  if (status === 'vor-ort') {
    return (
      <span className={cx(styles.statusIcon, styles.vorOrt)} aria-label="vor Ort">
        <MapPin size={16} strokeWidth={1.5} aria-hidden />
        <span className={styles.pulsPunkt} aria-hidden />
      </span>
    );
  }
  if (status === 'wartet-teil') return <PackageSearch size={16} strokeWidth={1.5} aria-label="wartet auf Teil" className={styles.statusIcon} />;
  if (status === 'erledigt') return <Check size={16} strokeWidth={1.5} aria-label="erledigt" className={styles.statusIcon} />;
  return null;
}

// ── §2 · Block ───────────────────────────────────────────────────

interface EinsatzBlockProps {
  view: EinsatzView;
  position: CSSProperties;
  farbeNach: FarbeNach;
  ausgewaehlt: boolean;
  markiert: boolean;
  onSelect: (einsatzId: string) => void;
}

export function EinsatzBlock({ view, position, farbeNach, ausgewaehlt, markiert, onSelect }: EinsatzBlockProps) {
  const { einsatz, kunde, liegenschaft, geraet, auftrag } = view;
  const ziehbar = isMovable(einsatz.status);
  const hovercard = useHovercard();
  const hover = useHoverIntent(
    (anker) => hovercard.zeigen({ auftragId: auftrag.id, einsatzId: einsatz.id, anker }),
    hovercard.verbergen,
  );

  const payload: DragPayload = { art: 'einsatz', einsatzId: einsatz.id, auftragId: auftrag.id, technikerId: einsatz.technikerId, dauerMin: einsatz.dauerMin, titel: kunde.kurzname };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `einsatz:${einsatz.id}`, data: payload, disabled: !ziehbar });

  return (
    <button
      ref={setNodeRef}
      type="button"
      data-einsatz-id={einsatz.id}
      className={cx(
        styles.block,
        farbKlasse(view, farbeNach),
        styles[`status-${einsatz.status}`],
        view.dringend && styles.dringend,
        view.konflikt && styles.konflikt,
        !view.imFilter && styles.abgeblendet,
        ausgewaehlt && styles.ausgewaehlt,
        markiert && styles.markiert,
        isDragging && styles.gezogen,
        ziehbar && styles.ziehbar,
      )}
      style={position}
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
      <StatusIcon view={view} />
      {(view.fahrzeitKnapp || view.ueberzogen) && <span className={styles.ecke} aria-hidden title={view.ueberzogen ? 'überzogen' : 'Fahrzeit zu knapp'} />}
      <span className={styles.kunde}>{kunde.kurzname}</span>
      <span className={styles.ort}>
        {liegenschaft.adresse.ort} · {formatStrasseKurz(liegenschaft.adresse)}
      </span>
      <span className={styles.geraet}>
        {geraet.marke} {geraet.art}
      </span>
      <span className={styles.kurz}>…{auftrag.nummer.slice(-3)}</span>
    </button>
  );
}

/* ◆ jh · eof */
