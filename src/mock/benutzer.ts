/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/benutzer.ts                                   │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Demo-Konten: Rolle, Personalakte, Anbieter – ohne Passwort            │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Benutzer, SsoVerknuepfung } from '../core/auth/auth.types';
import { emailFuer } from './personal';
import { zeitpunkt } from './heute';

// ── §1 · Benutzer ────────────────────────────────────────────────

function microsoft(sub: string, email: string, offset: number): SsoVerknuepfung {
  return { anbieter: 'microsoft', externeId: sub, email, verknuepftAm: zeitpunkt(offset, '08:05') };
}

// jh! Reine Demo-Konten. Es gibt keine Passwörter – jede Eingabe meldet an. Konten mit Anbieter-Verknüpfung
//     melden sich im Produkt nur noch über Microsoft Entra ID an (nurSso in den Einstellungen).
export const BENUTZER: readonly Benutzer[] = [
  {
    id: 'U-JH', benutzername: 'jh', vorname: 'Joel', nachname: 'Hediger', kuerzel: 'JH', rolle: 'disposition', mitarbeiterId: 'M-JH',
    email: emailFuer('Joel', 'Hediger'), aktiv: true, zusatzRechte: ['zeit:exportieren'], sso: microsoft('ms-jh', emailFuer('Joel', 'Hediger'), -40), mfa: true,
    letzteAnmeldung: zeitpunkt(-1, '07:12'), erstelltAm: '2026-01-05T09:00',
  },
  {
    id: 'U-RW', benutzername: 'rw', vorname: 'Regula', nachname: 'Wild', kuerzel: 'RW', rolle: 'buero', mitarbeiterId: 'M-RW',
    email: emailFuer('Regula', 'Wild'), aktiv: true, sso: microsoft('ms-rw', emailFuer('Regula', 'Wild'), -40), mfa: true,
    letzteAnmeldung: zeitpunkt(-1, '07:48'), erstelltAm: '2026-01-05T09:00',
  },
  {
    id: 'U-MB', benutzername: 'mb', vorname: 'Marco', nachname: 'Brunner', kuerzel: 'MB', rolle: 'aussendienst', technikerId: 'T-MB', mitarbeiterId: 'M-MB',
    email: emailFuer('Marco', 'Brunner'), aktiv: true, sso: microsoft('ms-mb', emailFuer('Marco', 'Brunner'), -33), mfa: true,
    letzteAnmeldung: zeitpunkt(-1, '06:58'), erstelltAm: '2026-01-05T09:00',
  },
  {
    id: 'U-SK', benutzername: 'sk', vorname: 'Sandra', nachname: 'Keller', kuerzel: 'SK', rolle: 'aussendienst', technikerId: 'T-SK', mitarbeiterId: 'M-SK',
    email: emailFuer('Sandra', 'Keller'), aktiv: true, letzteAnmeldung: zeitpunkt(-1, '07:05'), erstelltAm: '2026-01-05T09:00',
  },
  {
    id: 'U-LF', benutzername: 'lf', vorname: 'Luca', nachname: 'Frei', kuerzel: 'LF', rolle: 'aussendienst', technikerId: 'T-LF', mitarbeiterId: 'M-LF',
    email: emailFuer('Luca', 'Frei'), aktiv: true, letzteAnmeldung: zeitpunkt(-3, '07:20'), erstelltAm: '2026-02-10T10:30',
  },
  {
    id: 'U-AD', benutzername: 'admin', vorname: 'Andrea', nachname: 'Dietrich', kuerzel: 'AD', rolle: 'administration', mitarbeiterId: 'M-AD',
    email: emailFuer('Andrea', 'Dietrich'), aktiv: true, sso: microsoft('ms-ad', emailFuer('Andrea', 'Dietrich'), -40), mfa: true,
    letzteAnmeldung: zeitpunkt(-2, '16:40'), erstelltAm: '2026-01-05T09:00',
  },
  {
    // jh› Ausgetreten per 30.06. – Konto gesperrt, bleibt bis zur Löschfrist sichtbar (Aufbewahrung ab Austritt).
    id: 'U-TE', benutzername: 'te', vorname: 'Thomas', nachname: 'Ehrler', kuerzel: 'TE', rolle: 'aussendienst', mitarbeiterId: 'M-TE',
    email: emailFuer('Thomas', 'Ehrler'), aktiv: false, letzteAnmeldung: '2026-06-30T16:05', erstelltAm: '2026-01-05T09:00',
  },
];

export function findBenutzer(benutzername: string): Benutzer | undefined {
  return BENUTZER.find((benutzer) => benutzer.benutzername === benutzername);
}

/* ◆ jh · eof */
