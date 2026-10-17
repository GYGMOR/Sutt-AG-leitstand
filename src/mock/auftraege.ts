/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/auftraege.ts                                  │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Handverlesene Aufträge für heute, gestern und den Eingang             │
   └────────────────────────────────────────────────────────────────────────┘ */

import { splitZeitpunkt, toZeitpunkt } from '../core/datum';
import type { IsoDatum, IsoZeitpunkt, Minuten } from '../core/datum';
import type {
  Auftrag,
  Auftragsart,
  Dringlichkeit,
  Eingangskanal,
  KontaktVorOrt,
  Rechnungsempfaenger,
  TeilStatus,
} from '../core/domain/auftrag';
import { kategorieFor } from '../core/domain/kategorie';
import type { Kategorie } from '../core/domain/kategorie';
import type { Geraet, Liegenschaft, Wohnung } from '../core/domain/stammdaten';
import { tag, zeitpunkt } from './heute';
import { buildGeraet, buildTeil, fehlerbildOf } from './katalog';
import type { KatalogKey } from './katalog';
import { LIEGENSCHAFTEN } from './kunden';

// ── §1 · Entwurfsformat ──────────────────────────────────────────

interface GeraetEntwurf {
  key: KatalogKey;
  sn: string;
  baujahr: number;
  garantieBis?: IsoDatum;
}

type TeilEntwurf = readonly [index: number, status: TeilStatus, liefertermin?: IsoDatum];

interface AuftragEntwurf {
  id: string;
  nummer: string;
  art?: Auftragsart;
  kategorie?: Kategorie;
  dringlichkeit?: Dringlichkeit;
  kanal?: Eingangskanal;
  angefragt: IsoZeitpunkt;
  /** Minuten bis zur Bestellung durch die Verwaltung; null = noch nicht bestellt. */
  bestelltNach?: Minuten | null;
  liegenschaftId: string;
  wohnung?: Wohnung;
  vorOrt: KontaktVorOrt;
  rechnung?: Rechnungsempfaenger;
  geraet: GeraetEntwurf;
  fehler?: string | number;
  teile?: readonly TeilEntwurf[];
  dauerMin: Minuten;
  notiz?: string;
}

function mieter(name: string, telefon: string): KontaktVorOrt {
  return { rolle: 'Mieter', name, telefon };
}

function wohnung(nummer: string, lage: string): Wohnung {
  return { nummer, lage };
}

function laterBy(start: IsoZeitpunkt, minuten: Minuten): IsoZeitpunkt {
  const { datum, minuten: basis } = splitZeitpunkt(start);
  return toZeitpunkt(datum, Math.min(basis + minuten, 23 * 60 + 59));
}

function findLiegenschaft(id: string): Liegenschaft {
  const liegenschaft = LIEGENSCHAFTEN.find((kandidat) => kandidat.id === id);
  if (!liegenschaft) throw new Error(`Mock: Liegenschaft ${id} fehlt`);
  return liegenschaft;
}

// ── §2 · Entwürfe ────────────────────────────────────────────────

const ENTWUERFE: readonly AuftragEntwurf[] = [
  // ·· heute · MB Marco Brunner
  {
    id: 'A01', nummer: '26-04788', angefragt: zeitpunkt(-2, '09:14'), liegenschaftId: 'L01',
    wohnung: wohnung('W 2.03', '3½-Zi · 2. OG links'), vorOrt: mieter('Lea Hofstetter', '079 381 22 64'),
    geraet: { key: 'miele-wm', sn: '1029-4471', baujahr: 2021 }, teile: [[0, 'bestellt', tag(4)]], dauerMin: 90,
    notiz: 'Laugenpumpe blockiert, Fremdkörper entfernt – Pumpe defekt, bestellt.',
  },
  {
    id: 'A02', nummer: '26-04801', angefragt: zeitpunkt(-1, '08:02'), liegenschaftId: 'L02',
    wohnung: wohnung('W C.14', '4½-Zi · 1. OG'), vorOrt: mieter('Martin Suter', '076 210 48 19'),
    geraet: { key: 'vzug-gs', sn: '4421-8810', baujahr: 2018 }, dauerMin: 60,
  },
  {
    id: 'A03', nummer: '26-04805', kanal: 'E-Mail', angefragt: zeitpunkt(-1, '11:30'), liegenschaftId: 'L10',
    vorOrt: { rolle: 'Eigentümer', name: 'Andrea Weber', telefon: '079 512 33 08' },
    geraet: { key: 'vzug-st', sn: '7730-1185', baujahr: 2020 }, dauerMin: 60,
  },
  {
    id: 'A04', nummer: '26-04807', angefragt: zeitpunkt(-1, '13:48'), liegenschaftId: 'L13',
    wohnung: wohnung('W 1.01', '2½-Zi · 1. OG rechts'), vorOrt: mieter('Yusuf Aydin', '078 447 90 31'),
    geraet: { key: 'miele-tr', sn: '2204-6618', baujahr: 2022 }, teile: [[0, 'ab-lager']], dauerMin: 90,
  },
  {
    id: 'A05', nummer: '26-04810', kanal: 'Portal', angefragt: zeitpunkt(-1, '15:20'), liegenschaftId: 'L12',
    vorOrt: { rolle: 'Betrieb', name: 'Simone Frey, Kitaleitung', telefon: '044 877 20 60' },
    geraet: { key: 'miele-gs', sn: '3318-0927', baujahr: 2019 }, dauerMin: 60,
  },
  // ·· heute · SK Sandra Keller
  {
    id: 'A06', nummer: '26-04792', angefragt: zeitpunkt(-2, '14:05'), liegenschaftId: 'L05',
    wohnung: wohnung('W 3.02', '4½-Zi · 3. OG'), vorOrt: mieter('Arben Rexhepi', '076 334 81 57'),
    geraet: { key: 'elux-gs', sn: '5106-2290', baujahr: 2016 }, teile: [[0, 'ab-lager']], dauerMin: 60,
  },
  {
    id: 'A07', nummer: '26-04811', dringlichkeit: 'hoch', angefragt: zeitpunkt(-1, '16:12'), liegenschaftId: 'L06',
    wohnung: wohnung('W 0.01', '3½-Zi · EG'), vorOrt: mieter('Claudia Brändli', '079 718 06 42'),
    geraet: { key: 'siemens-wm', sn: '8842-3307', baujahr: 2020 }, dauerMin: 90,
  },
  {
    id: 'A08', nummer: '26-04796', dringlichkeit: 'tief', kanal: 'Portal', angefragt: zeitpunkt(-2, '17:40'),
    liegenschaftId: 'L05', wohnung: wohnung('W 1.04', '2½-Zi · 1. OG'), vorOrt: mieter('Hans Ruckstuhl', '044 302 77 18'),
    geraet: { key: 'elux-bo', sn: '6631-0458', baujahr: 2015 }, teile: [[1, 'ab-lager']], dauerMin: 30,
  },
  {
    id: 'A09', nummer: '26-04802', angefragt: zeitpunkt(-1, '08:44'), liegenschaftId: 'L09',
    wohnung: wohnung('W 2.02', '3½-Zi · 2. OG'), vorOrt: mieter('Sven Lüthi', '078 260 13 95'),
    rechnung: { art: 'mieter', grund: 'Scharnierbruch – Mieterschaden gem. Verwaltung' },
    geraet: { key: 'siemens-gs', sn: '9015-7742', baujahr: 2021 }, teile: [[1, 'ab-lager']], dauerMin: 90,
  },
  {
    id: 'A10', nummer: '26-04814', dringlichkeit: 'hoch', angefragt: zeitpunkt(0, '07:05'), liegenschaftId: 'L14',
    wohnung: wohnung('W 4.03', '3½-Zi · 4. OG'), vorOrt: mieter('Elena Rossi', '076 812 55 20'),
    geraet: { key: 'elux-ks', sn: '1140-8863', baujahr: 2017 }, dauerMin: 60,
  },
  // ·· heute · DM Dragan Marković
  {
    id: 'A11', nummer: '26-04813', dringlichkeit: 'notfall', angefragt: zeitpunkt(0, '06:48'), bestelltNach: 6,
    liegenschaftId: 'L03', wohnung: wohnung('W 2.01', '4½-Zi · 2. OG links'), vorOrt: mieter('Thomas Gerber', '079 903 41 77'),
    geraet: { key: 'lh-ks', sn: '3047-5512', baujahr: 2023, garantieBis: tag(240) }, dauerMin: 90,
  },
  {
    id: 'A12', nummer: '26-04798', angefragt: zeitpunkt(-2, '10:26'), liegenschaftId: 'L04',
    wohnung: wohnung('W B.21', '3½-Zi · Haus B, 2. OG'), vorOrt: mieter('Fatma Yilmaz', '078 155 62 09'),
    geraet: { key: 'elux-bo', sn: '6629-3014', baujahr: 2015 }, fehler: 1, teile: [[0, 'ab-lager']], dauerMin: 60,
  },
  {
    id: 'A13', nummer: '26-04794', art: 'Garantie', angefragt: zeitpunkt(-2, '16:02'), liegenschaftId: 'L11',
    vorOrt: { rolle: 'Eigentümer', name: 'Peter Baumgartner', telefon: '078 640 19 72' },
    rechnung: { art: 'garantie', marke: 'Liebherr', fallNummer: 'LH-GA-778120' },
    geraet: { key: 'lh-gf', sn: '5520-1176', baujahr: 2024, garantieBis: tag(410) }, teile: [[0, 'eingetroffen', tag(-1)]],
    dauerMin: 30,
  },
  {
    id: 'A14', nummer: '26-04771', art: 'Montage', kanal: 'E-Mail', angefragt: zeitpunkt(-6, '09:40'), bestelltNach: 1440,
    liegenschaftId: 'L04', wohnung: wohnung('W A.02', '4½-Zi · Haus A, EG'), vorOrt: mieter('Ivan Petrović', '076 470 28 83'),
    geraet: { key: 'lh-kg', sn: '6012-4408', baujahr: 2026, garantieBis: tag(730) }, dauerMin: 120,
    notiz: 'Neugerät ab Lager, Altgerät zur Entsorgung mitnehmen.',
  },
  {
    id: 'A15', nummer: '26-04752', art: 'Service', dringlichkeit: 'tief', kanal: 'E-Mail', angefragt: zeitpunkt(-12, '10:00'),
    liegenschaftId: 'L03', wohnung: wohnung('Waschküche', 'UG · Gemeinschaftsraum'),
    vorOrt: { rolle: 'Hauswart', name: 'Kurt Meier', telefon: '078 711 05 90' },
    geraet: { key: 'miele-wm', sn: '1011-2093', baujahr: 2019 }, fehler: 'Jahreswartung Waschturm (Abo)', dauerMin: 60,
  },
  // ·· heute · LF Luca Frei
  {
    id: 'A16', nummer: '26-04799', angefragt: zeitpunkt(-2, '11:52'), liegenschaftId: 'L07',
    wohnung: wohnung('W 1.02', '3½-Zi · 1. OG'), vorOrt: mieter('Laura Bachmann', '079 466 30 12'),
    geraet: { key: 'vzug-wm', sn: '4471-0326', baujahr: 2019 }, fehler: 1, dauerMin: 60,
  },
  {
    id: 'A17', nummer: '26-04803', angefragt: zeitpunkt(-1, '09:31'), liegenschaftId: 'L08',
    wohnung: wohnung('W 3.01', '5½-Zi · Attika'), vorOrt: mieter('Daniel Kunz', '076 905 17 44'),
    geraet: { key: 'vzug-bo', sn: '2290-6614', baujahr: 2014 }, teile: [[0, 'ab-lager']], dauerMin: 90,
  },
  {
    id: 'A18', nummer: '26-04806', angefragt: zeitpunkt(-1, '12:10'), liegenschaftId: 'L01',
    wohnung: wohnung('W 4.01', '2½-Zi · 4. OG'), vorOrt: mieter('Marc Odermatt', '078 333 90 61'),
    geraet: { key: 'asko-wm', sn: '8801-3345', baujahr: 2017 }, dauerMin: 60,
  },
  {
    id: 'A19', nummer: '26-04808', kanal: 'Portal', angefragt: zeitpunkt(-1, '14:22'), liegenschaftId: 'L02',
    wohnung: wohnung('W C.07', '3½-Zi · 2. OG'), vorOrt: mieter('Sabine Wyss', '079 127 84 50'),
    geraet: { key: 'vzug-kf', sn: '5590-0071', baujahr: 2018 }, dauerMin: 60,
  },
  {
    id: 'A20', nummer: '26-04809', angefragt: zeitpunkt(-1, '14:58'), liegenschaftId: 'L15',
    wohnung: wohnung('W 2.04', '3½-Zi · 2. OG rechts'), vorOrt: mieter('Patrick Sommer', '076 641 03 28'),
    geraet: { key: 'vzug-tr', sn: '4475-9902', baujahr: 2020 }, teile: [[0, 'ab-lager']], dauerMin: 90,
  },
  // ·· heute · RH Reto Huber
  {
    id: 'A21', nummer: '26-04800', angefragt: zeitpunkt(-1, '07:38'), liegenschaftId: 'L03',
    wohnung: wohnung('W 1.02', '3½-Zi · 1. OG rechts'), vorOrt: mieter('Nicole Imhof', '078 812 47 36'),
    geraet: { key: 'miele-gs', sn: '3320-1458', baujahr: 2020 }, fehler: 1, dauerMin: 60,
  },
  {
    id: 'A22', nummer: '26-04804', angefragt: zeitpunkt(-1, '10:05'), liegenschaftId: 'L04',
    wohnung: wohnung('W B.05', '4½-Zi · Haus B, EG'), vorOrt: mieter('Lukas Tanner', '079 554 19 03'),
    geraet: { key: 'siemens-wm', sn: '8839-1270', baujahr: 2019 }, fehler: 1, teile: [[0, 'ab-lager']], dauerMin: 90,
  },
  {
    id: 'A23', nummer: '26-04812', angefragt: zeitpunkt(-1, '17:02'), liegenschaftId: 'L13',
    wohnung: wohnung('W 3.02', '3½-Zi · 3. OG'), vorOrt: mieter('Mirjam Kälin', '076 228 64 71'),
    geraet: { key: 'miele-bo', sn: '1907-5536', baujahr: 2018 }, dauerMin: 60,
  },
  {
    id: 'A24', nummer: '26-04797', kanal: 'Portal', angefragt: zeitpunkt(-2, '08:15'), liegenschaftId: 'L03',
    wohnung: wohnung('W 3.03', '2½-Zi · 3. OG'), vorOrt: mieter('Ramona Signer', '079 690 25 84'),
    geraet: { key: 'siemens-bo', sn: '7713-4029', baujahr: 2021 }, teile: [[0, 'ab-lager']], dauerMin: 60,
  },
  // ·· heute · NA Nadine Ammann
  {
    id: 'A25', nummer: '26-04790', angefragt: zeitpunkt(-2, '12:44'), liegenschaftId: 'L06',
    wohnung: wohnung('W 1.01', '4½-Zi · 1. OG'), vorOrt: mieter('Roger Egli', '078 402 66 18'),
    geraet: { key: 'vzug-wm', sn: '4468-2207', baujahr: 2016 }, teile: [[0, 'unterwegs', tag(2)]], dauerMin: 90,
    notiz: 'Laugenpumpe verschlissen, Ersatz bei V-ZUG bestellt. Mieterin nutzt Waschküche Haus 2.',
  },
  {
    id: 'A26', nummer: '26-04795', angefragt: zeitpunkt(-2, '16:30'), liegenschaftId: 'L05',
    wohnung: wohnung('W 2.05', '3½-Zi · 2. OG'), vorOrt: mieter('Monika Steiner', '044 301 92 40'),
    geraet: { key: 'vzug-st', sn: '7728-6093', baujahr: 2017 }, fehler: 1, dauerMin: 30,
  },
  {
    id: 'A27', nummer: '26-04793', angefragt: zeitpunkt(-2, '15:11'), liegenschaftId: 'L06',
    wohnung: wohnung('W 2.03', '3½-Zi · 2. OG'), vorOrt: mieter('Stefan Graf', '076 117 40 85'),
    geraet: { key: 'elux-wm', sn: '5203-8841', baujahr: 2018 }, teile: [[0, 'ab-lager']], dauerMin: 90,
  },
  {
    id: 'A28', nummer: '26-04815', angefragt: zeitpunkt(0, '07:20'), liegenschaftId: 'L07',
    wohnung: wohnung('W 2.01', '4½-Zi · 2. OG'), vorOrt: mieter('Anna Lehmann', '079 845 31 26'),
    geraet: { key: 'elux-gs', sn: '5111-0634', baujahr: 2019 }, fehler: 1, dauerMin: 90,
  },
  // ·· gestern · SK – wartet auf Heizpumpe, Folgetermin offen
  {
    id: 'A30', nummer: '26-04779', angefragt: zeitpunkt(-3, '10:18'), liegenschaftId: 'L09',
    wohnung: wohnung('W 1.03', '4½-Zi · 1. OG'), vorOrt: mieter('Beat Zwahlen', '078 529 70 14'),
    geraet: { key: 'siemens-gs', sn: '9011-2286', baujahr: 2019 }, fehler: 1, teile: [[0, 'eingetroffen', tag(0)]],
    dauerMin: 60, notiz: 'Heizpumpe defekt (Fehler E09). Teil heute eingetroffen, Einbau ca. 45 min.',
  },
  // ·· Eingang – noch nicht disponiert
  {
    id: 'A31', nummer: '26-04817', dringlichkeit: 'notfall', angefragt: zeitpunkt(0, '07:42'), bestelltNach: 8,
    liegenschaftId: 'L03', wohnung: wohnung('W 3.01', '3½-Zi · 3. OG links'), vorOrt: mieter('Sarah Brunold', '079 233 58 40'),
    geraet: { key: 'lh-ks', sn: '3051-0938', baujahr: 2022 }, fehler: 'Kühlt nicht mehr, Lebensmittel verdorben',
    dauerMin: 60, notiz: 'Mieterin mit Säugling – heute noch, bitte vorher anrufen.',
  },
  {
    id: 'A32', nummer: '26-04818', dringlichkeit: 'hoch', kanal: 'Portal', angefragt: zeitpunkt(0, '08:15'), bestelltNach: 25,
    liegenschaftId: 'L02', wohnung: wohnung('W C.03', '2½-Zi · EG'), vorOrt: mieter('Kevin Baumann', '076 593 12 77'),
    geraet: { key: 'miele-wm', sn: '1033-7819', baujahr: 2022 }, fehler: 2, dauerMin: 60,
  },
  {
    id: 'A33', nummer: '26-04816', dringlichkeit: 'hoch', kanal: 'E-Mail', angefragt: zeitpunkt(-1, '16:40'), bestelltNach: 25,
    liegenschaftId: 'L05', wohnung: wohnung('W 0.03', '3½-Zi · EG'), vorOrt: mieter('Gabriela Meier', '044 302 18 63'),
    geraet: { key: 'elux-kf', sn: '6702-4417', baujahr: 2016 }, dauerMin: 60,
  },
  {
    id: 'A34', nummer: '26-04789', angefragt: zeitpunkt(-1, '10:12'), liegenschaftId: 'L07',
    wohnung: wohnung('W 3.02', '3½-Zi · 3. OG'), vorOrt: mieter('Jonas Wälti', '078 671 09 92'),
    geraet: { key: 'vzug-gs', sn: '4426-3381', baujahr: 2019 }, fehler: 1, dauerMin: 60,
  },
  {
    id: 'A35', nummer: '26-04784', art: 'Montage', kanal: 'E-Mail', angefragt: zeitpunkt(-2, '14:30'), bestelltNach: 1200,
    liegenschaftId: 'L10', vorOrt: { rolle: 'Eigentümer', name: 'Markus Weber', telefon: '079 512 33 09' },
    geraet: { key: 'siemens-gs', sn: '9030-0154', baujahr: 2026, garantieBis: tag(730) },
    fehler: 'Lieferung & Montage Ersatz-Geschirrspüler, Altgerät entsorgen', dauerMin: 120,
  },
  {
    id: 'A36', nummer: '26-04791', angefragt: zeitpunkt(-1, '09:20'), liegenschaftId: 'L13',
    wohnung: wohnung('W 2.04', '4½-Zi · 2. OG'), vorOrt: mieter('Nadia Haller', '076 380 45 16'),
    geraet: { key: 'asko-tr', sn: '8815-6630', baujahr: 2018 }, dauerMin: 60,
  },
  {
    id: 'A37', nummer: '26-04761', art: 'Service', dringlichkeit: 'tief', kanal: 'E-Mail', angefragt: zeitpunkt(-5, '11:00'),
    liegenschaftId: 'L04', wohnung: wohnung('Waschküche', 'Haus A · UG'),
    vorOrt: { rolle: 'Hauswart', name: 'Hauswartung Hohrainli', telefon: '044 813 70 29' },
    geraet: { key: 'miele-tr', sn: '2198-4405', baujahr: 2020 }, fehler: 'Jahreswartung Waschküche (Waschturm, 2 Geräte)',
    dauerMin: 90,
  },
  {
    id: 'A38', nummer: '26-04786', art: 'Abklärung', dringlichkeit: 'tief', angefragt: zeitpunkt(-2, '15:10'), bestelltNach: null,
    liegenschaftId: 'L08', wohnung: wohnung('W 1.01', '3½-Zi · 1. OG'), vorOrt: mieter('Ruth Kessler', '044 830 21 77'),
    geraet: { key: 'vzug-bo', sn: '2101-7745', baujahr: 2009 }, fehler: 'Offerte Ersatz Backofen – Gerät 17-jährig',
    dauerMin: 30, notiz: 'Verwaltung entscheidet nach Offerte über Ersatz.',
  },
  {
    id: 'A39', nummer: '26-04819', art: 'Mietgerät', angefragt: zeitpunkt(0, '08:52'), bestelltNach: 10, liegenschaftId: 'L01',
    wohnung: wohnung('W 2.03', '3½-Zi · 2. OG links'), vorOrt: mieter('Lea Hofstetter', '079 381 22 64'),
    geraet: { key: 'miele-wm', sn: 'MIET-0417', baujahr: 2023 },
    fehler: 'Ersatz-Waschmaschine (Mietgerät) bis zur Reparatur 26-04788 stellen', dauerMin: 60,
    notiz: 'Verwaltung übernimmt Miete. Gerät MIET-0417 ab Lager.',
  },
  {
    id: 'A40', nummer: '26-04782', art: 'Malerarbeiten', dringlichkeit: 'tief', kanal: 'E-Mail', angefragt: zeitpunkt(-3, '09:05'),
    bestelltNach: 2000, liegenschaftId: 'L06', wohnung: wohnung('W 1.01', '4½-Zi · 1. OG'), vorOrt: mieter('Roger Egli', '078 402 66 18'),
    geraet: { key: 'vzug-wm', sn: '4468-2207', baujahr: 2016 },
    fehler: 'Malerarbeiten Küchenwand nach Wasserschaden (Offerte 26-O-118 bewilligt)', dauerMin: 180,
    notiz: 'Erst nach Pumpentausch 26-04790. Farbton gemäss Verwaltung NCS S 0502-Y.',
  },
  {
    id: 'A41', nummer: '26-04820', art: 'Lieferung', kanal: 'Telefon', angefragt: zeitpunkt(0, '09:30'), bestelltNach: 15,
    liegenschaftId: 'L14', wohnung: wohnung('W 4.03', '3½-Zi · 4. OG'), vorOrt: mieter('Elena Rossi', '076 812 55 20'),
    geraet: { key: 'lh-ks', sn: '3066-2211', baujahr: 2026, garantieBis: tag(730) },
    fehler: 'Lieferung Kühlschrank Liebherr IRBd 5150, Anschluss, Altgerät entsorgen', dauerMin: 90,
    notiz: 'Ersatz für 26-04814 (Kompressor defekt, Reparatur unwirtschaftlich).',
  },
];

// jh? Nummernkreis: Auftragsnummer «26-04817» pro Jahr fortlaufend – wie bei Sutt heute?

// ── §3 · Aufbau ──────────────────────────────────────────────────

function buildAuftrag(entwurf: AuftragEntwurf): { auftrag: Auftrag; geraet: Geraet } {
  const liegenschaft = findLiegenschaft(entwurf.liegenschaftId);
  const geraet = buildGeraet(entwurf.geraet.key, {
    id: `G-${entwurf.id}`,
    seriennummer: entwurf.geraet.sn,
    baujahr: entwurf.geraet.baujahr,
    ...(entwurf.geraet.garantieBis ? { garantieBis: entwurf.geraet.garantieBis } : {}),
  });

  const art = entwurf.art ?? 'Reparatur';
  const dringlichkeit = entwurf.dringlichkeit ?? 'normal';
  const fehlerbild =
    typeof entwurf.fehler === 'string' ? entwurf.fehler : fehlerbildOf(entwurf.geraet.key, entwurf.fehler ?? 0);
  const rechnung: Rechnungsempfaenger = entwurf.rechnung ?? {
    art: 'auftraggeber',
    ...(liegenschaft.objektNummer ? { referenz: `Objekt ${liegenschaft.objektNummer}` } : {}),
  };
  const bestelltNach = entwurf.bestelltNach === undefined ? 35 : entwurf.bestelltNach;

  const auftrag: Auftrag = {
    id: entwurf.id,
    nummer: entwurf.nummer,
    art,
    kategorie: entwurf.kategorie ?? kategorieFor(art, dringlichkeit),
    dringlichkeit,
    fehlerbild,
    kanal: entwurf.kanal ?? 'Telefon',
    angefragtAm: entwurf.angefragt,
    ...(bestelltNach === null ? {} : { bestelltAm: laterBy(entwurf.angefragt, bestelltNach) }),
    kundeId: liegenschaft.kundeId,
    liegenschaftId: liegenschaft.id,
    ...(entwurf.wohnung ? { wohnung: entwurf.wohnung } : {}),
    kontaktVorOrt: entwurf.vorOrt,
    rechnung,
    geraetId: geraet.id,
    ersatzteile: (entwurf.teile ?? []).map(([index, status, liefertermin]) =>
      buildTeil(entwurf.geraet.key, index, status, liefertermin),
    ),
    fotos: [],
    rapport: 'offen',
    rechnungStatus: 'offen',
    dauerMin: entwurf.dauerMin,
    ...(entwurf.notiz ? { notiz: entwurf.notiz } : {}),
  };
  return { auftrag, geraet };
}

const AUFGEBAUT = ENTWUERFE.map(buildAuftrag);

export const HAND_AUFTRAEGE: readonly Auftrag[] = AUFGEBAUT.map((eintrag) => eintrag.auftrag);
export const HAND_GERAETE: readonly Geraet[] = AUFGEBAUT.map((eintrag) => eintrag.geraet);

/* ◆ jh · eof */
