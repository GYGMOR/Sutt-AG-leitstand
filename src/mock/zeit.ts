/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/zeit.ts                                       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Zeiteinträge aus Einsatzplan und Bürotag, Monatsabschlüsse, Journal   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, addMonths, isWeekend, parseIsoDate, rangeDays, startOfMonth, toZeitpunkt } from '../core/datum';
import type { IsoDatum, IsoZeitpunkt, Minuten } from '../core/datum';
import { absenzAm } from '../core/domain/absenz';
import type { Absenz } from '../core/domain/absenz';
import type { Einsatz } from '../core/domain/einsatz';
import { feiertagAm } from '../core/domain/feiertage';
import type { BetrieblicherFeiertag, Kanton } from '../core/domain/feiertage';
import type { JournalEintrag } from '../core/domain/journal';
import { istAngestellt, mitarbeiterName } from '../core/domain/personal';
import type { Mitarbeiter } from '../core/domain/personal';
import { berechneTag, einsatzZeiten, monatVon, tageImMonat } from '../core/domain/zeit';
import type { Arbeitszeitmodell, Monatsabschluss, ZeitEintrag } from '../core/domain/zeit';
import { between, mulberry32, pick, seedFrom } from './generator';
import type { Zufall } from './generator';

// ── §1 · Kontext ─────────────────────────────────────────────────

export interface ZeitSaat {
  heute: IsoDatum;
  jetztMin: Minuten;
  mitarbeiter: readonly Mitarbeiter[];
  einsaetze: readonly Einsatz[];
  absenzen: readonly Absenz[];
  kanton: Kanton;
  betrieblich: readonly BetrieblicherFeiertag[];
  modell: Arbeitszeitmodell;
}

export interface ZeitErgebnis {
  zeiteintraege: ZeitEintrag[];
  monatsabschluesse: Monatsabschluss[];
  journal: JournalEintrag[];
}

interface Tagesplan {
  kommen: Minuten;
  gehen: Minuten;
  pause: { von: Minuten; dauer: Minuten } | null;
  quelle: 'stempel' | 'manuell' | 'einsatz';
  bemerkung?: string;
}

function runde5(wert: number): number {
  return Math.round(wert / 5) * 5;
}

// ── §2 · Tagesmuster ─────────────────────────────────────────────

// jh› Techniker stempeln in der App rund um Abfahrt und Feierabend; ohne Einsätze ist es ein Werkstatttag.
//     Büro arbeitet Gleitzeit um 07:45–17:15, freitags kürzer. Alles deterministisch gesät.
/** Pause so bemessen, dass die Pflicht nach ArG 15 erfüllt ist – ausser der Tag soll bewusst eine Warnung tragen. */
function pauseFuer(zufall: Zufall, kommen: Minuten, gehen: Minuten, ohnePause: boolean): Tagesplan['pause'] {
  if (ohnePause) return null;
  const spanne = gehen - kommen;
  const mindest = spanne > 9 * 60 + 45 ? 60 : spanne > 7 * 60 + 30 ? 30 : spanne > 5.5 * 60 + 15 ? 15 : 0;
  return { von: 12 * 60 + between(zufall, -20, 20), dauer: Math.max(mindest, between(zufall, 30, 45)) };
}

// jh› Techniker stempeln rund um Abfahrt und Feierabend; die Pause ist meist korrekt – ein Tag von zwölf
//     vergisst sie, damit die Warnungen des Moduls echte Fälle zeigen.
function planFuerTechniker(zufall: Zufall, eigene: readonly Einsatz[], freitag: boolean): Tagesplan {
  const zeiten = einsatzZeiten(eigene);
  const kommenRoh = zeiten.ersteAbfahrtMin !== null ? Math.max(6 * 60 + 30, zeiten.ersteAbfahrtMin - between(zufall, 5, 20)) : 7 * 60 + 30 + between(zufall, -15, 15);
  const kommen = runde5(kommenRoh) + between(zufall, 0, 4);
  const gehenRoh = zeiten.letztesEndeMin !== null ? Math.min(18 * 60 + 30, zeiten.letztesEndeMin + between(zufall, 10, 35)) : (freitag ? 16 * 60 : 16 * 60 + 45) + between(zufall, -30, 30);
  const gehen = Math.max(kommen + 60, gehenRoh);
  const pause = pauseFuer(zufall, kommen, gehen, zufall() < 0.05);
  const wurf = zufall();
  const quelle = wurf < 0.02 ? 'manuell' : wurf < 0.3 ? 'einsatz' : 'stempel';
  return { kommen, gehen, pause, quelle, ...(quelle === 'manuell' ? { bemerkung: 'Nachgetragen – Handy im Fahrzeug vergessen' } : {}) };
}

function planFuerBuero(zufall: Zufall, person: Mitarbeiter, freitag: boolean): Tagesplan {
  const frueh = person.funktion === 'disposition';
  const kommen = (frueh ? 7 * 60 + 10 : 7 * 60 + 45) + between(zufall, -10, 10);
  const basisGehen = freitag ? 15 * 60 + 45 : frueh ? 16 * 60 + 35 : 17 * 60 + 5;
  const gehenRoh = (person.pensum < 100 ? basisGehen - Math.round(((100 - person.pensum) / 100) * 8 * 60) : basisGehen) + between(zufall, -20, 20);
  const gehen = Math.max(kommen + 60, gehenRoh);
  const pause = pauseFuer(zufall, kommen, gehen, zufall() < 0.03);
  const manuell = zufall() < 0.03;
  return { kommen, gehen, pause, quelle: manuell ? 'manuell' : 'stempel', ...(manuell ? { bemerkung: 'Sitzung auswärts' } : {}) };
}

function eintraegeAusPlan(plan: Tagesplan, person: Mitarbeiter, datum: IsoDatum, neueId: () => string, offenAb: Minuten | null): ZeitEintrag[] {
  const basis = {
    mitarbeiterId: person.id,
    datum,
    quelle: plan.quelle,
    ...(plan.quelle !== 'einsatz' ? { geraet: person.technikerId ? ('app' as const) : ('leitstand' as const) } : {}),
    ...(plan.bemerkung ? { bemerkung: plan.bemerkung } : {}),
    erfasstAm: toZeitpunkt(datum, plan.kommen),
    erfasstVon: person.kuerzel,
    korrekturen: [],
  };
  const eintraege: ZeitEintrag[] = [];
  const pauseVon = plan.pause ? Math.max(plan.kommen + 30, plan.pause.von) : null;
  const pauseBis = plan.pause && pauseVon !== null ? Math.min(plan.gehen - 30, pauseVon + plan.pause.dauer) : null;
  const hatPause = pauseVon !== null && pauseBis !== null && pauseBis > pauseVon && pauseBis < plan.gehen && (offenAb === null || offenAb > pauseBis);

  if (hatPause && pauseVon !== null && pauseBis !== null) {
    eintraege.push({ ...basis, id: neueId(), art: 'arbeit', vonMin: plan.kommen, bisMin: pauseVon });
    eintraege.push({ ...basis, id: neueId(), art: 'pause', vonMin: pauseVon, bisMin: pauseBis });
    eintraege.push({ ...basis, id: neueId(), art: 'arbeit', vonMin: pauseBis, bisMin: offenAb === null ? plan.gehen : null });
    return eintraege;
  }
  if (offenAb !== null && pauseVon !== null && pauseBis !== null && offenAb >= pauseVon && offenAb <= pauseBis) {
    eintraege.push({ ...basis, id: neueId(), art: 'arbeit', vonMin: plan.kommen, bisMin: pauseVon });
    eintraege.push({ ...basis, id: neueId(), art: 'pause', vonMin: pauseVon, bisMin: null });
    return eintraege;
  }
  eintraege.push({ ...basis, id: neueId(), art: 'arbeit', vonMin: plan.kommen, bisMin: offenAb === null ? plan.gehen : null });
  return eintraege;
}

// ── §3 · Aufbau ──────────────────────────────────────────────────

export function buildZeit(saat: ZeitSaat): ZeitErgebnis {
  let lauf = 0;
  const neueId = () => `Z-${(lauf += 1).toString().padStart(5, '0')}`;
  const zeiteintraege: ZeitEintrag[] = [];
  const erster = startOfMonth(addMonths(saat.heute, -1));
  const tage = rangeDays(erster, saat.heute);

  for (const person of saat.mitarbeiter) {
    for (const datum of tage) {
      if (!istAngestellt(person, datum) || isWeekend(datum)) continue;
      if (feiertagAm(datum, saat.kanton, saat.betrieblich)?.halb === false) continue;
      if (absenzAm(saat.absenzen, person.id, datum)) continue;
      const zufall = mulberry32(seedFrom(`zeit·${person.id}·${datum}`));
      const freitag = parseIsoDate(datum).getDay() === 5;
      const eigene = saat.einsaetze.filter((einsatz) => einsatz.technikerId === person.technikerId && einsatz.datum === datum);
      const plan = person.technikerId ? planFuerTechniker(zufall, eigene, freitag) : planFuerBuero(zufall, person, freitag);

      if (datum < saat.heute) {
        zeiteintraege.push(...eintraegeAusPlan(plan, person, datum, neueId, null));
        continue;
      }
      // jh› Heute: wer schon da ist, ist eingestempelt – der Stand folgt der Uhrzeit beim Laden, wie die Jetzt-Linie.
      if (saat.jetztMin <= plan.kommen) continue;
      const fertig = saat.jetztMin >= plan.gehen;
      zeiteintraege.push(...eintraegeAusPlan(plan, person, datum, neueId, fertig ? null : saat.jetztMin));
    }
  }

  // Monatsabschlüsse des Vormonats: genehmigt, einer eingereicht, einer zurückgewiesen
  const vormonat = monatVon(erster);
  const monatsabschluesse: Monatsabschluss[] = [];
  const journal: JournalEintrag[] = [];
  let abschlussLauf = 0;
  for (const person of saat.mitarbeiter) {
    if (!istAngestellt(person, addDays(erster, 27))) continue;
    const tageSaldo = tageImMonat(vormonat).map((datum) =>
      berechneTag({
        datum,
        mitarbeiter: person,
        eintraege: zeiteintraege,
        modell: saat.modell,
        feiertag: feiertagAm(datum, saat.kanton, saat.betrieblich),
        absenz: absenzAm(saat.absenzen, person.id, datum),
        jetztMin: null,
      }),
    );
    const sollMin = tageSaldo.reduce((summe, tag) => summe + tag.sollMin, 0);
    const istMin = tageSaldo.reduce((summe, tag) => summe + tag.arbeitMin, 0);
    const saldoMin = istMin - sollMin;
    const eingereichtAm = `${addDays(startOfMonth(saat.heute), 1)}T${pick(mulberry32(seedFrom(`ma·${person.id}`)), ['07:40', '08:15', '16:50', '17:20'])}` as IsoZeitpunkt;
    const status = person.id === 'M-SO' ? 'eingereicht' : person.id === 'M-JV' ? 'zurueckgewiesen' : 'genehmigt';
    const entscheider = person.vorgesetzterId === 'M-AD' ? 'AD' : 'RW';
    abschlussLauf += 1;
    const abschluss: Monatsabschluss = {
      id: `MA-${abschlussLauf.toString().padStart(3, '0')}`,
      mitarbeiterId: person.id,
      monat: vormonat,
      status,
      sollMin,
      istMin,
      saldoMin,
      saldoKumuliertMin: person.zeitUebertragMin + saldoMin,
      eingereichtAm,
      eingereichtVon: person.kuerzel,
      ...(status === 'genehmigt' ? { entschiedenAm: `${addDays(startOfMonth(saat.heute), 4)}T09:30` as IsoZeitpunkt, entschiedenVon: entscheider } : {}),
      ...(status === 'zurueckgewiesen' ? { entschiedenAm: `${addDays(startOfMonth(saat.heute), 4)}T09:35` as IsoZeitpunkt, entschiedenVon: entscheider, bemerkung: 'Pause am 14.9. fehlt – bitte nachtragen' } : {}),
    };
    monatsabschluesse.push(abschluss);
    if (status === 'genehmigt') {
      journal.push({ id: `J-S-${abschlussLauf}`, zeitpunkt: abschluss.entschiedenAm ?? eingereichtAm, benutzer: entscheider, bereich: 'zeit', art: 'aenderung', text: `${mitarbeiterName(person)} · Monat ${vormonat} genehmigt`, aktion: 'monatEntscheiden', betrifft: abschluss.id, mitarbeiterId: person.id });
    }
  }

  return { zeiteintraege, monatsabschluesse, journal };
}

/* ◆ jh · eof */
