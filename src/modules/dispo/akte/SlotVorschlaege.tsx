/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/akte/SlotVorschlaege.tsx             │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Die drei besten Slots mit Begründung – ein Klick plant                │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import { CalendarCheck } from 'lucide-react';
import type { IsoDatum, Minuten } from '../../../core/datum';
import { formatDatumKurz, formatWochentag, formatZeitspanne } from '../../../core/format';
import { Avatar } from '../../../core/ui/Avatar';
import { CapsLabel } from '../../../core/ui/CapsLabel';
import { cx } from '../../../core/ui/cx';
import type { DispoStammdaten, Einsatz, PlanZiel } from '../dispo.types';
import { suggestSlots } from '../scoring';
import styles from './SlotVorschlaege.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface SlotVorschlaegeProps {
  stammdaten: DispoStammdaten;
  einsaetze: readonly Einsatz[];
  auftragId: string;
  dauerMin: Minuten;
  abDatum: IsoDatum;
  heute: IsoDatum;
  jetztMin: Minuten;
  titel?: string;
  ignorierenId?: string;
  onPlan: (ziel: PlanZiel) => void;
}

// jh› Der Vorschlag ersetzt kein Drag & Drop, macht die Planung aber auch
//     per Tastatur möglich (Telefon in der Hand) – und erklärt sich selbst.
export function SlotVorschlaege({ stammdaten, einsaetze, auftragId, dauerMin, abDatum, heute, jetztMin, titel, ignorierenId, onPlan }: SlotVorschlaegeProps) {
  const vorschlaege = useMemo(
    () => suggestSlots({ stammdaten, einsaetze, auftragId, dauerMin, abDatum, heute, jetztMin, anzahl: 3, ...(ignorierenId ? { ignorierenId } : {}) }),
    [stammdaten, einsaetze, auftragId, dauerMin, abDatum, heute, jetztMin, ignorierenId],
  );

  return (
    <div className={styles.block}>
      <CapsLabel>Vorschlag{titel ? ` · ${titel}` : ''}</CapsLabel>
      {vorschlaege.length === 0 && <p className={styles.keiner}>Kein freier Slot in den nächsten 7 Tagen.</p>}
      <ul className={styles.liste}>
        {vorschlaege.map((slot, index) => (
          <li key={`${slot.technikerId}-${slot.datum}-${slot.startMin}`}>
            <button
              type="button"
              className={cx(styles.slot, styles[`stufe-${slot.bewertung.stufe}`], index === 0 && styles.bester)}
              onClick={() => onPlan({ technikerId: slot.technikerId, datum: slot.datum, startMin: slot.startMin })}
              title={`${slot.bewertung.punkte} Punkte`}
            >
              <Avatar techniker={slot.techniker} size="sm" />
              <span className={styles.text}>
                <span className={styles.termin}>
                  {formatWochentag(slot.datum, 'kurz')} {formatDatumKurz(slot.datum)} · {formatZeitspanne(slot.startMin, slot.dauerMin)}
                </span>
                <span className={styles.gruende}>
                  {slot.techniker.nachname} · {slot.bewertung.gruende.join(' · ')}
                </span>
              </span>
              <CalendarCheck size={16} strokeWidth={1.5} aria-hidden className={styles.icon} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ◆ jh · eof */
