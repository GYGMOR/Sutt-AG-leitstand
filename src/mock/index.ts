/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/index.ts                                      │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Mock-Bestand zusammenstellen, veredeln (Fotos, Rapport) und prüfen    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, toZeitpunkt } from '../core/datum';
import type { Auftrag, Foto, FotoMotiv, RapportStatus, RechnungStatus } from '../core/domain/auftrag';
import type { Einsatz, Pendenz } from '../core/domain/einsatz';
import type { Absenz, Geraet, GeraetEreignis, Kunde, Liegenschaft, Techniker } from '../core/domain/stammdaten';
import { ABSENZEN } from './absenzen';
import { HAND_AUFTRAEGE, HAND_GERAETE } from './auftraege';
import { HAND_EINSAETZE, HAND_PENDENZEN, HAND_TECHNIKER_HEUTE } from './einsaetze';
import { between, generateFill, mulberry32, pick, seedFrom } from './generator';
import { MOCK_HEUTE, MOCK_REFERENZ_MIN } from './heute';
import { KUNDEN, LIEGENSCHAFTEN } from './kunden';
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

const alleEinsaetze: readonly Einsatz[] = [...HAND_EINSAETZE, ...fuellung.einsaetze];

// ── §3 · Veredelung: Fotos, Rapport, Verrechnung, Gerätehistorie ────

const FOTO_MOTIVE: readonly FotoMotiv[] = ['typenschild', 'schaden', 'anschluss', 'einbau', 'uebersicht'];
const HISTORIE_TEXTE = [
  'Laugenpumpe ersetzt',
  'Jahreswartung durchgeführt',
  'Türverriegelung ersetzt',
  'Heizelement ersetzt, Dichtung erneuert',
  'Fehlerspeicher gelöscht, Probelauf i. O.',
  'Entkalkung und Reinigung Sprüharme',
  'Garantiefall: Steuerplatine getauscht',
] as const;

// jh› Fotos und Rapportstatus hängen am Einsatz, nicht am Entwurf: erledigt
//     heisst «Fotos vorhanden, Rapport erstellt», früher heisst «unterschrieben».
function veredleAuftrag(auftrag: Auftrag, einsaetze: readonly Einsatz[], technikerById: ReadonlyMap<string, Techniker>): Auftrag {
  // jh› Massgebend ist der letzte Einsatz, der vor Ort war – ein geplanter Folgetermin hat noch keine Fotos.
  const letzter = einsaetze
    .filter((einsatz) => einsatz.auftragId === auftrag.id && einsatz.status !== 'geplant' && einsatz.status !== 'unterwegs')
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.startMin - b.startMin)
    .pop();
  if (!letzter) return auftrag;

  const zufall = mulberry32(seedFrom(`foto·${auftrag.id}`));
  const kuerzel = technikerById.get(letzter.technikerId)?.kuerzel ?? '??';
  const anzahl = between(zufall, 1, 4);
  const fotos: Foto[] = Array.from({ length: anzahl }, (_, index) => ({
    id: `F-${auftrag.id}-${index + 1}`,
    motiv: FOTO_MOTIVE[(index + between(zufall, 0, 1)) % FOTO_MOTIVE.length] ?? 'uebersicht',
    aufgenommenAm: toZeitpunkt(letzter.datum, letzter.startMin + 5 + index * 9),
    technikerKuerzel: kuerzel,
  }));

  const vergangen = letzter.datum < MOCK_HEUTE;
  let rapport: RapportStatus = 'erstellt';
  let rechnungStatus: RechnungStatus = 'offen';
  if (letzter.status === 'erledigt' && vergangen) {
    rapport = 'unterschrieben';
    rechnungStatus = zufall() < 0.55 ? 'bezahlt' : 'gestellt';
  } else if (letzter.status === 'erledigt') {
    rapport = zufall() < 0.3 ? 'offen' : 'erstellt';
  } else if (letzter.status === 'wartet-teil') {
    rapport = 'offen';
  }
  return { ...auftrag, fotos, rapport, rechnungStatus };
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

const technikerById = byId(TECHNIKER);
const auftraege: readonly Auftrag[] = [...HAND_AUFTRAEGE, ...fuellung.auftraege].map((auftrag) =>
  veredleAuftrag(auftrag, alleEinsaetze, technikerById),
);
const geraete: readonly Geraet[] = [...HAND_GERAETE, ...fuellung.geraete].map((geraet) => ({
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
  for (const absenz of stammdaten.absenzen) {
    if (!technikerIds.has(absenz.technikerId)) fehler.push(`${absenz.id}: Techniker ${absenz.technikerId}`);
  }
  if (fehler.length > 0) throw new Error(`Mock inkonsistent:\n${fehler.join('\n')}`);
}

assertConsistent(mockStammdaten, mockBestand);

/* ◆ jh · eof */
