/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/absenzen.ts                                   │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Ferien, Schulung, Fahrzeugservice – ganztägig, relativ zu heute       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, startOfWeek } from '../core/datum';
import type { Absenz } from '../core/domain/stammdaten';
import { MOCK_HEUTE, tag } from './heute';

// ── §1 · Absenzen ────────────────────────────────────────────────

const naechsterMontag = addDays(startOfWeek(MOCK_HEUTE), 7);

export const ABSENZEN: readonly Absenz[] = [
  { id: 'AB-1', technikerId: 'T-SO', art: 'ferien', von: naechsterMontag, bis: addDays(naechsterMontag, 4), notiz: 'Herbstferien' },
  { id: 'AB-2', technikerId: 'T-FR', art: 'fahrzeugservice', von: addDays(naechsterMontag, 1), bis: addDays(naechsterMontag, 1), notiz: 'ZH 418 241 · Garage Opfikon, 07:30' },
  { id: 'AB-3', technikerId: 'T-JV', art: 'schulung', von: addDays(naechsterMontag, 2), bis: addDays(naechsterMontag, 3), notiz: 'Electrolux Service-Schulung Mägenwil' },
  { id: 'AB-4', technikerId: 'T-NA', art: 'krank', von: tag(-3), bis: tag(-3) },
  { id: 'AB-5', technikerId: 'T-RH', art: 'militaer', von: addDays(naechsterMontag, 7), bis: addDays(naechsterMontag, 11), notiz: 'WK' },
];

/* ◆ jh · eof */
