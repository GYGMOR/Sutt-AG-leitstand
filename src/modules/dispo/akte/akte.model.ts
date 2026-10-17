/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/akte/akte.model.ts                   │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Akte aufbauen: Auswahl → Auftrag, Einsatz, Pendenz, Vorgänger         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { toZeitpunkt } from '../../../core/datum';
import type { Einsatz, Pendenz } from '../../../core/domain/einsatz';
import type { Techniker } from '../../../core/domain/stammdaten';
import { SUTT_HQ, fahrzeitMin, strassenKm } from '../../../core/geo';
import type { Koordinaten } from '../../../core/geo';
import type { DispoAuswahl, DispoStammdaten } from '../dispo.types';
import { buildPhasen, resolveAuftrag } from '../store/dispo.selectors';
import type { AuftragKontext, PhasenSchritt } from '../store/dispo.selectors';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface Vorgaenger {
  koordinaten: Koordinaten;
  fahrzeitMin: number;
  km: number;
  label: string;
}

export interface AuftragAkte extends AuftragKontext {
  einsatz: Einsatz | null;
  pendenz: Pendenz | null;
  techniker: Techniker | null;
  einsaetze: Einsatz[];
  /** Offener Folgetermin im Eingang (nicht die gerade gewählte Pendenz). */
  offeneFolge: Pendenz | null;
  phasen: PhasenSchritt[];
  vorgaenger: Vorgaenger | null;
}

// ── §2 · Aufbau ──────────────────────────────────────────────────

function sortEinsaetze(einsaetze: readonly Einsatz[]): Einsatz[] {
  return [...einsaetze].sort((a, b) => toZeitpunkt(a.datum, a.startMin).localeCompare(toZeitpunkt(b.datum, b.startMin)));
}

function vorgaengerFor(stammdaten: DispoStammdaten, einsaetze: readonly Einsatz[], einsatz: Einsatz, ziel: Koordinaten): Vorgaenger {
  const davor = einsaetze
    .filter((kandidat) => kandidat.technikerId === einsatz.technikerId && kandidat.datum === einsatz.datum && kandidat.startMin + kandidat.dauerMin <= einsatz.startMin)
    .sort((a, b) => b.startMin - a.startMin)[0];
  if (!davor) {
    return { koordinaten: SUTT_HQ, fahrzeitMin: fahrzeitMin(SUTT_HQ, ziel), km: strassenKm(SUTT_HQ, ziel), label: 'ab Glattbrugg (Werkhof)' };
  }
  const kontext = resolveAuftrag(stammdaten, davor.auftragId);
  return {
    koordinaten: kontext.koordinaten,
    fahrzeitMin: fahrzeitMin(kontext.koordinaten, ziel),
    km: strassenKm(kontext.koordinaten, ziel),
    label: `ab ${kontext.liegenschaft.adresse.ort} (${kontext.auftrag.nummer})`,
  };
}

export function buildAkte(stammdaten: DispoStammdaten, einsaetze: readonly Einsatz[], pendenzen: readonly Pendenz[], auswahl: DispoAuswahl): AuftragAkte | null {
  if (!auswahl) return null;
  const einsatz = auswahl.art === 'einsatz' ? (einsaetze.find((kandidat) => kandidat.id === auswahl.einsatzId) ?? null) : null;
  const pendenz = auswahl.art === 'pendenz' ? (pendenzen.find((kandidat) => kandidat.id === auswahl.pendenzId) ?? null) : null;
  const auftragId = einsatz?.auftragId ?? pendenz?.auftragId;
  if (!auftragId || !stammdaten.auftraege.has(auftragId)) return null;

  const kontext = resolveAuftrag(stammdaten, auftragId);
  const eigene = sortEinsaetze(einsaetze.filter((kandidat) => kandidat.auftragId === auftragId));
  const offeneFolge = pendenzen.find((kandidat) => kandidat.auftragId === auftragId && kandidat.id !== pendenz?.id) ?? null;
  const technikerById = new Map(stammdaten.techniker.map((techniker) => [techniker.id, techniker]));

  return {
    ...kontext,
    einsatz,
    pendenz,
    techniker: einsatz ? (technikerById.get(einsatz.technikerId) ?? null) : null,
    einsaetze: eigene,
    offeneFolge,
    phasen: buildPhasen(kontext.auftrag, eigene, offeneFolge ?? pendenz, technikerById),
    vorgaenger: einsatz ? vorgaengerFor(stammdaten, einsaetze, einsatz, kontext.koordinaten) : null,
  };
}

/* ◆ jh · eof */
