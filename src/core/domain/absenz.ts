/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/absenz.ts                              │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Absenz: Arten, Antrag, Entscheid, Ferienkonto, maskierte Sicht        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays } from '../datum';
import type { IsoDatum, IsoZeitpunkt } from '../datum';
import { arbeitstageZwischen } from './feiertage';
import type { BetrieblicherFeiertag, Kanton } from './feiertage';
import { istAngestellt } from './personal';
import type { Mitarbeiter } from './personal';

// ── §1 · Arten ───────────────────────────────────────────────────

export type AbsenzArt = 'ferien' | 'krank' | 'unfall' | 'militaer' | 'schulung' | 'kompensation' | 'unbezahlt' | 'fahrzeugservice' | 'abwesend';

export const ABSENZ_ARTEN: readonly AbsenzArt[] = ['ferien', 'krank', 'unfall', 'militaer', 'schulung', 'kompensation', 'unbezahlt', 'fahrzeugservice'];

export interface AbsenzArtInfo {
  label: string;
  /** Lohnfortzahlung – der Tag zählt als Soll erfüllt. */
  bezahlt: boolean;
  /** Braucht einen Entscheid der/des Vorgesetzten. */
  genehmigung: boolean;
  /** Wird dem Ferienkonto belastet. */
  ferienkonto: boolean;
  /** Gesundheitsdaten im Sinne von DSG Art. 5 lit. c – nur mit Recht «personal:gesundheit» sichtbar. */
  gesundheit: boolean;
}

export const ABSENZ_INFO: Readonly<Record<AbsenzArt, AbsenzArtInfo>> = {
  ferien: { label: 'Ferien', bezahlt: true, genehmigung: true, ferienkonto: true, gesundheit: false },
  krank: { label: 'Krank', bezahlt: true, genehmigung: false, ferienkonto: false, gesundheit: true },
  unfall: { label: 'Unfall', bezahlt: true, genehmigung: false, ferienkonto: false, gesundheit: true },
  militaer: { label: 'Militär / Zivilschutz', bezahlt: true, genehmigung: false, ferienkonto: false, gesundheit: false },
  schulung: { label: 'Schulung', bezahlt: true, genehmigung: true, ferienkonto: false, gesundheit: false },
  kompensation: { label: 'Kompensation', bezahlt: true, genehmigung: true, ferienkonto: false, gesundheit: false },
  unbezahlt: { label: 'Unbezahlter Urlaub', bezahlt: false, genehmigung: true, ferienkonto: false, gesundheit: false },
  fahrzeugservice: { label: 'Fahrzeugservice', bezahlt: true, genehmigung: false, ferienkonto: false, gesundheit: false },
  abwesend: { label: 'Abwesend', bezahlt: true, genehmigung: false, ferienkonto: false, gesundheit: false },
};

export const ABSENZ_LABEL: Readonly<Record<AbsenzArt, string>> = Object.fromEntries(
  (Object.keys(ABSENZ_INFO) as AbsenzArt[]).map((art) => [art, ABSENZ_INFO[art].label]),
) as Record<AbsenzArt, string>;

export type AbsenzStatus = 'beantragt' | 'genehmigt' | 'abgelehnt';

export const ABSENZ_STATUS_LABEL: Readonly<Record<AbsenzStatus, string>> = {
  beantragt: 'Beantragt',
  genehmigt: 'Genehmigt',
  abgelehnt: 'Abgelehnt',
};

// ── §2 · Absenz ──────────────────────────────────────────────────

/** Ganztägige (oder halbtägige) Abwesenheit – blockiert die Zeile im Plan, erscheint im Kalender als Ganztag. */
export interface Absenz {
  id: string;
  mitarbeiterId: string;
  /** Zugehöriger Techniker im Plan, wenn die Person fährt. */
  technikerId?: string;
  von: IsoDatum;
  bis: IsoDatum;
  art: AbsenzArt;
  status: AbsenzStatus;
  /** Nur bei von = bis: ein halber Tag. */
  halberTag?: 'vormittag' | 'nachmittag';
  notiz?: string;
  beantragtAm?: IsoZeitpunkt;
  beantragtVon?: string;
  entschiedenAm?: IsoZeitpunkt;
  entschiedenVon?: string;
  entscheidGrund?: string;
  /** Arztzeugnis liegt vor (ab dem 3. Tag üblich) – Gesundheitsdatum. */
  arztzeugnis?: boolean;
}

/** Genehmigte Absenz eines Technikers an diesem Tag. */
export function isAbwesend(absenzen: readonly Absenz[], technikerId: string, datum: IsoDatum): Absenz | undefined {
  return absenzen.find((absenz) => absenz.status === 'genehmigt' && absenz.technikerId === technikerId && absenz.von <= datum && absenz.bis >= datum);
}

/** Genehmigte Absenz einer Mitarbeiterin / eines Mitarbeiters an diesem Tag. */
export function absenzAm(absenzen: readonly Absenz[], mitarbeiterId: string, datum: IsoDatum): Absenz | undefined {
  return absenzen.find((absenz) => absenz.status === 'genehmigt' && absenz.mitarbeiterId === mitarbeiterId && absenz.von <= datum && absenz.bis >= datum);
}

/** Belastete Arbeitstage (Wochenende und Feiertage zählen nicht, halber Tag = 0.5). */
export function absenzTage(absenz: Pick<Absenz, 'von' | 'bis' | 'halberTag'>, kanton: Kanton, betrieblich?: readonly BetrieblicherFeiertag[]): number {
  const tage = arbeitstageZwischen(absenz.von, absenz.bis, kanton, betrieblich);
  return absenz.halberTag && absenz.von === absenz.bis ? Math.min(tage, 0.5) : tage;
}

export function ueberschneidung(absenzen: readonly Absenz[], mitarbeiterId: string, von: IsoDatum, bis: IsoDatum, ausserId?: string): Absenz | undefined {
  return absenzen.find((absenz) => absenz.id !== ausserId && absenz.mitarbeiterId === mitarbeiterId && absenz.status !== 'abgelehnt' && absenz.von <= bis && absenz.bis >= von);
}

export function istGesundheitsdatum(absenz: Pick<Absenz, 'art'>): boolean {
  return ABSENZ_INFO[absenz.art].gesundheit;
}

// jh› Privacy by Design (DSG Art. 7): Wer kein Recht auf Gesundheitsdaten hat, sieht «Abwesend» –
//     Art, Notiz und Arztzeugnis verlassen das Personalmodul nicht. Die Plantafel braucht nur den Block.
export function absenzenFuerSicht(absenzen: readonly Absenz[], gesundheitSichtbar: boolean): readonly Absenz[] {
  if (gesundheitSichtbar) return absenzen;
  return absenzen.map((absenz) => {
    if (!istGesundheitsdatum(absenz)) return absenz;
    const { notiz: _notiz, arztzeugnis: _zeugnis, entscheidGrund: _grund, ...rest } = absenz;
    return { ...rest, art: 'abwesend' as const };
  });
}

// ── §3 · Ferienkonto ─────────────────────────────────────────────

export interface Ferienkonto {
  jahr: number;
  /** Anspruch des Jahres, pensum- und eintrittsbereinigt, auf halbe Tage gerundet. */
  anspruchTage: number;
  uebertragTage: number;
  /** Genehmigt und vorbei (bis heute). */
  bezogenTage: number;
  /** Genehmigt, liegt noch vor uns. */
  geplantTage: number;
  beantragtTage: number;
  restTage: number;
}

function rundeHalb(wert: number): number {
  return Math.round(wert * 2) / 2;
}

/** Anteil des Jahres, in dem die Person angestellt ist (Eintritt/Austritt), 0–1. */
export function anstellungsAnteil(mitarbeiter: Pick<Mitarbeiter, 'eintritt' | 'austritt'>, jahr: number): number {
  const start = `${jahr}-01-01` as IsoDatum;
  const ende = `${jahr}-12-31` as IsoDatum;
  const von = mitarbeiter.eintritt > start ? mitarbeiter.eintritt : start;
  const bis = mitarbeiter.austritt && mitarbeiter.austritt < ende ? mitarbeiter.austritt : ende;
  if (bis < von) return 0;
  const tageImJahr = (Date.UTC(jahr + 1, 0, 1) - Date.UTC(jahr, 0, 1)) / 86_400_000;
  const tage = (Date.UTC(Number(bis.slice(0, 4)), Number(bis.slice(5, 7)) - 1, Number(bis.slice(8, 10))) - Date.UTC(Number(von.slice(0, 4)), Number(von.slice(5, 7)) - 1, Number(von.slice(8, 10)))) / 86_400_000 + 1;
  return Math.min(1, tage / tageImJahr);
}

export function ferienkonto(mitarbeiter: Mitarbeiter, absenzen: readonly Absenz[], jahr: number, heute: IsoDatum, kanton: Kanton, betrieblich?: readonly BetrieblicherFeiertag[]): Ferienkonto {
  const anspruchTage = rundeHalb(mitarbeiter.ferienTageProJahr * (mitarbeiter.pensum / 100) * anstellungsAnteil(mitarbeiter, jahr));
  const uebertragTage = istAngestellt(mitarbeiter, `${jahr}-01-01` as IsoDatum) ? mitarbeiter.ferienUebertragTage : 0;
  let bezogen = 0;
  let geplant = 0;
  let beantragt = 0;
  for (const absenz of absenzen) {
    if (absenz.mitarbeiterId !== mitarbeiter.id || !ABSENZ_INFO[absenz.art].ferienkonto || absenz.status === 'abgelehnt') continue;
    if (absenz.von.slice(0, 4) !== String(jahr) && absenz.bis.slice(0, 4) !== String(jahr)) continue;
    // jh› Jahresgrenze: nur der Teil im gewünschten Jahr zählt (Ferien über Silvester).
    const von = absenz.von.slice(0, 4) === String(jahr) ? absenz.von : (`${jahr}-01-01` as IsoDatum);
    const bis = absenz.bis.slice(0, 4) === String(jahr) ? absenz.bis : (`${jahr}-12-31` as IsoDatum);
    const tage = absenzTage({ von, bis, ...(absenz.halberTag ? { halberTag: absenz.halberTag } : {}) }, kanton, betrieblich);
    if (absenz.status === 'beantragt') {
      beantragt += tage;
      continue;
    }
    if (bis <= heute) {
      bezogen += tage;
      continue;
    }
    if (von > heute) {
      geplant += tage;
      continue;
    }
    bezogen += absenzTage({ von, bis: heute }, kanton, betrieblich);
    geplant += absenzTage({ von: addDays(heute, 1), bis }, kanton, betrieblich);
  }
  return {
    jahr,
    anspruchTage,
    uebertragTage,
    bezogenTage: bezogen,
    geplantTage: geplant,
    beantragtTage: beantragt,
    restTage: rundeHalb(anspruchTage + uebertragTage - bezogen - geplant),
  };
}

/* ◆ jh · eof */
