/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/index.ts                                      │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Mock-Bestand zusammenstellen, veredeln (Verlauf, Rapport, Lager)      │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Benutzer } from '../core/auth/auth.types';
import { addDays } from '../core/datum';
import type { Auftrag, RechnungStatus } from '../core/domain/auftrag';
import type { Einsatz, Pendenz } from '../core/domain/einsatz';
import { BETRIEBLICHE_FEIERTAGE_STANDARD } from '../core/domain/feiertage';
import type { JournalEintrag } from '../core/domain/journal';
import type { Artikel, Bestellung, Lagerbestand, Lagerbewegung } from '../core/domain/lager';
import type { Nachricht } from '../core/domain/nachricht';
import type { Mitarbeiter } from '../core/domain/personal';
import type { Rapport } from '../core/domain/rapport';
import type { Absenz, Geraet, GeraetEreignis, Kunde, Liegenschaft, Techniker } from '../core/domain/stammdaten';
import { ARBEITSZEIT_STANDARD } from '../core/domain/zeit';
import type { Monatsabschluss, ZeitEintrag } from '../core/domain/zeit';
import { ABSENZEN } from './absenzen';
import { HAND_AUFTRAEGE, HAND_GERAETE } from './auftraege';
import { BENUTZER } from './benutzer';
import { HAND_EINSAETZE, HAND_PENDENZEN, HAND_TECHNIKER_HEUTE } from './einsaetze';
import { between, generateFill, mulberry32, pick, seedFrom } from './generator';
import { MOCK_HEUTE, MOCK_REFERENZ_MIN } from './heute';
import { JOURNAL } from './journal';
import { KUNDEN, LIEGENSCHAFTEN } from './kunden';
import { buildLager } from './lager';
import { MITARBEITER } from './personal';
import { buildRapporte } from './rapporte';
import { TECHNIKER } from './techniker';
import { buildZeit } from './zeit';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface Stammdaten {
  techniker: readonly Techniker[];
  auftraege: ReadonlyMap<string, Auftrag>;
  kunden: ReadonlyMap<string, Kunde>;
  liegenschaften: ReadonlyMap<string, Liegenschaft>;
  geraete: ReadonlyMap<string, Geraet>;
  artikel: ReadonlyMap<string, Artikel>;
  absenzen: readonly Absenz[];
  mitarbeiter: ReadonlyMap<string, Mitarbeiter>;
  benutzer: ReadonlyMap<string, Benutzer>;
}

export interface Bestand {
  einsaetze: readonly Einsatz[];
  pendenzen: readonly Pendenz[];
  rapporte: readonly Rapport[];
  nachrichten: readonly Nachricht[];
  bestaende: readonly Lagerbestand[];
  bestellungen: readonly Bestellung[];
  bewegungen: readonly Lagerbewegung[];
  zeiteintraege: readonly ZeitEintrag[];
  monatsabschluesse: readonly Monatsabschluss[];
  journal: readonly JournalEintrag[];
}

/** Telefonbuch für die Schnellerfassung: normalisierte Nummer → wer ruft an. */
export interface TelefonEintrag {
  ziffern: string;
  anzeige: string;
  name: string;
  rolle: string;
  kundeId: string;
  liegenschaftId?: string;
  wohnungNummer?: string;
}

// ── §2 · Zusammenstellen ─────────────────────────────────────────

function byId<T extends { id: string }>(eintraege: readonly T[]): ReadonlyMap<string, T> {
  return new Map(eintraege.map((eintrag) => [eintrag.id, eintrag]));
}

const kunden = byId(KUNDEN);

const fuellung = generateFill({
  heute: MOCK_HEUTE,
  jetztMin: MOCK_REFERENZ_MIN,
  techniker: TECHNIKER,
  liegenschaften: LIEGENSCHAFTEN,
  kunden,
  absenzen: ABSENZEN,
  reserviert: HAND_EINSAETZE,
  handTechnikerHeute: HAND_TECHNIKER_HEUTE,
});

const rohEinsaetze: readonly Einsatz[] = [...HAND_EINSAETZE, ...fuellung.einsaetze];

// ── §3 · Veredelung: Verlauf, Rapporte, Verrechnung, Gerätehistorie ────

const HISTORIE_TEXTE = [
  'Laugenpumpe ersetzt',
  'Jahreswartung durchgeführt',
  'Türverriegelung ersetzt',
  'Heizelement ersetzt, Dichtung erneuert',
  'Fehlerspeicher gelöscht, Probelauf i. O.',
  'Entkalkung und Reinigung Sprüharme',
  'Garantiefall: Steuerplatine getauscht',
] as const;

const rohAuftraege: readonly Auftrag[] = [...HAND_AUFTRAEGE, ...fuellung.auftraege];
const rohGeraete: readonly Geraet[] = [...HAND_GERAETE, ...fuellung.geraete];

// jh› Statusverläufe und Rapporte entstehen aus den Einsätzen – deterministisch
//     mit Saat, damit Demo und Screenshots stabil bleiben.
const { rapporte, einsaetze: alleEinsaetze } = buildRapporte(
  { heute: MOCK_HEUTE, jetztMin: MOCK_REFERENZ_MIN, auftraege: byId(rohAuftraege), geraete: byId(rohGeraete), techniker: TECHNIKER },
  rohEinsaetze,
);

// jh› Der Auftrag spiegelt seinen jüngsten Rapport: Status, Fotos, Verrechnung.
//     Ohne Rapport, aber mit begonnenem Einsatz, bleibt der Rapport «offen».
function veredleAuftrag(auftrag: Auftrag, einsaetze: readonly Einsatz[], rapporteProAuftrag: ReadonlyMap<string, readonly Rapport[]>): Auftrag {
  const eigene = rapporteProAuftrag.get(auftrag.id) ?? [];
  const juengster = [...eigene].sort((a, b) => a.erstelltAm.localeCompare(b.erstelltAm)).pop();
  if (!juengster) {
    const begonnen = einsaetze.some((einsatz) => einsatz.auftragId === auftrag.id && (einsatz.status === 'erledigt' || einsatz.status === 'wartet-teil'));
    return begonnen ? { ...auftrag, rapport: 'offen', fotos: [] } : auftrag;
  }
  const zufall = mulberry32(seedFrom(`rechnung·${auftrag.id}`));
  const rechnungStatus: RechnungStatus = juengster.status === 'verrechnet' ? (zufall() < 0.55 ? 'bezahlt' : 'gestellt') : 'offen';
  return { ...auftrag, rapport: juengster.status, rapportId: juengster.id, fotos: juengster.fotos, rechnungStatus };
}

function historieFor(geraet: Geraet, technikerListe: readonly Techniker[]): readonly GeraetEreignis[] {
  if (geraet.baujahr >= 2025) return [];
  const zufall = mulberry32(seedFrom(`hist·${geraet.id}`));
  const anzahl = between(zufall, 0, 3);
  return Array.from({ length: anzahl }, (_, index) => ({
    datum: addDays(MOCK_HEUTE, -(between(zufall, 60, 400) + index * 365)),
    text: pick(zufall, HISTORIE_TEXTE),
    technikerKuerzel: pick(zufall, technikerListe).kuerzel,
  })).sort((a, b) => b.datum.localeCompare(a.datum));
}

const rapporteProAuftrag = new Map<string, Rapport[]>();
for (const rapport of rapporte) {
  const liste = rapporteProAuftrag.get(rapport.auftragId) ?? [];
  liste.push(rapport);
  rapporteProAuftrag.set(rapport.auftragId, liste);
}
const auftraege: readonly Auftrag[] = rohAuftraege.map((auftrag) => veredleAuftrag(auftrag, alleEinsaetze, rapporteProAuftrag));
const geraete: readonly Geraet[] = rohGeraete.map((geraet) => ({
  ...geraet,
  historie: historieFor(geraet, TECHNIKER),
}));

// ── §4 · Lager ───────────────────────────────────────────────────

// jh› Lager aus den fertigen Aufträgen: Bestellungen für bestellte Teile, Verbrauch aus
//     erledigten Einsätzen – Lagerzahlen passen damit zur Plantafel (ADR-004).
const lager = buildLager({ heute: MOCK_HEUTE, techniker: TECHNIKER, auftraege, einsaetze: alleEinsaetze });

// jh› Zeiterfassung aus demselben Plan: Stempel rund um Abfahrt und Feierabend, Büro in Gleitzeit,
//     Vormonat abgeschlossen – Kundenwunsch «Arbeits- und Fahrzeiten aus dem Einsatzplan».
const zeit = buildZeit({
  heute: MOCK_HEUTE,
  jetztMin: MOCK_REFERENZ_MIN,
  mitarbeiter: MITARBEITER,
  einsaetze: alleEinsaetze,
  absenzen: ABSENZEN,
  kanton: 'ZH',
  betrieblich: BETRIEBLICHE_FEIERTAGE_STANDARD,
  modell: ARBEITSZEIT_STANDARD,
});

// ── §5 · Export ──────────────────────────────────────────────────

export const mockStammdaten: Stammdaten = {
  techniker: TECHNIKER,
  auftraege: byId(auftraege),
  kunden,
  liegenschaften: byId(LIEGENSCHAFTEN),
  geraete: byId(geraete),
  artikel: new Map(lager.artikel.map((artikel) => [artikel.artikelNummer, artikel])),
  absenzen: ABSENZEN,
  mitarbeiter: byId(MITARBEITER),
  benutzer: byId(BENUTZER),
};

export const mockBestand: Bestand = {
  einsaetze: alleEinsaetze,
  pendenzen: HAND_PENDENZEN,
  rapporte,
  nachrichten: [],
  bestaende: lager.bestaende,
  bestellungen: lager.bestellungen,
  bewegungen: lager.bewegungen,
  zeiteintraege: zeit.zeiteintraege,
  monatsabschluesse: zeit.monatsabschluesse,
  journal: [...JOURNAL, ...zeit.journal].sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt)),
};

export { MOCK_HEUTE };
export { MOCK_ANFRAGEN } from './anfragen';

function nurZiffern(telefon: string): string {
  return telefon.replace(/\D/g, '');
}

export const mockTelefonbuch: readonly TelefonEintrag[] = (() => {
  const eintraege = new Map<string, TelefonEintrag>();
  for (const kunde of KUNDEN) {
    eintraege.set(nurZiffern(kunde.kontakt.telefon), {
      ziffern: nurZiffern(kunde.kontakt.telefon), anzeige: kunde.kontakt.telefon, name: kunde.kontakt.name,
      rolle: kunde.art === 'verwaltung' ? 'Verwaltung' : kunde.art === 'gewerbe' ? 'Betrieb' : 'Eigentümer', kundeId: kunde.id,
    });
  }
  for (const liegenschaft of LIEGENSCHAFTEN) {
    if (!liegenschaft.hauswart) continue;
    eintraege.set(nurZiffern(liegenschaft.hauswart.telefon), {
      ziffern: nurZiffern(liegenschaft.hauswart.telefon), anzeige: liegenschaft.hauswart.telefon, name: liegenschaft.hauswart.name,
      rolle: 'Hauswart', kundeId: liegenschaft.kundeId, liegenschaftId: liegenschaft.id,
    });
  }
  for (const auftrag of HAND_AUFTRAEGE) {
    const ziffern = nurZiffern(auftrag.kontaktVorOrt.telefon);
    if (eintraege.has(ziffern)) continue;
    eintraege.set(ziffern, {
      ziffern, anzeige: auftrag.kontaktVorOrt.telefon, name: auftrag.kontaktVorOrt.name, rolle: auftrag.kontaktVorOrt.rolle,
      kundeId: auftrag.kundeId, liegenschaftId: auftrag.liegenschaftId, ...(auftrag.wohnung ? { wohnungNummer: auftrag.wohnung.nummer } : {}),
    });
  }
  return [...eintraege.values()];
})();

// ── §6 · Konsistenz ──────────────────────────────────────────────

// jh! Fehlende Referenzen im Mock sind Programmierfehler – lieber laut beim
//     Start als still mit leeren Feldern in der Akte.
function assertConsistent(stammdaten: Stammdaten, bestand: Bestand): void {
  const fehler: string[] = [];
  for (const auftrag of stammdaten.auftraege.values()) {
    if (!stammdaten.kunden.has(auftrag.kundeId)) fehler.push(`${auftrag.id}: Kunde ${auftrag.kundeId}`);
    if (!stammdaten.liegenschaften.has(auftrag.liegenschaftId)) fehler.push(`${auftrag.id}: Liegenschaft`);
    if (!stammdaten.geraete.has(auftrag.geraetId)) fehler.push(`${auftrag.id}: Gerät`);
  }
  const technikerIds = new Set(stammdaten.techniker.map((techniker) => techniker.id));
  for (const einsatz of bestand.einsaetze) {
    if (!stammdaten.auftraege.has(einsatz.auftragId)) fehler.push(`${einsatz.id}: Auftrag ${einsatz.auftragId}`);
    if (!technikerIds.has(einsatz.technikerId)) fehler.push(`${einsatz.id}: Techniker ${einsatz.technikerId}`);
  }
  for (const pendenz of bestand.pendenzen) {
    if (!stammdaten.auftraege.has(pendenz.auftragId)) fehler.push(`${pendenz.id}: Auftrag ${pendenz.auftragId}`);
  }
  const einsatzIds = new Set(bestand.einsaetze.map((einsatz) => einsatz.id));
  for (const rapport of bestand.rapporte) {
    if (!stammdaten.auftraege.has(rapport.auftragId)) fehler.push(`${rapport.id}: Auftrag ${rapport.auftragId}`);
    if (!einsatzIds.has(rapport.einsatzId)) fehler.push(`${rapport.id}: Einsatz ${rapport.einsatzId}`);
  }
  for (const absenz of stammdaten.absenzen) {
    if (absenz.technikerId && !technikerIds.has(absenz.technikerId)) fehler.push(`${absenz.id}: Techniker ${absenz.technikerId}`);
    if (!stammdaten.mitarbeiter.has(absenz.mitarbeiterId)) fehler.push(`${absenz.id}: Mitarbeiter ${absenz.mitarbeiterId}`);
  }
  for (const benutzer of stammdaten.benutzer.values()) {
    if (benutzer.mitarbeiterId && !stammdaten.mitarbeiter.has(benutzer.mitarbeiterId)) fehler.push(`${benutzer.id}: Mitarbeiter ${benutzer.mitarbeiterId}`);
    if (benutzer.technikerId && !technikerIds.has(benutzer.technikerId)) fehler.push(`${benutzer.id}: Techniker ${benutzer.technikerId}`);
  }
  for (const eintrag of bestand.zeiteintraege) {
    if (!stammdaten.mitarbeiter.has(eintrag.mitarbeiterId)) fehler.push(`${eintrag.id}: Mitarbeiter ${eintrag.mitarbeiterId}`);
  }
  for (const abschluss of bestand.monatsabschluesse) {
    if (!stammdaten.mitarbeiter.has(abschluss.mitarbeiterId)) fehler.push(`${abschluss.id}: Mitarbeiter ${abschluss.mitarbeiterId}`);
  }
  for (const bestellung of bestand.bestellungen) {
    if (!stammdaten.artikel.has(bestellung.artikelNummer)) fehler.push(`${bestellung.id}: Artikel ${bestellung.artikelNummer}`);
    if (bestellung.auftragId && !stammdaten.auftraege.has(bestellung.auftragId)) fehler.push(`${bestellung.id}: Auftrag ${bestellung.auftragId}`);
  }
  for (const eintrag of bestand.bestaende) {
    if (!stammdaten.artikel.has(eintrag.artikelNummer)) fehler.push(`Bestand ${eintrag.ort}: Artikel ${eintrag.artikelNummer}`);
  }
  for (const bewegung of bestand.bewegungen) {
    if (!stammdaten.artikel.has(bewegung.artikelNummer)) fehler.push(`${bewegung.id}: Artikel ${bewegung.artikelNummer}`);
  }
  if (fehler.length > 0) throw new Error(`Mock inkonsistent:\n${fehler.join('\n')}`);
}

assertConsistent(mockStammdaten, mockBestand);

/* ◆ jh · eof */
