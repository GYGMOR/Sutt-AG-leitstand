/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/bilder/bilder.model.test.ts                │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Bilder: ohne Doppel, nach Zeit, Filter, Gruppierung nach Tag          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { describe, expect, it } from 'vitest';
import { HEUTE, testState } from '../../test/testdaten';
import { buildAuftragViews } from '../auftraege/auftraege.model';
import { LEERER_BILDER_FILTER, buildBildViews, filterBilder, gruppiereNachTag, zaehleBilder } from './bilder.model';

function bildViews() {
  const state = testState();
  const auftraege = buildAuftragViews(state.stammdaten, state.einsaetze, state.pendenzen, state.rapporte, HEUTE);
  return { state, views: buildBildViews(auftraege, state.rapporte) };
}

// ── §1 · Aufbau ──────────────────────────────────────────────────

describe('buildBildViews', () => {
  it('zählt jedes Foto genau einmal und sortiert neueste zuerst', () => {
    const { state, views } = bildViews();
    const ids = new Set([...[...state.stammdaten.auftraege.values()].flatMap((auftrag) => auftrag.fotos.map((foto) => foto.id)), ...state.rapporte.flatMap((rapport) => rapport.fotos.map((foto) => foto.id))]);
    expect(views).toHaveLength(ids.size);
    for (let index = 1; index < views.length; index += 1) {
      expect(views[index - 1]!.foto.aufgenommenAm >= views[index]!.foto.aufgenommenAm).toBe(true);
    }
  });

  it('gruppiert nach Tag ohne Verlust', () => {
    const { views } = bildViews();
    const tage = gruppiereNachTag(views);
    expect(tage.reduce((summe, tag) => summe + tag.bilder.length, 0)).toBe(views.length);
    expect(tage.every((tag) => tag.bilder.every((bild) => bild.datum === tag.datum))).toBe(true);
  });
});

// ── §2 · Filter ──────────────────────────────────────────────────

describe('filterBilder', () => {
  it('filtert nach Motiv, Zeitraum und Kategorie', () => {
    const { views } = bildViews();
    const typenschilder = filterBilder(views, { ...LEERER_BILDER_FILTER, motiv: 'typenschild' }, HEUTE);
    expect(typenschilder.every((view) => view.foto.motiv === 'typenschild')).toBe(true);
    expect(typenschilder).toHaveLength(zaehleBilder(views, HEUTE).typenschild);
    const heute = filterBilder(views, { ...LEERER_BILDER_FILTER, zeitraum: 'heute' }, HEUTE);
    expect(heute.every((view) => view.datum === HEUTE)).toBe(true);
    const garantie = filterBilder(views, { ...LEERER_BILDER_FILTER, kategorie: 'garantie' }, HEUTE);
    expect(garantie.every((view) => view.auftrag.auftrag.kategorie === 'garantie')).toBe(true);
  });
});

/* ◆ jh · eof */
