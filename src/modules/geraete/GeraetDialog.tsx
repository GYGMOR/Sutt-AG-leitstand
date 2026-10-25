/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/geraete/GeraetDialog.tsx                   │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Gerät bearbeiten: Marke, Art, Modell, Typ, Seriennummer, Garantie     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import { Save } from 'lucide-react';
import { parseIsoInput } from '../../core/datum';
import { GERAETEARTEN, KENNUNG_LABEL, MARKEN } from '../../core/domain/stammdaten';
import type { Geraet, Geraeteart, Marke } from '../../core/domain/stammdaten';
import { Button } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Auswahl, Eingabe, Feld } from '../../core/ui/Form';
import styles from './GeraetePage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface GeraetDialogProps {
  open: boolean;
  geraet: Geraet;
  onClose: () => void;
  onSave: (geraet: Geraet) => void;
}

export function GeraetDialog({ open, geraet, onClose, onSave }: GeraetDialogProps) {
  const [marke, setMarke] = useState<Marke>(geraet.marke);
  const [art, setArt] = useState<Geraeteart>(geraet.art);
  const [modell, setModell] = useState(geraet.modell);
  const [typNummer, setTypNummer] = useState(geraet.typNummer);
  const [seriennummer, setSeriennummer] = useState(geraet.seriennummer);
  const [baujahr, setBaujahr] = useState(String(geraet.baujahr));
  const [garantieBis, setGarantieBis] = useState(geraet.garantieBis ?? '');

  const jahr = Number(baujahr);
  const garantie = garantieBis ? parseIsoInput(garantieBis) : null;
  const bereit = modell.trim().length > 0 && seriennummer.trim().length > 0 && jahr >= 1990 && jahr <= 2030 && (garantieBis === '' || garantie !== null);

  const speichern = () => {
    if (!bereit) return;
    const { garantieBis: _alt, ...rest } = geraet;
    onSave({ ...rest, marke, art, modell: modell.trim(), typNummer: typNummer.trim() || 'noch nicht erfasst', seriennummer: seriennummer.trim(), baujahr: jahr, ...(garantie ? { garantieBis: garantie } : {}) });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel="Gerät bearbeiten"
      untertitel="Typenschild-Angaben gelten sofort in Akte, Rapport und Suche."
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
          <Feld
            label="Marke"
            render={(id) => (
              <Auswahl id={id} value={marke} onChange={(event) => setMarke(event.target.value as Marke)}>
                {MARKEN.map((eintrag) => (
                  <option key={eintrag} value={eintrag}>
                    {eintrag}
                  </option>
                ))}
              </Auswahl>
            )}
          />
          <Feld
            label="Geräteart"
            render={(id) => (
              <Auswahl id={id} value={art} onChange={(event) => setArt(event.target.value as Geraeteart)}>
                {GERAETEARTEN.map((eintrag) => (
                  <option key={eintrag} value={eintrag}>
                    {eintrag}
                  </option>
                ))}
              </Auswahl>
            )}
          />
        </div>
        <div className={styles.zeile}>
          <Feld label="Modell" render={(id) => <Eingabe id={id} value={modell} onChange={(event) => setModell(event.target.value)} />} />
          <Feld label="Typnummer" render={(id) => <Eingabe id={id} value={typNummer} mono onChange={(event) => setTypNummer(event.target.value)} />} />
        </div>
        <div className={styles.zeile}>
          <Feld label={KENNUNG_LABEL[marke]} render={(id) => <Eingabe id={id} value={seriennummer} mono onChange={(event) => setSeriennummer(event.target.value)} />} />
          <Feld label="Baujahr" render={(id) => <Eingabe id={id} type="number" min={1990} max={2030} value={baujahr} mono onChange={(event) => setBaujahr(event.target.value)} />} />
        </div>
        <Feld label="Garantie bis" hinweis="Leer lassen, wenn keine Garantie besteht" render={(id) => <Eingabe id={id} type="date" value={garantieBis} mono onChange={(event) => setGarantieBis(event.target.value)} />} />
      </div>
    </Dialog>
  );
}

/* ◆ jh · eof */
