/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/DispoPage.tsx                        │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Modulwurzel Disposition: Ansichten, Panel, Akte, DnD, Befehle         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, List, Map as MapIcon, Palette, Plus, Redo2, TriangleAlert, Undo2, UserRound } from 'lucide-react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { meldeAenderungen } from '../../core/aenderungen';
import { ZEITRAUM_LABEL, useArbeitstag } from '../../core/arbeitstag';
import type { Zeitraum } from '../../core/arbeitstag';
import { addDays, minutesOfDay, startOfWeek, rangeDays } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import type { Einsatz, EinsatzStatus } from '../../core/domain/einsatz';
import type { Kategorie } from '../../core/domain/kategorie';
import { fullName } from '../../core/domain/stammdaten';
import type { Region } from '../../core/domain/stammdaten';
import { useHotkey } from '../../core/hooks/useHotkey';
import { useNow } from '../../core/hooks/useNow';
import { useRegisterKommandos, useRegisterSuchQuelle } from '../../core/kommando';
import type { Kommando, SuchQuelle } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { findModul } from '../../core/modules.config';
import { normalizeSuchtext } from '../../core/suche';
import { cx } from '../../core/ui/cx';
import { MOCK_HEUTE, mockBestand, mockStammdaten, mockTelefonbuch } from '../../mock';
import { Akte } from './akte/Akte';
import { buildAkte } from './akte/akte.model';
import { DispoDnd } from './drag/DispoDnd';
import { ANSICHTEN, ANSICHT_LABEL, FARBE_NACH_LABEL, LEERER_FILTER, isAnsicht } from './dispo.types';
import type { Ansicht, DispoFilter, FarbeNach, PanelTab } from './dispo.types';
import { DispoToolbar } from './DispoToolbar';
import { EinsatzHovercard } from './hover/EinsatzHovercard';
import { HovercardProvider } from './hover/HovercardContext';
import { KapazitaetsBand } from './KapazitaetsBand';
import { findKonflikte } from './konflikte';
import { EingangTab } from './panel/EingangTab';
import { ErledigtTab } from './panel/ErledigtTab';
import { SeitenPanel } from './panel/SeitenPanel';
import { WartetTab } from './panel/WartetTab';
import { useGlobaleSuchquellen } from '../suche/globaleSuche';
import { Schnellerfassung } from './Schnellerfassung';
import {
  buildEinsatzViewsFuer,
  buildErledigtViews,
  buildMehrtagesZeilen,
  buildPendenzViews,
  buildSuchIndex,
  buildTagesZeilen,
  buildWartetViews,
  pulsFor,
  rapportFuerEinsatz,
  visibleTechniker,
} from './store/dispo.selectors';
import type { Puls } from './store/dispo.selectors';
import { initDispoStore, setAnsicht, useAnsichtEinstellungen, useDispoState } from './store/dispoStore';
import { useDispoAktionen } from './store/useDispoAktionen';
import { useDemoReset } from './store/useDemoReset';
import { Kalender } from './views/Kalender';
import { Karte } from './views/Karte';
import { Liste } from './views/Liste';
import { Plantafel } from './views/Plantafel';
import { PlantafelKompakt } from './views/PlantafelKompakt';
import { ZOOM_STUFEN } from './zeitraster';
import type { Skala } from './zeitraster';
import styles from './DispoPage.module.css';

// ── §1 · Konfiguration ───────────────────────────────────────────

// jh› Die Modulwurzel hängt den Mock ein – einzige Stelle, die mock/ importiert.
initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

const ZEITRAEUME: Readonly<Record<Ansicht, readonly Zeitraum[]>> = {
  plantafel: ['tag', '3tage', 'arbeitswoche', 'woche'],
  kalender: ['tag', 'arbeitswoche', 'woche', 'monat'],
  liste: ['tag', '3tage', 'arbeitswoche', 'woche', 'monat'],
  karte: ['tag'],
};

const ANSICHT_ICON = { plantafel: CalendarRange, kalender: CalendarDays, liste: List, karte: MapIcon } as const;

function toggleIn<T>(liste: readonly T[], wert: T): T[] {
  return liste.includes(wert) ? liste.filter((eintrag) => eintrag !== wert) : [...liste, wert];
}

// ── §2 · Wurzel ──────────────────────────────────────────────────

export function DispoPage() {
  const { ansicht } = useParams();
  if (!isAnsicht(ansicht)) return <Navigate to="/dispo/plantafel" replace />;
  return (
    <HovercardProvider>
      <DispoInhalt ansicht={ansicht} />
    </HovercardProvider>
  );
}

// ── §3 · Inhalt ──────────────────────────────────────────────────

function DispoInhalt({ ansicht }: { ansicht: Ansicht }) {
  const navigate = useNavigate();
  const location = useLocation();
  const arbeitstag = useArbeitstag();
  const { datum, heute, tage, setDatum, setZeitraum } = arbeitstag;
  const state = useDispoState();
  const einstellungen = useAnsichtEinstellungen();
  const aktionen = useDispoAktionen();
  const jetzt = useNow();
  const jetztMin = minutesOfDay(jetzt);

  const [filter, setFilter] = useState<DispoFilter>(LEERER_FILTER);
  const [panelSuche, setPanelSuche] = useState('');
  const [schnellOffen, setSchnellOffen] = useState(false);
  const demoReset = useDemoReset();
  const [konfliktIndex, setKonfliktIndex] = useState(0);
  const [restHoehe, setRestHoehe] = useState(0);
  const [skalaInfo, setSkalaInfo] = useState<{ skala: Skala; rowH: number } | null>(null);

  // Zeitraum an die Ansicht anpassen (URL bleibt gültig)
  const erlaubt = ZEITRAEUME[ansicht];
  const zeitraum: Zeitraum = erlaubt.includes(arbeitstag.zeitraum) ? arbeitstag.zeitraum : (erlaubt[0] ?? 'tag');
  useEffect(() => {
    if (zeitraum !== arbeitstag.zeitraum) setZeitraum(zeitraum);
  }, [zeitraum, arbeitstag.zeitraum, setZeitraum]);
  const sichtbareTage = useMemo(() => (zeitraum === arbeitstag.zeitraum ? tage : [datum]), [zeitraum, arbeitstag.zeitraum, tage, datum]);

  const { stammdaten, einsaetze, pendenzen, rapporte, nachrichten, auswahl } = state;

  // ·· Ansichtsmodelle
  const tagesZeilen = useMemo(
    () => (ansicht === 'plantafel' && zeitraum === 'tag' ? buildTagesZeilen(stammdaten, einsaetze, datum, filter, datum === heute ? jetztMin : null) : []),
    [ansicht, zeitraum, stammdaten, einsaetze, datum, filter, heute, jetztMin],
  );
  const mehrtagesZeilen = useMemo(
    () => (ansicht === 'plantafel' && zeitraum !== 'tag' ? buildMehrtagesZeilen(stammdaten, einsaetze, sichtbareTage, filter) : []),
    [ansicht, zeitraum, stammdaten, einsaetze, sichtbareTage, filter],
  );
  const views = useMemo(
    () => (ansicht === 'plantafel' ? [] : buildEinsatzViewsFuer(stammdaten, einsaetze, ansicht === 'karte' ? [datum] : sichtbareTage, filter, jetztMin)),
    [ansicht, stammdaten, einsaetze, datum, sichtbareTage, filter, jetztMin],
  );
  const techniker = useMemo(() => visibleTechniker(stammdaten, filter), [stammdaten, filter]);

  const pulse = useMemo(() => {
    const map = new Map<string, Puls>();
    const heutige = einsaetze.filter((einsatz) => einsatz.datum === heute);
    for (const person of stammdaten.techniker) {
      const absenz = stammdaten.absenzen.find((eintrag) => eintrag.technikerId === person.id && eintrag.von <= heute && eintrag.bis >= heute);
      map.set(person.id, pulsFor(heutige.filter((einsatz) => einsatz.technikerId === person.id), jetztMin, absenz));
    }
    return map;
  }, [stammdaten, einsaetze, heute, jetztMin]);

  // ·· Panel
  const suchbegriffe = useMemo(() => normalizeSuchtext(panelSuche).split(/\s+/).filter(Boolean), [panelSuche]);
  const passtZurSuche = useCallback(
    (texte: readonly string[]) => suchbegriffe.length === 0 || suchbegriffe.every((begriff) => normalizeSuchtext(texte.join(' ')).includes(begriff)),
    [suchbegriffe],
  );
  const pendenzViews = useMemo(
    () => buildPendenzViews(stammdaten, pendenzen, filter).filter((view) => passtZurSuche([view.auftrag.nummer, view.kunde.name, view.auftrag.fehlerbild, view.liegenschaft.adresse.ort, view.geraet.marke])),
    [stammdaten, pendenzen, filter, passtZurSuche],
  );
  const wartetViews = useMemo(
    () => buildWartetViews(stammdaten, einsaetze, pendenzen).filter((view) => passtZurSuche([view.auftrag.nummer, view.kunde.name, view.auftrag.fehlerbild])),
    [stammdaten, einsaetze, pendenzen, passtZurSuche],
  );
  const erledigtTage = useMemo(() => rangeDays(startOfWeek(datum), addDays(startOfWeek(datum), 6)), [datum]);
  const erledigtViews = useMemo(
    () => buildErledigtViews(stammdaten, einsaetze, erledigtTage, rapporte).filter((view) => passtZurSuche([view.auftrag.nummer, view.kunde.name, view.auftrag.fehlerbild, view.techniker.nachname])),
    [stammdaten, einsaetze, erledigtTage, rapporte, passtZurSuche],
  );
  const zaehler: Readonly<Record<PanelTab, number>> = { eingang: pendenzen.length, wartet: wartetViews.length, erledigt: erledigtViews.length };
  const dringend = pendenzViews.filter((view) => view.dringend).length;

  const akte = useMemo(() => buildAkte(stammdaten, einsaetze, pendenzen, auswahl), [stammdaten, einsaetze, pendenzen, auswahl]);
  const konflikte = useMemo(() => findKonflikte(stammdaten, einsaetze, heute, rapporte), [stammdaten, einsaetze, heute, rapporte]);
  const suchIndex = useMemo(() => buildSuchIndex(stammdaten, einsaetze, pendenzen), [stammdaten, einsaetze, pendenzen]);

  useEffect(() => {
    meldeAenderungen('dispo', state.protokoll.length);
  }, [state.protokoll.length]);

  // ·· Navigation
  const wechsleAnsicht = useCallback(
    (ziel: Ansicht) => navigate({ pathname: `/dispo/${ziel}`, search: location.search }),
    [navigate, location.search],
  );
  const openDay = useCallback(
    (tag: IsoDatum) => {
      setDatum(tag);
      setZeitraum('tag');
    },
    [setDatum, setZeitraum],
  );
  const openEinsatz = useCallback(
    (einsatz: Einsatz) => {
      setDatum(einsatz.datum);
      aktionen.select({ art: 'einsatz', einsatzId: einsatz.id });
    },
    [setDatum, aktionen],
  );
  const zoomen = useCallback(
    (richtung: 1 | -1) => {
      const index = ZOOM_STUFEN.indexOf(einstellungen.zoom);
      const neu = ZOOM_STUFEN[Math.min(ZOOM_STUFEN.length - 1, Math.max(0, index + richtung))];
      if (neu) setAnsicht({ zoom: neu });
    },
    [einstellungen.zoom],
  );
  const naechsterKonflikt = useCallback(() => {
    if (konflikte.length === 0) return;
    const konflikt = konflikte[konfliktIndex % konflikte.length];
    if (!konflikt) return;
    setKonfliktIndex((wert) => wert + 1);
    setDatum(konflikt.datum);
    if (ansicht === 'karte' || ansicht === 'liste') wechsleAnsicht('plantafel');
    if (zeitraum !== 'tag') setZeitraum('tag');
    aktionen.select({ art: 'einsatz', einsatzId: konflikt.einsatzId });
  }, [konflikte, konfliktIndex, setDatum, ansicht, wechsleAnsicht, zeitraum, setZeitraum, aktionen]);

  const drucken = useCallback((technikerId: string) => navigate(`/dispo/druck/${technikerId}?d=${datum}`), [navigate, datum]);

  // ·· Tastatur
  useHotkey({ key: '1' }, () => wechsleAnsicht('plantafel'));
  useHotkey({ key: '2' }, () => wechsleAnsicht('kalender'));
  useHotkey({ key: '3' }, () => wechsleAnsicht('liste'));
  useHotkey({ key: '4' }, () => wechsleAnsicht('karte'));
  useHotkey({ key: 'n' }, () => setSchnellOffen(true));
  useHotkey({ key: ']' }, () => setAnsicht({ panelEingeklappt: !einstellungen.panelEingeklappt }));
  useHotkey({ key: 'z', mod: true }, aktionen.undo);
  useHotkey({ key: 'y', mod: true }, aktionen.redo);
  useHotkey({ key: 'Escape', inInputs: true }, () => {
    if (schnellOffen) {
      setSchnellOffen(false);
      return;
    }
    if (auswahl) aktionen.select(null);
  });

  // ·· Befehle & Suche für die Palette
  const kommandos = useMemo<Kommando[]>(
    () => [
      { id: 'dispo:neu', label: 'Neuer Auftrag (Telefon-Schnellerfassung)', gruppe: 'aktion', icon: Plus, kuerzel: 'N', run: () => setSchnellOffen(true) },
      { id: 'dispo:undo', label: 'Rückgängig', gruppe: 'aktion', icon: Undo2, kuerzel: 'Strg Z', run: aktionen.undo, ...(state.protokoll.length === 0 ? { gesperrt: 'Nichts rückgängig zu machen' } : {}) },
      { id: 'dispo:redo', label: 'Wiederherstellen', gruppe: 'aktion', icon: Redo2, kuerzel: 'Strg Y', run: aktionen.redo, ...(state.zukunft.length === 0 ? { gesperrt: 'Nichts wiederherzustellen' } : {}) },
      { id: 'dispo:konflikt', label: konflikte.length > 0 ? `Nächster Konflikt (${konflikte.length})` : 'Konflikte prüfen', gruppe: 'aktion', icon: TriangleAlert, run: naechsterKonflikt, ...(konflikte.length === 0 ? { gesperrt: 'Keine Konflikte' } : {}) },
      demoReset.kommando,
      { id: 'nav:heute', label: 'Gehe zu heute', gruppe: 'navigation', kuerzel: 'T', run: () => setDatum(heute) },
      { id: 'nav:morgen', label: 'Gehe zu morgen', gruppe: 'navigation', run: () => setDatum(addDays(heute, 1)) },
      { id: 'nav:gestern', label: 'Gehe zu gestern', gruppe: 'navigation', run: () => setDatum(addDays(heute, -1)) },
      { id: 'nav:naechste-woche', label: 'Gehe zu nächster Woche', gruppe: 'navigation', run: () => setDatum(addDays(startOfWeek(heute), 7)) },
      ...stammdaten.techniker.map<Kommando>((person) => ({
        id: `nav:tech:${person.id}`,
        label: `Zeige ${fullName(person)}`,
        gruppe: 'navigation',
        icon: UserRound,
        stichworte: `${person.kuerzel} techniker filter`,
        run: () => {
          setFilter((aktuell) => ({ ...aktuell, technikerIds: [person.id] }));
          if (ansicht !== 'plantafel') wechsleAnsicht('plantafel');
        },
      })),
      ...ANSICHTEN.map<Kommando>((ziel, index) => ({ id: `ansicht:${ziel}`, label: `Ansicht ${ANSICHT_LABEL[ziel]}`, gruppe: 'ansicht', icon: ANSICHT_ICON[ziel], kuerzel: String(index + 1), run: () => wechsleAnsicht(ziel) })),
      ...erlaubt.map<Kommando>((wert) => ({ id: `zeitraum:${wert}`, label: `Zeitraum ${ZEITRAUM_LABEL[wert]}`, gruppe: 'ansicht', run: () => setZeitraum(wert) })),
      ...(['kategorie', 'techniker', 'region', 'status'] as const).map<Kommando>((wert) => ({ id: `farbe:${wert}`, label: `Farbe nach ${FARBE_NACH_LABEL[wert]}`, gruppe: 'ansicht', icon: Palette, run: () => setAnsicht({ farbeNach: wert }) })),
      { id: 'ansicht:panel', label: einstellungen.panelEingeklappt ? 'Rechtes Panel ausklappen' : 'Rechtes Panel einklappen', gruppe: 'ansicht', kuerzel: ']', run: () => setAnsicht({ panelEingeklappt: !einstellungen.panelEingeklappt }) },
      { id: 'ansicht:filter-reset', label: 'Filter zurücksetzen', gruppe: 'ansicht', run: () => setFilter(LEERER_FILTER) },
    ],
    [aktionen, state.protokoll.length, state.zukunft.length, konflikte.length, naechsterKonflikt, setDatum, heute, stammdaten.techniker, ansicht, wechsleAnsicht, erlaubt, setZeitraum, einstellungen.panelEingeklappt, demoReset.kommando],
  );
  useRegisterKommandos('dispo', kommandos);

  const suchQuelle = useMemo<SuchQuelle>(
    () => ({
      id: 'dispo',
      label: 'Aufträge',
      eintraege: suchIndex,
      onSelect: (auftragId) => {
        // jh› Offene Pendenz zuerst – dort muss der Disponent etwas tun.
        const pendenz = pendenzen.find((kandidat) => kandidat.auftragId === auftragId);
        if (pendenz) {
          aktionen.select({ art: 'pendenz', pendenzId: pendenz.id });
          setAnsicht({ panelEingeklappt: false });
          return;
        }
        const eigene = einsaetze.filter((kandidat) => kandidat.auftragId === auftragId).sort((a, b) => a.datum.localeCompare(b.datum) || a.startMin - b.startMin);
        const einsatz = eigene.find((kandidat) => kandidat.datum >= heute) ?? eigene[eigene.length - 1];
        if (einsatz) openEinsatz(einsatz);
      },
    }),
    [suchIndex, pendenzen, einsaetze, heute, aktionen, openEinsatz],
  );
  useRegisterSuchQuelle(suchQuelle);
  // jh› Kunden und Geräte findet die Palette auch hier – Aufträge liefert die Dispo-Quelle (öffnet im Plan).
  useGlobaleSuchquellen({ ohneAuftraege: true });

  // ·· Filteraktionen
  const toggleTechniker = useCallback((id: string) => setFilter((aktuell) => ({ ...aktuell, technikerIds: toggleIn(aktuell.technikerIds, id) })), []);
  const toggleStatus = useCallback((status: EinsatzStatus) => setFilter((aktuell) => ({ ...aktuell, status: toggleIn(aktuell.status, status) })), []);
  const toggleKategorie = useCallback((kategorie: Kategorie) => setFilter((aktuell) => ({ ...aktuell, kategorien: toggleIn(aktuell.kategorien, kategorie) })), []);
  const setRegion = useCallback((region: Region | 'alle') => setFilter((aktuell) => ({ ...aktuell, region })), []);

  const ausgewaehltId = auswahl?.art === 'einsatz' ? auswahl.einsatzId : null;
  const ausgewaehltePendenzId = auswahl?.art === 'pendenz' ? auswahl.pendenzId : null;
  const zeigeBand = ansicht === 'plantafel' && (zeitraum === 'tag' ? restHoehe > 150 : true);

  const pendenzIdFuer = useCallback((auftragId: string) => pendenzen.find((pendenz) => pendenz.auftragId === auftragId)?.id ?? null, [pendenzen]);
  const tastaturSchritt = useCallback(() => ({ x: skalaInfo ? skalaInfo.skala.rasterMin * skalaInfo.skala.pxPerMin : 40, y: skalaInfo?.rowH ?? 72 }), [skalaInfo]);
  const onSkala = useCallback((skala: Skala, rowH: number) => setSkalaInfo({ skala, rowH }), []);

  const konfliktBadge = (
    <button type="button" className={cx(styles.konflikte, konflikte.length === 0 && styles.konflikteLeer)} onClick={naechsterKonflikt} disabled={konflikte.length === 0} title={konflikte.map((konflikt) => konflikt.text).join('\n') || 'Keine Konflikte'}>
      <TriangleAlert size={16} strokeWidth={1.5} aria-hidden />
      {konflikte.length === 0 ? 'Keine Konflikte' : `${konflikte.length} Konflikt${konflikte.length === 1 ? '' : 'e'}`}
    </button>
  );

  return (
    <AppShell modul={findModul(ansicht)} topbarExtras={konfliktBadge} menueEintraege={demoReset.menueEintraege}>
      <DispoDnd stammdaten={stammdaten} einsaetze={einsaetze} heute={heute} jetztMin={jetztMin} tastaturSchritt={tastaturSchritt} onPlan={aktionen.planPendenz} onMove={aktionen.moveEinsatz} onUnplan={aktionen.unplanEinsatz}>
        <div className={styles.dispo}>
          <section className={styles.planBereich} aria-label="Einsatzplan">
            <DispoToolbar
              ansicht={ansicht}
              onAnsicht={wechsleAnsicht}
              zeitraum={zeitraum}
              zeitraeume={erlaubt}
              onZeitraum={setZeitraum}
              zoom={einstellungen.zoom}
              onZoom={zoomen}
              farbeNach={einstellungen.farbeNach}
              onFarbeNach={(farbeNach: FarbeNach) => setAnsicht({ farbeNach })}
              filter={filter}
              techniker={stammdaten.techniker}
              onToggleTechniker={toggleTechniker}
              onToggleStatus={toggleStatus}
              onToggleKategorie={toggleKategorie}
              onRegion={setRegion}
              onResetFilter={() => setFilter(LEERER_FILTER)}
              protokoll={state.protokoll}
              zukunft={state.zukunft}
              onUndo={aktionen.undo}
              onRedo={aktionen.redo}
              onNeu={() => setSchnellOffen(true)}
            />

            {ansicht === 'plantafel' && zeitraum === 'tag' && (
              <Plantafel
                zeilen={tagesZeilen}
                datum={datum}
                heute={heute}
                jetztMin={jetztMin}
                zoom={einstellungen.zoom}
                farbeNach={einstellungen.farbeNach}
                pulse={datum === heute ? pulse : new Map()}
                ausgewaehltId={ausgewaehltId}
                markiertId={state.markiertId}
                onSelectEinsatz={(einsatzId) => aktionen.select({ art: 'einsatz', einsatzId })}
                onZoom={zoomen}
                onDrucken={drucken}
                onSkala={onSkala}
                onRestHoehe={setRestHoehe}
              />
            )}
            {ansicht === 'plantafel' && zeitraum !== 'tag' && (
              <PlantafelKompakt
                zeilen={mehrtagesZeilen}
                tage={sichtbareTage}
                datum={datum}
                heute={heute}
                zoom={einstellungen.zoom}
                farbeNach={einstellungen.farbeNach}
                pulse={pulse}
                ausgewaehltId={ausgewaehltId}
                markiertId={state.markiertId}
                onSelectEinsatz={(einsatzId) => aktionen.select({ art: 'einsatz', einsatzId })}
                onOpenDay={openDay}
                onDrucken={drucken}
              />
            )}
            {ansicht === 'kalender' && (
              <Kalender
                views={views}
                tage={sichtbareTage}
                zeitraum={zeitraum}
                datum={datum}
                heute={heute}
                jetztMin={jetztMin}
                zoom={einstellungen.zoom}
                farbeNach={einstellungen.farbeNach}
                techniker={techniker}
                absenzen={stammdaten.absenzen}
                nebeneinander={einstellungen.kalenderNebeneinander}
                onNebeneinander={(wert) => setAnsicht({ kalenderNebeneinander: wert })}
                technikerAuswahl={einstellungen.kalenderTechnikerIds}
                onTechnikerAuswahl={(ids) => setAnsicht({ kalenderTechnikerIds: ids })}
                ausgewaehltId={ausgewaehltId}
                markiertId={state.markiertId}
                onSelectEinsatz={(einsatzId) => aktionen.select({ art: 'einsatz', einsatzId })}
                onOpenDay={openDay}
              />
            )}
            {ansicht === 'liste' && (
              <Liste
                views={views}
                techniker={stammdaten.techniker}
                heute={heute}
                mehrfach={state.mehrfach}
                ausgewaehltId={ausgewaehltId}
                onSelectEinsatz={(einsatzId) => aktionen.select({ art: 'einsatz', einsatzId })}
                onToggleMehrfach={aktionen.toggleMehrfach}
                onSetMehrfach={aktionen.setMehrfach}
                onAssign={aktionen.assignTechniker}
                onShift={aktionen.shiftEinsaetze}
              />
            )}
            {ansicht === 'karte' && <Karte views={views} techniker={techniker} datum={datum} ausgewaehltId={ausgewaehltId} onSelectEinsatz={(einsatzId) => aktionen.select({ art: 'einsatz', einsatzId })} />}

            {zeigeBand && zeitraum === 'tag' && <KapazitaetsBand tagesZeilen={tagesZeilen} />}
            {zeigeBand && zeitraum !== 'tag' && <KapazitaetsBand wochenZeilen={mehrtagesZeilen} tage={sichtbareTage} />}
          </section>

          <SeitenPanel
            breite={einstellungen.panelBreite}
            eingeklappt={einstellungen.panelEingeklappt}
            tab={einstellungen.panelTab}
            zaehler={zaehler}
            dringend={dringend}
            suche={panelSuche}
            akte={
              akte ? (
                <Akte
                  akte={akte}
                  stammdaten={stammdaten}
                  einsaetze={einsaetze}
                  heute={heute}
                  jetztMin={jetztMin}
                  onClose={() => aktionen.select(null)}
                  onSetStatus={aktionen.setStatus}
                  onRequestFolgetermin={aktionen.requestFolgetermin}
                  onUnplan={aktionen.unplanEinsatz}
                  onPlan={aktionen.planPendenz}
                  onMove={aktionen.moveEinsatz}
                  onSave={aktionen.updateAuftrag}
                  onCopy={aktionen.copyAuftrag}
                  onDelete={aktionen.deleteAuftrag}
                  onSelectPendenz={(pendenzId) => aktionen.select({ art: 'pendenz', pendenzId })}
                  onOpenEinsatz={openEinsatz}
                  rapport={akte.einsatz ? rapportFuerEinsatz(rapporte, akte.einsatz.id) : undefined}
                  nachrichten={nachrichten.filter((nachricht) => nachricht.auftragId === akte.auftrag.id)}
                  onFreigebenRapport={aktionen.freigebenRapport}
                  onVerrechnenRapport={aktionen.verrechnenRapport}
                  onZurueckRapport={aktionen.zurueckAnTechniker}
                  onNachricht={aktionen.sendeNachricht}
                />
              ) : null
            }
            onTab={(tab) => setAnsicht({ panelTab: tab })}
            onBreite={(panelBreite) => setAnsicht({ panelBreite })}
            onEingeklappt={(panelEingeklappt) => setAnsicht({ panelEingeklappt })}
            onSuche={setPanelSuche}
          >
            {einstellungen.panelTab === 'eingang' && (
              <EingangTab pendenzen={pendenzViews} ausgewaehltId={ausgewaehltePendenzId} markiertId={state.markiertId} regionGefiltert={filter.region !== 'alle'} onSelectPendenz={(pendenzId) => aktionen.select({ art: 'pendenz', pendenzId })} />
            )}
            {einstellungen.panelTab === 'wartet' && (
              <WartetTab
                eintraege={wartetViews}
                stammdaten={stammdaten}
                einsaetze={einsaetze}
                heute={heute}
                jetztMin={jetztMin}
                ausgewaehltId={ausgewaehltId}
                onSelectEinsatz={(einsatzId) => aktionen.select({ art: 'einsatz', einsatzId })}
                onPlanFolgetermin={aktionen.planFolgetermin}
                onSelectPendenz={(pendenzId) => aktionen.select({ art: 'pendenz', pendenzId })}
                pendenzIdFuer={pendenzIdFuer}
              />
            )}
            {einstellungen.panelTab === 'erledigt' && (
              <ErledigtTab eintraege={erledigtViews} zeitraumLabel={`KW ${erledigtTage[0] ? `${erledigtTage[0].slice(8)}.${erledigtTage[0].slice(5, 7)}.–${erledigtTage[6]?.slice(8)}.${erledigtTage[6]?.slice(5, 7)}.` : ''}`} ausgewaehltId={ausgewaehltId} onSelectEinsatz={(einsatzId) => aktionen.select({ art: 'einsatz', einsatzId })} />
            )}
          </SeitenPanel>

          <Schnellerfassung
            open={schnellOffen}
            stammdaten={stammdaten}
            einsaetze={einsaetze}
            telefonbuch={mockTelefonbuch}
            heute={heute}
            jetztMin={jetztMin}
            onClose={() => setSchnellOffen(false)}
            onCreate={(auftrag, optionen) => {
              aktionen.createAuftrag(auftrag, optionen);
              if (optionen.einsatz) setDatum(optionen.einsatz.datum);
              setAnsicht({ panelEingeklappt: false, ...(optionen.pendenz ? { panelTab: 'eingang' as const } : {}) });
            }}
          />
          {demoReset.dialog}
          <EinsatzHovercard stammdaten={stammdaten} einsaetze={einsaetze} unterdrueckt={schnellOffen} />
        </div>
      </DispoDnd>
    </AppShell>
  );
}

/* ◆ jh · eof */
