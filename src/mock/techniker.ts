/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/techniker.ts                                  │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Neun Service-Techniker: Region, Farbe, Markenkompetenz, Fahrzeug      │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Techniker } from '../core/domain/stammdaten';

// ── §1 · Techniker ───────────────────────────────────────────────

// jh? Soll-Einsatzzeit 8:30 h pro Tag realistisch, oder rechnet Sutt mit Fahrzeitpauschale?
const SOLL_TAG = 8 * 60 + 30;

export const TECHNIKER: readonly Techniker[] = [
  {
    id: 'T-MB', kuerzel: 'MB', vorname: 'Marco', nachname: 'Brunner', region: 'glattal', farbe: 1,
    fahrzeug: 'ZH 418 207', telefon: '079 412 18 33', kompetenzen: ['Miele', 'V-ZUG'], zertifiziert: ['Miele'], sollMinuten: SOLL_TAG,
  },
  {
    id: 'T-SK', kuerzel: 'SK', vorname: 'Sandra', nachname: 'Keller', region: 'zuerich-nord', farbe: 2,
    fahrzeug: 'ZH 418 211', telefon: '079 655 02 47', kompetenzen: ['Electrolux', 'Siemens'], zertifiziert: ['Siemens'], sollMinuten: SOLL_TAG,
  },
  {
    id: 'T-DM', kuerzel: 'DM', vorname: 'Dragan', nachname: 'Marković', region: 'unterland', farbe: 3,
    fahrzeug: 'ZH 418 219', telefon: '078 309 71 16', kompetenzen: ['Liebherr', 'Electrolux'], zertifiziert: ['Liebherr'], sollMinuten: SOLL_TAG,
  },
  {
    id: 'T-LF', kuerzel: 'LF', vorname: 'Luca', nachname: 'Frei', region: 'glattal', farbe: 4,
    fahrzeug: 'ZH 418 224', telefon: '076 588 40 92', kompetenzen: ['V-ZUG', 'Asko'], zertifiziert: ['V-ZUG'], sollMinuten: SOLL_TAG,
  },
  {
    id: 'T-RH', kuerzel: 'RH', vorname: 'Reto', nachname: 'Huber', region: 'unterland', farbe: 5,
    fahrzeug: 'ZH 418 230', telefon: '079 241 66 05', kompetenzen: ['Miele', 'Siemens'], zertifiziert: ['Miele', 'Siemens'], sollMinuten: SOLL_TAG,
  },
  {
    id: 'T-NA', kuerzel: 'NA', vorname: 'Nadine', nachname: 'Ammann', region: 'zuerich-nord', farbe: 6,
    fahrzeug: 'ZH 418 236', telefon: '078 902 13 58', kompetenzen: ['V-ZUG', 'Electrolux'], zertifiziert: ['V-ZUG'], sollMinuten: SOLL_TAG,
  },
  {
    id: 'T-FR', kuerzel: 'FR', vorname: 'Fabio', nachname: 'Rinaldi', region: 'glattal', farbe: 7,
    fahrzeug: 'ZH 418 241', telefon: '076 341 77 20', kompetenzen: ['Miele', 'Liebherr'], zertifiziert: [], sollMinuten: SOLL_TAG,
  },
  {
    id: 'T-JV', kuerzel: 'JV', vorname: 'Jana', nachname: 'Vogt', region: 'zuerich-nord', farbe: 8,
    fahrzeug: 'ZH 418 245', telefon: '079 508 61 93', kompetenzen: ['Siemens', 'Electrolux', 'Asko'], zertifiziert: ['Electrolux'], sollMinuten: SOLL_TAG,
  },
  {
    // jh› Lehrabgänger – noch ohne Zertifikat, darum im Smart-Slot etwas tiefer bewertet.
    id: 'T-SO', kuerzel: 'SO', vorname: 'Samuel', nachname: 'Odermatt', region: 'unterland', farbe: 9,
    fahrzeug: 'ZH 418 252', telefon: '078 115 39 04', kompetenzen: ['V-ZUG', 'Miele'], zertifiziert: [], sollMinuten: SOLL_TAG,
  },
];

export const TECHNIKER_BY_ID: ReadonlyMap<string, Techniker> = new Map(TECHNIKER.map((techniker) => [techniker.id, techniker]));

/* ◆ jh · eof */
