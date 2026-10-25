/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/rapporte.ts                                   │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Statusverläufe und Servicerapporte für erledigte Einsätze (Saat)      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, daysBetween, toZeitpunkt } from '../core/datum';
import type { IsoDatum, IsoZeitpunkt, Minuten } from '../core/datum';
import type { Auftrag, Foto, FotoMotiv, RapportStatus } from '../core/domain/auftrag';
import { einsatzEnde } from '../core/domain/einsatz';
import type { Einsatz, StatusWechsel } from '../core/domain/einsatz';
import { arbeitenFor, diagnoseCodeOf, zeitenAusVerlauf } from '../core/domain/rapport';
import type { Rapport, RapportTeil, Unterschrift } from '../core/domain/rapport';
import type { Geraet, Techniker } from '../core/domain/stammdaten';
import { between, mulberry32, pick, seedFrom } from './generator';

// ── §1 · Bausteine ───────────────────────────────────────────────

// jh› Drei Unterschriften als SVG-Pfade (320 × 120) – erkennbar als Kritzel, nicht als Name.
const UNTERSCHRIFTEN: readonly string[] = [
  'M18 84 C 34 30, 52 96, 70 56 S 104 26, 122 64 C 140 98, 156 40, 176 58 S 222 94, 254 52 L 296 66',
  'M22 70 C 40 20, 58 110, 84 58 C 100 28, 108 90, 132 74 S 170 36, 190 70 C 206 96, 236 44, 262 62 L 300 54',
  'M16 90 C 28 40, 44 60, 60 46 S 90 102, 118 66 C 132 44, 150 84, 172 60 S 212 30, 240 76 C 254 94, 276 70, 302 58',
];

const MOTIVE: readonly FotoMotiv[] = ['typenschild', 'schaden', 'anschluss', 'einbau', 'uebersicht'];

const BEMERKUNGEN: readonly string[] = [
  'Probelauf i. O., Gerät übergeben.',
  'Gerät gereinigt, Kundin instruiert.',
  'Fehlerspeicher gelöscht, keine Auffälligkeiten.',
  'Dichtung erneuert, Probelauf ohne Befund.',
  'Anschluss geprüft, Abfluss war verstopft.',
  'Ersatzteil ab Fahrzeuglager eingebaut.',
];

// jh› Handverlesene Rapporte für die Demo: zwei mit Fotos und Unterschrift, einer mit Mangel.
const HAND_BEMERKUNG: Readonly<Record<string, string>> = {
  A02: 'Türverriegelung ersetzt, Probelauf i. O. Mieterin instruiert.',
  A11: 'Probelauf i. O. – Türgummi zeigt Risse, nachbestellen und beim nächsten Service ersetzen.',
  A30: 'Heizpumpe defekt (E09), Teil bestellt – Einbau nach Lieferung, ca. 45 min.',
};

interface RapportKontext {
  heute: IsoDatum;
  jetztMin: Minuten;
  auftraege: ReadonlyMap<string, Auftrag>;
  geraete: ReadonlyMap<string, Geraet>;
  techniker: readonly Techniker[];
}

// ── §2 · Verlauf ─────────────────────────────────────────────────

function wechsel(datum: IsoDatum, minuten: Minuten, status: StatusWechsel['status']): StatusWechsel {
  return { status, zeitpunkt: toZeitpunkt(datum, Math.max(6 * 60, minuten)), quelle: 'mock' };
}

// jh› Echte Zeiten statt Planzeiten: Abfahrt 15–40 min vor Termin, Ankunft ±10 min,
//     Fertig ±20 min – so sehen Rapportzeiten und Live-Puls glaubwürdig aus.
function verlaufFor(einsatz: Einsatz, zufall: () => number): StatusWechsel[] {
  const unterwegs = einsatz.startMin - between(zufall, 15, 40);
  const vorOrt = einsatz.startMin + between(zufall, -5, 10);
  const fertig = einsatzEnde(einsatz) + between(zufall, -10, 20);
  switch (einsatz.status) {
    case 'unterwegs':
      return [wechsel(einsatz.datum, unterwegs, 'unterwegs')];
    case 'vor-ort':
      return [wechsel(einsatz.datum, unterwegs, 'unterwegs'), wechsel(einsatz.datum, vorOrt, 'vor-ort')];
    case 'erledigt':
    case 'wartet-teil':
      return [wechsel(einsatz.datum, unterwegs, 'unterwegs'), wechsel(einsatz.datum, vorOrt, 'vor-ort'), wechsel(einsatz.datum, fertig, einsatz.status)];
    default:
      return [];
  }
}

// ── §3 · Rapport ─────────────────────────────────────────────────

function statusFor(einsatz: Einsatz, heute: IsoDatum, zufall: () => number): RapportStatus | null {
  if (einsatz.status === 'wartet-teil') return 'erstellt';
  const alter = daysBetween(einsatz.datum, heute);
  if (alter <= 0) {
    const wurf = zufall();
    if (wurf < 0.2) return null;
    return wurf < 0.75 ? 'erstellt' : 'unterschrieben';
  }
  // jh› Fehlende Rapporte nur aus den letzten drei Tagen – ältere hat das Büro längst eingefordert;
  //     sonst zählt der Konflikt-Wächter Dutzende Mahnungen und die Demo ertrinkt darin.
  const fehlt = zufall() < 0.12;
  if (fehlt && alter <= 3) return null;
  if (alter >= 5) return zufall() < 0.65 ? 'verrechnet' : 'freigegeben';
  if (alter >= 2) return zufall() < 0.8 ? 'unterschrieben' : 'erstellt';
  return zufall() < 0.6 ? 'unterschrieben' : 'erstellt';
}

function fotosFor(einsatz: Einsatz, kuerzel: string, vorOrt: IsoZeitpunkt, zufall: () => number): Foto[] {
  const anzahl = between(zufall, 1, 4);
  return Array.from({ length: anzahl }, (_, index) => ({
    id: `F-${einsatz.id}-${index + 1}`,
    motiv: MOTIVE[(index + between(zufall, 0, 1)) % MOTIVE.length] ?? 'uebersicht',
    aufgenommenAm: toZeitpunkt(einsatz.datum, Math.min(23 * 60 + 59, vorOrtMinuten(vorOrt) + 5 + index * 9)),
    technikerKuerzel: kuerzel,
  }));
}

function vorOrtMinuten(zeitpunkt: IsoZeitpunkt): Minuten {
  const [stunden = 0, minuten = 0] = zeitpunkt.slice(11).split(':').map(Number);
  return stunden * 60 + minuten;
}

function teileFor(auftrag: Auftrag): RapportTeil[] {
  return auftrag.ersatzteile.map((teil) => ({
    artikelNummer: teil.artikelNummer,
    bezeichnung: teil.bezeichnung,
    menge: teil.menge,
    verwendung: teil.status === 'ab-lager' ? 'fahrzeuglager' : teil.status === 'eingetroffen' ? 'eingebaut' : 'bestellen',
  }));
}

export function buildRapporte(kontext: RapportKontext, einsaetze: readonly Einsatz[]): { rapporte: Rapport[]; einsaetze: Einsatz[] } {
  const rapporte: Rapport[] = [];
  const mitVerlauf: Einsatz[] = [];
  const sortiert = [...einsaetze].sort((a, b) => a.datum.localeCompare(b.datum) || a.startMin - b.startMin);
  let laufnummer = 400;

  for (const einsatz of sortiert) {
    const zufall = mulberry32(seedFrom(`rapport·${einsatz.id}`));
    const verlauf = verlaufFor(einsatz, zufall);
    const einsatzMitVerlauf: Einsatz = verlauf.length > 0 ? { ...einsatz, verlauf, statusSeit: verlauf[verlauf.length - 1]?.zeitpunkt ?? einsatz.statusSeit } : einsatz;
    mitVerlauf.push(einsatzMitVerlauf);

    if (einsatz.status !== 'erledigt' && einsatz.status !== 'wartet-teil') continue;
    const auftrag = kontext.auftraege.get(einsatz.auftragId);
    const geraet = auftrag ? kontext.geraete.get(auftrag.geraetId) : undefined;
    const techniker = kontext.techniker.find((kandidat) => kandidat.id === einsatz.technikerId);
    if (!auftrag || !geraet || !techniker) continue;
    const status = HAND_BEMERKUNG[auftrag.id] && einsatz.status === 'erledigt' ? 'unterschrieben' : statusFor(einsatz, kontext.heute, zufall);
    if (!status) continue;

    laufnummer += 1;
    const vorOrt = verlauf.find((eintrag) => eintrag.status === 'vor-ort')?.zeitpunkt ?? toZeitpunkt(einsatz.datum, einsatz.startMin);
    const fertig = verlauf[verlauf.length - 1]?.zeitpunkt ?? toZeitpunkt(einsatz.datum, einsatzEnde(einsatz));
    const arbeiten = arbeitenFor(geraet.art).map((schritt, index) => ({ ...schritt, erledigt: index < between(zufall, 2, 5) }));
    const unterschrieben = status === 'unterschrieben' || status === 'freigegeben' || status === 'verrechnet';
    const unterschrift: Unterschrift | undefined = unterschrieben ? { name: auftrag.kontaktVorOrt.name, zeitpunkt: fertig, pfad: pick(zufall, UNTERSCHRIFTEN) } : undefined;
    const freigegebenAm = status === 'freigegeben' || status === 'verrechnet' ? toZeitpunkt(addDays(einsatz.datum, 1), 9 * 60 + between(zufall, 0, 50)) : undefined;
    const verrechnetAm = status === 'verrechnet' ? toZeitpunkt(addDays(einsatz.datum, 2), 10 * 60 + between(zufall, 0, 50)) : undefined;
    const diagnoseCode = diagnoseCodeOf(auftrag.fehlerbild);

    rapporte.push({
      id: `R-${einsatz.id}`,
      nummer: `R-26-${String(laufnummer).padStart(5, '0')}`,
      auftragId: auftrag.id,
      einsatzId: einsatz.id,
      technikerId: techniker.id,
      status,
      zeiten: zeitenAusVerlauf(einsatzMitVerlauf, kontext.jetztMin),
      arbeiten,
      ...(diagnoseCode ? { diagnoseCode } : {}),
      bemerkung: HAND_BEMERKUNG[auftrag.id] ?? pick(zufall, BEMERKUNGEN),
      teile: teileFor(auftrag),
      fotos: fotosFor(einsatz, techniker.kuerzel, vorOrt, zufall),
      abschluss: einsatz.status === 'wartet-teil' ? 'teil-bestellt' : 'erledigt',
      ...(unterschrift ? { unterschrift } : {}),
      erstelltAm: fertig,
      geaendertAm: verrechnetAm ?? freigegebenAm ?? fertig,
      ...(freigegebenAm ? { freigegebenAm } : {}),
      ...(verrechnetAm ? { verrechnetAm } : {}),
    });
  }

  return { rapporte, einsaetze: mitVerlauf };
}

/* ◆ jh · eof */
