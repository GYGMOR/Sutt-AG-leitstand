/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/lager/LagerPage.tsx                        │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Modul Lager: Artikel, Bestellungen, Fahrzeuge, Journal – ein Stand    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, PackageCheck, ShoppingCart, Warehouse } from 'lucide-react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { meldeAenderungen } from '../../core/aenderungen';
import { useArbeitstag } from '../../core/arbeitstag';
import { ARTIKEL_GRUPPEN, ARTIKEL_GRUPPE_LABEL, BESTAND_STUFE_LABEL, BESTELL_STATUS_LABEL, BEWEGUNG_LABEL, LAGER_GLATTBRUGG } from '../../core/domain/lager';
import type { ArtikelGruppe, LagerOrt } from '../../core/domain/lager';
import { fullName } from '../../core/domain/stammdaten';
import { formatChf, formatDatumKurz, formatZeitpunktKurz } from '../../core/format';
import { useHotkey } from '../../core/hooks/useHotkey';
import { useRegisterKommandos } from '../../core/kommando';
import type { Kommando } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { findModul } from '../../core/modules.config';
import { Avatar } from '../../core/ui/Avatar';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { Auswahl } from '../../core/ui/Form';
import { Kacheln } from '../../core/ui/Kacheln';
import type { Kachel } from '../../core/ui/Kacheln';
import { Leer } from '../../core/ui/Leer';
import { ModulSeite, ModulWerkzeuge } from '../../core/ui/ModulSeite';
import { Suchfeld } from '../../core/ui/Suchfeld';
import { Tabelle } from '../../core/ui/Tabelle';
import type { Spalte } from '../../core/ui/Tabelle';
import { Typenschild } from '../../core/ui/Typenschild';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import { cx } from '../../core/ui/cx';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '../../mock';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { useDemoReset } from '../dispo/store/useDemoReset';
import { useGlobaleSuchquellen } from '../suche/globaleSuche';
import { ArtikelDossier } from './ArtikelDossier';
import { BestellDialog } from './BestellDialog';
import { BestellungDossier } from './BestellungDossier';
import { UmbuchenDialog } from './LagerDialoge';
import { BESTELL_SICHTEN, LEERER_ARTIKEL_FILTER, buildArtikelViews, buildBestellungViews, buildBewegungViews, buildFahrzeugViews, filterArtikel, filterBestellungen, ortLabel, zaehleLager } from './lager.model';
import type { ArtikelFilter, ArtikelSicht, ArtikelView, BestellSicht, BestellungView, BewegungView } from './lager.model';
import styles from './LagerPage.module.css';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Bereiche & Spalten ──────────────────────────────────────

const BEREICHE = ['artikel', 'bestellungen', 'fahrzeuge', 'journal'] as const;
type Bereich = (typeof BEREICHE)[number];

function isBereich(wert: string | undefined): wert is Bereich {
  return wert !== undefined && (BEREICHE as readonly string[]).includes(wert);
}

const STUFE_TON = { ok: 'ok', knapp: 'signal', leer: 'danger' } as const;

const ARTIKEL_SPALTEN: readonly Spalte<ArtikelView>[] = [
  { id: 'nummer', label: 'Artikel', render: (view) => <Typenschild label="Art." wert={view.artikel.artikelNummer} />, sortWert: (view) => view.artikel.artikelNummer, breite: '140px' },
  {
    id: 'bezeichnung',
    label: 'Bezeichnung',
    render: (view) => (
      <span className={styles.zelle}>
        <span className={styles.zelleHaupt}>{view.artikel.bezeichnung}</span>
        <span className={styles.zelleMeta}>
          {view.artikel.marke ?? ARTIKEL_GRUPPE_LABEL[view.artikel.gruppe]}
          {view.artikel.passtZu && ` · ${view.artikel.passtZu}`}
        </span>
      </span>
    ),
    sortWert: (view) => view.artikel.bezeichnung,
  },
  { id: 'glattbrugg', label: 'Glattbrugg', render: (view) => view.glattbrugg, sortWert: (view) => view.glattbrugg, align: 'right', mono: true },
  { id: 'stufe', label: 'Stand', render: (view) => <Chip tone={STUFE_TON[view.stufe]}>{BESTAND_STUFE_LABEL[view.stufe]}</Chip>, sortWert: (view) => ['leer', 'knapp', 'ok'].indexOf(view.stufe) },
  { id: 'fahrzeuge', label: 'Fahrzeuge', render: (view) => view.fahrzeuge, sortWert: (view) => view.fahrzeuge, align: 'right', mono: true, nebensaechlich: true },
  { id: 'mindest', label: 'Min.', render: (view) => view.artikel.mindestbestand, sortWert: (view) => view.artikel.mindestbestand, align: 'right', mono: true, nebensaechlich: true },
  { id: 'bestellt', label: 'Bestellt', render: (view) => (view.offeneBestellungen.length > 0 ? `${view.offeneBestellungen.reduce((summe, bestellung) => summe + bestellung.menge, 0)} unterwegs` : <span className={styles.leerWert}>–</span>), sortWert: (view) => view.offeneBestellungen.length, nebensaechlich: true },
  { id: 'preis', label: 'Preis', render: (view) => formatChf(view.artikel.preisChf), sortWert: (view) => view.artikel.preisChf, align: 'right', mono: true, nebensaechlich: true },
];

const BESTELL_SPALTEN: readonly Spalte<BestellungView>[] = [
  { id: 'nummer', label: 'Bestellung', render: (view) => <Typenschild label="Best." wert={view.bestellung.nummer} />, sortWert: (view) => view.bestellung.nummer, breite: '130px' },
  {
    id: 'artikel',
    label: 'Artikel',
    render: (view) => (
      <span className={styles.zelle}>
        <span className={styles.zelleHaupt}>
          {view.bestellung.menge}× {view.bestellung.bezeichnung}
        </span>
        <span className={styles.zelleMeta}>
          {view.bestellung.artikelNummer} · {view.bestellung.lieferant}
        </span>
      </span>
    ),
    sortWert: (view) => view.bestellung.bezeichnung,
  },
  { id: 'bestellt', label: 'Bestellt', render: (view) => formatZeitpunktKurz(view.bestellung.bestelltAm), sortWert: (view) => view.bestellung.bestelltAm, mono: true, nebensaechlich: true },
  {
    id: 'liefertermin',
    label: 'Liefertermin',
    render: (view) => <Chip tone={view.ueberfaellig ? 'danger' : view.heute ? 'ok' : view.bestellung.status === 'offen' ? 'neutral' : 'mute'}>{formatDatumKurz(view.bestellung.liefertermin)}</Chip>,
    sortWert: (view) => view.bestellung.liefertermin,
  },
  { id: 'auftrag', label: 'Auftrag', render: (view) => (view.auftrag ? <Verweis zu={ZIEL.auftrag(view.auftrag.id)} label="Auftrag" wert={view.auftrag.nummer} text={view.kunde?.kurzname} /> : <span className={styles.leerWert}>Lager</span>), sortWert: (view) => view.auftrag?.nummer ?? '', nebensaechlich: true },
  { id: 'status', label: 'Status', render: (view) => <Chip tone={view.bestellung.status === 'offen' ? 'signal' : view.bestellung.status === 'eingetroffen' ? 'ok' : 'mute'}>{BESTELL_STATUS_LABEL[view.bestellung.status]}</Chip>, sortWert: (view) => view.bestellung.status },
];

const JOURNAL_SPALTEN = (ortName: (ort: LagerOrt) => string): readonly Spalte<BewegungView>[] => [
  { id: 'zeit', label: 'Zeit', render: (view) => formatZeitpunktKurz(view.bewegung.zeitpunkt), sortWert: (view) => view.bewegung.zeitpunkt, mono: true, breite: '110px' },
  { id: 'art', label: 'Art', render: (view) => <Chip tone={view.bewegung.art === 'wareneingang' ? 'ok' : view.bewegung.art === 'verbrauch' ? 'neutral' : 'mute'}>{BEWEGUNG_LABEL[view.bewegung.art]}</Chip>, sortWert: (view) => view.bewegung.art },
  { id: 'artikel', label: 'Artikel', render: (view) => (view.artikel ? <Verweis zu={ZIEL.artikel(view.artikel.artikelNummer)} label="Art." wert={view.artikel.artikelNummer} text={view.artikel.bezeichnung} /> : view.bewegung.artikelNummer), sortWert: (view) => view.artikel?.bezeichnung ?? '' },
  { id: 'menge', label: 'Menge', render: (view) => <span className={cx(view.bewegung.art === 'verbrauch' && styles.journalMinus)}>{view.bewegung.art === 'verbrauch' || view.bewegung.art === 'retoure' ? '−' : view.bewegung.menge < 0 ? '' : '+'}{Math.abs(view.bewegung.menge)}</span>, sortWert: (view) => view.bewegung.menge, align: 'right', mono: true },
  { id: 'weg', label: 'Von → Nach', render: (view) => `${view.bewegung.von ? ortName(view.bewegung.von) : '–'} → ${view.bewegung.nach ? ortName(view.bewegung.nach) : '–'}`, nebensaechlich: true },
  { id: 'auftrag', label: 'Auftrag', render: (view) => (view.auftrag ? <Verweis zu={ZIEL.auftrag(view.auftrag.id)} label="Auftrag" wert={view.auftrag.nummer} /> : <span className={styles.leerWert}>–</span>), sortWert: (view) => view.auftrag?.nummer ?? '', nebensaechlich: true },
  { id: 'wer', label: 'Wer · Text', render: (view) => `${view.bewegung.benutzer}${view.bewegung.text ? ` · ${view.bewegung.text}` : ''}`, nebensaechlich: true },
];

// ── §2 · Seite ───────────────────────────────────────────────────

export function LagerPage() {
  const { bereich } = useParams();
  if (!isBereich(bereich)) return <Navigate to="/lager/artikel" replace />;
  return <LagerInhalt bereich={bereich} />;
}

function LagerInhalt({ bereich }: { bereich: Bereich }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { heute } = useArbeitstag();
  const state = useDispoState();
  const aktionen = useDispoAktionen();
  const { stammdaten, bestaende, bestellungen, bewegungen } = state;

  const [artikelFilter, setArtikelFilter] = useState<ArtikelFilter>(LEERER_ARTIKEL_FILTER);
  const [bestellSicht, setBestellSicht] = useState<BestellSicht>('offen');
  const [bestellSuche, setBestellSuche] = useState('');
  const [auffuellen, setAuffuellen] = useState(false);
  const [umbuchen, setUmbuchen] = useState<{ offen: boolean; nach?: LagerOrt }>({ offen: false });

  const artikelViews = useMemo(() => buildArtikelViews(stammdaten, bestaende, bestellungen), [stammdaten, bestaende, bestellungen]);
  const bestellViews = useMemo(() => buildBestellungViews(stammdaten, bestellungen, heute), [stammdaten, bestellungen, heute]);
  const fahrzeugViews = useMemo(() => buildFahrzeugViews(stammdaten, bestaende), [stammdaten, bestaende]);
  const journal = useMemo(() => buildBewegungViews(stammdaten, bewegungen), [stammdaten, bewegungen]);
  const zaehler = useMemo(() => zaehleLager(artikelViews, bestellViews, fahrzeugViews), [artikelViews, bestellViews, fahrzeugViews]);
  const sichtbareArtikel = useMemo(() => filterArtikel(artikelViews, artikelFilter), [artikelViews, artikelFilter]);
  const sichtbareBestellungen = useMemo(() => filterBestellungen(bestellViews, bestellSicht, bestellSuche), [bestellViews, bestellSicht, bestellSuche]);

  const artikelNummer = params.get('artikel');
  const bestellungId = params.get('bestellung');
  const gewaehlterArtikel = bereich === 'artikel' && artikelNummer ? (artikelViews.find((view) => view.artikel.artikelNummer === artikelNummer) ?? null) : null;
  const gewaehlteBestellung = bereich === 'bestellungen' && bestellungId ? (bestellViews.find((view) => view.bestellung.id === bestellungId) ?? null) : null;
  const detailOffen = (bereich === 'artikel' && artikelNummer !== null) || (bereich === 'bestellungen' && bestellungId !== null);

  useGlobaleSuchquellen();
  useEffect(() => {
    meldeAenderungen('dispo', state.protokoll.length);
  }, [state.protokoll.length]);

  const zurListe = useCallback(() => navigate(`/lager/${bereich}`), [navigate, bereich]);
  useHotkey({ key: 'Escape', inInputs: true }, () => {
    if (auffuellen || umbuchen.offen) return;
    if (detailOffen) zurListe();
  });

  // jh› Kacheln sind Sprungmarken: Zahl → Bereich + Sicht, der Stand bleibt derselbe.
  const kacheln: Kachel[] = [
    { id: 'artikel', label: 'Artikel', zahl: zaehler.artikel },
    { id: 'knapp', label: 'Knapp', zahl: zaehler.knapp, ton: zaehler.knapp > 0 ? 'signal' : 'mute' },
    { id: 'leer', label: 'Nicht am Lager', zahl: zaehler.leer, ton: zaehler.leer > 0 ? 'danger' : 'mute' },
    { id: 'offen', label: 'Bestellt', zahl: zaehler.offen },
    { id: 'ueberfaellig', label: 'Überfällig', zahl: zaehler.ueberfaellig, ton: zaehler.ueberfaellig > 0 ? 'danger' : 'mute' },
    { id: 'heute', label: 'Lieferung heute', zahl: zaehler.heute, ton: zaehler.heute > 0 ? 'ok' : 'mute' },
    { id: 'fahrzeuge', label: 'In Fahrzeugen', zahl: zaehler.fahrzeugStueck },
    { id: 'journal', label: 'Bewegungen', zahl: bewegungen.length },
  ];
  const aktiveKachel = bereich === 'artikel' ? (artikelFilter.sicht === 'alle' ? 'artikel' : artikelFilter.sicht) : bereich === 'bestellungen' ? (bestellSicht === 'ueberfaellig' ? 'ueberfaellig' : bestellSicht === 'heute' ? 'heute' : 'offen') : bereich;

  const kachelWahl = useCallback(
    (id: string) => {
      if (id === 'artikel' || id === 'knapp' || id === 'leer') {
        setArtikelFilter((aktuell) => ({ ...aktuell, sicht: id === 'artikel' ? 'alle' : (id as ArtikelSicht) }));
        navigate('/lager/artikel');
        return;
      }
      if (id === 'offen' || id === 'ueberfaellig' || id === 'heute') {
        setBestellSicht(id);
        navigate('/lager/bestellungen');
        return;
      }
      navigate(`/lager/${id}`);
    },
    [navigate],
  );

  const demoReset = useDemoReset();
  const kommandos = useMemo<Kommando[]>(
    () => [
      { id: 'lager:auffuellen', label: 'Lager auffüllen (Bestellung)', gruppe: 'aktion', icon: ShoppingCart, run: () => setAuffuellen(true) },
      { id: 'lager:umbuchen', label: 'Umbuchen Glattbrugg → Fahrzeug', gruppe: 'aktion', icon: ArrowRightLeft, run: () => setUmbuchen({ offen: true }) },
      ...kacheln.map<Kommando>((kachel) => ({ id: `lager:${kachel.id}`, label: `Lager: ${kachel.label}`, gruppe: 'ansicht', icon: Warehouse, run: () => kachelWahl(kachel.id) })),
      demoReset.kommando,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kachelWahl, demoReset.kommando],
  );
  useRegisterKommandos('lager', kommandos);

  const ortName = useCallback((ort: LagerOrt) => ortLabel(ort, stammdaten), [stammdaten]);
  const journalSpalten = useMemo(() => JOURNAL_SPALTEN(ortName), [ortName]);

  return (
    <AppShell modul={findModul('lager')} menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <ModulSeite
        label="Lager & Ersatzteile"
        detailOffen={detailOffen}
        onZurueck={zurListe}
        liste={
          <>
            <Kacheln kacheln={kacheln} aktiv={aktiveKachel} onWahl={kachelWahl} label="Bereich" />

            {bereich === 'artikel' && (
              <>
                <ModulWerkzeuge anzahl={`${sichtbareArtikel.length} von ${artikelViews.length}`}>
                  <Suchfeld wert={artikelFilter.suche} onChange={(suche) => setArtikelFilter((aktuell) => ({ ...aktuell, suche }))} placeholder="Artikelnummer, Bezeichnung, Marke, Lieferant …" label="Artikel durchsuchen" />
                  <Auswahl value={artikelFilter.gruppe} aria-label="Gruppe" onChange={(event) => setArtikelFilter((aktuell) => ({ ...aktuell, gruppe: event.target.value as ArtikelGruppe | 'alle' }))}>
                    <option value="alle">Alle Gruppen</option>
                    {ARTIKEL_GRUPPEN.map((gruppe) => (
                      <option key={gruppe} value={gruppe}>
                        {ARTIKEL_GRUPPE_LABEL[gruppe]}
                      </option>
                    ))}
                  </Auswahl>
                  <Button variant="secondary" size="sm" icon={ArrowRightLeft} onClick={() => setUmbuchen({ offen: true })}>
                    Umbuchen
                  </Button>
                  <Button variant="primary" size="sm" icon={ShoppingCart} onClick={() => setAuffuellen(true)}>
                    Auffüllen
                  </Button>
                </ModulWerkzeuge>
                <Tabelle spalten={ARTIKEL_SPALTEN} zeilen={sichtbareArtikel} zeilenId={(view) => view.artikel.artikelNummer} label="Artikel" aktivId={artikelNummer} onZeile={(view) => navigate(ZIEL.artikel(view.artikel.artikelNummer))} standardSortierung={{ id: 'stufe', richtung: 'auf' }} leer="Keine Artikel in dieser Sicht." />
              </>
            )}

            {bereich === 'bestellungen' && (
              <>
                <ModulWerkzeuge anzahl={`${sichtbareBestellungen.length} von ${bestellViews.length}`}>
                  <Suchfeld wert={bestellSuche} onChange={setBestellSuche} placeholder="Nummer, Artikel, Lieferant, Auftrag, Kunde …" label="Bestellungen durchsuchen" />
                  <Auswahl value={bestellSicht} aria-label="Sicht" onChange={(event) => setBestellSicht(event.target.value as BestellSicht)}>
                    {BESTELL_SICHTEN.map((sicht) => (
                      <option key={sicht.id} value={sicht.id}>
                        {sicht.label}
                      </option>
                    ))}
                  </Auswahl>
                  <Button variant="primary" size="sm" icon={ShoppingCart} onClick={() => setAuffuellen(true)}>
                    Bestellen
                  </Button>
                </ModulWerkzeuge>
                <Tabelle spalten={BESTELL_SPALTEN} zeilen={sichtbareBestellungen} zeilenId={(view) => view.bestellung.id} label="Bestellungen" aktivId={bestellungId} onZeile={(view) => navigate(ZIEL.bestellung(view.bestellung.id))} standardSortierung={{ id: 'liefertermin', richtung: 'auf' }} leer="Keine Bestellungen in dieser Sicht." />
              </>
            )}

            {bereich === 'fahrzeuge' && (
              <div className={styles.fahrzeuge}>
                {fahrzeugViews.map((view) => (
                  <section key={view.techniker.id} className={styles.fahrzeug} aria-label={`Fahrzeug ${view.techniker.kuerzel}`}>
                    <header className={styles.fahrzeugKopf}>
                      <Avatar techniker={view.techniker} size="md" />
                      <div className={styles.fahrzeugTitel}>
                        <strong>{fullName(view.techniker)}</strong>
                        <span className={styles.zelleMeta}>
                          {view.techniker.fahrzeug} · {view.stueck} Stück
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" icon={ArrowRightLeft} onClick={() => setUmbuchen({ offen: true, nach: view.ort })}>
                        Auffüllen
                      </Button>
                    </header>
                    {view.eintraege.length === 0 && <p className={styles.leer}>Fahrzeug ist leer.</p>}
                    <ul className={styles.fahrzeugListe}>
                      {view.eintraege.map((eintrag) => (
                        <li key={eintrag.artikel.artikelNummer} className={styles.fahrzeugZeile}>
                          <Verweis zu={ZIEL.artikel(eintrag.artikel.artikelNummer)} label="Art." wert={eintrag.artikel.artikelNummer} text={eintrag.artikel.bezeichnung} />
                          <span className={styles.mono}>{eintrag.menge}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            {bereich === 'journal' && (
              <>
                <ModulWerkzeuge anzahl={`${journal.length} Bewegungen`}>
                  <span className={styles.journalHinweis}>
                    <PackageCheck size={16} strokeWidth={1.5} aria-hidden /> Jede Bestandsänderung ist eine Bewegung – Wareneingang, Umbuchung, Verbrauch aus dem Rapport, Korrektur.
                  </span>
                </ModulWerkzeuge>
                <Tabelle spalten={journalSpalten} zeilen={journal} zeilenId={(view) => view.bewegung.id} label="Journal" standardSortierung={{ id: 'zeit', richtung: 'ab' }} leer="Noch keine Bewegung." />
              </>
            )}
          </>
        }
        detail={
          gewaehlterArtikel ? (
            <ArtikelDossier view={gewaehlterArtikel} stammdaten={stammdaten} state={state} aktionen={aktionen} />
          ) : gewaehlteBestellung ? (
            <BestellungDossier view={gewaehlteBestellung} stammdaten={stammdaten} aktionen={aktionen} />
          ) : (
            <Leer icon={Warehouse} titel="Nicht gefunden" text="Der Datensatz existiert nicht mehr oder gehört zu einem anderen Stand." fuellend>
              <Button variant="secondary" size="sm" onClick={zurListe}>
                Zur Liste
              </Button>
            </Leer>
          )
        }
      />
      <BestellDialog open={auffuellen} stammdaten={stammdaten} onClose={() => setAuffuellen(false)} onBestellen={(angaben) => aktionen.bestellen(angaben)} />
      <UmbuchenDialog open={umbuchen.offen} stammdaten={stammdaten} bestaende={bestaende} von={LAGER_GLATTBRUGG} {...(umbuchen.nach ? { nach: umbuchen.nach } : {})} onClose={() => setUmbuchen({ offen: false })} onUmbuchen={aktionen.umbuchen} />
    </AppShell>
  );
}

/* ◆ jh · eof */
