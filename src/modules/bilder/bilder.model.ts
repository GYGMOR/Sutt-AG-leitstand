/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/bilder/bilder.model.ts                     │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Bilder: alle Fotos mit Kontext, Filter nach Motiv, Zeit, Marke        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, splitZeitpunkt, startOfMonth, startOfWeek } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import { FOTO_MOTIV_LABEL } from '../../core/domain/auftrag';
import type { Foto, FotoMotiv } from '../../core/domain/auftrag';
import type { Kategorie } from '../../core/domain/kategorie';
import type { Rapport } from '../../core/domain/rapport';
import type { Marke } from '../../core/domain/stammdaten';
import { normalizeSuchtext } from '../../core/suche';
import { passtZurSuche, suchtextVon } from '../auftraege/auftraege.model';
import type { AuftragView } from '../auftraege/auftraege.model';

// ── §1 · Sichten ─────────────────────────────────────────────────

export interface BildView {
  foto: Foto;
  auftrag: AuftragView;
  rapport: Rapport | null;
  datum: IsoDatum;
}

// jh› Fotos leben am Auftrag (Spiegel) und am Rapport (Quelle) – dieselbe ID zählt einmal.
export function buildBildViews(auftragViews: readonly AuftragView[], rapporte: readonly Rapport[]): BildView[] {
  const rapportProFoto = new Map<string, Rapport>();
  for (const rapport of rapporte) for (const foto of rapport.fotos) rapportProFoto.set(foto.id, rapport);
  const gesehen = new Set<string>();
  const views: BildView[] = [];
  const auftragProId = new Map(auftragViews.map((view) => [view.auftrag.id, view]));

  const aufnehmen = (foto: Foto, auftrag: AuftragView, rapport: Rapport | null) => {
    if (gesehen.has(foto.id)) return;
    gesehen.add(foto.id);
    views.push({ foto, auftrag, rapport, datum: splitZeitpunkt(foto.aufgenommenAm).datum });
  };

  for (const view of auftragViews) {
    for (const foto of view.auftrag.fotos) aufnehmen(foto, view, rapportProFoto.get(foto.id) ?? view.rapport);
  }
  for (const rapport of rapporte) {
    const auftrag = auftragProId.get(rapport.auftragId);
    if (!auftrag) continue;
    for (const foto of rapport.fotos) aufnehmen(foto, auftrag, rapport);
  }
  return views.sort((a, b) => b.foto.aufgenommenAm.localeCompare(a.foto.aufgenommenAm));
}

// ── §2 · Filter ──────────────────────────────────────────────────

export type BilderZeitraum = 'heute' | 'woche' | 'monat' | 'alle';

export const ZEITRAUM_OPTIONEN: readonly { id: BilderZeitraum; label: string }[] = [
  { id: 'heute', label: 'Heute' },
  { id: 'woche', label: 'Diese Woche' },
  { id: 'monat', label: 'Dieser Monat' },
  { id: 'alle', label: 'Alle' },
];

export interface BilderFilter {
  motiv: FotoMotiv | 'alle';
  technikerKuerzel: string | 'alle';
  marke: Marke | 'alle';
  kategorie: Kategorie | 'alle';
  zeitraum: BilderZeitraum;
  suche: string;
}

export const LEERER_BILDER_FILTER: BilderFilter = { motiv: 'alle', technikerKuerzel: 'alle', marke: 'alle', kategorie: 'alle', zeitraum: 'alle', suche: '' };

export function abDatum(zeitraum: BilderZeitraum, heute: IsoDatum): IsoDatum | null {
  switch (zeitraum) {
    case 'heute':
      return heute;
    case 'woche':
      return startOfWeek(heute);
    case 'monat':
      return startOfMonth(heute);
    case 'alle':
      return null;
  }
}

export function filterBilder(views: readonly BildView[], filter: BilderFilter, heute: IsoDatum): BildView[] {
  const ab = abDatum(filter.zeitraum, heute);
  return views.filter(
    (view) =>
      (filter.motiv === 'alle' || view.foto.motiv === filter.motiv) &&
      (filter.technikerKuerzel === 'alle' || view.foto.technikerKuerzel === filter.technikerKuerzel) &&
      (filter.marke === 'alle' || view.auftrag.geraet.marke === filter.marke) &&
      (filter.kategorie === 'alle' || view.auftrag.auftrag.kategorie === filter.kategorie) &&
      (ab === null || view.datum >= ab) &&
      (filter.suche.trim() === '' || passtZurSuche(`${suchtextVon(view.auftrag)} ${normalizeSuchtext(FOTO_MOTIV_LABEL[view.foto.motiv])} ${normalizeSuchtext(view.foto.technikerKuerzel)}`, filter.suche)),
  );
}

export interface BilderTag {
  datum: IsoDatum;
  bilder: BildView[];
}

export function gruppiereNachTag(views: readonly BildView[]): BilderTag[] {
  const tage = new Map<IsoDatum, BildView[]>();
  for (const view of views) {
    const liste = tage.get(view.datum) ?? [];
    liste.push(view);
    tage.set(view.datum, liste);
  }
  return [...tage.entries()].map(([datum, bilder]) => ({ datum, bilder })).sort((a, b) => b.datum.localeCompare(a.datum));
}

export interface BilderZaehler {
  alle: number;
  heute: number;
  woche: number;
  garantie: number;
  typenschild: number;
}

export function zaehleBilder(views: readonly BildView[], heute: IsoDatum): BilderZaehler {
  const woche = startOfWeek(heute);
  const wochenEnde = addDays(woche, 6);
  return {
    alle: views.length,
    heute: views.filter((view) => view.datum === heute).length,
    woche: views.filter((view) => view.datum >= woche && view.datum <= wochenEnde).length,
    garantie: views.filter((view) => view.auftrag.auftrag.kategorie === 'garantie').length,
    typenschild: views.filter((view) => view.foto.motiv === 'typenschild').length,
  };
}

/* ◆ jh · eof */
