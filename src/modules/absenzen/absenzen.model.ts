/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/absenzen/absenzen.model.ts                 │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Absenzen: Sichten, Zähler, Filter, Planer-Raster, Überschneidungen    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, isWeekend as istWochenende } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import { ABSENZ_INFO, ABSENZ_LABEL, absenzTage } from '../../core/domain/absenz';
import type { Absenz, AbsenzArt, AbsenzStatus } from '../../core/domain/absenz';
import type { Einsatz } from '../../core/domain/einsatz';
import { feiertagAm } from '../../core/domain/feiertage';
import type { BetrieblicherFeiertag, Feiertag, Kanton } from '../../core/domain/feiertage';
import type { ChipTone } from '../../core/ui/Chip';
import { normalizeSuchtext } from '../../core/suche';
import type { PersonView } from '../personal/personal.model';

// ── §1 · Sichten & Filter ────────────────────────────────────────

export type AbsenzSicht = 'alle' | 'beantragt' | 'heute' | 'kommend' | 'ferien' | 'gesundheit';

export const ABSENZ_SICHTEN: readonly { id: AbsenzSicht; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'beantragt', label: 'Zu entscheiden' },
  { id: 'heute', label: 'Heute abwesend' },
  { id: 'kommend', label: 'Nächste 30 Tage' },
  { id: 'ferien', label: 'Ferien' },
  { id: 'gesundheit', label: 'Krank / Unfall' },
];

export interface AbsenzFilter {
  mitarbeiterId: string;
  art: AbsenzArt | 'alle';
  jahr: number | 'alle';
  suche: string;
}

export const LEERER_ABSENZ_FILTER: AbsenzFilter = { mitarbeiterId: 'alle', art: 'alle', jahr: 'alle', suche: '' };

export const ABSENZ_STATUS_TON: Readonly<Record<AbsenzStatus, ChipTone>> = { beantragt: 'signal', genehmigt: 'ok', abgelehnt: 'mute' };

// ── §2 · Sichten je Absenz ───────────────────────────────────────

export type AbsenzLage = 'vergangen' | 'laufend' | 'kommend';

export interface AbsenzView {
  absenz: Absenz;
  person: PersonView;
  tage: number;
  lage: AbsenzLage;
  /** Geplante Einsätze des Technikers im Zeitraum – Konflikt für die Dispo. */
  einsaetze: Einsatz[];
  suchtext: string;
}

export function buildAbsenzViews(absenzen: readonly Absenz[], personen: readonly PersonView[], einsaetze: readonly Einsatz[], heute: IsoDatum, kanton: Kanton, betrieblich: readonly BetrieblicherFeiertag[]): AbsenzView[] {
  const proPerson = new Map(personen.map((person) => [person.mitarbeiter.id, person]));
  return absenzen
    .flatMap((absenz) => {
      const person = proPerson.get(absenz.mitarbeiterId);
      if (!person) return [];
      const lage: AbsenzLage = absenz.bis < heute ? 'vergangen' : absenz.von > heute ? 'kommend' : 'laufend';
      const eigene = absenz.technikerId ? einsaetze.filter((einsatz) => einsatz.technikerId === absenz.technikerId && einsatz.datum >= absenz.von && einsatz.datum <= absenz.bis && einsatz.status === 'geplant') : [];
      return [
        {
          absenz,
          person,
          tage: absenzTage(absenz, kanton, betrieblich),
          lage,
          einsaetze: eigene,
          suchtext: normalizeSuchtext(`${person.mitarbeiter.vorname} ${person.mitarbeiter.nachname} ${person.mitarbeiter.kuerzel} ${ABSENZ_LABEL[absenz.art]} ${absenz.notiz ?? ''} ${absenz.von}`),
        },
      ];
    })
    .sort((a, b) => b.absenz.von.localeCompare(a.absenz.von) || a.person.mitarbeiter.nachname.localeCompare(b.person.mitarbeiter.nachname, 'de-CH'));
}

function passtZurSicht(view: AbsenzView, sicht: AbsenzSicht, heute: IsoDatum): boolean {
  switch (sicht) {
    case 'alle':
      return true;
    case 'beantragt':
      return view.absenz.status === 'beantragt';
    case 'heute':
      return view.absenz.status === 'genehmigt' && view.lage === 'laufend';
    case 'kommend':
      return view.absenz.status !== 'abgelehnt' && view.absenz.von > heute && view.absenz.von <= addDays(heute, 30);
    case 'ferien':
      return view.absenz.art === 'ferien';
    case 'gesundheit':
      return ABSENZ_INFO[view.absenz.art].gesundheit;
  }
}

export function zaehleAbsenzen(views: readonly AbsenzView[], heute: IsoDatum): Readonly<Record<AbsenzSicht, number>> {
  const zaehler: Record<AbsenzSicht, number> = { alle: views.length, beantragt: 0, heute: 0, kommend: 0, ferien: 0, gesundheit: 0 };
  for (const view of views) {
    for (const sicht of ABSENZ_SICHTEN) {
      if (sicht.id !== 'alle' && passtZurSicht(view, sicht.id, heute)) zaehler[sicht.id] += 1;
    }
  }
  return zaehler;
}

export function filterAbsenzen(views: readonly AbsenzView[], sicht: AbsenzSicht, filter: AbsenzFilter, heute: IsoDatum): AbsenzView[] {
  const begriff = normalizeSuchtext(filter.suche);
  return views.filter((view) => {
    if (!passtZurSicht(view, sicht, heute)) return false;
    if (filter.mitarbeiterId !== 'alle' && view.absenz.mitarbeiterId !== filter.mitarbeiterId) return false;
    if (filter.art !== 'alle' && view.absenz.art !== filter.art) return false;
    if (filter.jahr !== 'alle' && !view.absenz.von.startsWith(String(filter.jahr)) && !view.absenz.bis.startsWith(String(filter.jahr))) return false;
    return begriff === '' || view.suchtext.includes(begriff);
  });
}

/** Andere Personen, die sich mit dieser Absenz überschneiden (ohne Abgelehnte). */
export function ueberlappende(views: readonly AbsenzView[], absenz: Absenz): AbsenzView[] {
  return views.filter((view) => view.absenz.id !== absenz.id && view.absenz.mitarbeiterId !== absenz.mitarbeiterId && view.absenz.status !== 'abgelehnt' && view.absenz.von <= absenz.bis && view.absenz.bis >= absenz.von);
}

export function jahreVon(views: readonly AbsenzView[], heute: IsoDatum): number[] {
  const jahre = new Set<number>([Number(heute.slice(0, 4))]);
  for (const view of views) {
    jahre.add(Number(view.absenz.von.slice(0, 4)));
    jahre.add(Number(view.absenz.bis.slice(0, 4)));
  }
  return [...jahre].sort((a, b) => b - a);
}

// ── §3 · Planer ──────────────────────────────────────────────────

export interface PlanerTag {
  datum: IsoDatum;
  wochenende: boolean;
  feiertag: Feiertag | undefined;
  absenz: Absenz | undefined;
  heute: boolean;
}

export interface PlanerZeile {
  person: PersonView;
  tage: PlanerTag[];
  tageAbwesend: number;
}

// jh› Der Planer zeigt beantragte Absenzen schraffiert mit – wer eine Woche plant, sieht auch, was noch offen ist.
export function buildPlaner(personen: readonly PersonView[], absenzen: readonly Absenz[], tage: readonly IsoDatum[], heute: IsoDatum, kanton: Kanton, betrieblich: readonly BetrieblicherFeiertag[]): PlanerZeile[] {
  return personen.map((person) => {
    const eigene = absenzen.filter((absenz) => absenz.mitarbeiterId === person.mitarbeiter.id && absenz.status !== 'abgelehnt');
    const zeile = tage.map<PlanerTag>((datum) => ({
      datum,
      wochenende: istWochenende(datum),
      feiertag: feiertagAm(datum, kanton, betrieblich),
      absenz: eigene.find((absenz) => absenz.von <= datum && absenz.bis >= datum),
      heute: datum === heute,
    }));
    return { person, tage: zeile, tageAbwesend: zeile.filter((tag) => tag.absenz && !tag.wochenende && !(tag.feiertag && !tag.feiertag.halb)).length };
  });
}

/* ◆ jh · eof */
