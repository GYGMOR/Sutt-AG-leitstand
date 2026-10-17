/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/heute.ts                                      │
   │  ◆ JH · 2026.10 · rev 01                                               │
   │  Zeitanker der Mockdaten: alles relativ zu «heute»                     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, minutesOfDay, todayIso } from '../core/datum';
import type { IsoDatum, IsoZeitpunkt, Minuten } from '../core/datum';

// ── §1 · Anker ───────────────────────────────────────────────────

// jh› Mockdaten hängen am echten Datum: so stimmt die Jetzt-Linie immer
//     mit dem Plan überein, egal wann jemand das Mockup öffnet.
export const MOCK_HEUTE: IsoDatum = todayIso();

/**
 * Uhrzeit beim Laden – daraus leiten sich die Status von heute ab.
 * jh! Bewusst nicht «geschönt»: Status und Jetzt-Linie müssen übereinstimmen,
 *     auch wenn der Plan am Abend dann fast nur «erledigt» zeigt.
 */
export const MOCK_REFERENZ_MIN: Minuten = minutesOfDay(new Date());

// ── §2 · Helfer ──────────────────────────────────────────────────

export function tag(offset: number): IsoDatum {
  return addDays(MOCK_HEUTE, offset);
}

/** zeitpunkt(-1, '16:40') → gestern 16:40 */
export function zeitpunkt(offset: number, zeit: string): IsoZeitpunkt {
  return `${tag(offset)}T${zeit}`;
}

export function hm(zeit: string): Minuten {
  const [stunden = 0, minuten = 0] = zeit.split(':').map(Number);
  return stunden * 60 + minuten;
}

/* ◆ jh · eof */
