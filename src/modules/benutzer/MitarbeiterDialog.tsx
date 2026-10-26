/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/benutzer/MitarbeiterDialog.tsx             │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Personalakte anlegen oder bearbeiten: Funktion, Pensum, Eintritt …    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { addDays, parseIsoInput } from '../../core/datum';
import { FUNKTIONEN, FUNKTION_LABEL, mitarbeiterName } from '../../core/domain/personal';
import type { Funktion, Mitarbeiter } from '../../core/domain/personal';
import { fullName } from '../../core/domain/stammdaten';
import type { Techniker } from '../../core/domain/stammdaten';
import type { Mandant } from '../../core/mandant/mandant.types';
import { Button } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Auswahl, Eingabe, Feld } from '../../core/ui/Form';
import { nextId } from '../dispo/store/useDispoAktionen';
import styles from '../personal/Personal.module.css';

// ── §1 · Dialog ──────────────────────────────────────────────────

interface MitarbeiterDialogProps {
  open: boolean;
  mitarbeiter: Mitarbeiter | null;
  alle: readonly Mitarbeiter[];
  techniker: readonly Techniker[];
  mandant: Mandant;
  onClose: () => void;
  onSpeichern: (mitarbeiter: Mitarbeiter) => void;
}

// jh› Datenminimierung auch im Formular: keine AHV-Nummer, kein Geburtsdatum, keine Privatadresse –
//     was die Zeiterfassung nicht braucht, wird nicht erhoben (DSG Art. 6 Abs. 3).
export function MitarbeiterDialog({ open, mitarbeiter, alle, techniker, mandant, onClose, onSpeichern }: MitarbeiterDialogProps) {
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [kuerzel, setKuerzel] = useState('');
  const [funktion, setFunktion] = useState<Funktion>('techniker');
  const [technikerId, setTechnikerId] = useState('');
  const [pensum, setPensum] = useState('100');
  const [eintritt, setEintritt] = useState('');
  const [austritt, setAustritt] = useState('');
  const [ferien, setFerien] = useState('25');
  const [uebertrag, setUebertrag] = useState('0');
  const [zeitStunden, setZeitStunden] = useState('0');
  const [zeitPer, setZeitPer] = useState('');
  const [vorgesetzterId, setVorgesetzterId] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');

  useEffect(() => {
    if (!open) return;
    const basis = mitarbeiter ?? null;
    setVorname(basis?.vorname ?? '');
    setNachname(basis?.nachname ?? '');
    setKuerzel(basis?.kuerzel ?? '');
    setFunktion(basis?.funktion ?? 'techniker');
    setTechnikerId(basis?.technikerId ?? '');
    setPensum(String(basis?.pensum ?? 100));
    setEintritt(basis?.eintritt ?? '');
    setAustritt(basis?.austritt ?? '');
    setFerien(String(basis?.ferienTageProJahr ?? mandant.ferienTageStandard));
    setUebertrag(String(basis?.ferienUebertragTage ?? 0));
    setZeitStunden(basis ? (basis.zeitUebertragMin / 60).toFixed(2) : '0');
    setZeitPer(basis?.zeitUebertragPer ?? '');
    setVorgesetzterId(basis?.vorgesetzterId ?? '');
    setEmail(basis?.email ?? '');
    setTelefon(basis?.telefon ?? '');
  }, [open, mitarbeiter, mandant.ferienTageStandard]);

  const freieTechniker = useMemo(() => {
    const belegt = new Set(alle.filter((person) => person.id !== mitarbeiter?.id).map((person) => person.technikerId));
    return techniker.filter((eintrag) => !belegt.has(eintrag.id));
  }, [alle, techniker, mitarbeiter?.id]);

  const fehler = useMemo(() => {
    if (vorname.trim() === '' || nachname.trim() === '') return 'Vor- und Nachname sind Pflicht.';
    const kz = kuerzel.trim().toUpperCase();
    if (kz.length < 2 || kz.length > 3) return 'Kürzel mit zwei oder drei Zeichen.';
    if (alle.some((person) => person.id !== mitarbeiter?.id && person.kuerzel === kz)) return 'Kürzel ist schon vergeben.';
    const prozent = Number(pensum);
    if (!(prozent >= 10 && prozent <= 100)) return 'Pensum zwischen 10 und 100 Prozent.';
    if (!parseIsoInput(eintritt)) return 'Eintrittsdatum fehlt.';
    if (austritt && (!parseIsoInput(austritt) || austritt < eintritt)) return 'Austritt liegt vor dem Eintritt.';
    if (!(Number(ferien) >= 20 && Number(ferien) <= 40)) return 'Ferienanspruch zwischen 20 und 40 Tagen (OR 329a: mindestens 20).';
    if (vorgesetzterId === mitarbeiter?.id) return 'Niemand ist sich selbst vorgesetzt.';
    if (zeitPer && !parseIsoInput(zeitPer)) return 'Stichtag des Gleitzeit-Übertrags als Datum eingeben.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return 'E-Mail-Adresse prüfen.';
    return null;
  }, [vorname, nachname, kuerzel, alle, mitarbeiter?.id, pensum, eintritt, austritt, ferien, vorgesetzterId, zeitPer, email]);

  const speichern = () => {
    const eintrittIso = parseIsoInput(eintritt);
    if (fehler || !eintrittIso) return;
    const austrittIso = austritt ? parseIsoInput(austritt) : null;
    // jh› Ohne Stichtag zählt der Saldo ab dem Tag vor dem Eintritt – also ab dem ersten Arbeitstag.
    const stichtag = (zeitPer ? parseIsoInput(zeitPer) : null) ?? addDays(eintrittIso, -1);
    const neu: Mitarbeiter = {
      id: mitarbeiter?.id ?? nextId('M'),
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      kuerzel: kuerzel.trim().toUpperCase(),
      funktion,
      ...(technikerId ? { technikerId } : {}),
      pensum: Number(pensum),
      eintritt: eintrittIso,
      ...(austrittIso ? { austritt: austrittIso } : {}),
      ferienTageProJahr: Number(ferien),
      ferienUebertragTage: Number(uebertrag) || 0,
      zeitUebertragMin: Math.round((Number(zeitStunden) || 0) * 60),
      zeitUebertragPer: stichtag,
      ...(vorgesetzterId ? { vorgesetzterId } : {}),
      email: email.trim(),
      ...(telefon.trim() ? { telefon: telefon.trim() } : {}),
    };
    onSpeichern(neu);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={mitarbeiter ? 'Personalakte bearbeiten' : 'Mitarbeiter/in anlegen'}
      untertitel={mitarbeiter ? mitarbeiterName(mitarbeiter) : undefined}
      breite="md"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" icon={Save} disabled={fehler !== null} onClick={speichern}>
            Speichern
          </Button>
        </>
      }
    >
      <div className={styles.formular}>
        <div className={styles.formularZeile}>
          <Feld label="Vorname" render={(id) => <Eingabe id={id} value={vorname} onChange={(event) => setVorname(event.target.value)} />} />
          <Feld label="Nachname" render={(id) => <Eingabe id={id} value={nachname} onChange={(event) => setNachname(event.target.value)} />} />
        </div>
        <div className={styles.formularZeile}>
          <Feld label="Kürzel" render={(id) => <Eingabe id={id} value={kuerzel} mono maxLength={3} onChange={(event) => setKuerzel(event.target.value)} />} />
          <Feld
            label="Funktion"
            render={(id) => (
              <Auswahl id={id} value={funktion} onChange={(event) => setFunktion(event.target.value as Funktion)}>
                {FUNKTIONEN.map((wert) => (
                  <option key={wert} value={wert}>
                    {FUNKTION_LABEL[wert]}
                  </option>
                ))}
              </Auswahl>
            )}
          />
        </div>
        <div className={styles.formularZeile}>
          <Feld
            label="Techniker im Plan"
            render={(id) => (
              <Auswahl id={id} value={technikerId} onChange={(event) => setTechnikerId(event.target.value)}>
                <option value="">Fährt nicht selbst</option>
                {freieTechniker.map((eintrag) => (
                  <option key={eintrag.id} value={eintrag.id}>
                    {eintrag.kuerzel} · {fullName(eintrag)} · {eintrag.fahrzeug}
                  </option>
                ))}
              </Auswahl>
            )}
          />
          <Feld
            label="Vorgesetzte/r"
            render={(id) => (
              <Auswahl id={id} value={vorgesetzterId} onChange={(event) => setVorgesetzterId(event.target.value)}>
                <option value="">Keine (Leitung)</option>
                {alle
                  .filter((person) => person.id !== mitarbeiter?.id)
                  .map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.kuerzel} · {mitarbeiterName(person)}
                    </option>
                  ))}
              </Auswahl>
            )}
          />
        </div>
        <div className={styles.formularZeile}>
          <Feld label="Pensum %" render={(id) => <Eingabe id={id} type="number" min={10} max={100} step={5} value={pensum} mono onChange={(event) => setPensum(event.target.value)} />} />
          <Feld label="Ferien Tage/Jahr (100 %)" render={(id) => <Eingabe id={id} type="number" min={20} max={40} step={0.5} value={ferien} mono onChange={(event) => setFerien(event.target.value)} />} />
        </div>
        <div className={styles.formularZeile}>
          <Feld label="Eintritt" render={(id) => <Eingabe id={id} type="date" value={eintritt} mono onChange={(event) => setEintritt(event.target.value)} />} />
          <Feld label="Austritt" hinweis="Leer, solange angestellt" render={(id) => <Eingabe id={id} type="date" value={austritt} mono onChange={(event) => setAustritt(event.target.value)} />} />
        </div>
        <div className={styles.formularZeile}>
          <Feld label="Ferienübertrag Vorjahr (Tage)" render={(id) => <Eingabe id={id} type="number" step={0.5} value={uebertrag} mono onChange={(event) => setUebertrag(event.target.value)} />} />
          <Feld label="Gleitzeit-Übertrag (Std.)" render={(id) => <Eingabe id={id} type="number" step={0.25} value={zeitStunden} mono onChange={(event) => setZeitStunden(event.target.value)} />} />
        </div>
        <Feld label="Übertrag per (Stichtag)" hinweis="Ab dem Folgetag zählt jeder Tag in den Saldo – leer = ab Eintritt" render={(id) => <Eingabe id={id} type="date" value={zeitPer} mono onChange={(event) => setZeitPer(event.target.value)} />} />
        <div className={styles.formularZeile}>
          <Feld label="E-Mail (geschäftlich)" render={(id) => <Eingabe id={id} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />} />
          <Feld label="Telefon (geschäftlich)" render={(id) => <Eingabe id={id} value={telefon} mono onChange={(event) => setTelefon(event.target.value)} />} />
        </div>
        <p className={styles.formularHinweis}>Keine AHV-Nummer, kein Geburtsdatum, keine Privatadresse: Das bleibt im Lohnsystem. Hier steht nur, was Plan und Zeiterfassung brauchen.</p>
        {fehler && <p className={styles.formularFehler}>{fehler}</p>}
      </div>
    </Dialog>
  );
}

/* ◆ jh · eof */
