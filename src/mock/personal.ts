/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/personal.ts                                   │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Mitarbeitende: Techniker plus Büro, Pensum, Vertrag, Hierarchie       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, addMonths, startOfMonth } from '../core/datum';
import type { IsoDatum, Minuten } from '../core/datum';
import type { Mitarbeiter, Vertragsart } from '../core/domain/personal';
import { MOCK_HEUTE } from './heute';
import { TECHNIKER } from './techniker';

// jh› Stichtag des Gleitzeit-Übertrags = Tag vor dem ersten Monat mit Zeiteinträgen in der Saat.
export const ZEIT_STICHTAG: IsoDatum = addDays(startOfMonth(addMonths(MOCK_HEUTE, -1)), -1);

// ── §1 · Zusatzangaben je Techniker ──────────────────────────────

interface Zusatz {
  pensum: number;
  eintritt: IsoDatum;
  ferien: number;
  uebertrag: number;
  zeit: Minuten;
  vertrag?: { art: Vertragsart; ende?: IsoDatum; notiz?: string };
}

// jh? Pensen, Eintritte, Ferienansprüche und Vertragsarten sind erfunden – Sutt liefert die echten Werte aus dem Lohnsystem.
// jh› Drei Verträge zeigen die Regeln: FR befristet und in 45 Tagen am Ende (Hinweis im Dashboard), SO mit
//     Lehrvertrag bis 2029, NA auf Widerruf ohne festes Ende; alle anderen unbefristet.
const ZUSATZ: Readonly<Record<string, Zusatz>> = {
  'T-MB': { pensum: 100, eintritt: '2019-03-01', ferien: 25, uebertrag: 2, zeit: 120 },
  'T-SK': { pensum: 100, eintritt: '2021-08-01', ferien: 25, uebertrag: 0, zeit: -60 },
  'T-DM': { pensum: 100, eintritt: '2015-05-01', ferien: 25, uebertrag: 3.5, zeit: 300 },
  'T-LF': { pensum: 100, eintritt: '2020-01-06', ferien: 25, uebertrag: 0, zeit: 45 },
  'T-RH': { pensum: 100, eintritt: '2012-09-01', ferien: 27, uebertrag: 1, zeit: 0 },
  'T-NA': { pensum: 100, eintritt: '2022-02-01', ferien: 25, uebertrag: 0, zeit: -30, vertrag: { art: 'auf-widerruf', notiz: 'Übernahme in Festanstellung nach Bedarf' } },
  'T-FR': { pensum: 100, eintritt: '2023-04-01', ferien: 25, uebertrag: 0, zeit: 90, vertrag: { art: 'befristet', ende: addDays(MOCK_HEUTE, 45), notiz: 'Befristung bis Projektende Glattpark – Verlängerung offen' } },
  'T-JV': { pensum: 100, eintritt: '2018-11-01', ferien: 25, uebertrag: 1.5, zeit: -120 },
  'T-SO': { pensum: 100, eintritt: '2025-08-01', ferien: 25, uebertrag: 0, zeit: 0, vertrag: { art: 'befristet', ende: '2029-07-31', notiz: 'Lehrvertrag Haushaltapparate-Fachmann EFZ' } },
};

function mailName(wert: string): string {
  return wert.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

export function emailFuer(vorname: string, nachname: string): string {
  return `${mailName(vorname).charAt(0)}.${mailName(nachname)}@sutt.example`;
}

// ── §2 · Mitarbeitende ───────────────────────────────────────────

const AUS_TECHNIKERN: Mitarbeiter[] = TECHNIKER.map((techniker) => {
  const zusatz = ZUSATZ[techniker.id] ?? { pensum: 100, eintritt: '2024-01-01', ferien: 25, uebertrag: 0, zeit: 0 };
  const vertrag = zusatz.vertrag ?? { art: 'unbefristet' as const };
  return {
    id: `M-${techniker.kuerzel}`,
    kuerzel: techniker.kuerzel,
    vorname: techniker.vorname,
    nachname: techniker.nachname,
    funktion: techniker.id === 'T-SO' ? 'lehrling' : 'techniker',
    technikerId: techniker.id,
    pensum: zusatz.pensum,
    eintritt: zusatz.eintritt,
    ...(vertrag.ende ? { austritt: vertrag.ende } : {}),
    vertragsart: vertrag.art,
    ...(vertrag.notiz ? { vertragsnotiz: vertrag.notiz } : {}),
    ferienTageProJahr: zusatz.ferien,
    ferienUebertragTage: zusatz.uebertrag,
    zeitUebertragMin: zusatz.zeit,
    zeitUebertragPer: ZEIT_STICHTAG,
    vorgesetzterId: 'M-JH',
    email: emailFuer(techniker.vorname, techniker.nachname),
    telefon: techniker.telefon,
  };
});

// jh› Hierarchie: Techniker → Disposition (JH) → Geschäftsleitung (AD); Büro (RW) direkt unter der Leitung.
export const MITARBEITER: readonly Mitarbeiter[] = [
  ...AUS_TECHNIKERN,
  {
    id: 'M-JH', kuerzel: 'JH', vorname: 'Joel', nachname: 'Hediger', funktion: 'disposition', pensum: 100, eintritt: '2016-01-04', vertragsart: 'unbefristet',
    ferienTageProJahr: 25, ferienUebertragTage: 2, zeitUebertragMin: 180, zeitUebertragPer: ZEIT_STICHTAG, vorgesetzterId: 'M-AD', email: emailFuer('Joel', 'Hediger'), telefon: '044 809 12 31',
  },
  {
    id: 'M-RW', kuerzel: 'RW', vorname: 'Regula', nachname: 'Wild', funktion: 'buero', pensum: 80, eintritt: '2010-03-01', vertragsart: 'unbefristet',
    ferienTageProJahr: 25, ferienUebertragTage: 0, zeitUebertragMin: 60, zeitUebertragPer: ZEIT_STICHTAG, vorgesetzterId: 'M-AD', email: emailFuer('Regula', 'Wild'), telefon: '044 809 12 30',
  },
  {
    id: 'M-AD', kuerzel: 'AD', vorname: 'Andrea', nachname: 'Dietrich', funktion: 'leitung', pensum: 100, eintritt: '2008-06-01', vertragsart: 'unbefristet',
    ferienTageProJahr: 25, ferienUebertragTage: 4, zeitUebertragMin: 0, zeitUebertragPer: ZEIT_STICHTAG, email: emailFuer('Andrea', 'Dietrich'), telefon: '044 809 12 10',
  },
  {
    // jh› Ausgetreten – zeigt Sperre des Kontos und die Aufbewahrung ab Austritt.
    id: 'M-TE', kuerzel: 'TE', vorname: 'Thomas', nachname: 'Ehrler', funktion: 'techniker', pensum: 100, eintritt: '2017-02-01', austritt: '2026-06-30', vertragsart: 'unbefristet', vertragsnotiz: 'Gekündigt per 30.06.2026',
    ferienTageProJahr: 25, ferienUebertragTage: 0, zeitUebertragMin: 0, zeitUebertragPer: '2026-06-30', vorgesetzterId: 'M-JH', email: emailFuer('Thomas', 'Ehrler'),
  },
];

export const MITARBEITER_BY_ID: ReadonlyMap<string, Mitarbeiter> = new Map(MITARBEITER.map((person) => [person.id, person]));

export function mitarbeiterVonTechniker(technikerId: string): Mitarbeiter | undefined {
  return MITARBEITER.find((person) => person.technikerId === technikerId);
}

/* ◆ jh · eof */
