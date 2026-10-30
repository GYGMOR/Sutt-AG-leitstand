/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/zeit.test.ts                           │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Stempeln, Tagessaldo, Pausenregel, Einsatzplan-Zeiten, Monate         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import type { IsoDatum } from '../datum';
import type { Einsatz } from './einsatz';
import { feiertagAm } from './feiertage';
import type { Mitarbeiter } from './personal';
import {
  ARBEITSZEIT_STANDARD,
  berechneTag,
  einsatzZeiten,
  eintraegeAusEinsatzplan,
  monatVerschieben,
  monatVon,
  pausenPflichtMin,
  ruhezeitVerletzungen,
  stempelStatus,
  stempeln,
  tageImMonat,
  tagesSollMin,
} from './zeit';
import type { StempelKontext, ZeitEintrag } from './zeit';

// ── §1 · Aufbau ──────────────────────────────────────────────────

const MB: Mitarbeiter = { id: 'M-MB', kuerzel: 'MB', vorname: 'Marco', nachname: 'Brunner', funktion: 'techniker', technikerId: 'T-MB', pensum: 100, eintritt: '2019-03-01', ferienTageProJahr: 25, ferienUebertragTage: 2, zeitUebertragMin: 0, zeitUebertragPer: '2025-12-31', vertragsart: 'unbefristet', email: 'm.brunner@sutt.example' };

let lauf = 0;
function kontext(datum: IsoDatum = '2026-10-20', jetztMin = 450): StempelKontext {
  return { mitarbeiterId: 'M-MB', datum, jetztMin, erfasstAm: `${datum}T08:00`, erfasstVon: 'MB', geraet: 'app', neueId: () => `Z-T${(lauf += 1)}` };
}

function eintrag(vonMin: number, bisMin: number | null, art: 'arbeit' | 'pause' = 'arbeit', datum: IsoDatum = '2026-10-20'): ZeitEintrag {
  return { id: `Z-${vonMin}-${art}`, mitarbeiterId: 'M-MB', datum, art, vonMin, bisMin, quelle: 'stempel', erfasstAm: `${datum}T08:00`, erfasstVon: 'MB', korrekturen: [] };
}

function tag(eintraege: ZeitEintrag[], datum: IsoDatum = '2026-10-20', jetztMin: number | null = null, mitarbeiter = MB) {
  return berechneTag({ datum, mitarbeiter, eintraege, modell: ARBEITSZEIT_STANDARD, feiertag: feiertagAm(datum, 'ZH'), absenz: undefined, jetztMin });
}

// ── §2 · Stempeln ────────────────────────────────────────────────

describe('Stempeln', () => {
  it('führt durch Kommen, Pause, Weiter, Gehen', () => {
    const kommen = stempeln([], 'kommen', kontext('2026-10-20', 450));
    expect(kommen.ok && kommen.eintraege.length === 1 && kommen.eintraege[0]?.bisMin === null).toBe(true);
    if (!kommen.ok) return;
    expect(stempelStatus(kommen.eintraege)).toBe('arbeitet');

    const pause = stempeln(kommen.eintraege, 'pause-start', kontext('2026-10-20', 720));
    if (!pause.ok) throw new Error(pause.fehler);
    expect(pause.eintraege.map((e) => [e.art, e.vonMin, e.bisMin])).toEqual([['arbeit', 450, 720], ['pause', 720, null]]);
    expect(stempelStatus(pause.eintraege)).toBe('pause');

    const weiter = stempeln(pause.eintraege, 'pause-ende', kontext('2026-10-20', 750));
    if (!weiter.ok) throw new Error(weiter.fehler);
    const gehen = stempeln(weiter.eintraege, 'gehen', kontext('2026-10-20', 1020));
    if (!gehen.ok) throw new Error(gehen.fehler);
    expect(gehen.eintraege.map((e) => [e.art, e.vonMin, e.bisMin])).toEqual([['arbeit', 450, 720], ['pause', 720, 750], ['arbeit', 750, 1020]]);
    expect(stempelStatus(gehen.eintraege)).toBe('draussen');
  });

  it('lehnt unpassende Stempel ab', () => {
    expect(stempeln([], 'gehen', kontext()).ok).toBe(false);
    const kommen = stempeln([], 'kommen', kontext());
    if (!kommen.ok) return;
    expect(stempeln(kommen.eintraege, 'kommen', kontext()).ok).toBe(false);
    expect(stempeln(kommen.eintraege, 'gehen', kontext('2026-10-20', 450)).ok).toBe(false);
  });
});

// ── §3 · Tagessaldo ──────────────────────────────────────────────

describe('Tagessaldo', () => {
  it('rechnet Soll aus Modell und Pensum', () => {
    expect(tagesSollMin(ARBEITSZEIT_STANDARD, 100)).toBe(504);
    expect(tagesSollMin(ARBEITSZEIT_STANDARD, 80)).toBe(403);
  });

  it('summiert Arbeit und Pause und bildet den Saldo', () => {
    const saldo = tag([eintrag(450, 720), eintrag(720, 750, 'pause'), eintrag(750, 1020)]);
    expect(saldo.arbeitMin).toBe(540);
    expect(saldo.pauseMin).toBe(30);
    expect(saldo.sollMin).toBe(504);
    expect(saldo.saldoMin).toBe(36);
    expect(saldo.warnungen).toEqual([]);
    expect(saldo.kommenMin).toBe(450);
    expect(saldo.gehenMin).toBe(1020);
  });

  it('mahnt fehlende oder zu kurze Pausen nach ArG 15', () => {
    expect(pausenPflichtMin(5 * 60)).toBe(0);
    expect(pausenPflichtMin(5.5 * 60 + 1)).toBe(15);
    expect(pausenPflichtMin(7 * 60 + 1)).toBe(30);
    expect(pausenPflichtMin(9 * 60 + 1)).toBe(60);
    expect(tag([eintrag(450, 1020)]).warnungen).toContain('pause-fehlt');
    expect(tag([eintrag(450, 720), eintrag(720, 735, 'pause'), eintrag(735, 1020)]).warnungen).toContain('pause-zu-kurz');
  });

  it('kennt Wochenende, Feiertag und Pensum', () => {
    const sonntag = tag([eintrag(600, 720, 'arbeit', '2026-10-25')], '2026-10-25');
    expect(sonntag.grund).toBe('wochenende');
    expect(sonntag.sollMin).toBe(0);
    expect(sonntag.saldoMin).toBe(120);
    expect(sonntag.warnungen).toContain('sonntag');
    expect(tag([], '2026-12-25').grund).toBe('feiertag');
    expect(tag([], '2026-12-24').sollMin).toBe(252);
    expect(tag([], '2026-10-20', null, { ...MB, pensum: 80 }).sollMin).toBe(403);
  });

  it('zählt laufende Einträge bis jetzt und meldet vergessene Stempel', () => {
    const heute = tag([eintrag(450, null)], '2026-10-20', 600);
    expect(heute.arbeitMin).toBe(150);
    expect(heute.laeuft).toBe(true);
    expect(heute.warnungen).not.toContain('offen');
    const gestern = tag([eintrag(450, null)], '2026-10-20', null);
    expect(gestern.warnungen).toContain('offen');
    expect(tag([], '2026-10-20', null).warnungen).toContain('ohne-stempel');
  });

  it('rechnet am Umstellungstag mit der echten Dauer', () => {
    const maerz = berechneTag({ datum: '2026-03-29', mitarbeiter: MB, eintraege: [eintrag(60, 4 * 60, 'arbeit', '2026-03-29')], modell: ARBEITSZEIT_STANDARD, feiertag: undefined, absenz: undefined, jetztMin: null, zone: 'Europe/Zurich' });
    expect(maerz.arbeitMin).toBe(120);
    expect(maerz.umstellung?.art).toBe('sommerzeit');
    const oktober = berechneTag({ datum: '2026-10-25', mitarbeiter: MB, eintraege: [eintrag(60, 4 * 60, 'arbeit', '2026-10-25')], modell: ARBEITSZEIT_STANDARD, feiertag: undefined, absenz: undefined, jetztMin: null, zone: 'Europe/Zurich' });
    expect(oktober.arbeitMin).toBe(240);
    expect(berechneTag({ datum: '2026-10-26', mitarbeiter: MB, eintraege: [eintrag(60, 4 * 60, 'arbeit', '2026-10-26')], modell: ARBEITSZEIT_STANDARD, feiertag: undefined, absenz: undefined, jetztMin: null, zone: 'Europe/Zurich' }).umstellung).toBeUndefined();
  });

  it('erkennt zu kurze Ruhezeit zwischen zwei Tagen', () => {
    const erster = tag([eintrag(900, 1380, 'arbeit', '2026-10-20')], '2026-10-20');
    const zweiter = tag([eintrag(420, 720, 'arbeit', '2026-10-21')], '2026-10-21');
    expect(ruhezeitVerletzungen([erster, zweiter])).toEqual([{ datum: '2026-10-21', ruheMin: 480 }]);
  });
});

// ── §4 · Einsatzplan & Monate ────────────────────────────────────

describe('Zeiten aus dem Einsatzplan', () => {
  const einsatz: Einsatz = {
    id: 'E-1', auftragId: 'A-1', technikerId: 'T-MB', datum: '2026-10-20', startMin: 480, dauerMin: 60, status: 'erledigt',
    verlauf: [
      { status: 'unterwegs', zeitpunkt: '2026-10-20T07:40', quelle: 'app' },
      { status: 'vor-ort', zeitpunkt: '2026-10-20T08:05', quelle: 'app' },
      { status: 'erledigt', zeitpunkt: '2026-10-20T09:10', quelle: 'app' },
    ],
  };

  it('liest Fahrt und Arbeit aus dem Verlauf', () => {
    const zeiten = einsatzZeiten([einsatz]);
    expect(zeiten).toEqual({ fahrtMin: 25, arbeitMin: 65, ersteAbfahrtMin: 460, letztesEndeMin: 550, einsaetze: 1 });
  });

  it('nimmt den Plan, wenn der Verlauf fehlt, und ignoriert Geplantes', () => {
    const ohne = einsatzZeiten([{ ...einsatz, verlauf: undefined }, { ...einsatz, id: 'E-2', status: 'geplant', startMin: 600 }]);
    expect(ohne).toEqual({ fahrtMin: 30, arbeitMin: 60, ersteAbfahrtMin: 450, letztesEndeMin: 540, einsaetze: 1 });
  });

  it('schlägt Einträge mit Pause um die Mitte vor', () => {
    const vorschlag = eintraegeAusEinsatzplan({ fahrtMin: 60, arbeitMin: 400, ersteAbfahrtMin: 460, letztesEndeMin: 1000, einsaetze: 5 }, kontext());
    expect(vorschlag.map((e) => [e.art, e.vonMin, e.bisMin])).toEqual([['arbeit', 450, 735], ['pause', 735, 795], ['arbeit', 795, 1015]]);
    expect(vorschlag.every((e) => e.quelle === 'einsatz')).toBe(true);
  });

  it('rechnet mit Monaten', () => {
    expect(monatVon('2026-10-26')).toBe('2026-10');
    expect(tageImMonat('2026-02')).toHaveLength(28);
    expect(monatVerschieben('2026-01', -1)).toBe('2025-12');
    expect(monatVerschieben('2026-11', 2)).toBe('2027-01');
  });
});

/* ◆ jh · eof */
