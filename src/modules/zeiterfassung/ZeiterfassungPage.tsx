/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/zeiterfassung/ZeiterfassungPage.tsx        │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Modul Zeiterfassung: Liste, Tag, Woche, Monat, Jahr, Dossier          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Download } from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { meldeAenderungen } from '../../core/aenderungen';
import { ladeHerunter } from '../../core/datei';
import { addDays, parseIsoInput, startOfWeek } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import { absenzenFuerSicht } from '../../core/domain/absenz';
import { ABSCHLUSS_STATUS_LABEL, jahrVon, monatVerschieben, monatVon } from '../../core/domain/zeit';
import type { MonatsSchluessel } from '../../core/domain/zeit';
import { formatDatum, formatDauer, formatSaldo, formatWochentag, formatZeit } from '../../core/format';
import { useHotkey } from '../../core/hooks/useHotkey';
import { useNow } from '../../core/hooks/useNow';
import { useRegisterKommandos } from '../../core/kommando';
import type { Kommando } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { useMandant } from '../../core/mandant/mandantStore';
import { findModul } from '../../core/modules.config';
import { Button, IconButton } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { Kacheln } from '../../core/ui/Kacheln';
import type { Kachel, KachelTon } from '../../core/ui/Kacheln';
import { Leer } from '../../core/ui/Leer';
import { ModulSeite, ModulWerkzeuge } from '../../core/ui/ModulSeite';
import { SegmentedControl } from '../../core/ui/SegmentedControl';
import { Suchfeld } from '../../core/ui/Suchfeld';
import { Tabelle } from '../../core/ui/Tabelle';
import type { Spalte } from '../../core/ui/Tabelle';
import { jetztInZone } from '../../core/zeitzone';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '../../mock';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { useDemoReset } from '../dispo/store/useDemoReset';
import { PersonZelle } from '../personal/PersonAvatar';
import { buildPersonViews, csvZeilen, exportName } from '../personal/personal.model';
import type { ZeitQuelle } from '../personal/personal.model';
import { useRechte } from '../personal/rechte';
import personal from '../personal/Personal.module.css';
import { useGlobaleSuchquellen } from '../suche/globaleSuche';
import { JahresMatrix, MonatsMatrix } from './MonatsMatrix';
import { TagesBild } from './TagesBild';
import { WochenUebersicht } from './WochenUebersicht';
import { ZeitkontoDossier } from './ZeitkontoDossier';
import { ZEIT_ANSICHTEN, ZEIT_SICHTEN, angestelltImMonat, buildJahresZeilen, buildTagesZeilen, buildWochenZeilen, buildZeitZeilen, filterZeit, isAnsicht, isMonat, isMontag, jahresCsv, matrixCsv, matrixTage, monatLabel, wochenCsv, wochenLabel, wochenTage, zaehleZeit } from './zeiterfassung.model';
import type { ZeitAnsicht, ZeitSicht, ZeitZeile } from './zeiterfassung.model';
import raster from './Zeitraster.module.css';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Spalten der Liste ───────────────────────────────────────

const SICHT_TON: Readonly<Record<ZeitSicht, KachelTon>> = { alle: 'neutral', eingestempelt: 'ok', warnungen: 'danger', pruefen: 'signal', eingereicht: 'signal', 'ohne-abschluss': 'mute' };
const ABSCHLUSS_TON = { eingereicht: 'signal', genehmigt: 'ok', zurueckgewiesen: 'danger' } as const;

function saldoKlasse(minuten: number): string | undefined {
  if (minuten > 0) return personal.plus;
  if (minuten < 0) return personal.minus;
  return undefined;
}

const SPALTEN: readonly Spalte<ZeitZeile>[] = [
  { id: 'person', label: 'Mitarbeiter/in', render: (zeile) => <PersonZelle mitarbeiter={zeile.person.mitarbeiter} techniker={zeile.person.techniker} />, sortWert: (zeile) => `${zeile.person.mitarbeiter.nachname} ${zeile.person.mitarbeiter.vorname}` },
  {
    id: 'heute',
    label: 'Heute',
    render: (zeile) => {
      if (zeile.lage.status === 'arbeitet') return <Chip tone="ok">seit {formatZeit(zeile.lage.seitMin ?? 0)}</Chip>;
      if (zeile.lage.status === 'pause') return <Chip tone="neutral">Pause</Chip>;
      return zeile.lage.kommenMin === null ? <span className={personal.leerWert}>–</span> : <span className={personal.mono}>{formatDauer(zeile.lage.arbeitMin)}</span>;
    },
    sortWert: (zeile) => ({ arbeitet: 0, pause: 1, draussen: 2 })[zeile.lage.status],
  },
  { id: 'soll', label: 'Soll', render: (zeile) => formatDauer(zeile.konto.periode.sollMin), sortWert: (zeile) => zeile.konto.periode.sollMin, align: 'right', mono: true, nebensaechlich: true },
  { id: 'ist', label: 'Ist', render: (zeile) => formatDauer(zeile.konto.periode.arbeitMin), sortWert: (zeile) => zeile.konto.periode.arbeitMin, align: 'right', mono: true },
  { id: 'saldo', label: 'Saldo Monat', render: (zeile) => <span className={saldoKlasse(zeile.konto.periode.saldoMin)}>{formatSaldo(zeile.konto.periode.saldoMin)}</span>, sortWert: (zeile) => zeile.konto.periode.saldoMin, align: 'right', mono: true },
  { id: 'kumuliert', label: 'Saldo total', render: (zeile) => <span className={saldoKlasse(zeile.konto.saldoKumuliertMin)}>{formatSaldo(zeile.konto.saldoKumuliertMin)}</span>, sortWert: (zeile) => zeile.konto.saldoKumuliertMin, align: 'right', mono: true, nebensaechlich: true },
  { id: 'ferien', label: 'Ferien Rest', render: (zeile) => `${zeile.ferien.restTage} Tage`, sortWert: (zeile) => zeile.ferien.restTage, align: 'right', mono: true, nebensaechlich: true },
  {
    id: 'warnungen',
    label: 'Warnungen',
    render: (zeile) => {
      const anzahl = zeile.konto.periode.tageMitWarnung + zeile.konto.ruhezeit.length;
      return anzahl > 0 ? (
        <Chip tone="danger" icon={AlertTriangle}>
          {anzahl}
        </Chip>
      ) : (
        <span className={personal.leerWert}>–</span>
      );
    },
    sortWert: (zeile) => zeile.konto.periode.tageMitWarnung,
    nebensaechlich: true,
  },
  {
    id: 'abschluss',
    label: 'Abschluss',
    render: (zeile) => (zeile.konto.abschluss ? <Chip tone={ABSCHLUSS_TON[zeile.konto.abschluss.status]}>{ABSCHLUSS_STATUS_LABEL[zeile.konto.abschluss.status]}</Chip> : <span className={personal.leerWert}>offen</span>),
    sortWert: (zeile) => zeile.konto.abschluss?.status ?? 'zzz',
  },
];

// ── §2 · Seite ───────────────────────────────────────────────────

interface Periode {
  label: string;
  zurueck: () => void;
  vor: () => void;
  heute: () => void;
  labelZurueck: string;
  labelVor: string;
}

export function ZeiterfassungPage() {
  const { mitarbeiterId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { search } = useLocation();
  const state = useDispoState();
  const mandant = useMandant();
  const rechte = useRechte();
  const aktionen = useDispoAktionen();

  // jh› «Heute» und «jetzt» gelten in der Zone des Betriebs, nicht in der des Geräts (Europe/Zurich).
  const uhr = jetztInZone(mandant.zeitzone, useNow());
  const heute = uhr.datum;
  const jetztMin = uhr.minuten;

  const ansichtParam = params.get('ansicht');
  const ansicht: ZeitAnsicht = isAnsicht(ansichtParam) ? ansichtParam : 'liste';
  const monatParam = params.get('monat');
  const monat: MonatsSchluessel = isMonat(monatParam) ? monatParam : monatVon(heute);
  const wocheParam = params.get('woche');
  const woche: IsoDatum = isMontag(wocheParam) ? wocheParam : startOfWeek(heute);
  const tag: IsoDatum = parseIsoInput(params.get('tag')) ?? heute;
  const jahr = jahrVon(monat);
  // jh› Die Sichten (Kacheln) und die Suche zählen immer über den Monat, in dem die Ansicht gerade steht.
  const anker: MonatsSchluessel = ansicht === 'woche' ? monatVon(woche) : ansicht === 'tag' ? monatVon(tag) : monat;
  const [sicht, setSicht] = useState<ZeitSicht>('alle');
  const [suche, setSuche] = useState('');

  // jh› Krankheit und Unfall erscheinen in den Übersichten nur mit dem Recht «personal:gesundheit» – sonst als
  //     «Abwesend» (DSG Art. 5 lit. c). Das eigene Dossier zeigt die eigenen Daten immer vollständig.
  const quelle = useMemo<ZeitQuelle>(
    () => ({ zeiteintraege: state.zeiteintraege, monatsabschluesse: state.monatsabschluesse, einsaetze: state.einsaetze, stammdaten: { absenzen: absenzenFuerSicht(state.stammdaten.absenzen, rechte.gesundheit) } }),
    [state.zeiteintraege, state.monatsabschluesse, state.einsaetze, state.stammdaten.absenzen, rechte.gesundheit],
  );
  const eigene = mitarbeiterId !== undefined && mitarbeiterId === rechte.mitarbeiter?.id;

  // jh› Ausgetretene erscheinen nur in Monaten, in denen sie noch angestellt waren.
  const sichtbare = useMemo(() => rechte.sichtbare('zeit').filter((person) => angestelltImMonat(person, anker)), [rechte, anker]);
  const personen = useMemo(() => buildPersonViews(state.stammdaten, heute, sichtbare), [state.stammdaten, heute, sichtbare]);
  const zeilen = useMemo(() => buildZeitZeilen(personen, anker, quelle, mandant, heute, jetztMin), [personen, anker, quelle, mandant, heute, jetztMin]);
  const zaehler = useMemo(() => zaehleZeit(zeilen, heute), [zeilen, heute]);
  const sichtbar = useMemo(() => filterZeit(zeilen, sicht, suche, heute), [zeilen, sicht, suche, heute]);
  const gefiltert = useMemo(() => sichtbar.map((zeile) => zeile.person), [sichtbar]);
  const wochenZeilen = useMemo(() => (ansicht === 'woche' ? buildWochenZeilen(gefiltert, woche, quelle, mandant, heute, jetztMin) : []), [ansicht, gefiltert, woche, quelle, mandant, heute, jetztMin]);
  const jahresZeilen = useMemo(() => (ansicht === 'jahr' ? buildJahresZeilen(gefiltert, jahr, quelle, mandant, heute, jetztMin) : []), [ansicht, gefiltert, jahr, quelle, mandant, heute, jetztMin]);
  const tagesZeilen = useMemo(() => (ansicht === 'tag' ? buildTagesZeilen(gefiltert, tag, quelle, mandant, heute, jetztMin) : []), [ansicht, gefiltert, tag, quelle, mandant, heute, jetztMin]);
  const tageMatrix = useMemo(() => matrixTage(monat, mandant, heute), [monat, mandant, heute]);

  // jh› Das Dossier rechnet mit dem Monat aus der URL – unabhängig davon, in welcher Ansicht die Liste steht.
  const gewaehlt = useMemo<ZeitZeile | null>(() => {
    if (!mitarbeiterId) return null;
    const person = rechte.sichtbare('zeit').find((kandidat) => kandidat.id === mitarbeiterId);
    if (!person) return null;
    const views = buildPersonViews(state.stammdaten, heute, [person]);
    return buildZeitZeilen(views, monat, eigene ? state : quelle, mandant, heute, jetztMin)[0] ?? null;
  }, [mitarbeiterId, rechte, state, quelle, eigene, monat, mandant, heute, jetztMin]);

  useGlobaleSuchquellen();
  useEffect(() => {
    meldeAenderungen('dispo', state.protokoll.length);
  }, [state.protokoll.length]);

  // jh› Wer nur sich selbst sieht (Aussendienst), landet direkt im eigenen Zeitkonto – keine Liste mit einer Zeile.
  useEffect(() => {
    const einzige = sichtbare[0];
    if (!mitarbeiterId && sichtbare.length === 1 && einzige) navigate(`/zeiterfassung/${einzige.id}${search}`, { replace: true });
  }, [mitarbeiterId, sichtbare, navigate, search]);

  const setParam = useCallback(
    (aenderung: Readonly<Record<string, string>>) => {
      const naechste = new URLSearchParams(params);
      for (const [schluessel, wert] of Object.entries(aenderung)) naechste.set(schluessel, wert);
      setParams(naechste, { replace: true });
    },
    [params, setParams],
  );
  const oeffnen = useCallback(
    (id: string, ziel?: MonatsSchluessel, datum?: IsoDatum) => {
      const naechste = new URLSearchParams(params);
      if (ziel) naechste.set('monat', ziel);
      if (datum) naechste.set('tag', datum);
      navigate(`/zeiterfassung/${id}?${naechste.toString()}`);
    },
    [params, navigate],
  );
  const zurListe = useCallback(() => navigate(`/zeiterfassung?${params.toString()}`), [navigate, params]);
  useHotkey({ key: 'Escape', inInputs: true }, () => {
    if (mitarbeiterId && sichtbare.length > 1) zurListe();
  });

  const periode = useMemo<Periode>(() => {
    switch (ansicht) {
      case 'woche':
        return { label: wochenLabel(woche), zurueck: () => setParam({ woche: addDays(woche, -7) }), vor: () => setParam({ woche: addDays(woche, 7) }), heute: () => setParam({ woche: startOfWeek(heute) }), labelZurueck: 'Vorwoche', labelVor: 'Nächste Woche' };
      case 'tag':
        return { label: `${formatWochentag(tag)}, ${formatDatum(tag)}`, zurueck: () => setParam({ tag: addDays(tag, -1) }), vor: () => setParam({ tag: addDays(tag, 1) }), heute: () => setParam({ tag: heute }), labelZurueck: 'Vortag', labelVor: 'Nächster Tag' };
      case 'jahr':
        return { label: String(jahr), zurueck: () => setParam({ monat: monatVerschieben(monat, -12) }), vor: () => setParam({ monat: monatVerschieben(monat, 12) }), heute: () => setParam({ monat: monatVon(heute) }), labelZurueck: 'Vorjahr', labelVor: 'Nächstes Jahr' };
      default:
        return { label: monatLabel(monat), zurueck: () => setParam({ monat: monatVerschieben(monat, -1) }), vor: () => setParam({ monat: monatVerschieben(monat, 1) }), heute: () => setParam({ monat: monatVon(heute) }), labelZurueck: 'Vormonat', labelVor: 'Nächster Monat' };
    }
  }, [ansicht, woche, tag, jahr, monat, heute, setParam]);

  const kacheln = useMemo<Kachel[]>(() => ZEIT_SICHTEN.map((eintrag) => ({ id: eintrag.id, label: eintrag.label, zahl: zaehler[eintrag.id], ton: zaehler[eintrag.id] > 0 ? SICHT_TON[eintrag.id] : 'neutral' })), [zaehler]);

  const demoReset = useDemoReset();
  const kommandos = useMemo<Kommando[]>(
    () => [
      ...ZEIT_ANSICHTEN.map<Kommando>((eintrag) => ({ id: `zeit:ansicht-${eintrag.value}`, label: `Zeiterfassung: Ansicht ${eintrag.label}`, gruppe: 'ansicht', icon: Clock, run: () => setParam({ ansicht: eintrag.value }) })),
      ...ZEIT_SICHTEN.map<Kommando>((eintrag) => ({ id: `zeit:${eintrag.id}`, label: `Zeiterfassung: ${eintrag.label}`, gruppe: 'ansicht', icon: Clock, run: () => setSicht(eintrag.id) })),
      { id: 'zeit:heute', label: 'Zeiterfassung: zu heute', gruppe: 'navigation', icon: Clock, run: periode.heute },
      demoReset.kommando,
    ],
    [demoReset.kommando, setParam, periode.heute],
  );
  useRegisterKommandos('zeiterfassung', kommandos);

  const exportieren = () => {
    let name: string;
    let inhalt: string;
    let text: string;
    switch (ansicht) {
      case 'woche':
        name = exportName('zeiterfassung-woche', [woche], 'csv');
        inhalt = wochenCsv(wochenZeilen, wochenTage(woche));
        text = `Wochenübersicht ${wochenLabel(woche)} (${wochenZeilen.length} Personen) als CSV exportiert`;
        break;
      case 'monat':
        name = exportName('zeiterfassung-matrix', [monat], 'csv');
        inhalt = matrixCsv(sichtbar, tageMatrix);
        text = `Monatsmatrix ${monatLabel(monat)} (${sichtbar.length} Personen) als CSV exportiert`;
        break;
      case 'jahr':
        name = exportName('zeiterfassung-jahr', [String(jahr)], 'csv');
        inhalt = jahresCsv(jahresZeilen, jahr);
        text = `Jahresübersicht ${jahr} (${jahresZeilen.length} Personen) als CSV exportiert`;
        break;
      default: {
        const zeilenCsv = sichtbar.map((zeile) => [
          zeile.person.mitarbeiter.kuerzel,
          `${zeile.person.mitarbeiter.vorname} ${zeile.person.mitarbeiter.nachname}`,
          zeile.person.mitarbeiter.pensum,
          zeile.konto.periode.sollMin,
          zeile.konto.periode.arbeitMin,
          zeile.konto.periode.saldoMin,
          zeile.konto.saldoKumuliertMin,
          zeile.ferien.restTage,
          zeile.konto.periode.tageMitWarnung,
          zeile.konto.abschluss?.status ?? '',
        ]);
        name = exportName('zeiterfassung', [monat], 'csv');
        inhalt = csvZeilen([['Kürzel', 'Name', 'Pensum', 'Soll (min)', 'Ist (min)', 'Saldo Monat (min)', 'Saldo total (min)', 'Ferien Rest (Tage)', 'Tage mit Warnung', 'Abschluss'], ...zeilenCsv]);
        text = `Monatsübersicht ${monatLabel(monat)} (${sichtbar.length} Personen) als CSV exportiert`;
      }
    }
    ladeHerunter(name, inhalt, 'text/csv');
    aktionen.protokolliere({ bereich: 'zeit', art: 'export', text });
  };

  const aktivId = mitarbeiterId ?? null;

  return (
    <AppShell modul={findModul('zeiterfassung')} menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <ModulSeite
        label="Zeiterfassung"
        detailOffen={mitarbeiterId !== undefined}
        onZurueck={sichtbare.length > 1 ? zurListe : undefined}
        liste={
          <>
            <Kacheln kacheln={kacheln} aktiv={sicht} onWahl={(id) => setSicht(id as ZeitSicht)} label="Sicht" />
            <ModulWerkzeuge anzahl={`${sichtbar.length} von ${zeilen.length}`}>
              <SegmentedControl label="Ansicht" options={ZEIT_ANSICHTEN} value={ansicht} onChange={(wert) => setParam({ ansicht: wert })} />
              <div className={raster.periodeNav} role="group" aria-label="Zeitraum">
                <IconButton icon={ChevronLeft} label={periode.labelZurueck} size="sm" onClick={periode.zurueck} />
                <span className={raster.periodeLabel}>{periode.label}</span>
                <IconButton icon={ChevronRight} label={periode.labelVor} size="sm" onClick={periode.vor} />
                <Button variant="ghost" size="sm" onClick={periode.heute}>
                  Heute
                </Button>
              </div>
              <Suchfeld wert={suche} onChange={setSuche} placeholder="Name, Kürzel, Funktion …" label="Mitarbeitende durchsuchen" />
              {rechte.hat('zeit:exportieren') && ansicht !== 'tag' && (
                <Button variant="secondary" size="sm" icon={Download} onClick={exportieren}>
                  CSV
                </Button>
              )}
            </ModulWerkzeuge>
            {ansicht === 'liste' && (
              <Tabelle spalten={SPALTEN} zeilen={sichtbar} zeilenId={(zeile) => zeile.person.mitarbeiter.id} label="Zeitkonten" aktivId={aktivId} onZeile={(zeile) => oeffnen(zeile.person.mitarbeiter.id)} standardSortierung={{ id: 'person', richtung: 'auf' }} leer="Keine Zeitkonten in dieser Sicht." />
            )}
            {ansicht === 'woche' && <WochenUebersicht zeilen={wochenZeilen} tage={wochenTage(woche)} heute={heute} aktivId={aktivId} onPerson={(id, datum) => oeffnen(id, monatVon(datum ?? woche), datum)} />}
            {ansicht === 'monat' && <MonatsMatrix zeilen={sichtbar} tage={tageMatrix} heute={heute} aktivId={aktivId} onZelle={(id, datum) => oeffnen(id, monat, datum)} />}
            {ansicht === 'jahr' && <JahresMatrix zeilen={jahresZeilen} jahr={jahr} aktivId={aktivId} onZelle={(id, ziel) => oeffnen(id, ziel)} />}
            {ansicht === 'tag' && <TagesBild zeilen={tagesZeilen} datum={tag} heute={heute} jetztMin={jetztMin} aktivId={aktivId} onPerson={(id) => oeffnen(id, monatVon(tag))} />}
          </>
        }
        detail={
          gewaehlt ? (
            <ZeitkontoDossier
              zeile={gewaehlt}
              eigene={eigene}
              rechte={rechte}
              aktionen={aktionen}
              alleEintraege={state.zeiteintraege}
              heute={heute}
              jetztMin={jetztMin}
              startTag={params.get('tag') && monatVon(tag) === monat ? tag : null}
              quelle={eigene ? state : quelle}
              mandant={mandant}
              onMonat={(ziel) => oeffnen(gewaehlt.person.mitarbeiter.id, ziel)}
            />
          ) : (
            <Leer icon={Clock} titel="Zeitkonto nicht sichtbar" text="Die Person existiert nicht oder liegt ausserhalb Ihres Umfangs (eigene, Team, alle)." fuellend>
              <Button variant="secondary" size="sm" onClick={zurListe}>
                Zur Liste
              </Button>
            </Leer>
          )
        }
      />
    </AppShell>
  );
}

/* ◆ jh · eof */
