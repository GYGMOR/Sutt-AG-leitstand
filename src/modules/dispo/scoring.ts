/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/scoring.ts                           │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Smart-Slot: Region, Marke, Fahrzeit, Auslastung → Bewertung           │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, isSunday } from '../../core/datum';
import type { IsoDatum, Minuten } from '../../core/datum';
import type { Einsatz } from '../../core/domain/einsatz';
import { REGION_LABEL, isAbwesend } from '../../core/domain/stammdaten';
import type { Marke, Region, Techniker } from '../../core/domain/stammdaten';
import { SUTT_HQ, fahrzeitMin } from '../../core/geo';
import type { Koordinaten } from '../../core/geo';
import type { DispoStammdaten, PlanZiel } from './dispo.types';
import { resolveAuftrag } from './store/dispo.selectors';
import { ARBEITSBEGINN, ARBEIT_ENDE, ceilToRaster, findFreeStarts, sumDauer } from './zeitraster';

// ── §1 · Typen ───────────────────────────────────────────────────

export type SlotStufe = 'gut' | 'ok' | 'schlecht';

export interface SlotBewertung {
  punkte: number;
  stufe: SlotStufe;
  gruende: string[];
  fahrzeitMin: Minuten;
}

export interface SlotKandidat extends PlanZiel {
  dauerMin: Minuten;
  techniker: Techniker;
  bewertung: SlotBewertung;
}

/** Was über den zu planenden Auftrag bekannt sein muss. */
export interface AuftragProfil {
  region: Region;
  marke: Marke;
  koordinaten: Koordinaten;
  dringend: boolean;
}

export interface SlotUmfeld {
  techniker: Techniker;
  /** Einsätze des Technikers an diesem Tag (ohne den, der gerade bewegt wird). */
  tagesEinsaetze: readonly Einsatz[];
  koordinatenOf: (einsatz: Einsatz) => Koordinaten;
}

// ── §2 · Bewertung ───────────────────────────────────────────────

// jh› Vier Kriterien, nachvollziehbar in Punkten – der Disponent soll den
//     Grund lesen können («Glattal · Miele-Profi · 9 min Fahrt»), kein schwarzer Kasten.
export function scoreSlot(profil: AuftragProfil, umfeld: SlotUmfeld, startMin: Minuten, dauerMin: Minuten): SlotBewertung {
  const gruende: string[] = [];
  let punkte = 0;

  if (umfeld.techniker.region === profil.region) {
    punkte += 30;
    gruende.push(REGION_LABEL[profil.region]);
  } else {
    gruende.push('ausserhalb Region');
  }

  if (umfeld.techniker.zertifiziert.includes(profil.marke)) {
    punkte += 25;
    gruende.push(`${profil.marke}-Profi`);
  } else if (umfeld.techniker.kompetenzen.includes(profil.marke)) {
    punkte += 15;
    gruende.push(`kennt ${profil.marke}`);
  } else {
    gruende.push(`${profil.marke} fremd`);
  }

  const vorgaenger = [...umfeld.tagesEinsaetze].filter((einsatz) => einsatz.startMin + einsatz.dauerMin <= startMin).sort((a, b) => b.startMin - a.startMin)[0];
  const von = vorgaenger ? umfeld.koordinatenOf(vorgaenger) : SUTT_HQ;
  const fahrzeit = fahrzeitMin(von, profil.koordinaten);
  const luecke = vorgaenger ? startMin - (vorgaenger.startMin + vorgaenger.dauerMin) : fahrzeit;
  if (luecke < fahrzeit) {
    punkte -= 20;
    gruende.push(`${fahrzeit - luecke} min zu knapp`);
  } else if (fahrzeit <= 10) {
    punkte += 25;
    gruende.push(`${fahrzeit} min Fahrt`);
  } else if (fahrzeit <= 20) {
    punkte += 15;
    gruende.push(`${fahrzeit} min Fahrt`);
  } else {
    punkte += 5;
    gruende.push(`${fahrzeit} min Fahrt`);
  }

  const auslastung = (sumDauer(umfeld.tagesEinsaetze) + dauerMin) / umfeld.techniker.sollMinuten;
  if (auslastung < 0.7) {
    punkte += 20;
  } else if (auslastung < 0.9) {
    punkte += 10;
    gruende.push('gut ausgelastet');
  } else {
    gruende.push('voll');
  }

  const begrenzt = Math.max(0, Math.min(100, punkte));
  return { punkte: begrenzt, stufe: begrenzt >= 70 ? 'gut' : begrenzt >= 45 ? 'ok' : 'schlecht', gruende, fahrzeitMin: fahrzeit };
}

// ── §3 · Freie Fenster bewerten ──────────────────────────────────

export interface BewertetesFenster {
  startMin: Minuten;
  dauerMin: Minuten;
  bewertung: SlotBewertung;
}

/** Alle freien Startzeiten einer Zeile, bewertet – Grundlage für die Grün/Gelb/Rot-Flächen. */
export function bewerteFenster(
  profil: AuftragProfil,
  umfeld: SlotUmfeld,
  dauerMin: Minuten,
  raster: Minuten,
  ab: Minuten = ARBEITSBEGINN,
): BewertetesFenster[] {
  return findFreeStarts(umfeld.tagesEinsaetze, dauerMin, raster, ab).map((startMin) => ({
    startMin,
    dauerMin,
    bewertung: scoreSlot(profil, umfeld, startMin, dauerMin),
  }));
}

// ── §4 · Vorschläge ──────────────────────────────────────────────

export function profilOf(stammdaten: DispoStammdaten, auftragId: string): AuftragProfil {
  const kontext = resolveAuftrag(stammdaten, auftragId);
  return { region: kontext.region, marke: kontext.geraet.marke, koordinaten: kontext.koordinaten, dringend: kontext.dringend };
}

interface VorschlagArgs {
  stammdaten: DispoStammdaten;
  einsaetze: readonly Einsatz[];
  auftragId: string;
  dauerMin: Minuten;
  abDatum: IsoDatum;
  heute: IsoDatum;
  jetztMin: Minuten;
  anzahl: number;
  /** Einsatz, der selbst bewegt wird – zählt nicht als belegt. */
  ignorierenId?: string;
  tageVoraus?: number;
}

// jh› Beste Slots über mehrere Tage: Punkte zuerst, bei Gleichstand der frühere.
//     Dringende Aufträge bekommen pro Tag Vorlauf 15 Punkte Abzug – sie sollen heute laufen.
export function suggestSlots(args: VorschlagArgs): SlotKandidat[] {
  return suggestSlotsFuerProfil({ ...args, profil: profilOf(args.stammdaten, args.auftragId) });
}

/** Für noch nicht gespeicherte Aufträge (Schnellerfassung): Profil statt Auftrags-ID. */
export function suggestSlotsFuerProfil(args: Omit<VorschlagArgs, 'auftragId'> & { profil: AuftragProfil }): SlotKandidat[] {
  const { profil } = args;
  const koordinatenOf = (einsatz: Einsatz) => resolveAuftrag(args.stammdaten, einsatz.auftragId).koordinaten;
  const kandidaten: (SlotKandidat & { rang: number })[] = [];
  const tageVoraus = args.tageVoraus ?? 7;

  for (let offset = 0; offset < tageVoraus; offset += 1) {
    const datum = addDays(args.abDatum, offset);
    if (isSunday(datum) || datum < args.heute) continue;
    for (const techniker of args.stammdaten.techniker) {
      if (isAbwesend(args.stammdaten.absenzen, techniker.id, datum)) continue;
      const tagesEinsaetze = args.einsaetze.filter(
        (einsatz) => einsatz.technikerId === techniker.id && einsatz.datum === datum && einsatz.id !== args.ignorierenId,
      );
      const ab = datum === args.heute ? Math.max(ARBEITSBEGINN, ceilToRaster(args.jetztMin + 30, 30)) : ARBEITSBEGINN;
      if (ab + args.dauerMin > ARBEIT_ENDE) continue;
      const umfeld: SlotUmfeld = { techniker, tagesEinsaetze, koordinatenOf };
      // jh› Pro Techniker und Tag nur der beste Slot, sonst füllen 20 Varianten eines Tages die Liste.
      const beste = bewerteFenster(profil, umfeld, args.dauerMin, 30, ab)
        .map((fenster) => ({ ...fenster, rang: fenster.bewertung.punkte - (profil.dringend ? offset * 15 : offset * 4) }))
        .sort((a, b) => b.rang - a.rang || a.startMin - b.startMin)[0];
      if (!beste) continue;
      kandidaten.push({
        technikerId: techniker.id,
        techniker,
        datum,
        startMin: beste.startMin,
        dauerMin: args.dauerMin,
        bewertung: beste.bewertung,
        rang: beste.rang,
      });
    }
  }

  return kandidaten
    .sort((a, b) => b.rang - a.rang || a.datum.localeCompare(b.datum) || a.startMin - b.startMin)
    .slice(0, args.anzahl)
    .map(({ rang: _rang, ...kandidat }) => kandidat);
}

/* ◆ jh · eof */
