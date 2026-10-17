/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/store/dispo.selectors.ts             │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Ansichtsmodelle: Zeilen, Puffer, Kalender, Liste, Karte, Puls, Akte   │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum, Minuten } from '../../../core/datum';
import { splitZeitpunkt, toZeitpunkt } from '../../../core/datum';
import { DRINGLICHKEIT_RANG, isDringend, isTeilOffen } from '../../../core/domain/auftrag';
import type { Auftrag } from '../../../core/domain/auftrag';
import { einsatzEnde } from '../../../core/domain/einsatz';
import type { Einsatz, Pendenz } from '../../../core/domain/einsatz';
import { KATEGORIE_LABEL } from '../../../core/domain/kategorie';
import { formatStrasse, fullName, isAbwesend, regionOf } from '../../../core/domain/stammdaten';
import type { Absenz, Geraet, Kunde, Liegenschaft, Region, Techniker } from '../../../core/domain/stammdaten';
import { formatDatum, formatDatumKurz, formatWochentag, formatZeit, formatZeitpunkt, formatZeitspanne } from '../../../core/format';
import { SUTT_HQ, fahrzeitMin, strassenKm } from '../../../core/geo';
import type { Koordinaten } from '../../../core/geo';
import { normalizeSuchtext } from '../../../core/suche';
import type { SuchEintrag } from '../../../core/suche';
import type { DispoFilter, DispoStammdaten } from '../dispo.types';
import { ARBEIT_ENDE, ARBEIT_START, assignLanes, overlaps, sumDauer } from '../zeitraster';

// ── §1 · Typen ───────────────────────────────────────────────────

/** Auftrag mit allen aufgelösten Referenzen. */
export interface AuftragKontext {
  auftrag: Auftrag;
  kunde: Kunde;
  liegenschaft: Liegenschaft;
  geraet: Geraet;
  region: Region;
  dringend: boolean;
  koordinaten: Koordinaten;
}

export interface EinsatzView extends AuftragKontext {
  einsatz: Einsatz;
  techniker: Techniker;
  /** Entspricht dem Status-/Kategorie-/Regionsfilter (sonst abgeblendet). */
  imFilter: boolean;
  konflikt: boolean;
  spur: number;
  /** Fahrzeit vom Vorgänger (oder vom Werkhof) bis hierher. */
  anfahrtMin: Minuten;
  anfahrtKm: number;
  /** Lücke zum Vorgänger in Minuten – negativ bei Überschneidung. */
  lueckeMin: Minuten | null;
  /** Fahrzeit reicht nicht in die Lücke. */
  fahrzeitKnapp: boolean;
  ueberzogen: boolean;
  /** Zusammenhänge: Erst-/Folgetermin desselben Auftrags, Bezugsaufträge. */
  verknuepfungen: readonly Verknuepfung[];
}

export type VerknuepfungArt = 'folgetermin' | 'ersttermin' | 'bezug' | 'bezogen';

export interface Verknuepfung {
  art: VerknuepfungArt;
  /** Geplanter Einsatz am anderen Ende – fehlt, solange der Bezug im Eingang liegt. */
  einsatzId?: string;
  auftragId: string;
  nummer: string;
  datum?: IsoDatum;
  startMin?: Minuten;
  /** Beschriftung auf der Linie, z. B. «Folgetermin» oder «Mietgerät 26-04819». */
  kurz: string;
  /** Wann und wer am anderen Ende, z. B. «Do 22.10. 08:00 · MB» – fehlt ohne Einsatz. */
  wann?: string;
  /** Langform für Hovercard und Akte, z. B. «Folgetermin · Do 22.10. 08:00 · MB». */
  text: string;
}

export interface FahrzeitPuffer {
  startMin: Minuten;
  dauerMin: Minuten;
  knapp: boolean;
  text: string;
}

export interface TagesZeile {
  techniker: Techniker;
  datum: IsoDatum;
  einsaetze: EinsatzView[];
  puffer: FahrzeitPuffer[];
  spuren: number;
  geplantMin: Minuten;
  fahrzeitMin: Minuten;
  absenz: Absenz | undefined;
}

export interface MehrtagesZeile {
  techniker: Techniker;
  zellen: { datum: IsoDatum; einsaetze: EinsatzView[]; geplantMin: Minuten; absenz: Absenz | undefined }[];
}

export interface PendenzView extends AuftragKontext {
  pendenz: Pendenz;
}

export type PulsArt = 'vor-ort' | 'unterwegs' | 'ueberzieht' | 'frei' | 'feierabend' | 'abwesend' | 'noch-nicht';

export interface Puls {
  art: PulsArt;
  text: string;
}

export interface Kapazitaet {
  technikerId: string;
  verplantMin: Minuten;
  fahrzeitMin: Minuten;
  freiMin: Minuten;
  sollMin: Minuten;
  anteil: number;
}

export type Phase = 'angefragt' | 'bestellt' | 'disponiert' | 'unterwegs' | 'vor-ort' | 'erledigt';

export interface PhasenSchritt {
  phase: Phase;
  label: string;
  erreicht: boolean;
  zeit?: string;
  detail?: string;
}

// ── §2 · Auflösen ────────────────────────────────────────────────

function mustGet<T>(map: ReadonlyMap<string, T>, id: string, was: string): T {
  const wert = map.get(id);
  if (wert === undefined) throw new Error(`${was} ${id} nicht gefunden`);
  return wert;
}

export function resolveAuftrag(stammdaten: DispoStammdaten, auftragId: string): AuftragKontext {
  const auftrag = mustGet(stammdaten.auftraege, auftragId, 'Auftrag');
  const liegenschaft = mustGet(stammdaten.liegenschaften, auftrag.liegenschaftId, 'Liegenschaft');
  return {
    auftrag,
    kunde: mustGet(stammdaten.kunden, auftrag.kundeId, 'Kunde'),
    liegenschaft,
    geraet: mustGet(stammdaten.geraete, auftrag.geraetId, 'Gerät'),
    region: regionOf(liegenschaft.adresse.ort),
    dringend: isDringend(auftrag.dringlichkeit),
    koordinaten: liegenschaft.koordinaten,
  };
}

export function technikerOf(stammdaten: DispoStammdaten, technikerId: string): Techniker {
  const techniker = stammdaten.techniker.find((kandidat) => kandidat.id === technikerId);
  if (!techniker) throw new Error(`Techniker ${technikerId} nicht gefunden`);
  return techniker;
}

// jh› Status/Region/Kategorie blenden nur ab statt aus: ausgeblendete Einsätze
//     würden belegte Zeit als frei erscheinen lassen – und genau dort wird disponiert.
function matchesFilter(kontext: AuftragKontext, einsatz: Einsatz, filter: DispoFilter): boolean {
  if (filter.status.length > 0 && !filter.status.includes(einsatz.status)) return false;
  if (filter.kategorien.length > 0 && !filter.kategorien.includes(kontext.auftrag.kategorie)) return false;
  return filter.region === 'alle' || kontext.region === filter.region;
}

export function visibleTechniker(stammdaten: DispoStammdaten, filter: DispoFilter): readonly Techniker[] {
  if (filter.technikerIds.length === 0) return stammdaten.techniker;
  return stammdaten.techniker.filter((techniker) => filter.technikerIds.includes(techniker.id));
}

// ── §3 · Verknüpfungen ───────────────────────────────────────────

export const VERKNUEPFUNG_LABEL: Readonly<Record<VerknuepfungArt, string>> = {
  folgetermin: 'Folgetermin',
  ersttermin: 'Ersttermin',
  bezug: 'Bezug',
  bezogen: 'Bezugsauftrag',
};

export type VerknuepfungsIndex = ReadonlyMap<string, readonly Verknuepfung[]>;

const KEINE_VERKNUEPFUNGEN: readonly Verknuepfung[] = [];

interface AuftragsBezuege {
  proAuftrag: ReadonlyMap<string, readonly Einsatz[]>;
  /** Ziel-Auftrag → Aufträge, die sich auf ihn beziehen. */
  bezogenVon: ReadonlyMap<string, readonly Auftrag[]>;
}

function zeitpunktOf(einsatz: Einsatz): string {
  return toZeitpunkt(einsatz.datum, einsatz.startMin);
}

function nachZeit(einsaetze: readonly Einsatz[]): Einsatz[] {
  return [...einsaetze].sort((a, b) => zeitpunktOf(a).localeCompare(zeitpunktOf(b)));
}

function sammleBezuege(stammdaten: DispoStammdaten, einsaetze: readonly Einsatz[]): AuftragsBezuege {
  const proAuftrag = new Map<string, Einsatz[]>();
  for (const einsatz of einsaetze) {
    const liste = proAuftrag.get(einsatz.auftragId) ?? [];
    liste.push(einsatz);
    proAuftrag.set(einsatz.auftragId, liste);
  }
  const bezogenVon = new Map<string, Auftrag[]>();
  for (const auftrag of stammdaten.auftraege.values()) {
    if (!auftrag.bezugAuftragId) continue;
    const liste = bezogenVon.get(auftrag.bezugAuftragId) ?? [];
    liste.push(auftrag);
    bezogenVon.set(auftrag.bezugAuftragId, liste);
  }
  return { proAuftrag, bezogenVon };
}

function bezugEintraege(art: 'bezug' | 'bezogen', anderer: Auftrag, einsaetze: readonly Einsatz[], wann: (einsatz: Einsatz) => string): Verknuepfung[] {
  const kurz = `${anderer.art} ${anderer.nummer}`;
  const praefix = art === 'bezug' ? 'Bezug: ' : '';
  const suffix = art === 'bezogen' ? ' bezieht sich hierauf' : '';
  if (einsaetze.length === 0) return [{ art, auftragId: anderer.id, nummer: anderer.nummer, kurz, text: `${praefix}${kurz}${suffix} · noch nicht disponiert` }];
  return nachZeit(einsaetze).map((einsatz) => ({
    art,
    einsatzId: einsatz.id,
    auftragId: anderer.id,
    nummer: anderer.nummer,
    datum: einsatz.datum,
    startMin: einsatz.startMin,
    kurz,
    wann: wann(einsatz),
    text: `${praefix}${kurz}${suffix} · ${wann(einsatz)}`,
  }));
}

// jh› Zusammenhänge, die ein Disponent sehen muss: weitere Einsätze desselben
//     Auftrags (Erst-/Folgetermin) und Aufträge, die sich aufeinander beziehen
//     (Mietgerät zur Reparatur, Lieferung als Ersatz, Malerarbeiten nach Schaden).
function verknuepfungenAus(stammdaten: DispoStammdaten, bezuege: AuftragsBezuege, auftragId: string, eigener: Einsatz | null): Verknuepfung[] {
  const auftrag = stammdaten.auftraege.get(auftragId);
  if (!auftrag) return [];
  const kuerzel = (technikerId: string) => stammdaten.techniker.find((techniker) => techniker.id === technikerId)?.kuerzel ?? '?';
  const wann = (einsatz: Einsatz) => `${formatWochentag(einsatz.datum, 'kurz')} ${formatDatumKurz(einsatz.datum)} ${formatZeit(einsatz.startMin)} · ${kuerzel(einsatz.technikerId)}`;
  const liste: Verknuepfung[] = [];

  for (const anderer of nachZeit(bezuege.proAuftrag.get(auftragId) ?? [])) {
    if (eigener && anderer.id === eigener.id) continue;
    const art: VerknuepfungArt = eigener && zeitpunktOf(anderer) < zeitpunktOf(eigener) ? 'ersttermin' : 'folgetermin';
    liste.push({
      art,
      einsatzId: anderer.id,
      auftragId,
      nummer: auftrag.nummer,
      datum: anderer.datum,
      startMin: anderer.startMin,
      kurz: VERKNUEPFUNG_LABEL[art],
      wann: wann(anderer),
      text: `${eigener ? VERKNUEPFUNG_LABEL[art] : 'Einsatz'} · ${wann(anderer)}`,
    });
  }
  if (auftrag.bezugAuftragId) {
    const ziel = stammdaten.auftraege.get(auftrag.bezugAuftragId);
    if (ziel) liste.push(...bezugEintraege('bezug', ziel, bezuege.proAuftrag.get(ziel.id) ?? [], wann));
  }
  for (const quelle of bezuege.bezogenVon.get(auftragId) ?? []) {
    liste.push(...bezugEintraege('bezogen', quelle, bezuege.proAuftrag.get(quelle.id) ?? [], wann));
  }
  return liste;
}

export function buildVerknuepfungsIndex(stammdaten: DispoStammdaten, einsaetze: readonly Einsatz[]): VerknuepfungsIndex {
  const bezuege = sammleBezuege(stammdaten, einsaetze);
  const index = new Map<string, Verknuepfung[]>();
  for (const einsatz of einsaetze) {
    const liste = verknuepfungenAus(stammdaten, bezuege, einsatz.auftragId, einsatz);
    if (liste.length > 0) index.set(einsatz.id, liste);
  }
  return index;
}

/** Verknüpfungen eines Auftrags – für die Akte auch ohne eigenen Einsatz (Pendenz). */
export function verknuepfungenFuerAuftrag(stammdaten: DispoStammdaten, einsaetze: readonly Einsatz[], auftragId: string, eigener: Einsatz | null): Verknuepfung[] {
  return verknuepfungenAus(stammdaten, sammleBezuege(stammdaten, einsaetze), auftragId, eigener);
}

// ── §4 · Tageszeile mit Fahrzeit-Puffern ─────────────────────────

function buildEinsatzViews(
  stammdaten: DispoStammdaten,
  techniker: Techniker,
  eigene: readonly Einsatz[],
  filter: DispoFilter,
  jetztMin: Minuten | null,
  verknuepfungen: VerknuepfungsIndex,
): { views: EinsatzView[]; puffer: FahrzeitPuffer[]; spuren: number; fahrzeitMin: Minuten } {
  const { belegung, spuren } = assignLanes(eigene);
  const sortiert = [...eigene].sort((a, b) => a.startMin - b.startMin);
  const puffer: FahrzeitPuffer[] = [];
  let fahrzeitSumme = 0;

  const views = belegung.map(({ eintrag, spur }) => {
    const kontext = resolveAuftrag(stammdaten, eintrag.auftragId);
    const index = sortiert.findIndex((einsatz) => einsatz.id === eintrag.id);
    const vorgaenger = index > 0 ? sortiert[index - 1] : undefined;
    const von = vorgaenger ? resolveAuftrag(stammdaten, vorgaenger.auftragId).koordinaten : SUTT_HQ;
    const anfahrtMin = fahrzeitMin(von, kontext.koordinaten);
    const anfahrtKm = strassenKm(von, kontext.koordinaten);
    const lueckeMin = vorgaenger ? eintrag.startMin - einsatzEnde(vorgaenger) : null;
    const fahrzeitKnapp = lueckeMin !== null && lueckeMin >= 0 && lueckeMin < anfahrtMin;
    const konflikt = eigene.some((anderer) => anderer.id !== eintrag.id && overlaps(anderer, eintrag));
    const ueberzogen = jetztMin !== null && eintrag.status === 'vor-ort' && jetztMin > einsatzEnde(eintrag);
    fahrzeitSumme += anfahrtMin;

    // jh› Puffer liegt direkt vor dem Einsatz; bei knapper Lücke füllt er die ganze Lücke rot.
    const pufferStart = vorgaenger ? einsatzEnde(vorgaenger) : eintrag.startMin - anfahrtMin;
    const pufferDauer = fahrzeitKnapp && lueckeMin !== null ? lueckeMin : anfahrtMin;
    if (lueckeMin === null || lueckeMin > 0) {
      puffer.push({
        startMin: pufferStart,
        dauerMin: Math.min(pufferDauer, eintrag.startMin - pufferStart),
        knapp: fahrzeitKnapp,
        text: fahrzeitKnapp
          ? `${anfahrtMin} min Fahrt, nur ${lueckeMin} min Lücke – ${anfahrtMin - (lueckeMin ?? 0)} min zu knapp`
          : `${anfahrtMin} min · ${anfahrtKm.toFixed(1).replace('.', ',')} km ${vorgaenger ? 'Fahrt' : 'ab Glattbrugg'}`,
      });
    }

    return {
      ...kontext,
      einsatz: eintrag,
      techniker,
      imFilter: matchesFilter(kontext, eintrag, filter),
      konflikt,
      spur,
      anfahrtMin,
      anfahrtKm,
      lueckeMin,
      fahrzeitKnapp,
      ueberzogen,
      verknuepfungen: verknuepfungen.get(eintrag.id) ?? KEINE_VERKNUEPFUNGEN,
    };
  });

  return { views, puffer, spuren, fahrzeitMin: fahrzeitSumme };
}

export function buildTagesZeilen(
  stammdaten: DispoStammdaten,
  einsaetze: readonly Einsatz[],
  datum: IsoDatum,
  filter: DispoFilter,
  jetztMin: Minuten | null,
): TagesZeile[] {
  const verknuepfungen = buildVerknuepfungsIndex(stammdaten, einsaetze);
  return visibleTechniker(stammdaten, filter).map((techniker) => {
    const eigene = einsaetze.filter((einsatz) => einsatz.technikerId === techniker.id && einsatz.datum === datum);
    const { views, puffer, spuren, fahrzeitMin: fahrzeit } = buildEinsatzViews(stammdaten, techniker, eigene, filter, jetztMin, verknuepfungen);
    return {
      techniker,
      datum,
      einsaetze: views,
      puffer,
      spuren,
      geplantMin: sumDauer(eigene),
      fahrzeitMin: fahrzeit,
      absenz: isAbwesend(stammdaten.absenzen, techniker.id, datum),
    };
  });
}

export function buildMehrtagesZeilen(
  stammdaten: DispoStammdaten,
  einsaetze: readonly Einsatz[],
  tage: readonly IsoDatum[],
  filter: DispoFilter,
): MehrtagesZeile[] {
  const verknuepfungen = buildVerknuepfungsIndex(stammdaten, einsaetze);
  return visibleTechniker(stammdaten, filter).map((techniker) => ({
    techniker,
    zellen: tage.map((datum) => {
      const eigene = einsaetze.filter((einsatz) => einsatz.technikerId === techniker.id && einsatz.datum === datum);
      const { views } = buildEinsatzViews(stammdaten, techniker, eigene, filter, null, verknuepfungen);
      views.sort((a, b) => a.einsatz.startMin - b.einsatz.startMin);
      return { datum, einsaetze: views, geplantMin: sumDauer(eigene), absenz: isAbwesend(stammdaten.absenzen, techniker.id, datum) };
    }),
  }));
}

/** Alle Einsätze eines Zeitraums als Views (Kalender, Liste, Karte). */
export function buildEinsatzViewsFuer(
  stammdaten: DispoStammdaten,
  einsaetze: readonly Einsatz[],
  tage: readonly IsoDatum[],
  filter: DispoFilter,
  jetztMin: Minuten | null,
): EinsatzView[] {
  const tageSet = new Set(tage);
  const verknuepfungen = buildVerknuepfungsIndex(stammdaten, einsaetze);
  return visibleTechniker(stammdaten, filter).flatMap((techniker) =>
    tage.flatMap((datum) => {
      const eigene = einsaetze.filter((einsatz) => einsatz.technikerId === techniker.id && einsatz.datum === datum && tageSet.has(einsatz.datum));
      if (eigene.length === 0) return [];
      return buildEinsatzViews(stammdaten, techniker, eigene, filter, datum === tage[0] ? jetztMin : null, verknuepfungen).views;
    }),
  );
}

// ── §5 · Eingang, Wartet, Erledigt ───────────────────────────────

// jh› Sortierung: Dringlichkeit, dann ältester Eingang zuerst – wer am
//     längsten wartet, steht bei gleicher Dringlichkeit oben.
export function buildPendenzViews(stammdaten: DispoStammdaten, pendenzen: readonly Pendenz[], filter: DispoFilter): PendenzView[] {
  return pendenzen
    .map((pendenz) => ({ ...resolveAuftrag(stammdaten, pendenz.auftragId), pendenz }))
    .filter((view) => filter.region === 'alle' || view.region === filter.region)
    .filter((view) => filter.kategorien.length === 0 || filter.kategorien.includes(view.auftrag.kategorie))
    .sort(
      (a, b) =>
        DRINGLICHKEIT_RANG[a.auftrag.dringlichkeit] - DRINGLICHKEIT_RANG[b.auftrag.dringlichkeit] ||
        a.pendenz.erstelltAm.localeCompare(b.pendenz.erstelltAm),
    );
}

export interface WartetView extends AuftragKontext {
  einsatz: Einsatz;
  techniker: Techniker;
  liefertermin: IsoDatum | undefined;
  folgeOffen: boolean;
  /** Bereits geplanter Folgetermin desselben Auftrags. */
  folgeGeplant: Einsatz | undefined;
}

export function buildWartetViews(stammdaten: DispoStammdaten, einsaetze: readonly Einsatz[], pendenzen: readonly Pendenz[]): WartetView[] {
  return einsaetze
    .filter((einsatz) => einsatz.status === 'wartet-teil')
    .map((einsatz) => {
      const kontext = resolveAuftrag(stammdaten, einsatz.auftragId);
      const termine = kontext.auftrag.ersatzteile
        .filter(isTeilOffen)
        .map((teil) => teil.liefertermin)
        .filter((termin): termin is IsoDatum => termin !== undefined)
        .sort();
      return {
        ...kontext,
        einsatz,
        techniker: technikerOf(stammdaten, einsatz.technikerId),
        liefertermin: termine[termine.length - 1],
        folgeOffen: pendenzen.some((pendenz) => pendenz.auftragId === einsatz.auftragId),
        folgeGeplant: nachZeit(einsaetze.filter((kandidat) => kandidat.auftragId === einsatz.auftragId && zeitpunktOf(kandidat) > zeitpunktOf(einsatz)))[0],
      };
    })
    .sort((a, b) => (a.liefertermin ?? '9999').localeCompare(b.liefertermin ?? '9999'));
}

export interface ErledigtView extends AuftragKontext {
  einsatz: Einsatz;
  techniker: Techniker;
}

export function buildErledigtViews(stammdaten: DispoStammdaten, einsaetze: readonly Einsatz[], tage: readonly IsoDatum[]): ErledigtView[] {
  const tageSet = new Set(tage);
  return einsaetze
    .filter((einsatz) => einsatz.status === 'erledigt' && tageSet.has(einsatz.datum))
    .map((einsatz) => ({ ...resolveAuftrag(stammdaten, einsatz.auftragId), einsatz, techniker: technikerOf(stammdaten, einsatz.technikerId) }))
    .sort((a, b) => b.einsatz.datum.localeCompare(a.einsatz.datum) || b.einsatz.startMin - a.einsatz.startMin);
}

// ── §6 · Live-Puls & Kapazität ───────────────────────────────────

export function pulsFor(einsaetzeHeute: readonly Einsatz[], jetztMin: Minuten, absenz: Absenz | undefined): Puls {
  if (absenz) return { art: 'abwesend', text: 'abwesend' };
  const laufend = einsaetzeHeute.find((einsatz) => einsatz.status === 'vor-ort');
  if (laufend) {
    const seit = laufend.statusSeit ? splitZeitpunkt(laufend.statusSeit).minuten : laufend.startMin;
    const ueber = jetztMin - einsatzEnde(laufend);
    if (ueber > 0) return { art: 'ueberzieht', text: `überzieht ${ueber} min` };
    return { art: 'vor-ort', text: `vor Ort seit ${Math.max(0, jetztMin - seit)} min` };
  }
  const unterwegs = einsaetzeHeute.find((einsatz) => einsatz.status === 'unterwegs');
  if (unterwegs) return { art: 'unterwegs', text: `unterwegs · Ankunft ${formatZeit(unterwegs.startMin)}` };
  if (jetztMin < ARBEIT_START) return { art: 'noch-nicht', text: 'vor Arbeitsbeginn' };
  if (jetztMin > ARBEIT_ENDE) return { art: 'feierabend', text: 'Feierabend' };
  const naechster = einsaetzeHeute.filter((einsatz) => einsatz.startMin > jetztMin).sort((a, b) => a.startMin - b.startMin)[0];
  return { art: 'frei', text: naechster ? `frei bis ${formatZeit(naechster.startMin)}` : 'keine weiteren Einsätze' };
}

export function kapazitaetFor(zeile: TagesZeile): Kapazitaet {
  const soll = zeile.absenz ? 0 : zeile.techniker.sollMinuten;
  const frei = Math.max(0, soll - zeile.geplantMin - zeile.fahrzeitMin);
  return {
    technikerId: zeile.techniker.id,
    verplantMin: zeile.geplantMin,
    fahrzeitMin: zeile.fahrzeitMin,
    freiMin: frei,
    sollMin: soll,
    anteil: soll > 0 ? (zeile.geplantMin + zeile.fahrzeitMin) / soll : 0,
  };
}

// ── §7 · Status-Verlauf ──────────────────────────────────────────

const ANFAHRT_MIN = 45;

export function buildPhasen(
  auftrag: Auftrag,
  einsaetze: readonly Einsatz[],
  offenePendenz: Pendenz | null,
  techniker: ReadonlyMap<string, Techniker>,
): PhasenSchritt[] {
  const sortiert = [...einsaetze].sort((a, b) => toZeitpunkt(a.datum, a.startMin).localeCompare(toZeitpunkt(b.datum, b.startMin)));
  const erster = sortiert[0];
  const letzter = sortiert[sortiert.length - 1];
  const alleErledigt = sortiert.length > 0 && sortiert.every((einsatz) => einsatz.status === 'erledigt');
  const begonnen = letzter ? letzter.status !== 'geplant' : false;
  const unterwegsOderWeiter = letzter ? letzter.status !== 'geplant' : false;
  const vorOrtOderWeiter = letzter ? letzter.status === 'vor-ort' || letzter.status === 'erledigt' || letzter.status === 'wartet-teil' : false;

  const schritte: PhasenSchritt[] = [
    { phase: 'angefragt', label: 'Angefragt', erreicht: true, zeit: formatZeitpunkt(auftrag.angefragtAm), detail: auftrag.kanal },
    auftrag.bestelltAm
      ? { phase: 'bestellt', label: 'Bestellt', erreicht: true, zeit: formatZeitpunkt(auftrag.bestelltAm), detail: 'Auftrag erteilt' }
      : { phase: 'bestellt', label: 'Bestellt', erreicht: false, detail: 'Bestellung ausstehend' },
    erster
      ? {
          phase: 'disponiert', label: 'Disponiert', erreicht: true,
          zeit: `${formatDatum(erster.datum)} · ${formatZeitspanne(erster.startMin, erster.dauerMin)}`,
          detail: [techniker.get(erster.technikerId)?.kuerzel, sortiert.length > 1 ? `${sortiert.length} Einsätze` : null].filter(Boolean).join(' · '),
        }
      : { phase: 'disponiert', label: 'Disponiert', erreicht: false, detail: 'im Auftragseingang' },
    letzter && unterwegsOderWeiter
      ? { phase: 'unterwegs', label: 'Unterwegs', erreicht: true, zeit: formatZeitpunkt(toZeitpunkt(letzter.datum, Math.max(0, letzter.startMin - ANFAHRT_MIN))), detail: 'Abfahrt' }
      : { phase: 'unterwegs', label: 'Unterwegs', erreicht: false },
    letzter && vorOrtOderWeiter
      ? { phase: 'vor-ort', label: 'Vor Ort', erreicht: true, zeit: formatZeitpunkt(letzter.statusSeit ?? toZeitpunkt(letzter.datum, letzter.startMin)), detail: 'Ankunft' }
      : { phase: 'vor-ort', label: 'Vor Ort', erreicht: false },
    buildErledigtSchritt(alleErledigt && !offenePendenz, letzter, offenePendenz, begonnen),
  ];
  return schritte;
}

function buildErledigtSchritt(erreicht: boolean, letzter: Einsatz | undefined, offenePendenz: Pendenz | null, begonnen: boolean): PhasenSchritt {
  if (erreicht && letzter) {
    return { phase: 'erledigt', label: 'Erledigt', erreicht: true, zeit: formatZeitpunkt(toZeitpunkt(letzter.datum, einsatzEnde(letzter))) };
  }
  if (letzter?.status === 'wartet-teil') return { phase: 'erledigt', label: 'Erledigt', erreicht: false, detail: 'wartet auf Teil' };
  if (offenePendenz?.anlass === 'folgetermin') return { phase: 'erledigt', label: 'Erledigt', erreicht: false, detail: 'Folgetermin offen' };
  if (begonnen) return { phase: 'erledigt', label: 'Erledigt', erreicht: false, detail: 'in Arbeit' };
  return { phase: 'erledigt', label: 'Erledigt', erreicht: false };
}

// ── §8 · Suche ───────────────────────────────────────────────────

export function buildSuchIndex(stammdaten: DispoStammdaten, einsaetze: readonly Einsatz[], pendenzen: readonly Pendenz[]): SuchEintrag[] {
  const auftragIds = new Set([...einsaetze.map((einsatz) => einsatz.auftragId), ...pendenzen.map((pendenz) => pendenz.auftragId)]);
  return [...auftragIds].map((auftragId) => {
    const { auftrag, kunde, liegenschaft, geraet } = resolveAuftrag(stammdaten, auftragId);
    const ort = `${formatStrasse(liegenschaft.adresse)}, ${liegenschaft.adresse.ort}`;
    const felder = [
      auftrag.nummer, kunde.name, kunde.kurzname, liegenschaft.bezeichnung, ort, liegenschaft.adresse.plz,
      auftrag.kontaktVorOrt.name, auftrag.kontaktVorOrt.telefon, geraet.marke, geraet.art, geraet.modell, geraet.typNummer, geraet.seriennummer,
      auftrag.fehlerbild, KATEGORIE_LABEL[auftrag.kategorie], auftrag.art,
    ];
    return {
      id: auftrag.id,
      kennung: auftrag.nummer,
      titel: `${kunde.name} · ${auftrag.kontaktVorOrt.name}`,
      untertitel: `${ort} · ${geraet.marke} ${geraet.modell} · SN ${geraet.seriennummer}`,
      suchtext: normalizeSuchtext(felder.join(' ')),
    };
  });
}

export function technikerLabel(techniker: Techniker): string {
  return `${techniker.kuerzel} · ${fullName(techniker)}`;
}

/* ◆ jh · eof */
