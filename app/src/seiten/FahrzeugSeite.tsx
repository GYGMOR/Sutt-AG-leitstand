/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/FahrzeugSeite.tsx                       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Fahrzeug: Bestand an Bord, Verbrauch melden, Nachschub, Lieferungen   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { MinusCircle, Package, PackageCheck, PackagePlus, Truck } from 'lucide-react';
import { ARTIKEL_GRUPPE_LABEL, fahrzeugOrt } from '@sl/core/domain/lager';
import type { Artikel, ArtikelGruppe } from '@sl/core/domain/lager';
import { formatDatumKurz } from '@sl/core/format';
import { Button, IconButton } from '@sl/core/ui/Button';
import { CapsLabel } from '@sl/core/ui/CapsLabel';
import { Chip } from '@sl/core/ui/Chip';
import { Auswahl, Eingabe, Feld } from '@sl/core/ui/Form';
import { cx } from '@sl/core/ui/cx';
import styles from '../bausteine/Seiten.module.css';
import { useApp } from '../rahmen/AppKontext';
import werkzeuge from './Werkzeuge.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface Bordeintrag {
  artikel: Artikel;
  menge: number;
}

const GRUPPEN: readonly ArtikelGruppe[] = ['ersatzteil', 'zubehoer', 'verbrauch'];

// jh› Verbrauch ausserhalb des Rapports (Kleinteil, Testlauf) und Nachschub direkt aus dem Auto:
//     beides landet als Bewegung bzw. Bestellung im Lager des Leitstands – dieselben Datensätze.
export function FahrzeugSeite() {
  const { techniker, heute, state, aktionen } = useApp();
  const [nachschubArtikel, setNachschubArtikel] = useState('');
  const [nachschubMenge, setNachschubMenge] = useState('1');
  const [meldung, setMeldung] = useState<string | null>(null);
  const ort = techniker ? fahrzeugOrt(techniker.id) : null;

  const anBord = useMemo<Bordeintrag[]>(
    () =>
      ort
        ? state.bestaende
            .filter((bestand) => bestand.ort === ort && bestand.menge > 0)
            .map((bestand) => ({ artikel: state.stammdaten.artikel.get(bestand.artikelNummer), menge: bestand.menge }))
            .filter((eintrag): eintrag is Bordeintrag => eintrag.artikel !== undefined)
            .sort((a, b) => a.artikel.bezeichnung.localeCompare(b.artikel.bezeichnung, 'de-CH'))
        : [],
    [state.bestaende, state.stammdaten.artikel, ort],
  );
  const katalog = useMemo(() => [...state.stammdaten.artikel.values()].sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, 'de-CH')), [state.stammdaten.artikel]);
  const meineAuftraege = useMemo(() => new Set(state.einsaetze.filter((einsatz) => techniker && einsatz.technikerId === techniker.id).map((einsatz) => einsatz.auftragId)), [state.einsaetze, techniker]);
  const lieferungen = useMemo(
    () => state.bestellungen.filter((bestellung) => bestellung.status === 'offen' && bestellung.auftragId && meineAuftraege.has(bestellung.auftragId)).sort((a, b) => a.liefertermin.localeCompare(b.liefertermin)),
    [state.bestellungen, meineAuftraege],
  );
  const stueck = anBord.reduce((summe, eintrag) => summe + eintrag.menge, 0);

  if (!techniker || !ort) return <p className={styles.leer}>Kein Techniker verknüpft – das Fahrzeuglager gehört zu einem Techniker.</p>;

  const verbrauch = (eintrag: Bordeintrag) => {
    aktionen.verbrauchMelden(eintrag.artikel.artikelNummer, ort, 1, 'Verbrauch gemeldet (App, Fahrzeug)');
    setMeldung(`1× ${eintrag.artikel.bezeichnung} abgebucht`);
  };

  const nachschub = (event: FormEvent) => {
    event.preventDefault();
    const menge = Number(nachschubMenge);
    if (!nachschubArtikel || !Number.isFinite(menge) || menge <= 0) return;
    const bestellung = aktionen.bestellen({ artikelNummer: nachschubArtikel, menge });
    setMeldung(bestellung ? `Nachschub ${bestellung.nummer}: ${menge}× ${bestellung.bezeichnung}, Liefertermin ${formatDatumKurz(bestellung.liefertermin)} – das Büro bucht ins Fahrzeug um.` : 'Bestellung nicht möglich');
    setNachschubArtikel('');
    setNachschubMenge('1');
  };

  return (
    <div className={styles.seite}>
      <header className={styles.seitentitel}>
        <h1>Fahrzeug</h1>
        <span>{techniker.fahrzeug}</span>
      </header>

      <section className={styles.leiste}>
        <div>
          <span className={styles.leisteZahl}>{anBord.length}</span>
          <span className={styles.leisteLabel}>Artikel</span>
        </div>
        <div>
          <span className={styles.leisteZahl}>{stueck}</span>
          <span className={styles.leisteLabel}>Stück</span>
        </div>
        <div>
          <span className={styles.leisteZahl}>{anBord.filter((eintrag) => eintrag.artikel.gruppe === 'ersatzteil' && eintrag.menge <= 1).length}</span>
          <span className={styles.leisteLabel}>knapp</span>
        </div>
        <div>
          <span className={styles.leisteZahl}>{lieferungen.length}</span>
          <span className={styles.leisteLabel}>unterwegs</span>
        </div>
      </section>

      {meldung && (
        <p className={styles.bestaetigung} role="status">
          <PackageCheck size={16} strokeWidth={1.5} aria-hidden /> {meldung}
        </p>
      )}

      <div className={styles.zweispaltig}>
        <div className={styles.spalte}>
          {GRUPPEN.map((gruppe) => {
            const eintraege = anBord.filter((eintrag) => eintrag.artikel.gruppe === gruppe);
            if (eintraege.length === 0) return null;
            return (
              <section key={gruppe} className={styles.abschnitt}>
                <CapsLabel as="h3">{ARTIKEL_GRUPPE_LABEL[gruppe]}</CapsLabel>
                <ul className={styles.bord}>
                  {eintraege.map((eintrag) => (
                    <li key={eintrag.artikel.artikelNummer} className={styles.bordZeile}>
                      <Package size={16} strokeWidth={1.5} aria-hidden className={styles.bordIcon} />
                      <span className={styles.bordText}>
                        <span>{eintrag.artikel.bezeichnung}</span>
                        <span className={styles.quelle}>
                          {eintrag.artikel.artikelNummer}
                          {eintrag.artikel.marke && ` · ${eintrag.artikel.marke}`}
                        </span>
                      </span>
                      <span className={cx(styles.mono, styles.bordMenge, gruppe === 'ersatzteil' && eintrag.menge <= 1 && styles.bordKnapp)}>{eintrag.menge}</span>
                      <IconButton icon={MinusCircle} label={`1× ${eintrag.artikel.bezeichnung} verbraucht`} size="sm" onClick={() => verbrauch(eintrag)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {anBord.length === 0 && <p className={styles.leer}>Nichts an Bord – das Büro füllt das Fahrzeug im Lager auf.</p>}
        </div>

        <div className={styles.spalte}>
          <section className={styles.abschnitt}>
            <CapsLabel as="h3">Nachschub anfordern</CapsLabel>
            <p className={styles.hinweisKarte}>
              <Truck size={16} strokeWidth={1.5} aria-hidden /> Wird als Bestellung im Lager angelegt; nach dem Wareneingang bucht das Büro Glattbrugg → {techniker.fahrzeug}.
            </p>
            <form className={werkzeuge.eingabeZeile} onSubmit={nachschub}>
              <Feld
                label="Artikel"
                render={(id) => (
                  <Auswahl id={id} value={nachschubArtikel} onChange={(event) => setNachschubArtikel(event.target.value)}>
                    <option value="">Artikel wählen …</option>
                    {katalog.map((artikel) => (
                      <option key={artikel.artikelNummer} value={artikel.artikelNummer}>
                        {artikel.bezeichnung}
                        {artikel.marke ? ` · ${artikel.marke}` : ''}
                      </option>
                    ))}
                  </Auswahl>
                )}
              />
              <Feld label="Menge" render={(id) => <Eingabe id={id} type="number" min={1} max={99} value={nachschubMenge} mono onChange={(event) => setNachschubMenge(event.target.value)} />} />
            </form>
            <div className={styles.aktionen}>
              <Button variant="primary" size="md" icon={PackagePlus} disabled={!nachschubArtikel} onClick={(event) => nachschub(event as unknown as FormEvent)}>
                Anfordern
              </Button>
            </div>
          </section>

          {lieferungen.length > 0 && (
            <section className={styles.abschnitt}>
              <CapsLabel as="h3">Unterwegs für meine Aufträge</CapsLabel>
              <ul className={styles.bord}>
                {lieferungen.map((bestellung) => {
                  const auftrag = bestellung.auftragId ? state.stammdaten.auftraege.get(bestellung.auftragId) : undefined;
                  return (
                    <li key={bestellung.id} className={styles.bordZeile}>
                      <PackageCheck size={16} strokeWidth={1.5} aria-hidden className={styles.bordIcon} />
                      <span className={styles.bordText}>
                        <span>
                          {bestellung.menge}× {bestellung.bezeichnung}
                        </span>
                        <span className={styles.quelle}>{auftrag ? `${auftrag.nummer} · ${auftrag.fehlerbild}` : 'Lager'}</span>
                      </span>
                      <Chip tone={bestellung.liefertermin < heute ? 'danger' : bestellung.liefertermin === heute ? 'ok' : 'neutral'}>{formatDatumKurz(bestellung.liefertermin)}</Chip>
                      <span />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ◆ jh · eof */
