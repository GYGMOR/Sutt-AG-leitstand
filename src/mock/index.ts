/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/index.ts                                      │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Mock-Bestand zusammenstellen, veredeln (Verlauf, Rapport) und prüfen  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays } from '../core/datum';
import type { Auftrag, RechnungStatus } from '../core/domain/auftrag';
import type { Einsatz, Pendenz } from '../core/domain/einsatz';
import type { Nachricht } from '../core/domain/nachricht';
import type { Rapport } from '../core/domain/rapport';
import type { Absenz, Geraet, GeraetEreignis, Kunde, Liegenschaft, Techniker } from '../core/domain/stammdaten';
import { ABSENZEN } from './absenzen';
import { HAND_AUFTRAEGE, HAND_GERAETE } from './auftraege';
import { HAND_EINSAETZE, HAND_PENDENZEN, HAND_TECHNIKER_HEUTE } from './einsaetze';
import { between, generateFill, mulberry32, pick, seedFrom } from './generator';
import { MOCK_HEUTE, MOCK_REFERENZ_MIN } from './heute';
import { KUNDEN, LIEGENSCHAFTEN } from './kunden';
import { buildRapporte } from './rapporte';
import { TECHNIKER } from './techniker';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface Stammdaten {
  techniker: readonly Techniker[];
  auftraege: ReadonlyMap<string, Auftrag>;
  kunden: ReadonlyMap<string, Kunde>;
  liegenschaften: ReadonlyMap<string, Liegenschaft>;
  geraete: ReadonlyMap<string, Geraet>;
  absenzen: readonly Absenz[];
}

export interface Bestand {
  einsaetze: readonly Einsatz[];
  pendenzen: readonly Pendenz[];
  rapporte: readonly Rapport[];
  nachrichten: readonly Nachricht[];
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

// ── §4 · Export ──────────────────────────────────────────────────

export const mockStammdaten: Stammdaten = {
  techniker: TECHNIKER,
  auftraege: byId(auftraege),
  kunden,
  liegenschaften: byId(LIEGENSCHAFTEN),
  geraete: byId(geraete),
  absenzen: ABSENZEN,
};

export const mockBestand: Bestand = {
  einsaetze: alleEinsaetze,
  pendenzen: HAND_PENDENZEN,
  rapporte,
  nachrichten: [],
};

export { MOCK_HEUTE };

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

// ── §5 · Konsistenz ──────────────────────────────────────────────

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
    if (!technikerIds.has(absenz.technikerId)) fehler.push(`${absenz.id}: Techniker ${absenz.technikerId}`);
  }
  if (fehler.length > 0) throw new Error(`Mock inkonsistent:\n${fehler.join('\n')}`);
}

assertConsistent(mockStammdaten, mockBestand);

/* ◆ jh · eof */
