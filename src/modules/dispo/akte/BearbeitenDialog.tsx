/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/akte/BearbeitenDialog.tsx            │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Auftrag bearbeiten: Kategorie, Dringlichkeit, Termin, Techniker       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Save } from 'lucide-react';
import { parseIsoInput } from '../../../core/datum';
import type { Minuten } from '../../../core/datum';
import { DRINGLICHKEIT_LABEL } from '../../../core/domain/auftrag';
import type { Auftrag, Dringlichkeit } from '../../../core/domain/auftrag';
import type { Einsatz } from '../../../core/domain/einsatz';
import { KATEGORIEN } from '../../../core/domain/kategorie';
import type { Kategorie } from '../../../core/domain/kategorie';
import { fullName } from '../../../core/domain/stammdaten';
import type { Techniker } from '../../../core/domain/stammdaten';
import { formatZeit } from '../../../core/format';
import { Button } from '../../../core/ui/Button';
import { Dialog } from '../../../core/ui/Dialog';
import { Auswahl, Eingabe, Feld, Textbereich } from '../../../core/ui/Form';
import type { EinsatzAenderung } from '../store/dispo.reducer';
import { ARBEIT_ENDE, ARBEIT_START } from '../zeitraster';
import styles from './BearbeitenDialog.module.css';

// ── §1 · Optionen ────────────────────────────────────────────────

const DAUERN: readonly Minuten[] = [30, 60, 90, 120, 150, 180, 240];
const STARTZEITEN: readonly Minuten[] = Array.from({ length: (ARBEIT_ENDE - ARBEIT_START) / 15 }, (_, index) => ARBEIT_START + index * 15);
const DRINGLICHKEITEN: readonly Dringlichkeit[] = ['notfall', 'hoch', 'normal', 'tief'];

// ── §2 · Komponente ──────────────────────────────────────────────

interface BearbeitenDialogProps {
  open: boolean;
  auftrag: Auftrag;
  einsatz: Einsatz | null;
  techniker: readonly Techniker[];
  onClose: () => void;
  onSave: (auftrag: Auftrag, einsatz?: EinsatzAenderung) => void;
}

export function BearbeitenDialog({ open, auftrag, einsatz, techniker, onClose, onSave }: BearbeitenDialogProps) {
  const [kategorie, setKategorie] = useState<Kategorie>(auftrag.kategorie);
  const [dringlichkeit, setDringlichkeit] = useState<Dringlichkeit>(auftrag.dringlichkeit);
  const [fehlerbild, setFehlerbild] = useState(auftrag.fehlerbild);
  const [notiz, setNotiz] = useState(auftrag.notiz ?? '');
  const [dauer, setDauer] = useState<Minuten>(einsatz?.dauerMin ?? auftrag.dauerMin);
  const [datum, setDatum] = useState(einsatz?.datum ?? '');
  const [start, setStart] = useState<Minuten>(einsatz?.startMin ?? ARBEIT_START + 30);
  const [technikerId, setTechnikerId] = useState(einsatz?.technikerId ?? '');
  const [fehler, setFehler] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (fehlerbild.trim().length < 3) {
      setFehler('Fehlerbild braucht mindestens drei Zeichen.');
      return;
    }
    const neu: Auftrag = { ...auftrag, kategorie, dringlichkeit, fehlerbild: fehlerbild.trim(), dauerMin: dauer, ...(notiz.trim() ? { notiz: notiz.trim() } : { notiz: undefined }) };
    if (!neu.notiz) delete neu.notiz;
    if (!einsatz) {
      onSave(neu);
      return;
    }
    const neuesDatum = parseIsoInput(datum);
    if (!neuesDatum) {
      setFehler('Datum ungültig.');
      return;
    }
    onSave(neu, { einsatzId: einsatz.id, datum: neuesDatum, startMin: start, dauerMin: dauer, technikerId: technikerId || einsatz.technikerId });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={`Auftrag ${auftrag.nummer} bearbeiten`}
      untertitel="Mockup: Änderungen bleiben bis zum Neuladen"
      breite="md"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" icon={Save} type="submit" form="sl-bearbeiten">
            Speichern
          </Button>
        </>
      }
    >
      <form id="sl-bearbeiten" className={styles.formular} onSubmit={onSubmit} noValidate>
        <div className={styles.zeile}>
          <Feld
            label="Kategorie"
            render={(id) => (
              <Auswahl id={id} value={kategorie} onChange={(event) => setKategorie(event.target.value as Kategorie)}>
                {KATEGORIEN.map((meta) => (
                  <option key={meta.id} value={meta.id}>
                    {meta.label}
                  </option>
                ))}
              </Auswahl>
            )}
          />
          <Feld
            label="Dringlichkeit"
            render={(id) => (
              <Auswahl id={id} value={dringlichkeit} onChange={(event) => setDringlichkeit(event.target.value as Dringlichkeit)}>
                {DRINGLICHKEITEN.map((wert) => (
                  <option key={wert} value={wert}>
                    {DRINGLICHKEIT_LABEL[wert]}
                  </option>
                ))}
              </Auswahl>
            )}
          />
        </div>
        <Feld label="Fehlerbild" fehler={fehler ?? undefined} render={(id) => <Textbereich id={id} value={fehlerbild} onChange={(event) => setFehlerbild(event.target.value)} rows={2} />} />
        <Feld label="Notiz" render={(id) => <Textbereich id={id} value={notiz} onChange={(event) => setNotiz(event.target.value)} rows={2} placeholder="Hinweise für den Techniker" />} />

        <div className={styles.zeile}>
          <Feld
            label="Dauer"
            render={(id) => (
              <Auswahl id={id} value={dauer} onChange={(event) => setDauer(Number(event.target.value))}>
                {DAUERN.map((wert) => (
                  <option key={wert} value={wert}>
                    {wert} min
                  </option>
                ))}
              </Auswahl>
            )}
          />
          {einsatz && (
            <>
              <Feld label="Datum" render={(id) => <Eingabe id={id} type="date" value={datum} mono onChange={(event) => setDatum(event.target.value)} />} />
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
            </>
          )}
        </div>
        {einsatz && (
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
        )}
      </form>
    </Dialog>
  );
}

/* ◆ jh · eof */
