/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/anfragen.ts                                   │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Website-Anfragen: zwei neue, eine angenommene, eine abgelehnte        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, toZeitpunkt } from '../core/datum';
import type { IsoZeitpunkt } from '../core/datum';
import type { Anfrage } from '../core/domain/anfrage';
import { MOCK_HEUTE } from './heute';

// ── §1 · Hilfen ──────────────────────────────────────────────────

function zeitpunkt(tageOffset: number, uhrzeit: string): IsoZeitpunkt {
  const [stunde = '0', minute = '0'] = uhrzeit.split(':');
  return toZeitpunkt(addDays(MOCK_HEUTE, tageOffset), Number(stunde) * 60 + Number(minute));
}

// ── §2 · Anfragen ────────────────────────────────────────────────

// jh› Die Telefonnummer von Rolf Zimmermann steht im Telefonbuch der Schnellerfassung (Hauswart Glattal Immobilien):
//     So zeigt die Demo, wie das Büro den Absender einer Anfrage erkennt. Alle Angaben sind erfunden.
export const MOCK_ANFRAGEN: readonly Anfrage[] = [
  {
    id: 'W-0101', nummer: 'W-26-0101', eingegangenAm: zeitpunkt(0, '08:05'), status: 'neu', anliegen: 'reparatur', dringend: true,
    geraeteart: 'Geschirrspüler', marke: 'V-ZUG', fehlerbild: 'Zieht kein Wasser mehr, Anzeige E15 blinkt. Die Wohnung ist tagsüber über den Hauswart zugänglich.',
    adresse: { strasse: 'Giebeleichstrasse 52', plz: '8152', ort: 'Opfikon', wohnung: 'W B.07' },
    terminwunsch: { datum: addDays(MOCK_HEUTE, 1), zeitfenster: 'vormittag' },
    kontakt: { name: 'Rolf Zimmermann', telefon: '079 334 71 02', email: 'r.zimmermann@glattal-immo.example', rolle: 'Hauswart' },
    datenschutzZugestimmtAm: zeitpunkt(0, '08:05'), quelle: 'website',
  },
  {
    id: 'W-0100', nummer: 'W-26-0100', eingegangenAm: zeitpunkt(-1, '17:42'), status: 'neu', anliegen: 'reparatur', dringend: false,
    geraeteart: 'Waschmaschine', marke: 'Miele', fehlerbild: 'Schleudert nicht mehr, Fehler F53, Wasser bleibt in der Trommel. Gerät ist etwa sechs Jahre alt.',
    adresse: { strasse: 'Talackerstrasse 41', plz: '8152', ort: 'Glattbrugg', wohnung: 'W 1.05' },
    terminwunsch: { datum: addDays(MOCK_HEUTE, 3), zeitfenster: 'nachmittag' },
    kontakt: { name: 'Nadia Keller', telefon: '079 655 21 44', email: 'nadia.keller@mail.example', rolle: 'Mieter' },
    fotoName: 'IMG_4471.jpg',
    datenschutzZugestimmtAm: zeitpunkt(-1, '17:42'), quelle: 'website',
  },
  {
    id: 'W-0099', nummer: 'W-26-0099', eingegangenAm: zeitpunkt(-2, '12:18'), status: 'angenommen', anliegen: 'reparatur', dringend: false,
    geraeteart: 'Steamer', marke: 'V-ZUG', fehlerbild: 'Entkalkungsmeldung lässt sich nicht quittieren, Gerät startet kein Programm mehr.',
    adresse: { strasse: 'Usterstrasse 64', plz: '8600', ort: 'Dübendorf' },
    kontakt: { name: 'Andrea Weber', telefon: '079 512 33 08', email: 'a.weber@mail.example', rolle: 'Eigentümer' },
    datenschutzZugestimmtAm: zeitpunkt(-2, '12:18'), quelle: 'website',
    auftragId: 'A05',
    antwort: { am: zeitpunkt(-2, '13:02'), kanal: 'mail', text: 'Guten Tag Andrea Weber\n\nVielen Dank für Ihre Anfrage W-26-0099. Unser Techniker kommt am vereinbarten Termin vorbei.\n\nFreundliche Grüsse\nSutt AG · 044 123 45 67', von: 'RW' },
  },
  {
    id: 'W-0098', nummer: 'W-26-0098', eingegangenAm: zeitpunkt(-4, '09:51'), status: 'abgelehnt', anliegen: 'offerte', dringend: false,
    geraeteart: 'Kaffeevollautomat', marke: 'andere', fehlerbild: 'Mahlwerk macht Geräusche, Kaffee kommt nur tröpfchenweise. Bitte um Offerte für eine Reparatur.',
    adresse: { strasse: 'Bahnhofstrasse 3', plz: '8302', ort: 'Kloten' },
    kontakt: { name: 'Peter Lang', telefon: '', email: 'peter.lang@mail.example', rolle: 'Eigentümer' },
    datenschutzZugestimmtAm: zeitpunkt(-4, '09:51'), quelle: 'website',
    antwort: { am: zeitpunkt(-4, '10:30'), kanal: 'mail', text: 'Guten Tag Peter Lang\n\nVielen Dank für Ihre Anfrage W-26-0098. Kaffeevollautomaten reparieren wir leider nicht – wir empfehlen den Herstellerservice.\n\nFreundliche Grüsse\nSutt AG · 044 123 45 67', von: 'RW' },
  },
];

/* ◆ jh · eof */
