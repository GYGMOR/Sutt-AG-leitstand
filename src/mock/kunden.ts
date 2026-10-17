/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/kunden.ts                                     │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Kunden & Liegenschaften mit Koordinaten und Hinweisen – erfunden      │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Kunde, Liegenschaft } from '../core/domain/stammdaten';
import { tag } from './heute';

// jh! Alle Firmen, Personen und Nummern sind erfunden. E-Mails auf .example.
//     Koordinaten sind Näherungen auf Strassenniveau im Raum Glattal/Zürich Nord.

// ── §1 · Kunden ──────────────────────────────────────────────────

export const KUNDEN: readonly Kunde[] = [
  {
    id: 'K1', nummer: 'K-10021', art: 'verwaltung', name: 'Glattal Immobilien AG', kurzname: 'Glattal Immo',
    adresse: { strasse: 'Wallisellerstrasse', hausnummer: '12', plz: '8152', ort: 'Glattbrugg' },
    kontakt: { name: 'Petra Graf, Bewirtschaftung', telefon: '044 809 12 40', email: 'p.graf@glattal-immo.example' },
    kundeSeit: '2014-03-01',
    hinweise: [{ art: 'stammkunde', text: 'Rahmenvertrag Unterhalt seit 2014 · Abrechnung monatlich' }],
  },
  {
    id: 'K2', nummer: 'K-10044', art: 'verwaltung', name: 'Hürlimann & Partner Liegenschaften AG', kurzname: 'Hürlimann',
    adresse: { strasse: 'Bahnhofstrasse', hausnummer: '18', plz: '8304', ort: 'Wallisellen' },
    kontakt: { name: 'Thomas Meier, Bewirtschaftung', telefon: '044 830 55 10', email: 't.meier@huerlimann-partner.example' },
    kundeSeit: '2019-08-15',
    rechnungOffenSeit: tag(-34),
    hinweise: [{ art: 'rechnung-offen', text: 'Rechnung 26-1187 (CHF 1’240.50) seit 34 Tagen offen – Büro informieren' }],
  },
  {
    id: 'K3', nummer: 'K-10057', art: 'verwaltung', name: 'Immoverwaltung Kloten GmbH', kurzname: 'Immo Kloten',
    adresse: { strasse: 'Schaffhauserstrasse', hausnummer: '89', plz: '8302', ort: 'Kloten' },
    kontakt: { name: 'Aylin Demir, Bewirtschaftung', telefon: '044 813 70 22', email: 'a.demir@immo-kloten.example' },
    kundeSeit: '2016-01-10',
    hinweise: [{ art: 'stammkunde', text: 'Stammkunde · Auftragserteilung immer per Portal' }],
  },
  {
    id: 'K4', nummer: 'K-10063', art: 'verwaltung', name: 'Wohnbaugenossenschaft Seebach', kurzname: 'WBG Seebach',
    adresse: { strasse: 'Seebacherstrasse', hausnummer: '140', plz: '8052', ort: 'Zürich-Seebach' },
    kontakt: { name: 'Beat Schmid, Liegenschaften', telefon: '044 302 41 18', email: 'b.schmid@wbg-seebach.example' },
    kundeSeit: '2011-05-02',
    hinweise: [{ art: 'schluessel-verwaltung', text: 'Schlüsseldepot in der Geschäftsstelle Seebacherstrasse 140, Mo–Fr 8–11 Uhr' }],
  },
  {
    id: 'K5', nummer: 'K-20311', art: 'privat', name: 'Andrea und Markus Weber', kurzname: 'Weber',
    adresse: { strasse: 'Usterstrasse', hausnummer: '64', plz: '8600', ort: 'Dübendorf' },
    kontakt: { name: 'Andrea Weber', telefon: '079 512 33 08', email: 'a.weber@mail.example' },
    kundeSeit: '2022-11-20',
    hinweise: [],
  },
  {
    id: 'K6', nummer: 'K-20345', art: 'privat', name: 'Peter Baumgartner', kurzname: 'Baumgartner',
    adresse: { strasse: 'Breitistrasse', hausnummer: '7', plz: '8302', ort: 'Kloten' },
    kontakt: { name: 'Peter Baumgartner', telefon: '078 640 19 72' },
    kundeSeit: '2024-02-05',
    hinweise: [{ art: 'parkplatz', text: 'Parkieren nur in der Einfahrt, Strasse ist Begegnungszone' }],
  },
  {
    id: 'K7', nummer: 'K-30102', art: 'gewerbe', name: 'Kita Sonnenstrahl GmbH', kurzname: 'Kita Sonnenstrahl',
    adresse: { strasse: 'Zürichstrasse', hausnummer: '31', plz: '8304', ort: 'Wallisellen' },
    kontakt: { name: 'Simone Frey, Kitaleitung', telefon: '044 877 20 60', email: 'leitung@kita-sonnenstrahl.example' },
    kundeSeit: '2020-09-01',
    hinweise: [{ art: 'vorsicht', text: 'Kinder im Haus – Werkzeug und Chemie nie unbeaufsichtigt, Mittagsruhe 12–14 Uhr' }],
  },
];

// ── §2 · Liegenschaften ──────────────────────────────────────────

export const LIEGENSCHAFTEN: readonly Liegenschaft[] = [
  {
    id: 'L01', objektNummer: 'LG-2210', bezeichnung: 'MFH Talackerstrasse 41', kundeId: 'K1',
    adresse: { strasse: 'Talackerstrasse', hausnummer: '41', plz: '8152', ort: 'Glattbrugg' }, koordinaten: { lat: 47.4338, lng: 8.5592 },
    hauswart: { name: 'Rolf Zimmermann', telefon: '079 334 71 02' },
    zugang: 'Schlüssel beim Hauswart, EG links',
    hinweise: [],
  },
  {
    id: 'L02', objektNummer: 'LG-2234', bezeichnung: 'Überbauung Giebeleich, Haus C', kundeId: 'K1',
    adresse: { strasse: 'Giebeleichstrasse', hausnummer: '52', plz: '8152', ort: 'Opfikon' }, koordinaten: { lat: 47.4279, lng: 8.5758 },
    hauswart: { name: 'Sandro Pellegrini', telefon: '079 220 48 61' },
    zugang: 'Tiefgarage Einfahrt Nord, Besucherplätze 1–4',
    hinweise: [{ art: 'parkplatz', text: 'Besucherplätze TG 1–4, Einfahrt Nord (Höhe 2,10 m)' }],
  },
  {
    id: 'L03', objektNummer: 'LG-3108', bezeichnung: 'MFH Schaffhauserstrasse 112', kundeId: 'K3',
    adresse: { strasse: 'Schaffhauserstrasse', hausnummer: '112', plz: '8302', ort: 'Kloten' }, koordinaten: { lat: 47.4538, lng: 8.5829 },
    hauswart: { name: 'Kurt Meier', telefon: '078 711 05 90' },
    hinweise: [],
  },
  {
    id: 'L04', objektNummer: 'LG-3115', bezeichnung: 'Wohnpark Hohrainli', kundeId: 'K3',
    adresse: { strasse: 'Hohrainlistrasse', hausnummer: '18', plz: '8302', ort: 'Kloten' }, koordinaten: { lat: 47.4479, lng: 8.5905 },
    zugang: 'Häuser A/B · Waschküche UG Haus A',
    hinweise: [{ art: 'hund', text: 'Hund in W B.21 (Mieterin Yilmaz) – bellt, beisst nicht' }],
  },
  {
    id: 'L05', objektNummer: 'LG-4402', bezeichnung: 'Siedlung Felsenrain', kundeId: 'K4',
    adresse: { strasse: 'Felsenrainstrasse', hausnummer: '87', plz: '8052', ort: 'Zürich-Seebach' }, koordinaten: { lat: 47.4247, lng: 8.5401 },
    hauswart: { name: 'Mehmet Kaya', telefon: '076 398 12 44' },
    hinweise: [],
  },
  {
    id: 'L06', objektNummer: 'LG-4417', bezeichnung: 'MFH Riedenhalde', kundeId: 'K4',
    adresse: { strasse: 'Riedenhaldenstrasse', hausnummer: '21', plz: '8052', ort: 'Zürich-Seebach' }, koordinaten: { lat: 47.4214, lng: 8.5332 },
    hinweise: [{ art: 'schluessel-verwaltung', text: 'Waschküchenschlüssel bei der Verwaltung' }],
  },
  {
    id: 'L07', objektNummer: 'LG-5021', bezeichnung: 'MFH Säntisstrasse 9', kundeId: 'K2',
    adresse: { strasse: 'Säntisstrasse', hausnummer: '9', plz: '8304', ort: 'Wallisellen' }, koordinaten: { lat: 47.4118, lng: 8.5897 },
    hinweise: [],
  },
  {
    id: 'L08', objektNummer: 'LG-5033', bezeichnung: 'MFH Alte Winterthurerstrasse 51', kundeId: 'K2',
    adresse: { strasse: 'Alte Winterthurerstrasse', hausnummer: '51', plz: '8304', ort: 'Wallisellen' }, koordinaten: { lat: 47.4166, lng: 8.6012 },
    hinweise: [],
  },
  {
    id: 'L09', objektNummer: 'LG-5040', bezeichnung: 'Wohnhaus Wallisellenstrasse 202', kundeId: 'K2',
    adresse: { strasse: 'Wallisellenstrasse', hausnummer: '202', plz: '8600', ort: 'Dübendorf' }, koordinaten: { lat: 47.4012, lng: 8.6079 },
    hinweise: [],
  },
  {
    id: 'L10', bezeichnung: 'EFH Weber', kundeId: 'K5',
    adresse: { strasse: 'Usterstrasse', hausnummer: '64', plz: '8600', ort: 'Dübendorf' }, koordinaten: { lat: 47.3946, lng: 8.6244 },
    zugang: 'Parkplatz vor der Garage benutzen',
    hinweise: [{ art: 'hund', text: 'Hund im Haus (Labrador, freundlich) – vor dem Eintreten klingeln' }],
  },
  {
    id: 'L11', bezeichnung: 'EFH Baumgartner', kundeId: 'K6',
    adresse: { strasse: 'Breitistrasse', hausnummer: '7', plz: '8302', ort: 'Kloten' }, koordinaten: { lat: 47.4506, lng: 8.5786 },
    hinweise: [],
  },
  {
    id: 'L12', bezeichnung: 'Kita Sonnenstrahl', kundeId: 'K7',
    adresse: { strasse: 'Zürichstrasse', hausnummer: '31', plz: '8304', ort: 'Wallisellen' }, koordinaten: { lat: 47.4139, lng: 8.5921 },
    zugang: 'Anlieferung über Hof · nicht während Mittagsruhe 12–14 Uhr',
    hinweise: [],
  },
  {
    id: 'L13', objektNummer: 'LG-2251', bezeichnung: 'MFH Europastrasse 14', kundeId: 'K1',
    adresse: { strasse: 'Europastrasse', hausnummer: '14', plz: '8152', ort: 'Glattbrugg' }, koordinaten: { lat: 47.4289, lng: 8.5603 },
    hinweise: [],
  },
  {
    id: 'L14', objektNummer: 'LG-2262', bezeichnung: 'MFH Oberhauserstrasse 6', kundeId: 'K1',
    adresse: { strasse: 'Oberhauserstrasse', hausnummer: '6', plz: '8152', ort: 'Opfikon' }, koordinaten: { lat: 47.4334, lng: 8.5727 },
    hinweise: [],
  },
  {
    id: 'L15', objektNummer: 'LG-5047', bezeichnung: 'MFH Überlandstrasse 245', kundeId: 'K2',
    adresse: { strasse: 'Überlandstrasse', hausnummer: '245', plz: '8600', ort: 'Dübendorf' }, koordinaten: { lat: 47.3992, lng: 8.6121 },
    hinweise: [],
  },
];

/* ◆ jh · eof */
