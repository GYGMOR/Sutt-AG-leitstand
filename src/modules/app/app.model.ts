/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/app/app.model.ts                           │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Techniker-Sicht: Tagesliste, aktiver Einsatz, nächster Schritt, Plan  │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum, Minuten } from '../../core/datum';
import type { Benutzer } from '../../core/auth/auth.types';
import type { Einsatz, EinsatzStatus } from '../../core/domain/einsatz';
import type { Techniker } from '../../core/domain/stammdaten';
import { readPersisted, writePersisted } from '../../core/store';
import { LEERER_FILTER } from '../dispo/dispo.types';
import type { DispoStammdaten } from '../dispo/dispo.types';
import { buildTagesZeilen } from '../dispo/store/dispo.selectors';
import type { EinsatzView, TagesZeile } from '../dispo/store/dispo.selectors';

// ── §1 · Techniker der Sitzung ───────────────────────────────────

// jh› Aussendienst = eigener Techniker; Innendienst darf zur Demo jeden Techniker
//     ansehen (?als=T-MB) – im Produkt eine Berechtigung, kein Querystring.
export function technikerFuer(benutzer: Benutzer | null, stammdaten: DispoStammdaten, alsId: string | null): Techniker | null {
  const gewuenscht = alsId ?? benutzer?.technikerId ?? null;
  if (gewuenscht) {
    const treffer = stammdaten.techniker.find((techniker) => techniker.id === gewuenscht);
    if (treffer) return treffer;
  }
  return benutzer?.rolle === 'aussendienst' ? null : (stammdaten.techniker[0] ?? null);
}

// ── §2 · Tag des Technikers ──────────────────────────────────────

export function tagesZeileFuer(stammdaten: DispoStammdaten, einsaetze: readonly Einsatz[], technikerId: string, datum: IsoDatum, jetztMin: Minuten | null): TagesZeile | null {
  return buildTagesZeilen(stammdaten, einsaetze, datum, { ...LEERER_FILTER, technikerIds: [technikerId] }, jetztMin)[0] ?? null;
}

export function sortiert(views: readonly EinsatzView[]): EinsatzView[] {
  return [...views].sort((a, b) => a.einsatz.startMin - b.einsatz.startMin);
}

/** Der Einsatz, um den es jetzt geht: laufend (unterwegs/vor Ort) vor dem nächsten geplanten. */
export function aktiverEinsatz(views: readonly EinsatzView[]): EinsatzView | null {
  const geordnet = sortiert(views);
  return geordnet.find((view) => view.einsatz.status === 'unterwegs' || view.einsatz.status === 'vor-ort') ?? geordnet.find((view) => view.einsatz.status === 'geplant') ?? null;
}

export interface Schritt {
  label: string;
  ziel: EinsatzStatus | 'rapport';
}

// jh› Ein Knopf, eine Bedeutung: Abfahrt → unterwegs, Angekommen → vor Ort, Fertig → Rapport.
export function naechsterSchritt(status: EinsatzStatus): Schritt | null {
  switch (status) {
    case 'geplant':
      return { label: 'Abfahrt', ziel: 'unterwegs' };
    case 'unterwegs':
      return { label: 'Angekommen', ziel: 'vor-ort' };
    case 'vor-ort':
      return { label: 'Fertig – Rapport', ziel: 'rapport' };
    default:
      return null;
  }
}

// ── §3 · Planänderungen erkennen ─────────────────────────────────

type Gesehen = Readonly<Record<string, number>>;

function gesehenSchluessel(technikerId: string, datum: IsoDatum): string {
  return `sl.app.gesehen.${technikerId}.${datum}`;
}

export interface PlanAenderung {
  einsatzId: string;
  kunde: string;
  vorherMin: number | null;
  nachherMin: number;
}

// jh› Die App merkt sich, welche Startzeiten der Techniker gesehen hat – verschiebt die
//     Dispo etwas, zeigt die App beim nächsten Blick «Plan geändert» mit Bestätigen.
export function planAenderungen(technikerId: string, datum: IsoDatum, views: readonly EinsatzView[]): PlanAenderung[] {
  const gesehen = readPersisted<Gesehen>(gesehenSchluessel(technikerId, datum), {});
  if (Object.keys(gesehen).length === 0) return [];
  return views
    .filter((view) => gesehen[view.einsatz.id] !== view.einsatz.startMin)
    .map((view) => ({ einsatzId: view.einsatz.id, kunde: view.kunde.kurzname, vorherMin: gesehen[view.einsatz.id] ?? null, nachherMin: view.einsatz.startMin }));
}

export function planBestaetigen(technikerId: string, datum: IsoDatum, views: readonly EinsatzView[]): void {
  const gesehen: Record<string, number> = {};
  for (const view of views) gesehen[view.einsatz.id] = view.einsatz.startMin;
  writePersisted(gesehenSchluessel(technikerId, datum), gesehen);
}

/* ◆ jh · eof */
