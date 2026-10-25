/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/verrechnung.test.ts                    │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Rapportbetrag: Arbeit, Pauschale, Teile, Rundung auf 5 Rappen         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { ANFAHRT_PAUSCHALE_CHF, STUNDENSATZ_CHF, rapportBetrag, rundeRappen, summeBetraege } from './verrechnung';

// ── §1 · Rundung ─────────────────────────────────────────────────

describe('rundeRappen', () => {
  it('rundet auf 5 Rappen', () => {
    expect(rundeRappen(12.32)).toBe(12.3);
    expect(rundeRappen(12.33)).toBe(12.35);
    expect(rundeRappen(12.375)).toBe(12.4);
  });
});

// ── §2 · Betrag ──────────────────────────────────────────────────

describe('rapportBetrag', () => {
  const preise = new Map([
    ['11380960', 92.4],
    ['10780350', 54.2],
  ]);
  const preisVon = (nr: string) => preise.get(nr) ?? 0;

  it('rechnet Arbeit ohne Pause, Pauschale und eingebaute Teile', () => {
    const betrag = rapportBetrag(
      {
        zeiten: { anfahrtMin: 20, arbeitMin: 90, pauseMin: 15 },
        teile: [
          { artikelNummer: '11380960', bezeichnung: 'Laugenpumpe', menge: 1, verwendung: 'eingebaut' },
          { artikelNummer: '10780350', bezeichnung: 'Türverriegelung', menge: 2, verwendung: 'fahrzeuglager' },
          { artikelNummer: '1040883', bezeichnung: 'Heizpumpe', menge: 1, verwendung: 'bestellen' },
        ],
      },
      preisVon,
    );
    expect(betrag.arbeitChf).toBe(rundeRappen((75 / 60) * STUNDENSATZ_CHF));
    expect(betrag.anfahrtChf).toBe(ANFAHRT_PAUSCHALE_CHF);
    expect(betrag.teileChf).toBe(rundeRappen(92.4 + 2 * 54.2));
    expect(betrag.totalChf).toBe(rundeRappen(betrag.arbeitChf + betrag.anfahrtChf + betrag.teileChf));
  });

  it('kennt keine negative Arbeitszeit', () => {
    const betrag = rapportBetrag({ zeiten: { anfahrtMin: 0, arbeitMin: 10, pauseMin: 30 }, teile: [] }, preisVon);
    expect(betrag.arbeitChf).toBe(0);
    expect(betrag.totalChf).toBe(ANFAHRT_PAUSCHALE_CHF);
  });

  it('summiert Beträge', () => {
    const a = rapportBetrag({ zeiten: { anfahrtMin: 0, arbeitMin: 60, pauseMin: 0 }, teile: [] }, preisVon);
    const summe = summeBetraege([a, a]);
    expect(summe.totalChf).toBe(rundeRappen(2 * a.totalChf));
  });
});

/* ◆ jh · eof */
