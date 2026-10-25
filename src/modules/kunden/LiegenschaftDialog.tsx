/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/kunden/LiegenschaftDialog.tsx              │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Liegenschaft anlegen oder bearbeiten: Adresse, Hauswart, Zugang       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import { Save } from 'lucide-react';
import { ORTE, ortInfo } from '../../core/domain/stammdaten';
import type { Kunde, KundenHinweis, Liegenschaft, Ort } from '../../core/domain/stammdaten';
import { Button } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Eingabe, Feld, Auswahl } from '../../core/ui/Form';
import { HinweisFelder } from './HinweisFelder';
import styles from './KundenPage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface LiegenschaftDialogProps {
  open: boolean;
  kunde: Kunde;
  /** Fehlt sie, wird eine neue Liegenschaft angelegt. */
  liegenschaft?: Liegenschaft;
  onClose: () => void;
  onSave: (liegenschaft: Omit<Liegenschaft, 'id'> & { id?: string }) => void;
}

export function LiegenschaftDialog({ open, kunde, liegenschaft, onClose, onSave }: LiegenschaftDialogProps) {
  const [bezeichnung, setBezeichnung] = useState(liegenschaft?.bezeichnung ?? '');
  const [objektNummer, setObjektNummer] = useState(liegenschaft?.objektNummer ?? '');
  const [strasse, setStrasse] = useState(liegenschaft?.adresse.strasse ?? '');
  const [hausnummer, setHausnummer] = useState(liegenschaft?.adresse.hausnummer ?? '');
  const [ort, setOrt] = useState<Ort>(liegenschaft?.adresse.ort ?? kunde.adresse.ort);
  const [hauswartName, setHauswartName] = useState(liegenschaft?.hauswart?.name ?? '');
  const [hauswartTelefon, setHauswartTelefon] = useState(liegenschaft?.hauswart?.telefon ?? '');
  const [zugang, setZugang] = useState(liegenschaft?.zugang ?? '');
  const [hinweise, setHinweise] = useState<readonly KundenHinweis[]>(liegenschaft?.hinweise ?? []);

  const bereit = bezeichnung.trim().length >= 2 && strasse.trim().length > 0 && hausnummer.trim().length > 0;

  const speichern = () => {
    if (!bereit) return;
    const info = ortInfo(ort);
    const hauswart = hauswartName.trim() ? { name: hauswartName.trim(), telefon: hauswartTelefon.trim() || '–' } : undefined;
    onSave({
      ...(liegenschaft ? { id: liegenschaft.id } : {}),
      bezeichnung: bezeichnung.trim(),
      ...(objektNummer.trim() ? { objektNummer: objektNummer.trim() } : {}),
      adresse: { strasse: strasse.trim(), hausnummer: hausnummer.trim(), plz: info.plz, ort },
      // jh# 016 Neue Liegenschaften bekommen die Ortsmitte – Geokodierung der Adresse folgt mit der API.
      koordinaten: liegenschaft && liegenschaft.adresse.ort === ort ? liegenschaft.koordinaten : info.mitte,
      kundeId: kunde.id,
      ...(hauswart ? { hauswart } : {}),
      ...(zugang.trim() ? { zugang: zugang.trim() } : {}),
      hinweise,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={liegenschaft ? `${liegenschaft.bezeichnung} bearbeiten` : `Neue Liegenschaft für ${kunde.kurzname}`}
      untertitel="Zugang, Hauswart und Hinweise sieht der Techniker auf der Einsatzkarte."
      breite="md"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" icon={Save} onClick={speichern} disabled={!bereit}>
            {liegenschaft ? 'Speichern' : 'Anlegen'}
          </Button>
        </>
      }
    >
      <div className={styles.formular}>
        <div className={styles.zeile}>
          <Feld label="Bezeichnung" render={(id) => <Eingabe id={id} value={bezeichnung} placeholder="MFH Talackerstrasse 41" onChange={(event) => setBezeichnung(event.target.value)} />} />
          <Feld label="Objektnummer" hinweis="Nummer der Verwaltung, optional" render={(id) => <Eingabe id={id} value={objektNummer} mono placeholder="LG-2210" onChange={(event) => setObjektNummer(event.target.value)} />} />
        </div>
        <div className={styles.zeileAdresse}>
          <Feld label="Strasse" render={(id) => <Eingabe id={id} value={strasse} onChange={(event) => setStrasse(event.target.value)} />} />
          <Feld label="Nr." render={(id) => <Eingabe id={id} value={hausnummer} mono onChange={(event) => setHausnummer(event.target.value)} />} />
          <Feld
            label="Ort"
            render={(id) => (
              <Auswahl id={id} value={ort} onChange={(event) => setOrt(event.target.value as Ort)}>
                {ORTE.map((info) => (
                  <option key={info.ort} value={info.ort}>
                    {info.plz} {info.ort}
                  </option>
                ))}
              </Auswahl>
            )}
          />
        </div>
        <div className={styles.zeile}>
          <Feld label="Hauswart" render={(id) => <Eingabe id={id} value={hauswartName} placeholder="Name" onChange={(event) => setHauswartName(event.target.value)} />} />
          <Feld label="Telefon Hauswart" render={(id) => <Eingabe id={id} value={hauswartTelefon} mono inputMode="tel" onChange={(event) => setHauswartTelefon(event.target.value)} />} />
        </div>
        <Feld label="Zugang" render={(id) => <Eingabe id={id} value={zugang} placeholder="Schlüssel beim Hauswart, EG links" onChange={(event) => setZugang(event.target.value)} />} />
        <HinweisFelder hinweise={hinweise} onChange={setHinweise} />
      </div>
    </Dialog>
  );
}

/* ◆ jh · eof */
