/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/lager/ArtikelDossier.tsx                   │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Artikel: Bestände je Ort, Bestellungen, Verwendung, Journal           │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { ArrowRightLeft, Pencil, ShoppingCart, SlidersHorizontal } from 'lucide-react';
import { useHeute } from '../../core/arbeitstag';
import { ARTIKEL_GRUPPE_LABEL, BESTAND_STUFE_LABEL, BEWEGUNG_LABEL, LAGER_GLATTBRUGG } from '../../core/domain/lager';
import type { LagerOrt } from '../../core/domain/lager';
import { formatChf, formatDatumKurz, formatZeitpunktKurz } from '../../core/format';
import { Button, IconButton } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { DossierAbschnitt, DossierKopf, Fakten } from '../../core/ui/ModulSeite';
import { Typenschild } from '../../core/ui/Typenschild';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import { cx } from '../../core/ui/cx';
import type { DispoStammdaten } from '../dispo/dispo.types';
import type { DispoState } from '../dispo/store/dispo.reducer';
import type { DispoAktionen } from '../dispo/store/useDispoAktionen';
import { BestellDialog } from './BestellDialog';
import { ArtikelDialog, KorrekturDialog, UmbuchenDialog } from './LagerDialoge';
import { ALLE_ORTE, ortLabel } from './lager.model';
import type { ArtikelView } from './lager.model';
import styles from './LagerPage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface ArtikelDossierProps {
  view: ArtikelView;
  stammdaten: DispoStammdaten;
  state: Pick<DispoState, 'bestaende' | 'bewegungen'>;
  aktionen: DispoAktionen;
}

const STUFE_TON = { ok: 'ok', knapp: 'signal', leer: 'danger' } as const;
const JOURNAL_LAENGE = 10;
const VERWENDUNG_LAENGE = 8;

export function ArtikelDossier({ view, stammdaten, state, aktionen }: ArtikelDossierProps) {
  const heute = useHeute();
  const { artikel } = view;
  const [dialog, setDialog] = useState<'keiner' | 'bestellen' | 'umbuchen' | 'korrektur' | 'bearbeiten'>('keiner');
  const [umbuchenNach, setUmbuchenNach] = useState<LagerOrt | undefined>(undefined);

  const bestaende = useMemo(() => ALLE_ORTE(stammdaten).map((ort) => ({ ...ort, menge: state.bestaende.find((bestand) => bestand.artikelNummer === artikel.artikelNummer && bestand.ort === ort.ort)?.menge ?? 0 })), [stammdaten, state.bestaende, artikel.artikelNummer]);
  const journal = useMemo(() => state.bewegungen.filter((bewegung) => bewegung.artikelNummer === artikel.artikelNummer).slice(0, JOURNAL_LAENGE), [state.bewegungen, artikel.artikelNummer]);
  const verwendung = useMemo(
    () =>
      [...stammdaten.auftraege.values()]
        .filter((auftrag) => auftrag.ersatzteile.some((teil) => teil.artikelNummer === artikel.artikelNummer))
        .sort((a, b) => b.angefragtAm.localeCompare(a.angefragtAm))
        .slice(0, VERWENDUNG_LAENGE),
    [stammdaten.auftraege, artikel.artikelNummer],
  );

  const schliessen = () => {
    setDialog('keiner');
    setUmbuchenNach(undefined);
  };

  return (
    <div className={styles.dossier}>
      <DossierKopf
        kennung={
          <>
            <Typenschild label="Artikel" wert={artikel.artikelNummer} size="md" />
            <Chip tone={STUFE_TON[view.stufe]} size="md">
              {BESTAND_STUFE_LABEL[view.stufe]} · {view.glattbrugg}
            </Chip>
            <Chip tone="neutral" size="md">
              {ARTIKEL_GRUPPE_LABEL[artikel.gruppe]}
            </Chip>
            {artikel.marke && (
              <Chip tone="mute" size="md">
                {artikel.marke}
              </Chip>
            )}
          </>
        }
        titel={artikel.bezeichnung}
        untertitel={`${artikel.lieferant} · ${formatChf(artikel.preisChf)} je ${artikel.einheit}${artikel.passtZu ? ` · ${artikel.passtZu}` : ''}`}
        aktionen={
          <>
            <Button variant="primary" size="sm" icon={ShoppingCart} onClick={() => setDialog('bestellen')}>
              Bestellen
            </Button>
            <Button variant="secondary" size="sm" icon={ArrowRightLeft} onClick={() => setDialog('umbuchen')}>
              Umbuchen
            </Button>
            <IconButton icon={SlidersHorizontal} label="Bestand korrigieren" size="sm" onClick={() => setDialog('korrektur')} />
            <IconButton icon={Pencil} label="Artikel bearbeiten" size="sm" onClick={() => setDialog('bearbeiten')} />
          </>
        }
      />

      <DossierAbschnitt titel="Bestände je Ort" zusatz={<span className={styles.mono}>Mindestbestand {artikel.mindestbestand}</span>}>
        <ul className={styles.orte}>
          {bestaende
            .filter((eintrag) => eintrag.ort === LAGER_GLATTBRUGG || eintrag.menge > 0)
            .map((eintrag) => (
              <li key={eintrag.ort} className={cx(styles.ort, eintrag.ort === LAGER_GLATTBRUGG && styles.ortHaupt)}>
                <span className={styles.ortLabel}>{eintrag.label}</span>
                <span className={styles.ortBalken} aria-hidden>
                  <span className={styles.ortFuellung} style={{ width: `${Math.min(100, (eintrag.menge / Math.max(1, artikel.mindestbestand * 3)) * 100)}%` }} />
                </span>
                <span className={cx(styles.mono, styles.ortMenge)}>{eintrag.menge}</span>
                {eintrag.ort !== LAGER_GLATTBRUGG && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={ArrowRightLeft}
                    onClick={() => {
                      setUmbuchenNach(eintrag.ort);
                      setDialog('umbuchen');
                    }}
                  >
                    Auffüllen
                  </Button>
                )}
              </li>
            ))}
        </ul>
        {bestaende.filter((eintrag) => eintrag.ort !== LAGER_GLATTBRUGG && eintrag.menge > 0).length === 0 && <p className={styles.leer}>In keinem Fahrzeug – über «Umbuchen» ein Fahrzeug bestücken.</p>}
      </DossierAbschnitt>

      <DossierAbschnitt titel="Offene Bestellungen" zusatz={<span className={styles.mono}>{view.offeneBestellungen.length}</span>}>
        {view.offeneBestellungen.length === 0 && <p className={styles.leer}>Nichts bestellt.</p>}
        <ul className={styles.liste}>
          {view.offeneBestellungen.map((bestellung) => (
            <li key={bestellung.id} className={styles.listenZeile}>
              <Verweis zu={ZIEL.bestellung(bestellung.id)} label="Bestellung" wert={bestellung.nummer} text={`${bestellung.menge}× · ${bestellung.lieferant}`} />
              <Chip tone={bestellung.liefertermin < heute ? 'danger' : bestellung.liefertermin === heute ? 'ok' : 'neutral'}>Liefertermin {formatDatumKurz(bestellung.liefertermin)}</Chip>
            </li>
          ))}
        </ul>
      </DossierAbschnitt>

      <DossierAbschnitt titel="Verwendung in Aufträgen" zusatz={<span className={styles.mono}>{view.verwendungen}</span>}>
        {verwendung.length === 0 && <p className={styles.leer}>Noch in keinem Auftrag.</p>}
        <ul className={styles.liste}>
          {verwendung.map((auftrag) => {
            const teil = auftrag.ersatzteile.find((kandidat) => kandidat.artikelNummer === artikel.artikelNummer);
            return (
              <li key={auftrag.id} className={styles.listenZeile}>
                <Verweis zu={ZIEL.auftrag(auftrag.id)} label="Auftrag" wert={auftrag.nummer} text={auftrag.fehlerbild} />
                {teil && <Chip tone={teil.status === 'ab-lager' || teil.status === 'eingetroffen' ? 'ok' : 'signal'}>{teil.status === 'ab-lager' ? 'ab Lager' : teil.status}</Chip>}
              </li>
            );
          })}
        </ul>
      </DossierAbschnitt>

      <DossierAbschnitt titel="Journal" zusatz={<span className={styles.mono}>{journal.length}</span>}>
        {journal.length === 0 && <p className={styles.leer}>Noch keine Bewegung.</p>}
        <ul className={styles.journal}>
          {journal.map((bewegung) => (
            <li key={bewegung.id} className={styles.journalZeile}>
              <span className={styles.mono}>{formatZeitpunktKurz(bewegung.zeitpunkt)}</span>
              <Chip tone={bewegung.art === 'wareneingang' ? 'ok' : bewegung.art === 'verbrauch' ? 'neutral' : 'mute'}>{BEWEGUNG_LABEL[bewegung.art]}</Chip>
              <span className={cx(styles.mono, styles.journalMenge, bewegung.art === 'verbrauch' && styles.journalMinus)}>
                {bewegung.art === 'verbrauch' || bewegung.art === 'retoure' ? '−' : bewegung.art === 'korrektur' && bewegung.menge < 0 ? '' : '+'}
                {Math.abs(bewegung.menge)}
              </span>
              <span className={styles.journalText}>
                {bewegung.von && ortLabel(bewegung.von, stammdaten)}
                {bewegung.von && bewegung.nach && ' → '}
                {bewegung.nach && ortLabel(bewegung.nach, stammdaten)}
                {bewegung.text && ` · ${bewegung.text}`} · {bewegung.benutzer}
              </span>
              {bewegung.auftragId && stammdaten.auftraege.has(bewegung.auftragId) && <Verweis zu={ZIEL.auftrag(bewegung.auftragId)} label="Auftrag" wert={stammdaten.auftraege.get(bewegung.auftragId)?.nummer ?? ''} />}
            </li>
          ))}
        </ul>
      </DossierAbschnitt>

      <Fakten
        eintraege={[
          { label: 'Preis', wert: `${formatChf(artikel.preisChf)} je ${artikel.einheit}`, mono: true },
          { label: 'Lieferant', wert: artikel.lieferant },
          { label: 'Passt zu', wert: artikel.passtZu ?? '–' },
          { label: 'Gesamt', wert: `${view.glattbrugg} in Glattbrugg · ${view.fahrzeuge} in Fahrzeugen`, mono: true },
        ]}
      />

      <BestellDialog open={dialog === 'bestellen'} stammdaten={stammdaten} artikelNummer={artikel.artikelNummer} onClose={schliessen} onBestellen={(angaben) => aktionen.bestellen(angaben)} />
      <UmbuchenDialog
        open={dialog === 'umbuchen'}
        stammdaten={stammdaten}
        bestaende={state.bestaende}
        artikelNummer={artikel.artikelNummer}
        {...(umbuchenNach ? { nach: umbuchenNach } : {})}
        onClose={schliessen}
        onUmbuchen={aktionen.umbuchen}
      />
      {dialog === 'korrektur' && <KorrekturDialog open artikel={artikel} stammdaten={stammdaten} bestaende={state.bestaende} onClose={schliessen} onKorrigieren={(ort, menge, grund) => aktionen.bestandKorrigieren(artikel.artikelNummer, ort, menge, grund)} />}
      {dialog === 'bearbeiten' && <ArtikelDialog open artikel={artikel} onClose={schliessen} onSave={aktionen.updateArtikel} />}
    </div>
  );
}

/* ◆ jh · eof */
