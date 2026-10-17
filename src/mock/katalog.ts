/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/katalog.ts                                    │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Gerätekatalog: Modelle, typische Fehlerbilder, Ersatzteile            │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum } from '../core/datum';
import type { Ersatzteil, TeilStatus } from '../core/domain/auftrag';
import type { Geraet, Geraeteart, Marke } from '../core/domain/stammdaten';

// ── §1 · Typen ───────────────────────────────────────────────────

interface TeilVorlage {
  artikelNummer: string;
  bezeichnung: string;
  preisChf: number;
}

interface GeraeteVorlage {
  marke: Marke;
  art: Geraeteart;
  modell: string;
  typNummer: string;
  fehlerbilder: readonly string[];
  teile: readonly TeilVorlage[];
}

// jh! Modell- und Artikelnummern sind plausibel, aber erfunden – nicht bestellen.

// ── §2 · Katalog ─────────────────────────────────────────────────

export const KATALOG = {
  'miele-wm': {
    marke: 'Miele', art: 'Waschmaschine', modell: 'W1 WWD 120 WCS', typNummer: 'WWD120',
    fehlerbilder: ['Pumpt nicht ab, Fehler F18', 'Türe bleibt nach Programmende verriegelt', 'Läuft beim Abpumpen aus'],
    teile: [
      { artikelNummer: '11380960', bezeichnung: 'Laugenpumpe', preisChf: 92.4 },
      { artikelNummer: '10780350', bezeichnung: 'Türverriegelung', preisChf: 54.2 },
    ],
  },
  'miele-tr': {
    marke: 'Miele', art: 'Wärmepumpentrockner', modell: 'T1 TWD 360 WP', typNummer: 'TWD360',
    fehlerbilder: ['Trocknet nicht mehr, Fehler F49', 'Flusensieb-Meldung erlischt nicht'],
    teile: [
      { artikelNummer: '09215210', bezeichnung: 'NTC-Temperaturfühler', preisChf: 28.9 },
      { artikelNummer: '09733420', bezeichnung: 'Kondenswasserpumpe', preisChf: 74.6 },
    ],
  },
  'miele-gs': {
    marke: 'Miele', art: 'Geschirrspüler', modell: 'G 7310 SCi', typNummer: 'G7310',
    fehlerbilder: ['Spült nicht sauber, Sprüharm blockiert', 'Zeigt Fehler F70 (Wasserschutz)'],
    teile: [
      { artikelNummer: '11051320', bezeichnung: 'Umwälzpumpe', preisChf: 168 },
      { artikelNummer: '10522470', bezeichnung: 'Sprüharm oben', preisChf: 39.9 },
    ],
  },
  'miele-bo': {
    marke: 'Miele', art: 'Backofen', modell: 'H 2465 B', typNummer: 'H2465B',
    fehlerbilder: ['Gebläse laut, heizt ungleichmässig', 'Heizt nicht mehr'],
    teile: [{ artikelNummer: '09877810', bezeichnung: 'Ringheizkörper', preisChf: 118 }],
  },
  'vzug-wm': {
    marke: 'V-ZUG', art: 'Waschmaschine', modell: 'AdoraWaschen V4000', typNummer: 'AWV4T-11165',
    fehlerbilder: ['Pumpt nicht ab', 'Türe lässt sich nach Programmende nicht öffnen', 'Schleudert nicht, Unwucht'],
    teile: [
      { artikelNummer: '1037548', bezeichnung: 'Laugenpumpe', preisChf: 96.8 },
      { artikelNummer: '1029417', bezeichnung: 'Türschloss', preisChf: 61.5 },
    ],
  },
  'vzug-tr': {
    marke: 'V-ZUG', art: 'Wärmepumpentrockner', modell: 'AdoraTrocknen V4000', typNummer: 'ATV4T-11207',
    fehlerbilder: ['Kondenswasserbehälter läuft über', 'Trocknet nicht, Fehler E 41'],
    teile: [{ artikelNummer: '1041132', bezeichnung: 'Kondenswasserpumpe', preisChf: 82 }],
  },
  'vzug-gs': {
    marke: 'V-ZUG', art: 'Geschirrspüler', modell: 'AdoraSpülen V2000', typNummer: 'ASV2T-41123',
    fehlerbilder: ['Fehler E15 – Wasser in der Bodenwanne', 'Spült nicht sauber, Klarspüler-Anzeige blinkt'],
    teile: [
      { artikelNummer: '1031207', bezeichnung: 'Aquastop-Schlauch', preisChf: 89 },
      { artikelNummer: '1040883', bezeichnung: 'Heizpumpe', preisChf: 214.5 },
    ],
  },
  'vzug-st': {
    marke: 'V-ZUG', art: 'Steamer', modell: 'CombiSteam V4000', typNummer: 'CSTV4-21067',
    fehlerbilder: ['Entkalkungsmeldung lässt sich nicht quittieren', 'Kein Dampf, Wassertank wird nicht erkannt'],
    teile: [
      { artikelNummer: '1039560', bezeichnung: 'Wassertank-Sensor', preisChf: 64 },
      { artikelNummer: '1035872', bezeichnung: 'Dampferzeuger', preisChf: 312 },
    ],
  },
  'vzug-bo': {
    marke: 'V-ZUG', art: 'Backofen', modell: 'Combair V4000', typNummer: 'BCV4T-21052',
    fehlerbilder: ['Heizt nicht mehr, Display zeigt «F 31»', 'Backofentür schliesst nicht bündig'],
    teile: [{ artikelNummer: '1027331', bezeichnung: 'Heizelement Oberhitze', preisChf: 104 }],
  },
  'vzug-kf': {
    marke: 'V-ZUG', art: 'Kochfeld', modell: 'CookTop V4000 I804', typNummer: 'CTI4T-31188',
    fehlerbilder: ['Kochzone hinten links ohne Funktion'],
    teile: [{ artikelNummer: '1036114', bezeichnung: 'Induktionsspule 210 mm', preisChf: 186 }],
  },
  'elux-wm': {
    marke: 'Electrolux', art: 'Waschmaschine', modell: 'WASL6E300', typNummer: '914 550 642',
    fehlerbilder: ['Schleudert nicht, Unwucht-Meldung', 'Läuft unten aus'],
    teile: [{ artikelNummer: '140 128 7512', bezeichnung: 'Stossdämpfer (Paar)', preisChf: 46.8 }],
  },
  'elux-gs': {
    marke: 'Electrolux', art: 'Geschirrspüler', modell: 'GA60SLVS', typNummer: '911 438 351',
    fehlerbilder: ['Heizt nicht, Geschirr bleibt kalt', 'Spült nicht sauber, Wasser bleibt stehen'],
    teile: [
      { artikelNummer: '140 218 1052', bezeichnung: 'Heizpumpe', preisChf: 196 },
      { artikelNummer: '140 000 4434', bezeichnung: 'Ablaufpumpe', preisChf: 58.4 },
    ],
  },
  'elux-bo': {
    marke: 'Electrolux', art: 'Backofen', modell: 'EB6SL70SP', typNummer: '944 188 471',
    fehlerbilder: ['Backofenlicht ohne Funktion', 'Heizt nicht mehr (Unterhitze)'],
    teile: [
      { artikelNummer: '387 080 3017', bezeichnung: 'Heizelement Unterhitze', preisChf: 96.3 },
      { artikelNummer: '387 900 6224', bezeichnung: 'Backofenlampe 25 W', preisChf: 12.8 },
    ],
  },
  'elux-kf': {
    marke: 'Electrolux', art: 'Kochfeld', modell: 'GK58TSO', typNummer: '949 597 210',
    fehlerbilder: ['Sicherung fliegt beim Einschalten raus'],
    teile: [{ artikelNummer: '140 038 1125', bezeichnung: 'Bedieneinheit', preisChf: 248 }],
  },
  'elux-ks': {
    marke: 'Electrolux', art: 'Kühlschrank', modell: 'IK2805SZR', typNummer: '925 052 133',
    fehlerbilder: ['Kühlt nicht mehr, Innenraum 14 °C', 'Vereist an der Rückwand'],
    teile: [{ artikelNummer: '242 202 9032', bezeichnung: 'Ventilator Verdampfer', preisChf: 58 }],
  },
  'siemens-wm': {
    marke: 'Siemens', art: 'Waschmaschine', modell: 'iQ700 WM14VG43CH', typNummer: 'WM14VG43CH/01',
    fehlerbilder: ['Läuft unten aus, Wasser am Boden', 'Trommel dreht nicht, lautes Brummen'],
    teile: [
      { artikelNummer: '00154740', bezeichnung: 'Kohlebürsten-Set', preisChf: 38.5 },
      { artikelNummer: '00772658', bezeichnung: 'Türmanschette', preisChf: 68 },
    ],
  },
  'siemens-gs': {
    marke: 'Siemens', art: 'Geschirrspüler', modell: 'iQ500 SN65ZX49CE', typNummer: 'SN65ZX49CE/14',
    fehlerbilder: ['Tür schliesst nicht mehr, Scharnier gebrochen', 'Heizt nicht'],
    teile: [
      { artikelNummer: '12019637', bezeichnung: 'Heizpumpe', preisChf: 228 },
      { artikelNummer: '00754866', bezeichnung: 'Scharnier-Set', preisChf: 44.9 },
    ],
  },
  'siemens-bo': {
    marke: 'Siemens', art: 'Backofen', modell: 'iQ700 HB676G0S1', typNummer: 'HB676G0S1/58',
    fehlerbilder: ['Backofentür schliesst nicht, Dichtung lose'],
    teile: [{ artikelNummer: '00747302', bezeichnung: 'Backofendichtung', preisChf: 42.5 }],
  },
  'lh-ks': {
    marke: 'Liebherr', art: 'Kühlschrank', modell: 'IRBd 5150 Peak', typNummer: 'IRBd 5150-20',
    fehlerbilder: ['Kühlt nicht, Lebensmittel bereits warm', 'Kühlt nicht mehr, Innenraum 12 °C'],
    teile: [
      { artikelNummer: '6113 422', bezeichnung: 'Steuerplatine', preisChf: 142 },
      { artikelNummer: '6118 112', bezeichnung: 'Ventilator', preisChf: 64 },
    ],
  },
  'lh-kg': {
    marke: 'Liebherr', art: 'Kühlschrank', modell: 'ICBNd 5163 Prime', typNummer: 'ICBNd 5163-20',
    fehlerbilder: ['Ersatz: Lieferung, Einbau, Entsorgung Altgerät'],
    teile: [],
  },
  'lh-gf': {
    marke: 'Liebherr', art: 'Gefrierschrank', modell: 'SIFNd 3556', typNummer: 'SIFNd 3556-20',
    fehlerbilder: ['Türdichtung eingerissen', 'Temperaturalarm, Verdampfer vereist'],
    teile: [{ artikelNummer: '7110 845', bezeichnung: 'Türdichtung', preisChf: 78 }],
  },
  'asko-wm': {
    marke: 'Asko', art: 'Waschmaschine', modell: 'W4086C.W/3', typNummer: 'W4086C.W/3',
    fehlerbilder: ['Schleudert nicht, Wäsche bleibt nass'],
    teile: [{ artikelNummer: '8085 233', bezeichnung: 'Motorkohlen', preisChf: 41.2 }],
  },
  'asko-tr': {
    marke: 'Asko', art: 'Wärmepumpentrockner', modell: 'T208H.W', typNummer: 'T208H.W/2',
    fehlerbilder: ['Flusensieb-Meldung erlischt nicht'],
    teile: [{ artikelNummer: '8076 112', bezeichnung: 'Flusensieb-Sensor', preisChf: 34 }],
  },
} as const satisfies Record<string, GeraeteVorlage>;

export type KatalogKey = keyof typeof KATALOG;

export const KATALOG_KEYS = Object.keys(KATALOG) as KatalogKey[];

// ── §3 · Bausteine ───────────────────────────────────────────────

interface GeraetAngaben {
  id: string;
  seriennummer: string;
  baujahr: number;
  garantieBis?: IsoDatum;
}

export function buildGeraet(key: KatalogKey, angaben: GeraetAngaben): Geraet {
  const vorlage: GeraeteVorlage = KATALOG[key];
  return {
    id: angaben.id,
    marke: vorlage.marke,
    art: vorlage.art,
    modell: vorlage.modell,
    typNummer: vorlage.typNummer,
    seriennummer: angaben.seriennummer,
    baujahr: angaben.baujahr,
    ...(angaben.garantieBis ? { garantieBis: angaben.garantieBis } : {}),
    historie: [],
  };
}

// jh› Ab Lager liefert das eigene Lager in Glattbrugg, alles andere der Hersteller.
export function buildTeil(key: KatalogKey, index: number, status: TeilStatus, liefertermin?: IsoDatum): Ersatzteil {
  const vorlage: GeraeteVorlage = KATALOG[key];
  const teil = vorlage.teile[index] ?? vorlage.teile[0];
  if (!teil) throw new Error(`Katalog ${key}: keine Ersatzteile hinterlegt`);
  return {
    ...teil,
    menge: 1,
    status,
    lieferant: status === 'ab-lager' ? 'Lager Sutt, Glattbrugg' : `${vorlage.marke} Ersatzteile`,
    ...(liefertermin ? { liefertermin } : {}),
  };
}

export function fehlerbildOf(key: KatalogKey, index = 0): string {
  const vorlage: GeraeteVorlage = KATALOG[key];
  return vorlage.fehlerbilder[index] ?? vorlage.fehlerbilder[0] ?? 'Störung gemäss Meldung';
}

export function hasTeile(key: KatalogKey): boolean {
  const vorlage: GeraeteVorlage = KATALOG[key];
  return vorlage.teile.length > 0;
}

/* ◆ jh · eof */
