/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/absenzen.ts                                   │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Absenzen: bezogene Ferien, Krankheit, Militär, offene Anträge         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, startOfWeek } from '../core/datum';
import type { IsoDatum, IsoZeitpunkt } from '../core/datum';
import type { Absenz, AbsenzArt, AbsenzStatus } from '../core/domain/absenz';
import { MOCK_HEUTE, tag, zeitpunkt } from './heute';
import { MITARBEITER_BY_ID } from './personal';

// ── §1 · Bausteine ───────────────────────────────────────────────

interface Angaben {
  id: string;
  mitarbeiterId: string;
  art: AbsenzArt;
  von: IsoDatum;
  bis: IsoDatum;
  status?: AbsenzStatus;
  halberTag?: 'vormittag' | 'nachmittag';
  notiz?: string;
  arztzeugnis?: boolean;
  entscheidGrund?: string;
  beantragtAm?: IsoZeitpunkt;
}

function absenz(angaben: Angaben): Absenz {
  const person = MITARBEITER_BY_ID.get(angaben.mitarbeiterId);
  const status = angaben.status ?? 'genehmigt';
  const beantragtAm = angaben.beantragtAm ?? (`${addDays(angaben.von, -21)}T09:15` as IsoZeitpunkt);
  const entschieden = status === 'beantragt' ? {} : { entschiedenAm: `${addDays(angaben.von, -19)}T14:30` as IsoZeitpunkt, entschiedenVon: person?.vorgesetzterId === 'M-AD' ? 'AD' : 'JH' };
  return {
    id: angaben.id,
    mitarbeiterId: angaben.mitarbeiterId,
    ...(person?.technikerId ? { technikerId: person.technikerId } : {}),
    von: angaben.von,
    bis: angaben.bis,
    art: angaben.art,
    status,
    ...(angaben.halberTag ? { halberTag: angaben.halberTag } : {}),
    ...(angaben.notiz ? { notiz: angaben.notiz } : {}),
    ...(angaben.arztzeugnis !== undefined ? { arztzeugnis: angaben.arztzeugnis } : {}),
    ...(angaben.entscheidGrund ? { entscheidGrund: angaben.entscheidGrund } : {}),
    beantragtAm,
    beantragtVon: person?.kuerzel ?? 'RW',
    ...entschieden,
  };
}

const naechsterMontag = addDays(startOfWeek(MOCK_HEUTE), 7);

// ── §2 · Absenzen ────────────────────────────────────────────────

// jh? Die Saat ist jahresfix (2026) – Ferienkonten stimmen für die Demo im Jahr 2026; relativ zu heute sind
//     nur die kommenden Wochen und die laufenden Anträge.
export const ABSENZEN: readonly Absenz[] = [
  // Kommende Wochen (relativ zu heute) – sichtbar in Plantafel und Dashboard
  absenz({ id: 'AB-1', mitarbeiterId: 'M-SO', art: 'ferien', von: naechsterMontag, bis: addDays(naechsterMontag, 4), notiz: 'Herbstferien' }),
  absenz({ id: 'AB-2', mitarbeiterId: 'M-FR', art: 'fahrzeugservice', von: addDays(naechsterMontag, 1), bis: addDays(naechsterMontag, 1), notiz: 'ZH 418 241 · Garage Opfikon, 07:30' }),
  absenz({ id: 'AB-3', mitarbeiterId: 'M-JV', art: 'schulung', von: addDays(naechsterMontag, 2), bis: addDays(naechsterMontag, 3), notiz: 'Electrolux Service-Schulung Mägenwil' }),
  absenz({ id: 'AB-4', mitarbeiterId: 'M-NA', art: 'krank', von: tag(-3), bis: tag(-3), arztzeugnis: false, beantragtAm: zeitpunkt(-3, '07:05') }),
  absenz({ id: 'AB-5', mitarbeiterId: 'M-RH', art: 'militaer', von: addDays(naechsterMontag, 7), bis: addDays(naechsterMontag, 11), notiz: 'WK' }),

  // Bezogene Ferien 2026
  absenz({ id: 'AB-10', mitarbeiterId: 'M-MB', art: 'ferien', von: '2026-02-09', bis: '2026-02-13', notiz: 'Skiferien' }),
  absenz({ id: 'AB-11', mitarbeiterId: 'M-MB', art: 'ferien', von: '2026-07-13', bis: '2026-07-24' }),
  absenz({ id: 'AB-12', mitarbeiterId: 'M-SK', art: 'ferien', von: '2026-07-27', bis: '2026-08-07' }),
  absenz({ id: 'AB-13', mitarbeiterId: 'M-DM', art: 'ferien', von: '2026-08-10', bis: '2026-08-28', notiz: 'Heimaturlaub' }),
  absenz({ id: 'AB-14', mitarbeiterId: 'M-LF', art: 'ferien', von: '2026-07-06', bis: '2026-07-17' }),
  absenz({ id: 'AB-15', mitarbeiterId: 'M-RH', art: 'ferien', von: '2026-06-22', bis: '2026-07-03' }),
  absenz({ id: 'AB-16', mitarbeiterId: 'M-NA', art: 'ferien', von: '2026-04-13', bis: '2026-04-17' }),
  absenz({ id: 'AB-17', mitarbeiterId: 'M-NA', art: 'ferien', von: '2026-08-03', bis: '2026-08-14' }),
  absenz({ id: 'AB-18', mitarbeiterId: 'M-FR', art: 'ferien', von: '2026-09-21', bis: '2026-09-25' }),
  absenz({ id: 'AB-19', mitarbeiterId: 'M-JV', art: 'ferien', von: '2026-07-20', bis: '2026-07-31' }),
  absenz({ id: 'AB-20', mitarbeiterId: 'M-JH', art: 'ferien', von: '2026-10-05', bis: '2026-10-09' }),
  absenz({ id: 'AB-21', mitarbeiterId: 'M-JH', art: 'ferien', von: '2026-05-18', bis: '2026-05-22' }),
  absenz({ id: 'AB-22', mitarbeiterId: 'M-RW', art: 'ferien', von: '2026-07-06', bis: '2026-07-24' }),
  absenz({ id: 'AB-23', mitarbeiterId: 'M-AD', art: 'ferien', von: '2026-08-10', bis: '2026-08-21' }),
  absenz({ id: 'AB-24', mitarbeiterId: 'M-SO', art: 'ferien', von: '2026-08-17', bis: '2026-08-21' }),

  // Krankheit, Unfall, Militär, Schulung, Kompensation (Vergangenheit)
  absenz({ id: 'AB-30', mitarbeiterId: 'M-MB', art: 'krank', von: '2026-09-14', bis: '2026-09-15', arztzeugnis: false }),
  absenz({ id: 'AB-31', mitarbeiterId: 'M-DM', art: 'krank', von: '2026-02-02', bis: '2026-02-06', arztzeugnis: true, notiz: 'Arztzeugnis bis 06.02.' }),
  absenz({ id: 'AB-32', mitarbeiterId: 'M-RH', art: 'unfall', von: '2026-05-11', bis: '2026-05-13', arztzeugnis: true, notiz: 'Sturz im Treppenhaus, SUVA gemeldet' }),
  absenz({ id: 'AB-33', mitarbeiterId: 'M-FR', art: 'militaer', von: '2026-06-01', bis: '2026-06-19', notiz: 'WK Inf Bat' }),
  absenz({ id: 'AB-34', mitarbeiterId: 'M-SK', art: 'schulung', von: '2026-03-10', bis: '2026-03-11', notiz: 'Siemens Service-Akademie' }),
  absenz({ id: 'AB-35', mitarbeiterId: 'M-LF', art: 'kompensation', von: '2026-09-04', bis: '2026-09-04' }),
  absenz({ id: 'AB-36', mitarbeiterId: 'M-SO', art: 'schulung', von: '2026-09-07', bis: '2026-09-11', notiz: 'Überbetrieblicher Kurs' }),
  absenz({ id: 'AB-37', mitarbeiterId: 'M-JV', art: 'krank', von: tag(-9), bis: tag(-8), arztzeugnis: false, beantragtAm: zeitpunkt(-9, '06:50') }),

  // Offene Anträge und ein abgelehnter
  absenz({ id: 'AB-40', mitarbeiterId: 'M-LF', art: 'ferien', von: '2026-12-21', bis: '2026-12-24', status: 'beantragt', notiz: 'Weihnachten bei der Familie', beantragtAm: zeitpunkt(-2, '18:20') }),
  absenz({ id: 'AB-41', mitarbeiterId: 'M-RW', art: 'kompensation', von: '2026-11-13', bis: '2026-11-13', status: 'beantragt', beantragtAm: zeitpunkt(-1, '11:40') }),
  absenz({ id: 'AB-42', mitarbeiterId: 'M-SK', art: 'ferien', von: '2027-02-08', bis: '2027-02-12', status: 'beantragt', notiz: 'Sportferien', beantragtAm: zeitpunkt(-4, '20:05') }),
  absenz({ id: 'AB-43', mitarbeiterId: 'M-DM', art: 'ferien', von: '2026-11-02', bis: '2026-11-03', status: 'abgelehnt', entscheidGrund: 'Drei Techniker in derselben Woche abwesend – bitte anderen Termin', beantragtAm: zeitpunkt(-6, '12:10') }),
  absenz({ id: 'AB-44', mitarbeiterId: 'M-MB', art: 'ferien', von: '2026-11-20', bis: '2026-11-20', status: 'beantragt', halberTag: 'nachmittag', beantragtAm: zeitpunkt(0, '06:45') }),
];

/* ◆ jh · eof */
