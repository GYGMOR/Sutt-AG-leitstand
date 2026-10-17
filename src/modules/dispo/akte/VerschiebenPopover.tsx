/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/akte/VerschiebenPopover.tsx          │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Einsatz verschieben: Datum, Startzeit, Techniker – ohne Maus          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import { parseIsoInput } from '../../../core/datum';
import type { Minuten } from '../../../core/datum';
import type { Einsatz } from '../../../core/domain/einsatz';
import { fullName } from '../../../core/domain/stammdaten';
import type { Techniker } from '../../../core/domain/stammdaten';
import { formatZeit } from '../../../core/format';
import { Button } from '../../../core/ui/Button';
import { Auswahl, Eingabe, Feld } from '../../../core/ui/Form';
import { Popover } from '../../../core/ui/Popover';
import type { PlanZiel } from '../dispo.types';
import { ARBEIT_ENDE, ARBEIT_START } from '../zeitraster';
import styles from './VerschiebenPopover.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

const STARTZEITEN: readonly Minuten[] = Array.from({ length: (ARBEIT_ENDE - ARBEIT_START) / 15 }, (_, index) => ARBEIT_START + index * 15);

interface VerschiebenPopoverProps {
  anchor: HTMLElement | null;
  open: boolean;
  einsatz: Einsatz;
  techniker: readonly Techniker[];
  onClose: () => void;
  onMove: (ziel: PlanZiel) => void;
}

export function VerschiebenPopover({ anchor, open, einsatz, techniker, onClose, onMove }: VerschiebenPopoverProps) {
  const [datum, setDatum] = useState(einsatz.datum);
  const [start, setStart] = useState(einsatz.startMin);
  const [technikerId, setTechnikerId] = useState(einsatz.technikerId);

  function uebernehmen() {
    const ziel = parseIsoInput(datum);
    if (!ziel) return;
    onMove({ technikerId, datum: ziel, startMin: start });
    onClose();
  }

  return (
    <Popover anchor={anchor} open={open} onClose={onClose} placement="top-start" breite={300} label="Einsatz verschieben">
      <div className={styles.inhalt}>
        <Feld label="Datum" render={(id) => <Eingabe id={id} type="date" value={datum} mono onChange={(event) => setDatum(event.target.value as typeof einsatz.datum)} />} />
        <Feld
          label="Start"
          render={(id) => (
            <Auswahl id={id} value={start} onChange={(event) => setStart(Number(event.target.value))}>
              {STARTZEITEN.map((minuten) => (
                <option key={minuten} value={minuten}>
                  {formatZeit(minuten)}
                </option>
              ))}
            </Auswahl>
          )}
        />
        <Feld
          label="Techniker"
          render={(id) => (
            <Auswahl id={id} value={technikerId} onChange={(event) => setTechnikerId(event.target.value)}>
              {techniker.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.kuerzel} · {fullName(person)}
                </option>
              ))}
            </Auswahl>
          )}
        />
        <div className={styles.aktionen}>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" size="sm" onClick={uebernehmen}>
            Verschieben
          </Button>
        </div>
      </div>
    </Popover>
  );
}

/* ◆ jh · eof */
