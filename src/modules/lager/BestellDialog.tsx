/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/lager/BestellDialog.tsx                    │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Bestellen: Artikel, Menge, Liefertermin – für Auftrag oder Lager      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useHeute } from '../../core/arbeitstag';
import { parseIsoInput } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import { liefertermin as lieferterminAb } from '../../core/domain/lager';
import { formatChf } from '../../core/format';
import { Button } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Auswahl, Eingabe, Feld } from '../../core/ui/Form';
import type { DispoStammdaten } from '../dispo/dispo.types';
import styles from './BestellDialog.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

export interface BestellAngaben {
  artikelNummer: string;
  menge: number;
  auftragId?: string;
  liefertermin: IsoDatum;
}

interface BestellDialogProps {
  open: boolean;
  stammdaten: Pick<DispoStammdaten, 'artikel' | 'auftraege'>;
  /** Vorbelegung: Artikel und/oder Auftrag. */
  artikelNummer?: string;
  auftragId?: string;
  onClose: () => void;
  onBestellen: (angaben: BestellAngaben) => void;
}

export function BestellDialog({ open, stammdaten, artikelNummer, auftragId, onClose, onBestellen }: BestellDialogProps) {
  const heute = useHeute();
  const artikelListe = useMemo(() => [...stammdaten.artikel.values()].sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, 'de-CH')), [stammdaten.artikel]);
  const [gewaehlt, setGewaehlt] = useState(artikelNummer ?? artikelListe[0]?.artikelNummer ?? '');
  const [menge, setMenge] = useState('1');
  const [termin, setTermin] = useState<string>(lieferterminAb(heute));

  useEffect(() => {
    if (!open) return;
    setGewaehlt(artikelNummer ?? artikelListe[0]?.artikelNummer ?? '');
    setMenge('1');
    setTermin(lieferterminAb(heute));
  }, [open, artikelNummer, artikelListe, heute]);

  const artikel = stammdaten.artikel.get(gewaehlt);
  const auftrag = auftragId ? stammdaten.auftraege.get(auftragId) : undefined;
  const anzahl = Math.max(0, Math.floor(Number(menge) || 0));
  const datum = parseIsoInput(termin);
  const bereit = artikel !== undefined && anzahl > 0 && datum !== null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={auftrag ? `Teil bestellen für ${auftrag.nummer}` : 'Lager auffüllen'}
      untertitel={auftrag ? auftrag.fehlerbild : 'Bestellung beim Lieferanten, Wareneingang in Glattbrugg'}
      breite="sm"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            icon={ShoppingCart}
            disabled={!bereit}
            onClick={() => {
              if (!bereit || !datum) return;
              onBestellen({ artikelNummer: gewaehlt, menge: anzahl, liefertermin: datum, ...(auftragId ? { auftragId } : {}) });
              onClose();
            }}
          >
            Bestellen
          </Button>
        </>
      }
    >
      <div className={styles.inhalt}>
        <Feld
          label="Artikel"
          render={(id) => (
            <Auswahl id={id} value={gewaehlt} onChange={(event) => setGewaehlt(event.target.value)}>
              {artikelListe.map((eintrag) => (
                <option key={eintrag.artikelNummer} value={eintrag.artikelNummer}>
                  {eintrag.bezeichnung} · {eintrag.artikelNummer}
                  {eintrag.marke ? ` · ${eintrag.marke}` : ''}
                </option>
              ))}
            </Auswahl>
          )}
        />
        <div className={styles.zeile}>
          <Feld label="Menge" render={(id) => <Eingabe id={id} type="number" min={1} value={menge} mono onChange={(event) => setMenge(event.target.value)} />} />
          <Feld label="Liefertermin" hinweis="Drei Arbeitstage angenommen" render={(id) => <Eingabe id={id} type="date" value={termin} mono onChange={(event) => setTermin(event.target.value)} />} />
        </div>
        {artikel && (
          <p className={styles.hinweis}>
            Lieferant {artikel.lieferant} · {formatChf(artikel.preisChf)} je {artikel.einheit} · Mindestbestand {artikel.mindestbestand}
          </p>
        )}
      </div>
    </Dialog>
  );
}

/* ◆ jh · eof */
