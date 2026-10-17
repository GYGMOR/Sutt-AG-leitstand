/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/EinsatzBlock.tsx               │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Einsatzblock: 3/2/1 Zeilen je Breite, Farbfläche, Balken, Status      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Check, Link2, MapPin, PackageSearch, Truck } from 'lucide-react';
import { STATUS_LABEL, isMovable } from '../../../core/domain/einsatz';
import { formatAdresse, formatStrasseKurz } from '../../../core/domain/stammdaten';
import { formatZeitspanne } from '../../../core/format';
import { useHoverIntent } from '../../../core/hooks/useHoverIntent';
import { cx, modulKlasse } from '../../../core/ui/cx';
import type { DragPayload } from '../drag/DispoDnd';
import type { FarbeNach } from '../dispo.types';
import { useHovercard } from '../hover/HovercardContext';
import { farbKlasse } from './farbe';
import type { EinsatzView } from '../store/dispo.selectors';
import { useBlockRegistry } from './Verbindungen';
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
    ...view.verknuepfungen.map((verknuepfung) => `↔ ${verknuepfung.text}`),
  ].join('\n');
}

function StatusIcon({ view }: { view: EinsatzView }) {
  const { status } = view.einsatz;
  if (status === 'unterwegs') return <Truck size={14} strokeWidth={1.75} aria-label="unterwegs" className={styles.statusIcon} />;
  if (status === 'vor-ort') {
    return (
      <span className={cx(styles.statusIcon, styles.vorOrt)} aria-label="vor Ort">
        <MapPin size={14} strokeWidth={1.75} aria-hidden />
        <span className={styles.pulsPunkt} aria-hidden />
      </span>
    );
  }
  if (status === 'wartet-teil') return <PackageSearch size={14} strokeWidth={1.75} aria-label="wartet auf Teil" className={styles.statusIcon} />;
  if (status === 'erledigt') return <Check size={14} strokeWidth={1.75} aria-label="erledigt" className={styles.statusIcon} />;
  return null;
}

// ── §2 · Block ───────────────────────────────────────────────────

interface EinsatzBlockProps {
  view: EinsatzView;
  position: CSSProperties;
  farbeNach: FarbeNach;
  ausgewaehlt: boolean;
  markiert: boolean;
  /** Hängt mit der Auswahl zusammen (Erst-/Folgetermin, Bezug) – gestrichelter Ring. */
  verwandt?: boolean;
  /** Techniker-Kürzel vor dem Kundennamen (Kalender überlagert). */
  zeigeTechniker?: boolean;
  /** Farbklasse für den Balken links, wenn die Fläche etwas anderes zeigt (--sl-balken). */
  balkenKlasse?: string;
  onSelect: (einsatzId: string) => void;
}

export function EinsatzBlock({ view, position, farbeNach, ausgewaehlt, markiert, verwandt = false, zeigeTechniker = false, balkenKlasse, onSelect }: EinsatzBlockProps) {
  const { einsatz, kunde, liegenschaft, geraet, auftrag } = view;
  const ziehbar = isMovable(einsatz.status);
  const hovercard = useHovercard();
  const hover = useHoverIntent(
    (anker) => hovercard.zeigen({ auftragId: auftrag.id, einsatzId: einsatz.id, anker }),
    hovercard.verbergen,
  );

  const payload: DragPayload = { art: 'einsatz', einsatzId: einsatz.id, auftragId: auftrag.id, technikerId: einsatz.technikerId, dauerMin: einsatz.dauerMin, titel: kunde.kurzname };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `einsatz:${einsatz.id}`, data: payload, disabled: !ziehbar });

  // jh› Blöcke melden sich bei der Registry, damit Verknüpfungslinien sie finden.
  const registry = useBlockRegistry();
  const knotenRef = useRef<HTMLButtonElement | null>(null);
  const setRefs = useCallback(
    (knoten: HTMLButtonElement | null) => {
      knotenRef.current = knoten;
      setNodeRef(knoten);
    },
    [setNodeRef],
  );
  useLayoutEffect(() => {
    const knoten = knotenRef.current;
    if (!registry || !knoten) return undefined;
    registry.melden(einsatz.id, knoten);
    return () => registry.abmelden(einsatz.id);
  }, [registry, einsatz.id]);

  const anzahlVerknuepft = view.verknuepfungen.length;

  return (
    <button
      ref={setRefs}
      type="button"
      data-einsatz-id={einsatz.id}
      className={cx(
        styles.block,
        farbKlasse(view, farbeNach),
        balkenKlasse,
        modulKlasse(styles, `status-${einsatz.status}`),
        view.dringend && styles.dringend,
        view.konflikt && styles.konflikt,
        !view.imFilter && styles.abgeblendet,
        ausgewaehlt && styles.ausgewaehlt,
        verwandt && !ausgewaehlt && styles.verwandt,
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
      {anzahlVerknuepft > 0 && (
        <Link2 size={12} strokeWidth={1.75} className={styles.link} aria-label={`${anzahlVerknuepft} Verknüpfung${anzahlVerknuepft === 1 ? '' : 'en'}`} />
      )}
      {(view.fahrzeitKnapp || view.ueberzogen) && <span className={styles.ecke} aria-hidden title={view.ueberzogen ? 'überzogen' : 'Fahrzeit zu knapp'} />}
      <span className={styles.kunde}>
        {zeigeTechniker && <span className={styles.wer}>{view.techniker.kuerzel}</span>}
        {kunde.kurzname}
      </span>
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
