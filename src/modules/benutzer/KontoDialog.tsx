/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/benutzer/KontoDialog.tsx                   │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Konto anlegen oder bearbeiten: Name, Benutzername, Rolle, Akte        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { ROLLEN, ROLLE_LABEL } from '../../core/auth/auth.types';
import type { Benutzer, Rolle } from '../../core/auth/auth.types';
import { kuerzelAus } from '../../core/auth/identitaet';
import { nowZeitpunkt } from '../../core/datum';
import { mitarbeiterName } from '../../core/domain/personal';
import type { Mitarbeiter } from '../../core/domain/personal';
import { Button } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Auswahl, Eingabe, Feld, Schalter } from '../../core/ui/Form';
import { nextId } from '../dispo/store/useDispoAktionen';
import styles from '../personal/Personal.module.css';
import { anpassungenBereinigen, benutzernameFrei } from './benutzer.model';

// ── §1 · Dialog ──────────────────────────────────────────────────

interface KontoDialogProps {
  open: boolean;
  konto: Benutzer | null;
  konten: ReadonlyMap<string, Benutzer>;
  mitarbeiter: readonly Mitarbeiter[];
  /** Personalakte, für die ein Konto angelegt wird. */
  vorgabe?: Mitarbeiter | null;
  onClose: () => void;
  onSpeichern: (benutzer: Benutzer) => void;
}

// jh› Der Rollenwechsel räumt Zusatz und Entzug auf, die zur neuen Rolle nichts mehr ändern – sonst sammeln
//     sich über Jahre unsichtbare Ausnahmen an.
export function KontoDialog({ open, konto, konten, mitarbeiter, vorgabe = null, onClose, onSpeichern }: KontoDialogProps) {
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [benutzername, setBenutzername] = useState('');
  const [email, setEmail] = useState('');
  const [rolle, setRolle] = useState<Rolle>('aussendienst');
  const [mitarbeiterId, setMitarbeiterId] = useState('');
  const [aktiv, setAktiv] = useState(true);
  const [mfa, setMfa] = useState(false);

  useEffect(() => {
    if (!open) return;
    const basis = konto ?? null;
    const person = vorgabe ?? null;
    setVorname(basis?.vorname ?? person?.vorname ?? '');
    setNachname(basis?.nachname ?? person?.nachname ?? '');
    setBenutzername(basis?.benutzername ?? (person ? person.kuerzel.toLowerCase() : ''));
    setEmail(basis?.email ?? person?.email ?? '');
    setRolle(basis?.rolle ?? (person?.technikerId ? 'aussendienst' : 'buero'));
    setMitarbeiterId(basis?.mitarbeiterId ?? person?.id ?? '');
    setAktiv(basis?.aktiv ?? true);
    setMfa(basis?.mfa ?? false);
  }, [open, konto, vorgabe]);

  const ohneKonto = useMemo(() => {
    const belegt = new Set([...konten.values()].filter((eintrag) => eintrag.id !== konto?.id).map((eintrag) => eintrag.mitarbeiterId));
    return mitarbeiter.filter((person) => !belegt.has(person.id));
  }, [konten, mitarbeiter, konto?.id]);

  const fehler = useMemo(() => {
    if (vorname.trim() === '' || nachname.trim() === '') return 'Vor- und Nachname sind Pflicht.';
    if (!benutzernameFrei(konten, benutzername, konto?.id)) return 'Benutzername fehlt oder ist schon vergeben.';
    if (email.trim() !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return 'E-Mail-Adresse prüfen.';
    return null;
  }, [vorname, nachname, benutzername, email, konten, konto?.id]);

  const speichern = () => {
    if (fehler) return;
    const person = mitarbeiter.find((kandidat) => kandidat.id === mitarbeiterId);
    const vergeben = new Set([...konten.values()].filter((eintrag) => eintrag.id !== konto?.id).map((eintrag) => eintrag.kuerzel));
    const bereinigt = anpassungenBereinigen(rolle, konto?.zusatzRechte, konto?.entzogeneRechte);
    const benutzer: Benutzer = {
      ...(konto ?? { id: nextId('U'), erstelltAm: nowZeitpunkt() }),
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      kuerzel: konto?.kuerzel ?? person?.kuerzel ?? kuerzelAus(vorname.trim(), nachname.trim(), vergeben),
      benutzername: benutzername.trim().toLowerCase(),
      rolle,
      aktiv,
      mfa,
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(person ? { mitarbeiterId: person.id, ...(person.technikerId ? { technikerId: person.technikerId } : {}) } : {}),
      ...bereinigt,
    };
    if (!person) {
      delete benutzer.mitarbeiterId;
      delete benutzer.technikerId;
    }
    onSpeichern(benutzer);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={konto ? 'Konto bearbeiten' : 'Konto anlegen'}
      untertitel={konto ? `@${konto.benutzername}` : 'Lokales Konto – oder beim ersten Anmelden über den Anbieter verknüpfen'}
      breite="sm"
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
          <Feld label="Benutzername" render={(id) => <Eingabe id={id} value={benutzername} mono autoComplete="off" onChange={(event) => setBenutzername(event.target.value)} />} />
          <Feld
            label="Rolle"
            render={(id) => (
              <Auswahl id={id} value={rolle} onChange={(event) => setRolle(event.target.value as Rolle)}>
                {ROLLEN.map((wert) => (
                  <option key={wert} value={wert}>
                    {ROLLE_LABEL[wert]}
                  </option>
                ))}
              </Auswahl>
            )}
          />
        </div>
        <Feld label="E-Mail" hinweis="Für die Anbieter-Anmeldung muss sie zur Domäne des Mandanten gehören." render={(id) => <Eingabe id={id} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />} />
        <Feld
          label="Personalakte"
          render={(id) => (
            <Auswahl id={id} value={mitarbeiterId} onChange={(event) => setMitarbeiterId(event.target.value)}>
              <option value="">Keine Verknüpfung</option>
              {ohneKonto.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.kuerzel} · {mitarbeiterName(person)}
                </option>
              ))}
            </Auswahl>
          )}
        />
        <Schalter checked={aktiv} onChange={setAktiv}>
          Konto aktiv (gesperrte Konten können sich nicht anmelden – auch nicht über den Anbieter)
        </Schalter>
        <Schalter checked={mfa} onChange={setMfa}>
          Zweiter Faktor über den Anbieter erzwungen
        </Schalter>
        {fehler && <p className={styles.formularFehler}>{fehler}</p>}
      </div>
    </Dialog>
  );
}

/* ◆ jh · eof */
