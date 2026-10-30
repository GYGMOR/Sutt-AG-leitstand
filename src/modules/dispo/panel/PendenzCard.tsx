/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/panel/PendenzCard.tsx                │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Karte im Auftragseingang – ziehbar in den Plan, mit Kunden-Chips      │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { KeyboardEvent } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Globe, GripVertical, MapPin } from 'lucide-react';
import { KATEGORIE_LABEL } from '../../../core/domain/kategorie';
import { formatStrasse } from '../../../core/domain/stammdaten';
import { formatDatumKurz, formatDauer, formatZeitpunktKurz } from '../../../core/format';
import { useHoverIntent } from '../../../core/hooks/useHoverIntent';
import { Chip } from '../../../core/ui/Chip';
import { Typenschild } from '../../../core/ui/Typenschild';
import { cx } from '../../../core/ui/cx';
import { kategorieKlasse } from '../../../core/ui/farben';
import type { DragPayload } from '../drag/DispoDnd';
import { DringlichkeitMarke } from '../DringlichkeitMarke';
import { useHovercard } from '../hover/HovercardContext';
import { KundenChips } from '../KundenChips';
import type { PendenzView } from '../store/dispo.selectors';
import styles from './PendenzCard.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface PendenzCardProps {
  view: PendenzView;
  ausgewaehlt: boolean;
  markiert: boolean;
  onSelect: (pendenzId: string) => void;
}

export function PendenzCard({ view, ausgewaehlt, markiert, onSelect }: PendenzCardProps) {
  const { pendenz, auftrag, kunde, liegenschaft, geraet } = view;
  const istFolge = pendenz.anlass === 'folgetermin';
  const hovercard = useHovercard();
  const hover = useHoverIntent((anker) => hovercard.zeigen({ auftragId: auftrag.id, anker }), hovercard.verbergen);

  const payload: DragPayload = {
    art: 'pendenz',
    pendenzId: pendenz.id,
    auftragId: auftrag.id,
    dauerMin: pendenz.dauerMin,
    titel: kunde.kurzname,
    ...(pendenz.fruehestensAm ? { fruehestensAm: pendenz.fruehestensAm } : {}),
  };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `pendenz:${pendenz.id}`, data: payload });

  function onCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onSelect(pendenz.id);
  }

  return (
    <div
      ref={setNodeRef}
      className={cx(styles.karte, kategorieKlasse(auftrag.kategorie), ausgewaehlt && styles.aktiv, markiert && styles.markiert, isDragging && styles.gezogen)}
      data-pendenz-id={pendenz.id}
      onClick={() => onSelect(pendenz.id)}
      {...attributes}
      {...listeners}
      // jh› nach dem dnd-kit-Spread: dessen aria-pressed («aufgenommen») wird durch die Auswahl ersetzt.
      aria-pressed={ausgewaehlt}
      aria-label={`${auftrag.nummer}, ${kunde.name}, ${auftrag.fehlerbild}`}
      onKeyDown={(event) => {
        onCardKeyDown(event);
        listeners?.['onKeyDown']?.(event);
      }}
      onPointerEnter={hover.onPointerEnter}
      onPointerLeave={hover.onPointerLeave}
      onFocus={hover.onFocus}
      onBlur={hover.onBlur}
      onPointerDown={(event) => {
        hover.onPointerDown();
        listeners?.['onPointerDown']?.(event);
      }}
    >
      <GripVertical size={16} strokeWidth={1.5} className={styles.griff} aria-hidden />

      <div className={styles.kopf}>
        <Typenschild label="Auftrag" wert={auftrag.nummer} />
        <DringlichkeitMarke dringlichkeit={auftrag.dringlichkeit} />
      </div>

      <p className={styles.kunde}>{kunde.name}</p>
      <p className={styles.ort}>
        <MapPin size={16} strokeWidth={1.5} aria-hidden />
        <span>
          {formatStrasse(liegenschaft.adresse)}, {liegenschaft.adresse.ort}
          {auftrag.wohnung && <span className={styles.wohnung}> · {auftrag.wohnung.nummer}</span>}
        </span>
      </p>

      <div className={styles.mitte}>
        <Typenschild label={geraet.marke} wert={geraet.typNummer} zusatz={`SN ${geraet.seriennummer}`} className={styles.geraet} />
        <Chip tone="tint" className={kategorieKlasse(auftrag.kategorie)}>
          {KATEGORIE_LABEL[auftrag.kategorie]}
        </Chip>
      </div>
      <p className={styles.fehler}>{auftrag.fehlerbild}</p>
      {pendenz.hinweis && <p className={styles.hinweis}>{pendenz.hinweis}</p>}

      <div className={styles.fuss}>
        {istFolge && <span className={styles.tag}>Folgetermin</span>}
        {auftrag.kanal === 'Website' && (
          <Chip tone="neutral" icon={Globe}>
            Website
          </Chip>
        )}
        {!auftrag.bestelltAm && <span className={cx(styles.tag, styles.tagOffen)}>Bestellung ausstehend</span>}
        <span className={styles.mono}>{formatDauer(pendenz.dauerMin)}</span>
        {pendenz.fruehestensAm && <span className={styles.mono}>ab {formatDatumKurz(pendenz.fruehestensAm)}</span>}
        <KundenChips kunde={kunde} liegenschaft={liegenschaft} kompakt />
        <span className={cx(styles.mono, styles.eingang)} title="Eingang">
          {formatZeitpunktKurz(pendenz.erstelltAm)}
        </span>
      </div>
    </div>
  );
}

/* ◆ jh · eof */
