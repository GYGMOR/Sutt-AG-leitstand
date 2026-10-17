/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/einsaetze.ts                                  │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Tagesplan heute (6 Techniker), Einsatz gestern, Pendenzen im Eingang  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { toZeitpunkt } from '../core/datum';
import type { Minuten } from '../core/datum';
import type { Einsatz, EinsatzStatus, Pendenz } from '../core/domain/einsatz';
import { MOCK_REFERENZ_MIN, hm, tag, zeitpunkt } from './heute';

// ── §1 · Tagesplan heute ─────────────────────────────────────────

type PlanZeile = readonly [auftragId: string, start: string, dauerMin: Minuten];

// jh› Randzeit-Termine ab 16:30 für berufstätige Mieter – Sutt bietet sie an.
const PLAN_HEUTE: Readonly<Record<string, readonly PlanZeile[]>> = {
  'T-MB': [['A01', '07:30', 90], ['A02', '09:30', 60], ['A03', '11:00', 60], ['A04', '13:30', 90], ['A05', '16:30', 60]],
  'T-SK': [['A06', '07:30', 60], ['A07', '09:00', 90], ['A08', '11:00', 30], ['A09', '13:00', 90], ['A10', '15:00', 60]],
  'T-DM': [['A11', '08:00', 90], ['A12', '10:00', 60], ['A13', '11:30', 30], ['A14', '13:30', 120], ['A15', '16:30', 60]],
  'T-LF': [['A16', '07:30', 60], ['A17', '08:30', 90], ['A18', '10:30', 60], ['A19', '13:00', 60], ['A20', '15:30', 90]],
  'T-RH': [['A21', '08:00', 60], ['A22', '09:30', 90], ['A23', '13:00', 60], ['A24', '14:30', 60]],
  'T-NA': [['A25', '07:30', 90], ['A26', '09:30', 30], ['A27', '10:30', 90], ['A28', '14:00', 90]],
};

/** Techniker mit handverlesenem Tagesplan – für sie füllt der Generator heute nichts. */
export const HAND_TECHNIKER_HEUTE: ReadonlySet<string> = new Set(Object.keys(PLAN_HEUTE));

/** Diese Einsätze sind heute früh gelaufen und warten auf ein bestelltes Teil. */
const WARTET_AUF_TEIL = new Set(['A01', 'A25']);

const ANFAHRT_MIN = 45;

// jh› Status heute aus der Uhrzeit ableiten – pro Techniker der Reihe nach,
//     damit nie zwei Einsätze gleichzeitig «vor Ort» oder «unterwegs» sind.
export function deriveTagesStatus(
  zeilen: readonly { startMin: Minuten; dauerMin: Minuten; wartetTeil: boolean }[],
  jetztMin: Minuten,
): EinsatzStatus[] {
  let belegt = false;
  return zeilen.map(({ startMin, dauerMin, wartetTeil }) => {
    const endeMin = startMin + dauerMin;
    if (endeMin <= jetztMin) return wartetTeil ? 'wartet-teil' : 'erledigt';
    if (belegt) return 'geplant';
    belegt = true;
    if (startMin <= jetztMin) return 'vor-ort';
    return startMin - ANFAHRT_MIN <= jetztMin ? 'unterwegs' : 'geplant';
  });
}

function buildTagesplan(): Einsatz[] {
  return Object.entries(PLAN_HEUTE).flatMap(([technikerId, zeilen]) => {
    const status = deriveTagesStatus(
      zeilen.map(([auftragId, start, dauerMin]) => ({ startMin: hm(start), dauerMin, wartetTeil: WARTET_AUF_TEIL.has(auftragId) })),
      MOCK_REFERENZ_MIN,
    );
    return zeilen.map(([auftragId, start, dauerMin], index) => {
      const einsatzStatus = status[index] ?? 'geplant';
      return {
        id: `E-${auftragId}`,
        auftragId,
        technikerId,
        datum: tag(0),
        startMin: hm(start),
        dauerMin,
        status: einsatzStatus,
        // jh› Live-Puls: «vor Ort seit 25 min» rechnet ab der geplanten Startzeit.
        ...(einsatzStatus === 'vor-ort' ? { statusSeit: toZeitpunkt(tag(0), hm(start)) } : {}),
      };
    });
  });
}

// ── §2 · Gestern ─────────────────────────────────────────────────

const EINSATZ_GESTERN: Einsatz = {
  id: 'E-A30',
  auftragId: 'A30',
  technikerId: 'T-SK',
  datum: tag(-1),
  startMin: hm('16:00'),
  dauerMin: 60,
  status: 'wartet-teil',
};

export const HAND_EINSAETZE: readonly Einsatz[] = [...buildTagesplan(), EINSATZ_GESTERN];

// ── §3 · Pendenzen (Auftragseingang) ─────────────────────────────

export const HAND_PENDENZEN: readonly Pendenz[] = [
  { id: 'P-A31', auftragId: 'A31', anlass: 'neu', dauerMin: 60, erstelltAm: zeitpunkt(0, '07:50') },
  { id: 'P-A32', auftragId: 'A32', anlass: 'neu', dauerMin: 60, erstelltAm: zeitpunkt(0, '08:40') },
  { id: 'P-A33', auftragId: 'A33', anlass: 'neu', dauerMin: 60, erstelltAm: zeitpunkt(-1, '17:05') },
  {
    id: 'P-A30', auftragId: 'A30', anlass: 'folgetermin', dauerMin: 60, erstelltAm: zeitpunkt(-1, '17:10'),
    fruehestensAm: tag(0), hinweis: 'Heizpumpe eingetroffen – Einbau',
  },
  { id: 'P-A34', auftragId: 'A34', anlass: 'neu', dauerMin: 60, erstelltAm: zeitpunkt(-1, '10:40') },
  { id: 'P-A35', auftragId: 'A35', anlass: 'neu', dauerMin: 120, erstelltAm: zeitpunkt(-1, '10:30'), fruehestensAm: tag(3) },
  { id: 'P-A36', auftragId: 'A36', anlass: 'neu', dauerMin: 60, erstelltAm: zeitpunkt(-1, '09:55') },
  { id: 'P-A37', auftragId: 'A37', anlass: 'neu', dauerMin: 90, erstelltAm: zeitpunkt(-5, '11:35') },
  { id: 'P-A38', auftragId: 'A38', anlass: 'neu', dauerMin: 30, erstelltAm: zeitpunkt(-2, '15:20') },
  { id: 'P-A39', auftragId: 'A39', anlass: 'neu', dauerMin: 60, erstelltAm: zeitpunkt(0, '09:02'), hinweis: 'Mietgerät MIET-0417 reserviert' },
  { id: 'P-A40', auftragId: 'A40', anlass: 'neu', dauerMin: 180, erstelltAm: zeitpunkt(-2, '10:20'), fruehestensAm: tag(5), hinweis: 'Nach Pumpentausch 26-04790' },
  { id: 'P-A41', auftragId: 'A41', anlass: 'neu', dauerMin: 90, erstelltAm: zeitpunkt(0, '09:45'), fruehestensAm: tag(2), hinweis: 'Gerät trifft übermorgen im Lager ein' },
];

/* ◆ jh · eof */
