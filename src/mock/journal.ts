/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/journal.ts                                    │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Journal-Saat: Anmeldungen, Einsichten, Entscheide der letzten Tage    │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { JournalArt, JournalBereich, JournalEintrag } from '../core/domain/journal';
import { zeitpunkt } from './heute';

// ── §1 · Einträge ────────────────────────────────────────────────

function eintrag(id: string, offset: number, zeit: string, benutzer: string, bereich: JournalBereich, art: JournalArt, text: string, zusatz: Partial<JournalEintrag> = {}): JournalEintrag {
  return { id: `J-S-${id}`, zeitpunkt: zeitpunkt(offset, zeit), benutzer, bereich, art, text, ...zusatz };
}

// jh› Die Saat zeigt, was das Journal im Betrieb enthält: wer sich wie anmeldet, wer fremde Zeitkonten
//     ansieht, welche Entscheide fallen – und ein Löschlauf, der nichts fand.
export const JOURNAL: readonly JournalEintrag[] = [
  eintrag('a01', -1, '07:12', 'JH', 'anmeldung', 'anmeldung', 'Anmeldung über Microsoft Entra ID (OIDC, MFA)', { betrifft: 'U-JH', mitarbeiterId: 'M-JH' }),
  eintrag('a02', -1, '07:48', 'RW', 'anmeldung', 'anmeldung', 'Anmeldung über Microsoft Entra ID (OIDC, MFA)', { betrifft: 'U-RW', mitarbeiterId: 'M-RW' }),
  eintrag('a03', -1, '06:58', 'MB', 'anmeldung', 'anmeldung', 'Anmeldung über Microsoft Entra ID (OIDC, MFA) · Techniker-App', { betrifft: 'U-MB', mitarbeiterId: 'M-MB' }),
  eintrag('a04', -1, '07:05', 'SK', 'anmeldung', 'anmeldung', 'Anmeldung lokal (Benutzername) · Techniker-App', { betrifft: 'U-SK', mitarbeiterId: 'M-SK' }),
  eintrag('e01', -1, '08:20', 'RW', 'zeit', 'einsicht', 'Zeitkonto Marco Brunner angesehen (Oktober)', { mitarbeiterId: 'M-MB' }),
  eintrag('e02', -1, '08:24', 'RW', 'zeit', 'einsicht', 'Zeitkonto Samuel Odermatt angesehen (September)', { mitarbeiterId: 'M-SO' }),
  eintrag('d01', -2, '09:05', 'JH', 'absenz', 'aenderung', 'Dragan Marković · Ferien 02.11. abgelehnt: Drei Techniker in derselben Woche abwesend – bitte anderen Termin', { aktion: 'absenzEntscheiden', betrifft: 'AB-43', mitarbeiterId: 'M-DM' }),
  eintrag('d02', -2, '09:08', 'JH', 'absenz', 'aenderung', 'Samuel Odermatt · Ferien 02.11.–06.11. genehmigt', { aktion: 'absenzEntscheiden', betrifft: 'AB-1', mitarbeiterId: 'M-SO' }),
  eintrag('d03', -2, '16:40', 'AD', 'anmeldung', 'anmeldung', 'Anmeldung über Microsoft Entra ID (OIDC, MFA)', { betrifft: 'U-AD', mitarbeiterId: 'M-AD' }),
  eintrag('d04', -2, '16:52', 'AD', 'benutzer', 'aenderung', 'Konto te gesperrt (Austritt 30.06.2026)', { aktion: 'benutzerSpeichern', betrifft: 'U-TE', mitarbeiterId: 'M-TE' }),
  eintrag('d05', -2, '16:55', 'AD', 'benutzer', 'aenderung', 'Konto jh · Zusatzrecht «Zeiten exportieren» erteilt', { aktion: 'benutzerSpeichern', betrifft: 'U-JH', mitarbeiterId: 'M-JH' }),
  eintrag('d06', -3, '07:02', 'NA', 'absenz', 'aenderung', 'Nadine Ammann · Krank gemeldet (App)', { aktion: 'absenzBeantragen', betrifft: 'AB-4', mitarbeiterId: 'M-NA' }),
  eintrag('d07', -4, '18:10', 'LF', 'absenz', 'aenderung', 'Luca Frei · Ferien 21.12.–24.12. beantragt (App)', { aktion: 'absenzBeantragen', betrifft: 'AB-40', mitarbeiterId: 'M-LF' }),
  eintrag('d08', -5, '10:15', 'RW', 'personal', 'export', 'Datenauskunft für Thomas Ehrler erstellt (DSG Art. 25)', { mitarbeiterId: 'M-TE' }),
  eintrag('d09', -6, '12:10', 'DM', 'absenz', 'aenderung', 'Dragan Marković · Ferien 02.11.–03.11. beantragt (App)', { aktion: 'absenzBeantragen', betrifft: 'AB-43', mitarbeiterId: 'M-DM' }),
  eintrag('d10', -7, '03:00', 'SYS', 'datenschutz', 'loeschung', 'Löschlauf nach Aufbewahrungsplan: 0 Journaleinträge, 0 Zeiteinträge, 0 Nachrichten fällig', { aktion: 'loeschlauf' }),
  eintrag('d11', -7, '09:30', 'AD', 'einstellungen', 'aenderung', 'Anbieter Microsoft Entra ID aktiviert · Gruppen SG-Aussendienst, SG-Disposition, SG-Buero, SG-Admin zugeordnet'),
  eintrag('d12', -7, '09:41', 'AD', 'einstellungen', 'system', 'Verbindungstest Microsoft Entra ID erfolgreich (Mandant 7e1c3b2a…)'),
  eintrag('d13', -8, '07:55', 'RW', 'zeit', 'einsicht', 'Zeitkonto Jana Vogt angesehen (September)', { mitarbeiterId: 'M-JV' }),
];

/* ◆ jh · eof */
