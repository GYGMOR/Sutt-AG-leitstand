/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/generator.ts                                  │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Deterministischer Füller: drei Wochen, neun Techniker, Kategorien     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, isSunday, startOfWeek, toIsoDate, toZeitpunkt } from '../core/datum';
import type { IsoDatum, Minuten } from '../core/datum';
import type { Auftrag, Auftragsart, Dringlichkeit, Ersatzteil, KontaktVorOrt, Rechnungsempfaenger } from '../core/domain/auftrag';
import type { Einsatz, EinsatzStatus } from '../core/domain/einsatz';
import { kategorieFor } from '../core/domain/kategorie';
import { isAbwesend, regionOf } from '../core/domain/stammdaten';
import type { Absenz, Geraet, Kunde, Liegenschaft, Techniker, Wohnung } from '../core/domain/stammdaten';
import { deriveTagesStatus } from './einsaetze';
import { hm } from './heute';
import { KATALOG, KATALOG_KEYS, buildGeraet, buildTeil, fehlerbildOf, hasTeile } from './katalog';
import type { KatalogKey } from './katalog';

// ── §1 · Zufall mit Saat ─────────────────────────────────────────

// jh› Saat aus Datum + Techniker: derselbe Tag sieht bei jedem Neuladen
//     gleich aus – Screenshots und Abnahmen bleiben vergleichbar.
export type Zufall = () => number;

export function seedFrom(text: string): number {
  let hash = 2166136261;
  for (const zeichen of text) {
    hash ^= zeichen.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): Zufall {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let wert = state;
    wert = Math.imul(wert ^ (wert >>> 15), wert | 1);
    wert ^= wert + Math.imul(wert ^ (wert >>> 7), wert | 61);
    return ((wert ^ (wert >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(zufall: Zufall, liste: readonly T[]): T {
  const wahl = liste[Math.floor(zufall() * liste.length)];
  if (wahl === undefined) throw new Error('Mock-Generator: leere Auswahlliste');
  return wahl;
}

export function between(zufall: Zufall, von: number, bis: number): number {
  return von + Math.floor(zufall() * (bis - von + 1));
}

// ── §2 · Bausteine ───────────────────────────────────────────────

const VORNAMEN = [
  'Daniel', 'Sandra', 'Thomas', 'Nicole', 'Martin', 'Barbara', 'Peter', 'Monika', 'Stefan', 'Claudia', 'Urs',
  'Manuela', 'Lukas', 'Corinne', 'Adrian', 'Jasmin', 'Regula', 'Fabian', 'Michelle', 'Pascal', 'Esther',
  'Dominik', 'Yvonne', 'Mehmet', 'Ana', 'Elif', 'Sofia', 'Roland', 'Silvia', 'Kurt',
] as const;

const NACHNAMEN = [
  'Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Schneider', 'Meyer', 'Steiner', 'Fischer', 'Gerber',
  'Baumann', 'Zimmermann', 'Moser', 'Widmer', 'Wyss', 'Roth', 'Bühler', 'Kälin', 'Suter', 'Arnold', 'Lüthi',
  'Bachmann', 'Hofmann', 'Kaufmann', 'Egli', 'Studer', 'Bosshard', 'Gashi', 'Ferreira', 'Yilmaz', 'Kovačević',
] as const;

const ZIMMER = ['2½', '3½', '3½', '4½', '4½', '5½'] as const;

const MUSTER: readonly (readonly (readonly [start: string, maxDauer: Minuten])[])[] = [
  [['07:30', 90], ['09:30', 60], ['11:00', 60], ['13:00', 90], ['15:00', 60]],
  [['08:00', 60], ['09:30', 90], ['11:30', 60], ['13:30', 60], ['15:00', 90]],
  [['07:30', 60], ['09:00', 90], ['11:00', 30], ['13:00', 120], ['15:30', 60]],
  [['08:00', 90], ['10:00', 60], ['13:00', 60], ['14:30', 90], ['16:30', 60]],
];

const REPARATUR_KEYS = KATALOG_KEYS.filter((key) => key !== 'lh-kg');
const NEUGERAET_KEYS: readonly KatalogKey[] = ['lh-kg', 'lh-ks', 'siemens-gs', 'vzug-wm', 'miele-wm', 'elux-ks'];

function telefon(zufall: Zufall): string {
  return `07${pick(zufall, ['6', '8', '9'])} ${between(zufall, 100, 999)} ${between(zufall, 10, 99)} ${between(zufall, 10, 99)}`;
}

function wohnungFor(zufall: Zufall): Wohnung {
  const etage = between(zufall, 0, 4);
  const lage = etage === 0 ? 'EG' : `${etage}. OG`;
  return { nummer: `W ${etage}.${String(between(zufall, 1, 6)).padStart(2, '0')}`, lage: `${pick(zufall, ZIMMER)}-Zi · ${lage}` };
}

function kontaktFor(zufall: Zufall, kunde: Kunde): KontaktVorOrt {
  if (kunde.art === 'privat') return { rolle: 'Eigentümer', ...kunde.kontakt };
  if (kunde.art === 'gewerbe') return { rolle: 'Betrieb', ...kunde.kontakt };
  return { rolle: 'Mieter', name: `${pick(zufall, VORNAMEN)} ${pick(zufall, NACHNAMEN)}`, telefon: telefon(zufall) };
}

function dringlichkeitFor(zufall: Zufall): Dringlichkeit {
  const wurf = zufall();
  if (wurf < 0.04) return 'notfall';
  if (wurf < 0.16) return 'hoch';
  if (wurf < 0.86) return 'normal';
  return 'tief';
}

// jh› Verteilung nach Bauchgefühl Service-Betrieb: zwei Drittel Reparatur, Rest gemischt.
function artFor(zufall: Zufall): Auftragsart {
  const wurf = zufall();
  if (wurf < 0.6) return 'Reparatur';
  if (wurf < 0.7) return 'Service';
  if (wurf < 0.78) return 'Montage';
  if (wurf < 0.85) return 'Lieferung';
  if (wurf < 0.93) return 'Garantie';
  if (wurf < 0.96) return 'Mietgerät';
  if (wurf < 0.98) return 'Abklärung';
  return 'Malerarbeiten';
}

function fehlerbildFor(art: Auftragsart, key: KatalogKey, zufall: Zufall): string {
  switch (art) {
    case 'Service':
      return 'Jahreswartung gemäss Serviceabo';
    case 'Montage':
      return `Lieferung & Montage ${KATALOG[key].marke} ${KATALOG[key].art}, Altgerät entsorgen`;
    case 'Lieferung':
      return `Lieferung ${KATALOG[key].marke} ${KATALOG[key].modell}, Anschluss und Einweisung`;
    case 'Mietgerät':
      return `Mietgerät ${KATALOG[key].art} stellen – Überbrückung bis Reparatur`;
    case 'Abklärung':
      return `Besichtigung und Offerte Ersatz ${KATALOG[key].art}`;
    case 'Malerarbeiten':
      return 'Malerarbeiten Küche nach Wasserschaden (Offerte bewilligt)';
    default:
      return fehlerbildOf(key, between(zufall, 0, 2));
  }
}

function dauerFor(zufall: Zufall, art: Auftragsart, maxDauer: Minuten): Minuten {
  if (art === 'Montage' || art === 'Malerarbeiten') return Math.max(maxDauer, 120);
  if (art === 'Abklärung') return 30;
  if (zufall() < 0.6) return maxDauer;
  return pick(zufall, [30, 60, 90, 120].filter((dauer) => dauer <= maxDauer));
}

function geraetKeyFor(zufall: Zufall, techniker: Techniker, art: Auftragsart): KatalogKey {
  if (art === 'Montage' || art === 'Lieferung' || art === 'Mietgerät') return pick(zufall, NEUGERAET_KEYS);
  const passend = REPARATUR_KEYS.filter((key) => techniker.kompetenzen.includes(KATALOG[key].marke));
  return zufall() < 0.7 && passend.length > 0 ? pick(zufall, passend) : pick(zufall, REPARATUR_KEYS);
}

// jh› Garantie (2 Jahre ab Kauf) ist ab Baujahr 2023 immer hinterlegt, bei älteren Geräten nur zu einem
//     Viertel – so hat die Kartei laufende, abgelaufene und unbekannte Garantien.
function garantieFor(zufall: Zufall, baujahr: number): { garantieBis?: IsoDatum } {
  const hinterlegt = baujahr >= 2023 || zufall() < 0.25;
  if (!hinterlegt) return {};
  return { garantieBis: toIsoDate(new Date(baujahr + 2, between(zufall, 0, 11), between(zufall, 1, 28))) };
}

// ── §3 · Tagesfüllung ────────────────────────────────────────────

interface GeneratorKontext {
  heute: IsoDatum;
  jetztMin: Minuten;
  techniker: readonly Techniker[];
  liegenschaften: readonly Liegenschaft[];
  kunden: ReadonlyMap<string, Kunde>;
  absenzen: readonly Absenz[];
  /** Bereits belegte Einsätze (handverlesen) – der Generator plant darum herum. */
  reserviert: readonly Einsatz[];
  /** Techniker, deren heutiger Plan handverlesen ist. */
  handTechnikerHeute: ReadonlySet<string>;
}

export interface GeneratorErgebnis {
  auftraege: Auftrag[];
  geraete: Geraet[];
  einsaetze: Einsatz[];
}

function overlapsReserved(kontext: GeneratorKontext, technikerId: string, datum: IsoDatum, start: Minuten, dauer: Minuten): boolean {
  return kontext.reserviert.some(
    (einsatz) =>
      einsatz.technikerId === technikerId &&
      einsatz.datum === datum &&
      start < einsatz.startMin + einsatz.dauerMin &&
      einsatz.startMin < start + dauer,
  );
}

function teileFor(zufall: Zufall, key: KatalogKey, status: EinsatzStatus, datum: IsoDatum, heute: IsoDatum): Ersatzteil[] {
  if (!hasTeile(key) || zufall() > 0.45) return [];
  if (status === 'wartet-teil') return [buildTeil(key, 0, 'bestellt', addDays(heute, between(zufall, 1, 3)))];
  if (status === 'erledigt') return [buildTeil(key, 0, 'ab-lager')];
  const vortag = addDays(datum, -1);
  if (zufall() < 0.4 && vortag > heute) return [buildTeil(key, 0, 'bestellt', vortag)];
  return [buildTeil(key, 0, 'ab-lager')];
}

function rechnungFor(art: Auftragsart, liegenschaft: Liegenschaft, geraet: Geraet, zufall: Zufall): Rechnungsempfaenger {
  if (art === 'Garantie') return { art: 'garantie', marke: geraet.marke, fallNummer: `GA-${between(zufall, 100000, 999999)}` };
  if (liegenschaft.objektNummer) return { art: 'auftraggeber', referenz: `Objekt ${liegenschaft.objektNummer}` };
  return { art: 'auftraggeber' };
}

interface Rohplan {
  slotIndex: number;
  startMin: Minuten;
  dauerMin: Minuten;
  art: Auftragsart;
}

interface Bekannt {
  geraet: Geraet;
  wohnung?: Wohnung;
}

// jh› Geräte haben ein Leben: Reparatur, Service und Garantie treffen mit 40 % ein Gerät,
//     das an dieser Liegenschaft schon einmal Besuch hatte – so entsteht eine echte Kartei.
const WIEDERSEHEN = 0.4;

export function generateFill(kontext: GeneratorKontext): GeneratorErgebnis {
  const ergebnis: GeneratorErgebnis = { auftraege: [], geraete: [], einsaetze: [] };
  const bekannt = new Map<string, Bekannt[]>();
  const erster = addDays(startOfWeek(kontext.heute), -7);
  let laufnummer = 4200;

  for (let offset = 0; offset < 21; offset += 1) {
    const datum = addDays(erster, offset);
    if (isSunday(datum)) continue;
    const istHeute = datum === kontext.heute;

    for (const techniker of kontext.techniker) {
      if (istHeute && kontext.handTechnikerHeute.has(techniker.id)) continue;
      if (isAbwesend(kontext.absenzen, techniker.id, datum)) continue;

      const zufall = mulberry32(seedFrom(`${datum}·${techniker.id}`));
      const muster = pick(zufall, MUSTER);

      // jh› Erst alle Slots des Tages würfeln, dann die Status in Zeitreihenfolge
      //     ableiten – sonst wären heute zwei Einsätze gleichzeitig «vor Ort».
      const rohplaene: Rohplan[] = [];
      muster.forEach(([start, maxDauer], slotIndex) => {
        if (zufall() > 0.74) return;
        const art = artFor(zufall);
        const startMin = hm(start);
        const dauerMin = dauerFor(zufall, art, maxDauer);
        if (overlapsReserved(kontext, techniker.id, datum, startMin, dauerMin)) return;
        if (rohplaene.some((plan) => startMin < plan.startMin + plan.dauerMin && plan.startMin < startMin + dauerMin)) return;
        rohplaene.push({ slotIndex, startMin, dauerMin, art });
      });

      const statusHeute = istHeute
        ? deriveTagesStatus(rohplaene.map((plan) => ({ startMin: plan.startMin, dauerMin: plan.dauerMin, wartetTeil: false })), kontext.jetztMin)
        : [];

      rohplaene.forEach((plan, index) => {
        const imGebiet = kontext.liegenschaften.filter((kandidat) => regionOf(kandidat.adresse.ort) === techniker.region);
        const liegenschaft = zufall() < 0.75 && imGebiet.length > 0 ? pick(zufall, imGebiet) : pick(zufall, kontext.liegenschaften);
        const kunde = kontext.kunden.get(liegenschaft.kundeId);
        if (!kunde) return;

        laufnummer += 1;
        const id = `GX-${datum}-${techniker.kuerzel}-${plan.slotIndex}`;
        const dringlichkeit = dringlichkeitFor(zufall);
        const vergangen = datum < kontext.heute;
        const status: EinsatzStatus = istHeute ? (statusHeute[index] ?? 'geplant') : vergangen ? (zufall() < 0.05 ? 'wartet-teil' : 'erledigt') : 'geplant';
        const neugeraet = plan.art === 'Montage' || plan.art === 'Lieferung' || plan.art === 'Mietgerät';
        const schonDa = bekannt.get(liegenschaft.id) ?? [];
        const wiedersehen = !neugeraet && schonDa.length > 0 && zufall() < WIEDERSEHEN ? pick(zufall, schonDa) : null;
        const key = wiedersehen ? (KATALOG_KEYS.find((kandidat) => KATALOG[kandidat].modell === wiedersehen.geraet.modell) ?? geraetKeyFor(zufall, techniker, plan.art)) : geraetKeyFor(zufall, techniker, plan.art);
        const baujahr = neugeraet ? 2026 : between(zufall, 2012, 2025);
        const geraet =
          wiedersehen?.geraet ??
          buildGeraet(key, {
            id: `G-${id}`,
            seriennummer: `${between(zufall, 1000, 9999)}-${between(zufall, 1000, 9999)}`,
            baujahr,
            ...(neugeraet ? { garantieBis: addDays(datum, 730) } : garantieFor(zufall, baujahr)),
          });
        const wohnung = wiedersehen ? wiedersehen.wohnung : kunde.art === 'verwaltung' ? wohnungFor(zufall) : undefined;
        if (!wiedersehen) {
          ergebnis.geraete.push(geraet);
          bekannt.set(liegenschaft.id, [...schonDa, { geraet, ...(wohnung ? { wohnung } : {}) }]);
        }

        // jh› Eingang immer vor dem Einsatz und nie in der Zukunft.
        const vorlauf = between(zufall, 1, 4);
        const angefragtTag = vergangen ? addDays(datum, -vorlauf) : addDays(kontext.heute, -Math.min(vorlauf, 3));
        const angefragtMin = between(zufall, 15, 34) * 30;

        ergebnis.auftraege.push({
          id,
          nummer: `26-0${laufnummer}`,
          art: plan.art,
          kategorie: kategorieFor(plan.art, dringlichkeit),
          dringlichkeit,
          fehlerbild: fehlerbildFor(plan.art, key, zufall),
          kanal: pick(zufall, ['Telefon', 'Telefon', 'E-Mail', 'Portal'] as const),
          angefragtAm: toZeitpunkt(angefragtTag, angefragtMin),
          bestelltAm: toZeitpunkt(angefragtTag, angefragtMin + between(zufall, 10, 90)),
          kundeId: kunde.id,
          liegenschaftId: liegenschaft.id,
          ...(wohnung ? { wohnung } : {}),
          kontaktVorOrt: kontaktFor(zufall, kunde),
          rechnung: rechnungFor(plan.art, liegenschaft, geraet, zufall),
          geraetId: geraet.id,
          ersatzteile: teileFor(zufall, key, status, datum, kontext.heute),
          fotos: [],
          rapport: 'offen',
          rechnungStatus: 'offen',
          dauerMin: plan.dauerMin,
        });
        ergebnis.einsaetze.push({
          id: `E-${id}`,
          auftragId: id,
          technikerId: techniker.id,
          datum,
          startMin: plan.startMin,
          dauerMin: plan.dauerMin,
          status,
          ...(status === 'vor-ort' ? { statusSeit: toZeitpunkt(datum, plan.startMin) } : {}),
        });
      });
    }
  }

  return ergebnis;
}

/* ◆ jh · eof */
