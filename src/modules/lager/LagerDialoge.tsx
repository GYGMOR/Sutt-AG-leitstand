/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/lager/LagerDialoge.tsx                     │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Umbuchen, Bestand korrigieren, Artikel bearbeiten                     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Save, SlidersHorizontal } from 'lucide-react';
import { LAGER_GLATTBRUGG, bestandVon } from '../../core/domain/lager';
import type { Artikel, LagerOrt, Lagerbestand } from '../../core/domain/lager';
import { Button } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Auswahl, Eingabe, Feld } from '../../core/ui/Form';
import type { DispoStammdaten } from '../dispo/dispo.types';
import { ALLE_ORTE } from './lager.model';
import styles from './LagerPage.module.css';

// ── §1 · Umbuchen ────────────────────────────────────────────────

interface UmbuchenDialogProps {
  open: boolean;
  stammdaten: Pick<DispoStammdaten, 'artikel' | 'techniker'>;
  bestaende: readonly Lagerbestand[];
  artikelNummer?: string;
  von?: LagerOrt;
  nach?: LagerOrt;
  onClose: () => void;
  onUmbuchen: (artikelNummer: string, von: LagerOrt, nach: LagerOrt, menge: number, text?: string) => void;
}

// jh› Umbuchen ist die Alltagsbewegung: Glattbrugg → Fahrzeug am Morgen, zurück am Abend.
export function UmbuchenDialog({ open, stammdaten, bestaende, artikelNummer, von, nach, onClose, onUmbuchen }: UmbuchenDialogProps) {
  const artikelListe = useMemo(() => [...stammdaten.artikel.values()].sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, 'de-CH')), [stammdaten.artikel]);
  const orte = useMemo(() => ALLE_ORTE(stammdaten), [stammdaten]);
  const [gewaehlt, setGewaehlt] = useState(artikelNummer ?? artikelListe[0]?.artikelNummer ?? '');
  const [vonOrt, setVonOrt] = useState<LagerOrt>(von ?? LAGER_GLATTBRUGG);
  const [nachOrt, setNachOrt] = useState<LagerOrt>(nach ?? orte[1]?.ort ?? LAGER_GLATTBRUGG);
  const [menge, setMenge] = useState('1');
  const [text, setText] = useState('');

  useEffect(() => {
    if (!open) return;
    setGewaehlt(artikelNummer ?? artikelListe[0]?.artikelNummer ?? '');
    setVonOrt(von ?? LAGER_GLATTBRUGG);
    setNachOrt(nach ?? orte[1]?.ort ?? LAGER_GLATTBRUGG);
    setMenge('1');
    setText('');
  }, [open, artikelNummer, von, nach, artikelListe, orte]);

  const verfuegbar = bestandVon(bestaende, gewaehlt, vonOrt);
  const anzahl = Math.max(0, Math.floor(Number(menge) || 0));
  const bereit = gewaehlt !== '' && vonOrt !== nachOrt && anzahl > 0 && anzahl <= verfuegbar;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel="Umbuchen"
      untertitel="Bestand von einem Ort zum anderen – mit Eintrag im Journal."
      breite="sm"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            icon={ArrowRightLeft}
            disabled={!bereit}
            onClick={() => {
              onUmbuchen(gewaehlt, vonOrt, nachOrt, anzahl, text.trim() || undefined);
              onClose();
            }}
          >
            Umbuchen
          </Button>
        </>
      }
    >
      <div className={styles.formular}>
        <Feld
          label="Artikel"
          render={(id) => (
            <Auswahl id={id} value={gewaehlt} onChange={(event) => setGewaehlt(event.target.value)} disabled={artikelNummer !== undefined}>
              {artikelListe.map((eintrag) => (
                <option key={eintrag.artikelNummer} value={eintrag.artikelNummer}>
                  {eintrag.bezeichnung} · {eintrag.artikelNummer}
                </option>
              ))}
            </Auswahl>
          )}
        />
        <div className={styles.zeile}>
          <Feld
            label="Von"
            hinweis={`Verfügbar: ${verfuegbar}`}
            render={(id) => (
              <Auswahl id={id} value={vonOrt} onChange={(event) => setVonOrt(event.target.value as LagerOrt)}>
                {orte.map((eintrag) => (
                  <option key={eintrag.ort} value={eintrag.ort}>
                    {eintrag.label}
                  </option>
                ))}
              </Auswahl>
            )}
          />
          <Feld
            label="Nach"
            render={(id) => (
              <Auswahl id={id} value={nachOrt} onChange={(event) => setNachOrt(event.target.value as LagerOrt)}>
                {orte.map((eintrag) => (
                  <option key={eintrag.ort} value={eintrag.ort}>
                    {eintrag.label}
                  </option>
                ))}
              </Auswahl>
            )}
          />
        </div>
        <div className={styles.zeile}>
          <Feld label="Menge" fehler={anzahl > verfuegbar ? 'Mehr als verfügbar' : undefined} render={(id) => <Eingabe id={id} type="number" min={1} max={verfuegbar} value={menge} mono onChange={(event) => setMenge(event.target.value)} />} />
          <Feld label="Bemerkung" render={(id) => <Eingabe id={id} value={text} placeholder="z. B. Fahrzeug aufgefüllt" onChange={(event) => setText(event.target.value)} />} />
        </div>
      </div>
    </Dialog>
  );
}

// ── §2 · Bestand korrigieren ─────────────────────────────────────

interface KorrekturDialogProps {
  open: boolean;
  artikel: Artikel;
  stammdaten: Pick<DispoStammdaten, 'techniker'>;
  bestaende: readonly Lagerbestand[];
  onClose: () => void;
  onKorrigieren: (ort: LagerOrt, neueMenge: number, grund: string) => void;
}

export function KorrekturDialog({ open, artikel, stammdaten, bestaende, onClose, onKorrigieren }: KorrekturDialogProps) {
  const orte = useMemo(() => ALLE_ORTE(stammdaten), [stammdaten]);
  const [ort, setOrt] = useState<LagerOrt>(LAGER_GLATTBRUGG);
  const [menge, setMenge] = useState(String(bestandVon(bestaende, artikel.artikelNummer, LAGER_GLATTBRUGG)));
  const [grund, setGrund] = useState('');

  useEffect(() => {
    if (open) setMenge(String(bestandVon(bestaende, artikel.artikelNummer, ort)));
  }, [open, ort, bestaende, artikel.artikelNummer]);

  const neu = Math.max(0, Math.floor(Number(menge) || 0));
  const aktuell = bestandVon(bestaende, artikel.artikelNummer, ort);
  const bereit = neu !== aktuell && grund.trim().length >= 3;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={`Bestand korrigieren · ${artikel.bezeichnung}`}
      untertitel="Nach Inventur oder Zählung – die Differenz steht im Journal."
      breite="sm"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            icon={SlidersHorizontal}
            disabled={!bereit}
            onClick={() => {
              onKorrigieren(ort, neu, grund.trim());
              onClose();
            }}
          >
            Korrigieren
          </Button>
        </>
      }
    >
      <div className={styles.formular}>
        <Feld
          label="Ort"
          render={(id) => (
            <Auswahl id={id} value={ort} onChange={(event) => setOrt(event.target.value as LagerOrt)}>
              {orte.map((eintrag) => (
                <option key={eintrag.ort} value={eintrag.ort}>
                  {eintrag.label}
                </option>
              ))}
            </Auswahl>
          )}
        />
        <div className={styles.zeile}>
          <Feld label="Gezählter Bestand" hinweis={`Bisher ${aktuell}`} render={(id) => <Eingabe id={id} type="number" min={0} value={menge} mono onChange={(event) => setMenge(event.target.value)} />} />
          <Feld label="Grund" render={(id) => <Eingabe id={id} value={grund} placeholder="Inventur, Bruch, Fehlbuchung …" onChange={(event) => setGrund(event.target.value)} />} />
        </div>
      </div>
    </Dialog>
  );
}

// ── §3 · Artikel bearbeiten ──────────────────────────────────────

interface ArtikelDialogProps {
  open: boolean;
  artikel: Artikel;
  onClose: () => void;
  onSave: (artikel: Artikel) => void;
}

export function ArtikelDialog({ open, artikel, onClose, onSave }: ArtikelDialogProps) {
  const [bezeichnung, setBezeichnung] = useState(artikel.bezeichnung);
  const [lieferant, setLieferant] = useState(artikel.lieferant);
  const [preis, setPreis] = useState(String(artikel.preisChf));
  const [mindestbestand, setMindestbestand] = useState(String(artikel.mindestbestand));

  const preisChf = Number(preis);
  const mindest = Math.max(0, Math.floor(Number(mindestbestand) || 0));
  const bereit = bezeichnung.trim().length >= 2 && lieferant.trim().length >= 2 && Number.isFinite(preisChf) && preisChf >= 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={`Artikel ${artikel.artikelNummer}`}
      untertitel="Mindestbestand steuert die Kachel «knapp» und den Vorschlag zum Auffüllen."
      breite="sm"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            icon={Save}
            disabled={!bereit}
            onClick={() => {
              onSave({ ...artikel, bezeichnung: bezeichnung.trim(), lieferant: lieferant.trim(), preisChf: Math.round(preisChf * 20) / 20, mindestbestand: mindest });
              onClose();
            }}
          >
            Speichern
          </Button>
        </>
      }
    >
      <div className={styles.formular}>
        <Feld label="Bezeichnung" render={(id) => <Eingabe id={id} value={bezeichnung} onChange={(event) => setBezeichnung(event.target.value)} />} />
        <Feld label="Lieferant" render={(id) => <Eingabe id={id} value={lieferant} onChange={(event) => setLieferant(event.target.value)} />} />
        <div className={styles.zeile}>
          <Feld label={`Preis CHF je ${artikel.einheit}`} render={(id) => <Eingabe id={id} type="number" min={0} step={0.05} value={preis} mono onChange={(event) => setPreis(event.target.value)} />} />
          <Feld label="Mindestbestand Glattbrugg" render={(id) => <Eingabe id={id} type="number" min={0} value={mindestbestand} mono onChange={(event) => setMindestbestand(event.target.value)} />} />
        </div>
      </div>
    </Dialog>
  );
}

/* ◆ jh · eof */
