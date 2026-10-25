/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/lager.ts                                      │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Lager: Artikel aus dem Katalog, Bestände, Bestellungen, Journal       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, splitZeitpunkt, toZeitpunkt } from '../core/datum';
import type { IsoDatum, IsoZeitpunkt } from '../core/datum';
import type { Auftrag } from '../core/domain/auftrag';
import type { Einsatz } from '../core/domain/einsatz';
import { LAGER_GLATTBRUGG, fahrzeugOrt, liefertermin } from '../core/domain/lager';
import type { Artikel, Bestellung, Einheit, Lagerbestand, Lagerbewegung } from '../core/domain/lager';
import type { Techniker } from '../core/domain/stammdaten';
import { between, mulberry32, seedFrom } from './generator';
import { KATALOG, KATALOG_KEYS } from './katalog';

// ── §1 · Artikel ─────────────────────────────────────────────────

// jh! Verbrauchsmaterial ist erfunden; die Ersatzteile kommen aus dem (ebenfalls erfundenen) Gerätekatalog.
const VERBRAUCH: readonly Artikel[] = [
  { artikelNummer: 'VB-1001', bezeichnung: 'Aquastop-Zulaufschlauch 1,5 m', gruppe: 'zubehoer', lieferant: 'Grosshandel Sanitär', preisChf: 42, einheit: 'Stk', mindestbestand: 4 },
  { artikelNummer: 'VB-1002', bezeichnung: 'Ablaufschlauch 2 m', gruppe: 'zubehoer', lieferant: 'Grosshandel Sanitär', preisChf: 18.5, einheit: 'Stk', mindestbestand: 4 },
  { artikelNummer: 'VB-1003', bezeichnung: 'Schlauchschellen 12–20 mm', gruppe: 'verbrauch', lieferant: 'Grosshandel Sanitär', preisChf: 9.8, einheit: 'Set', mindestbestand: 6 },
  { artikelNummer: 'VB-1004', bezeichnung: 'Entkalker Haushaltgeräte', gruppe: 'verbrauch', lieferant: 'Grosshandel Chemie', preisChf: 14.9, einheit: 'l', mindestbestand: 8 },
  { artikelNummer: 'VB-1005', bezeichnung: 'Geräteanschlusskabel T13 1,5 m', gruppe: 'zubehoer', lieferant: 'Elektro-Grosshandel', preisChf: 16, einheit: 'Stk', mindestbestand: 5 },
  { artikelNummer: 'VB-1006', bezeichnung: 'Transportsicherung Waschmaschine', gruppe: 'zubehoer', lieferant: 'Miele Ersatzteile', preisChf: 24, einheit: 'Set', mindestbestand: 2 },
  { artikelNummer: 'VB-1007', bezeichnung: 'Dichtmasse Sanitär 310 ml', gruppe: 'verbrauch', lieferant: 'Grosshandel Sanitär', preisChf: 11.2, einheit: 'Stk', mindestbestand: 4 },
];

function einheitFuer(bezeichnung: string): Einheit {
  if (/Paar/.test(bezeichnung)) return 'Paar';
  if (/-Set|Set\b/.test(bezeichnung)) return 'Set';
  return 'Stk';
}

export function buildArtikel(): Artikel[] {
  const artikel = new Map<string, Artikel>();
  for (const key of KATALOG_KEYS) {
    const vorlage = KATALOG[key];
    for (const teil of vorlage.teile) {
      if (artikel.has(teil.artikelNummer)) continue;
      artikel.set(teil.artikelNummer, {
        artikelNummer: teil.artikelNummer,
        bezeichnung: teil.bezeichnung,
        gruppe: 'ersatzteil',
        marke: vorlage.marke,
        passtZu: vorlage.art,
        lieferant: `${vorlage.marke} Ersatzteile`,
        preisChf: teil.preisChf,
        einheit: einheitFuer(teil.bezeichnung),
        mindestbestand: teil.preisChf < 100 ? 2 : 1,
      });
    }
  }
  for (const eintrag of VERBRAUCH) artikel.set(eintrag.artikelNummer, eintrag);
  return [...artikel.values()];
}

// ── §2 · Bestände ────────────────────────────────────────────────

// jh› Glattbrugg führt alles, ein paar Artikel sind absichtlich knapp oder leer – sonst gäbe es im Lager nichts zu tun.
function buildBestaende(artikel: readonly Artikel[], techniker: readonly Techniker[]): Lagerbestand[] {
  const bestaende: Lagerbestand[] = [];
  artikel.forEach((eintrag, index) => {
    const zufall = mulberry32(seedFrom(`lager·${eintrag.artikelNummer}`));
    let menge = eintrag.gruppe === 'ersatzteil' ? between(zufall, 1, 8) : between(zufall, 6, 24);
    if (index % 7 === 3) menge = 0;
    else if (index % 11 === 5) menge = Math.max(0, eintrag.mindestbestand - 1);
    bestaende.push({ artikelNummer: eintrag.artikelNummer, ort: LAGER_GLATTBRUGG, menge });

    for (const person of techniker) {
      const wurf = zufall();
      if (eintrag.gruppe === 'ersatzteil') {
        if (!eintrag.marke || !person.kompetenzen.includes(eintrag.marke) || wurf > 0.55) continue;
        bestaende.push({ artikelNummer: eintrag.artikelNummer, ort: fahrzeugOrt(person.id), menge: between(zufall, 1, 2) });
      } else if (wurf < 0.8) {
        bestaende.push({ artikelNummer: eintrag.artikelNummer, ort: fahrzeugOrt(person.id), menge: between(zufall, 1, 3) });
      }
    }
  });
  return bestaende;
}

// ── §3 · Bestellungen & Journal ──────────────────────────────────

interface LagerKontext {
  heute: IsoDatum;
  techniker: readonly Techniker[];
  auftraege: readonly Auftrag[];
  einsaetze: readonly Einsatz[];
}

export interface LagerBestand {
  artikel: Artikel[];
  bestaende: Lagerbestand[];
  bestellungen: Bestellung[];
  bewegungen: Lagerbewegung[];
}

function datumVon(zeitpunkt: IsoZeitpunkt): IsoDatum {
  return splitZeitpunkt(zeitpunkt).datum;
}

export function buildLager(kontext: LagerKontext): LagerBestand {
  const artikel = buildArtikel();
  const artikelNummern = new Set(artikel.map((eintrag) => eintrag.artikelNummer));
  const bestaende = buildBestaende(artikel, kontext.techniker);
  const bestellungen: Bestellung[] = [];
  const bewegungen: Lagerbewegung[] = [];
  let bestellLauf = 120;
  let bewegungLauf = 0;

  const nummer = () => {
    bestellLauf += 1;
    return `B-26-${String(bestellLauf).padStart(5, '0')}`;
  };
  const bewegungId = () => {
    bewegungLauf += 1;
    return `LB-${bewegungLauf}`;
  };

  // Bestellungen aus den Aufträgen: bestellt/unterwegs offen, eingetroffen mit Wareneingang
  const sortiert = [...kontext.auftraege].sort((a, b) => a.nummer.localeCompare(b.nummer));
  for (const auftrag of sortiert) {
    auftrag.ersatzteile.forEach((teil, index) => {
      if (teil.status === 'ab-lager' || !artikelNummern.has(teil.artikelNummer)) return;
      const zufall = mulberry32(seedFrom(`bestellung·${auftrag.id}·${index}`));
      const bestelltAm = auftrag.bestelltAm ?? auftrag.angefragtAm;
      const termin = teil.liefertermin ?? liefertermin(datumVon(bestelltAm));
      const eingetroffen = teil.status === 'eingetroffen';
      const eingetroffenAm = eingetroffen ? toZeitpunkt(termin, 8 * 60 + between(zufall, 0, 90)) : undefined;
      const bestellung: Bestellung = {
        id: `B-${auftrag.id}-${index}`,
        nummer: nummer(),
        artikelNummer: teil.artikelNummer,
        bezeichnung: teil.bezeichnung,
        menge: teil.menge,
        lieferant: teil.lieferant,
        bestelltAm,
        liefertermin: termin,
        status: eingetroffen ? 'eingetroffen' : 'offen',
        auftragId: auftrag.id,
        ...(eingetroffenAm ? { eingetroffenAm } : {}),
        von: 'RW',
      };
      bestellungen.push(bestellung);
      if (eingetroffenAm) {
        bewegungen.push({ id: bewegungId(), zeitpunkt: eingetroffenAm, art: 'wareneingang', artikelNummer: teil.artikelNummer, menge: teil.menge, nach: LAGER_GLATTBRUGG, auftragId: auftrag.id, bestellungId: bestellung.id, benutzer: 'RW' });
      }
    });
  }

  // Lagerauffüllung für knappe Artikel: eine pünktlich, eine überfällig, eine unterwegs
  const knapp = artikel.filter((eintrag) => {
    const menge = bestaende.find((bestand) => bestand.artikelNummer === eintrag.artikelNummer && bestand.ort === LAGER_GLATTBRUGG)?.menge ?? 0;
    return menge < eintrag.mindestbestand;
  });
  knapp.slice(0, 3).forEach((eintrag, index) => {
    const termine: readonly IsoDatum[] = [addDays(kontext.heute, 1), addDays(kontext.heute, -1), addDays(kontext.heute, 2)];
    bestellungen.push({
      id: `B-AUFFUELLEN-${index + 1}`,
      nummer: nummer(),
      artikelNummer: eintrag.artikelNummer,
      bezeichnung: eintrag.bezeichnung,
      menge: Math.max(2, eintrag.mindestbestand * 2),
      lieferant: eintrag.lieferant,
      bestelltAm: toZeitpunkt(addDays(kontext.heute, -3), 10 * 60 + index * 25),
      liefertermin: termine[index] ?? addDays(kontext.heute, 2),
      status: 'offen',
      von: 'RW',
    });
  });

  // Verbrauch aus erledigten Einsätzen: ab Fahrzeug, geliefertes Teil aus Glattbrugg
  const auftragById = new Map(kontext.auftraege.map((auftrag) => [auftrag.id, auftrag]));
  for (const einsatz of kontext.einsaetze) {
    if (einsatz.status !== 'erledigt' && einsatz.status !== 'wartet-teil') continue;
    const auftrag = auftragById.get(einsatz.auftragId);
    if (!auftrag) continue;
    for (const teil of auftrag.ersatzteile) {
      if (!artikelNummern.has(teil.artikelNummer)) continue;
      const zeitpunkt = toZeitpunkt(einsatz.datum, Math.min(23 * 60, einsatz.startMin + 30));
      if (teil.status === 'ab-lager') {
        bewegungen.push({ id: bewegungId(), zeitpunkt, art: 'verbrauch', artikelNummer: teil.artikelNummer, menge: teil.menge, von: fahrzeugOrt(einsatz.technikerId), auftragId: auftrag.id, benutzer: 'App' });
      } else if (teil.status === 'eingetroffen' && einsatz.status === 'erledigt') {
        bewegungen.push({ id: bewegungId(), zeitpunkt, art: 'verbrauch', artikelNummer: teil.artikelNummer, menge: teil.menge, von: LAGER_GLATTBRUGG, auftragId: auftrag.id, benutzer: 'App' });
      }
    }
  }

  // Umbuchungen Glattbrugg → Fahrzeug der letzten zwei Wochen
  kontext.techniker.slice(0, 6).forEach((person, index) => {
    const zufall = mulberry32(seedFrom(`umbuchung·${person.id}`));
    const passende = artikel.filter((eintrag) => eintrag.gruppe === 'ersatzteil' && eintrag.marke && person.kompetenzen.includes(eintrag.marke));
    const eintrag = passende[between(zufall, 0, Math.max(0, passende.length - 1))];
    if (!eintrag) return;
    const tag = addDays(kontext.heute, -between(zufall, 2, 12));
    bewegungen.push({ id: bewegungId(), zeitpunkt: toZeitpunkt(tag, 7 * 60 + 15 + index * 5), art: 'umbuchung', artikelNummer: eintrag.artikelNummer, menge: between(zufall, 1, 2), von: LAGER_GLATTBRUGG, nach: fahrzeugOrt(person.id), text: 'Fahrzeug aufgefüllt', benutzer: 'RW' });
  });

  bewegungen.sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt));
  return { artikel, bestaende, bestellungen, bewegungen };
}

/* ◆ jh · eof */
