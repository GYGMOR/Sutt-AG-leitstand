/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/kunden/KundeDialog.tsx                     │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Kunde bearbeiten: Name, Art, Kontakt, Adresse, Hinweise               │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import { Save } from 'lucide-react';
import { KUNDENART_LABEL, ORTE, ortInfo } from '../../core/domain/stammdaten';
import type { Kunde, KundenHinweis, Kundenart, Ort } from '../../core/domain/stammdaten';
import { Button } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Auswahl, Eingabe, Feld } from '../../core/ui/Form';
import { HinweisFelder } from './HinweisFelder';
import styles from './KundenPage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface KundeDialogProps {
  open: boolean;
  kunde: Kunde;
  onClose: () => void;
  onSave: (kunde: Kunde) => void;
}

const KUNDENARTEN: readonly Kundenart[] = ['verwaltung', 'privat', 'gewerbe'];

export function KundeDialog({ open, kunde, onClose, onSave }: KundeDialogProps) {
  const [name, setName] = useState(kunde.name);
  const [kurzname, setKurzname] = useState(kunde.kurzname);
  const [art, setArt] = useState<Kundenart>(kunde.art);
  const [kontaktName, setKontaktName] = useState(kunde.kontakt.name);
  const [telefon, setTelefon] = useState(kunde.kontakt.telefon);
  const [email, setEmail] = useState(kunde.kontakt.email ?? '');
  const [strasse, setStrasse] = useState(kunde.adresse.strasse);
  const [hausnummer, setHausnummer] = useState(kunde.adresse.hausnummer);
  const [ort, setOrt] = useState<Ort>(kunde.adresse.ort);
  const [hinweise, setHinweise] = useState<readonly KundenHinweis[]>(kunde.hinweise);

  const bereit = name.trim().length >= 2 && kontaktName.trim().length >= 2 && telefon.trim().length >= 7 && strasse.trim().length > 0;

  const speichern = () => {
    if (!bereit) return;
    const mail = email.trim();
    onSave({
      ...kunde,
      name: name.trim(),
      kurzname: kurzname.trim() || name.trim(),
      art,
      kontakt: { name: kontaktName.trim(), telefon: telefon.trim(), ...(mail ? { email: mail } : {}) },
      adresse: { strasse: strasse.trim(), hausnummer: hausnummer.trim(), plz: ortInfo(ort).plz, ort },
      hinweise,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={`${kunde.nummer} bearbeiten`}
      untertitel="Kontakt und Hinweise gelten sofort in Akte, Plan und Techniker-App."
      breite="md"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" icon={Save} onClick={speichern} disabled={!bereit}>
            Speichern
          </Button>
        </>
      }
    >
      <div className={styles.formular}>
        <div className={styles.zeile}>
          <Feld label="Name" render={(id) => <Eingabe id={id} value={name} onChange={(event) => setName(event.target.value)} />} />
          <Feld label="Kurzname" hinweis="Für enge Blöcke im Plan" render={(id) => <Eingabe id={id} value={kurzname} onChange={(event) => setKurzname(event.target.value)} />} />
        </div>
        <div className={styles.zeile}>
          <Feld
            label="Kundenart"
            render={(id) => (
              <Auswahl id={id} value={art} onChange={(event) => setArt(event.target.value as Kundenart)}>
                {KUNDENARTEN.map((eintrag) => (
                  <option key={eintrag} value={eintrag}>
                    {KUNDENART_LABEL[eintrag]}
                  </option>
                ))}
              </Auswahl>
            )}
          />
          <Feld label="Kontaktperson" render={(id) => <Eingabe id={id} value={kontaktName} onChange={(event) => setKontaktName(event.target.value)} />} />
        </div>
        <div className={styles.zeile}>
          <Feld label="Telefon" render={(id) => <Eingabe id={id} value={telefon} mono inputMode="tel" onChange={(event) => setTelefon(event.target.value)} />} />
          <Feld label="E-Mail" render={(id) => <Eingabe id={id} value={email} inputMode="email" onChange={(event) => setEmail(event.target.value)} />} />
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
        <HinweisFelder hinweise={hinweise} onChange={setHinweise} />
      </div>
    </Dialog>
  );
}

/* ◆ jh · eof */
