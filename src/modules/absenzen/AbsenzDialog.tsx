/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/absenzen/AbsenzDialog.tsx                  │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Absenz beantragen oder bearbeiten: Person, Art, Zeitraum, Konto       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useState } from 'react';
import { Check, Send } from 'lucide-react';
import { parseIsoInput } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import { ABSENZ_ARTEN, ABSENZ_INFO, ABSENZ_LABEL, absenzTage, ferienkonto, ueberschneidung } from '../../core/domain/absenz';
import type { Absenz, AbsenzArt, AbsenzStatus } from '../../core/domain/absenz';
import { mitarbeiterName } from '../../core/domain/personal';
import { formatDatumKurz } from '../../core/format';
import type { Mandant } from '../../core/mandant/mandant.types';
import { Button } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Auswahl, Eingabe, Feld, Schalter, Textbereich } from '../../core/ui/Form';
import type { AbsenzEntwurf } from '../dispo/store/useDispoAktionen';
import type { PersonView } from '../personal/personal.model';
import type { Rechte } from '../personal/rechte';
import styles from '../personal/Personal.module.css';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface AbsenzVorgabe {
  mitarbeiterId?: string;
  von?: IsoDatum;
  bis?: IsoDatum;
  art?: AbsenzArt;
}

interface AbsenzDialogProps {
  open: boolean;
  /** Personen, für die erfasst werden darf. */
  personen: readonly PersonView[];
  vorgabe?: AbsenzVorgabe;
  /** Bestehende Absenz zum Bearbeiten. */
  absenz?: Absenz | null;
  rechte: Rechte;
  mandant: Mandant;
  absenzen: readonly Absenz[];
  heute: IsoDatum;
  onClose: () => void;
  onSpeichern: (entwurf: AbsenzEntwurf, bestehend: Absenz | null) => void;
}

// jh› Status beim Speichern: Wer für sein Team genehmigen darf und nicht sich selbst erfasst, trägt direkt
//     «genehmigt» ein; Krankheit und Militär brauchen keinen Entscheid; alles andere wird «beantragt» (Vier-Augen).
export function statusFuer(rechte: Rechte, art: AbsenzArt, mitarbeiterId: string): AbsenzStatus {
  if (!ABSENZ_INFO[art].genehmigung) return 'genehmigt';
  const eigene = rechte.mitarbeiter?.id === mitarbeiterId;
  if (!eigene && rechte.hat('absenzen:genehmigen') && rechte.darfPerson('absenzen', mitarbeiterId)) return 'genehmigt';
  return 'beantragt';
}

// ── §2 · Dialog ──────────────────────────────────────────────────

export function AbsenzDialog({ open, personen, vorgabe, absenz = null, rechte, mandant, absenzen, heute, onClose, onSpeichern }: AbsenzDialogProps) {
  const [mitarbeiterId, setMitarbeiterId] = useState('');
  const [art, setArt] = useState<AbsenzArt>('ferien');
  const [von, setVon] = useState<string>(heute);
  const [bis, setBis] = useState<string>(heute);
  const [halb, setHalb] = useState<'' | 'vormittag' | 'nachmittag'>('');
  const [notiz, setNotiz] = useState('');
  const [arztzeugnis, setArztzeugnis] = useState(false);

  useEffect(() => {
    if (!open) return;
    const basis = absenz ?? null;
    setMitarbeiterId(basis?.mitarbeiterId ?? vorgabe?.mitarbeiterId ?? rechte.mitarbeiter?.id ?? personen[0]?.mitarbeiter.id ?? '');
    setArt(basis?.art ?? vorgabe?.art ?? 'ferien');
    setVon(basis?.von ?? vorgabe?.von ?? heute);
    setBis(basis?.bis ?? vorgabe?.bis ?? vorgabe?.von ?? heute);
    setHalb(basis?.halberTag ?? '');
    setNotiz(basis?.notiz ?? '');
    setArztzeugnis(basis?.arztzeugnis ?? false);
  }, [open, absenz, vorgabe, rechte.mitarbeiter?.id, personen, heute]);

  const person = personen.find((kandidat) => kandidat.mitarbeiter.id === mitarbeiterId);
  const eigene = rechte.mitarbeiter?.id === mitarbeiterId;
  const arten = useMemo(() => ABSENZ_ARTEN.filter((kandidat) => !ABSENZ_INFO[kandidat].gesundheit || eigene || rechte.gesundheit), [eigene, rechte.gesundheit]);
  const vonIso = parseIsoInput(von);
  const bisIso = parseIsoInput(bis);
  const einTag = vonIso !== null && vonIso === bisIso;
  const tage = vonIso && bisIso && bisIso >= vonIso ? absenzTage({ von: vonIso, bis: bisIso, ...(einTag && halb ? { halberTag: halb } : {}) }, mandant.kanton, mandant.betrieblicheFeiertage) : 0;
  const konto = useMemo(() => {
    if (!person || !vonIso) return null;
    const ohneDiese = absenzen.filter((kandidat) => kandidat.id !== absenz?.id);
    return ferienkonto(person.mitarbeiter, ohneDiese, Number(vonIso.slice(0, 4)), heute, mandant.kanton, mandant.betrieblicheFeiertage);
  }, [person, vonIso, absenzen, absenz?.id, heute, mandant]);
  const restDanach = konto && ABSENZ_INFO[art].ferienkonto ? konto.restTage - tage : null;
  const status = statusFuer(rechte, art, mitarbeiterId);

  const fehler = useMemo(() => {
    if (!person) return 'Person wählen.';
    if (!vonIso || !bisIso) return 'Von und Bis als Datum eingeben.';
    if (bisIso < vonIso) return 'Bis liegt vor Von.';
    const kollision = ueberschneidung(absenzen, mitarbeiterId, vonIso, bisIso, absenz?.id);
    if (kollision) return `Überschneidet sich mit ${ABSENZ_LABEL[kollision.art]} ${formatDatumKurz(kollision.von)}–${formatDatumKurz(kollision.bis)}.`;
    if (tage === 0) return 'Der Zeitraum enthält keinen Arbeitstag.';
    return null;
  }, [person, vonIso, bisIso, absenzen, mitarbeiterId, absenz?.id, tage]);

  const speichern = () => {
    if (!vonIso || !bisIso || fehler || !person) return;
    const entwurf: AbsenzEntwurf = {
      mitarbeiterId,
      ...(person.mitarbeiter.technikerId ? { technikerId: person.mitarbeiter.technikerId } : {}),
      von: vonIso,
      bis: bisIso,
      art,
      status: absenz ? absenz.status : status,
      ...(einTag && halb ? { halberTag: halb } : {}),
      ...(notiz.trim() ? { notiz: notiz.trim() } : {}),
      ...(ABSENZ_INFO[art].gesundheit ? { arztzeugnis } : {}),
    };
    onSpeichern(entwurf, absenz);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={absenz ? 'Absenz bearbeiten' : status === 'genehmigt' ? 'Absenz eintragen' : 'Absenz beantragen'}
      untertitel={person ? mitarbeiterName(person.mitarbeiter) : undefined}
      breite="sm"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" icon={status === 'genehmigt' || absenz ? Check : Send} disabled={fehler !== null} onClick={speichern}>
            {absenz ? 'Speichern' : status === 'genehmigt' ? 'Eintragen' : 'Beantragen'}
          </Button>
        </>
      }
    >
      <div className={styles.formular}>
        {personen.length > 1 && (
          <Feld
            label="Person"
            render={(id) => (
              <Auswahl id={id} value={mitarbeiterId} disabled={absenz !== null} onChange={(event) => setMitarbeiterId(event.target.value)}>
                {personen.map((eintrag) => (
                  <option key={eintrag.mitarbeiter.id} value={eintrag.mitarbeiter.id}>
                    {eintrag.mitarbeiter.kuerzel} · {mitarbeiterName(eintrag.mitarbeiter)}
                  </option>
                ))}
              </Auswahl>
            )}
          />
        )}
        <Feld
          label="Art"
          render={(id) => (
            <Auswahl id={id} value={art} onChange={(event) => setArt(event.target.value as AbsenzArt)}>
              {arten.map((kandidat) => (
                <option key={kandidat} value={kandidat}>
                  {ABSENZ_LABEL[kandidat]}
                </option>
              ))}
            </Auswahl>
          )}
        />
        <div className={styles.formularZeile}>
          <Feld label="Von" render={(id) => <Eingabe id={id} type="date" value={von} mono onChange={(event) => setVon(event.target.value)} />} />
          <Feld label="Bis" render={(id) => <Eingabe id={id} type="date" value={bis} min={von} mono onChange={(event) => setBis(event.target.value)} />} />
        </div>
        {einTag && (
          <Feld
            label="Dauer"
            render={(id) => (
              <Auswahl id={id} value={halb} onChange={(event) => setHalb(event.target.value as '' | 'vormittag' | 'nachmittag')}>
                <option value="">Ganzer Tag</option>
                <option value="vormittag">Halber Tag – Vormittag</option>
                <option value="nachmittag">Halber Tag – Nachmittag</option>
              </Auswahl>
            )}
          />
        )}
        <Feld label="Notiz" render={(id) => <Textbereich id={id} rows={2} value={notiz} onChange={(event) => setNotiz(event.target.value)} />} />
        {ABSENZ_INFO[art].gesundheit && (
          <Schalter checked={arztzeugnis} onChange={setArztzeugnis}>
            Arztzeugnis liegt vor (ab dem dritten Tag)
          </Schalter>
        )}
        <p className={styles.formularHinweis}>
          {tage} Arbeitstag{tage === 1 ? '' : 'e'}
          {restDanach !== null && ` · Ferienkonto danach ${restDanach} Tage`}
          {restDanach !== null && restDanach < 0 && ' – übersteigt den Anspruch'}
          {!absenz && ` · wird ${status === 'genehmigt' ? 'direkt eingetragen' : 'zur Genehmigung eingereicht'}`}
          {ABSENZ_INFO[art].gesundheit && ' · Gesundheitsdatum: nur mit Recht «Gesundheitsdaten» sichtbar, im Plan als «Abwesend»'}
        </p>
        {fehler && <p className={styles.formularFehler}>{fehler}</p>}
      </div>
    </Dialog>
  );
}

/* ◆ jh · eof */
