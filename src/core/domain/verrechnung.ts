/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/verrechnung.ts                         │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Rapportbetrag: Arbeit × Stundensatz, Anfahrtspauschale, Teile         │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Rapport } from './rapport';

// ── §1 · Sätze ───────────────────────────────────────────────────

// jh? Stundensatz, Anfahrtspauschale und Rundung mit Sutt festlegen – hier Branchenwerte als Platzhalter.
export const STUNDENSATZ_CHF = 128;
export const ANFAHRT_PAUSCHALE_CHF = 48;

/** Auf 5 Rappen runden, wie die Schweizer Rechnung es verlangt. */
export function rundeRappen(betrag: number): number {
  return Math.round(betrag * 20) / 20;
}

// ── §2 · Betrag ──────────────────────────────────────────────────

export interface Betrag {
  arbeitChf: number;
  anfahrtChf: number;
  teileChf: number;
  totalChf: number;
}

export const KEIN_BETRAG: Betrag = { arbeitChf: 0, anfahrtChf: 0, teileChf: 0, totalChf: 0 };

// jh› Verrechnet wird die Arbeitszeit ohne Pause plus eine Pauschale für die Anfahrt;
//     Teile nur, wenn sie eingebaut wurden – bestellte Teile kommen mit dem Folgetermin.
export function rapportBetrag(rapport: Pick<Rapport, 'zeiten' | 'teile'>, preisVon: (artikelNummer: string) => number): Betrag {
  const arbeitMin = Math.max(0, rapport.zeiten.arbeitMin - rapport.zeiten.pauseMin);
  const arbeitChf = rundeRappen((arbeitMin / 60) * STUNDENSATZ_CHF);
  const anfahrtChf = ANFAHRT_PAUSCHALE_CHF;
  const teileChf = rundeRappen(rapport.teile.filter((teil) => teil.verwendung !== 'bestellen').reduce((summe, teil) => summe + teil.menge * preisVon(teil.artikelNummer), 0));
  return { arbeitChf, anfahrtChf, teileChf, totalChf: rundeRappen(arbeitChf + anfahrtChf + teileChf) };
}

export function summeBetraege(betraege: readonly Betrag[]): Betrag {
  return betraege.reduce<Betrag>(
    (summe, betrag) => ({
      arbeitChf: rundeRappen(summe.arbeitChf + betrag.arbeitChf),
      anfahrtChf: rundeRappen(summe.anfahrtChf + betrag.anfahrtChf),
      teileChf: rundeRappen(summe.teileChf + betrag.teileChf),
      totalChf: rundeRappen(summe.totalChf + betrag.totalChf),
    }),
    KEIN_BETRAG,
  );
}

/* ◆ jh · eof */
