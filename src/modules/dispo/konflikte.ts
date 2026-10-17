/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/konflikte.ts                         │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Konflikt-Wächter: Überschneidung, Arbeitszeit, Teil, Fahrt, Absenz    │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum } from '../../core/datum';
import { isTeilOffen } from '../../core/domain/auftrag';
import { einsatzEnde } from '../../core/domain/einsatz';
import type { Einsatz } from '../../core/domain/einsatz';
import { ABSENZ_LABEL, isAbwesend } from '../../core/domain/stammdaten';
import { formatDatumKurz, formatZeit } from '../../core/format';
import { SUTT_HQ, fahrzeitMin } from '../../core/geo';
import type { DispoStammdaten } from './dispo.types';
import { resolveAuftrag } from './store/dispo.selectors';
import { ARBEIT_ENDE, ARBEIT_START, overlaps } from './zeitraster';

// ── §1 · Typen ───────────────────────────────────────────────────

export type KonfliktArt = 'ueberschneidung' | 'ausserhalb-arbeitszeit' | 'teil-nicht-geliefert' | 'fahrzeit-knapp' | 'absenz';

export const KONFLIKT_LABEL: Readonly<Record<KonfliktArt, string>> = {
  ueberschneidung: 'Überschneidung',
  'ausserhalb-arbeitszeit': 'Ausserhalb Arbeitszeit',
  'teil-nicht-geliefert': 'Teil noch nicht geliefert',
  'fahrzeit-knapp': 'Fahrzeit zu knapp',
  absenz: 'Techniker abwesend',
};

export interface Konflikt {
  id: string;
  art: KonfliktArt;
  einsatzId: string;
  technikerId: string;
  datum: IsoDatum;
  text: string;
}

// ── §2 · Prüfung ─────────────────────────────────────────────────

// jh› Nur zukünftige/laufende Einsätze – erledigte Überschneidungen von letzter
//     Woche sind Geschichte, nicht Arbeit. Fahrzeit nur innerhalb eines Tages.
export function findKonflikte(stammdaten: DispoStammdaten, einsaetze: readonly Einsatz[], heute: IsoDatum): Konflikt[] {
  const konflikte: Konflikt[] = [];
  const relevante = einsaetze.filter((einsatz) => einsatz.datum >= heute && einsatz.status !== 'erledigt' && einsatz.status !== 'wartet-teil');
  const gesehen = new Set<string>();

  for (const einsatz of relevante) {
    const kontext = resolveAuftrag(stammdaten, einsatz.auftragId);
    const tagesKollegen = einsaetze.filter((anderer) => anderer.technikerId === einsatz.technikerId && anderer.datum === einsatz.datum && anderer.id !== einsatz.id);
    const basis = `${kontext.auftrag.nummer} · ${formatDatumKurz(einsatz.datum)} ${formatZeit(einsatz.startMin)}`;

    for (const anderer of tagesKollegen) {
      if (!overlaps(einsatz, anderer)) continue;
      const schluessel = [einsatz.id, anderer.id].sort().join('|');
      if (gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      const andererNummer = resolveAuftrag(stammdaten, anderer.auftragId).auftrag.nummer;
      konflikte.push({
        id: `K-ue-${schluessel}`, art: 'ueberschneidung', einsatzId: einsatz.id, technikerId: einsatz.technikerId, datum: einsatz.datum,
        text: `${basis} überschneidet ${andererNummer} (${formatZeit(anderer.startMin)})`,
      });
    }

    if (einsatz.startMin < ARBEIT_START || einsatzEnde(einsatz) > ARBEIT_ENDE) {
      konflikte.push({
        id: `K-az-${einsatz.id}`, art: 'ausserhalb-arbeitszeit', einsatzId: einsatz.id, technikerId: einsatz.technikerId, datum: einsatz.datum,
        text: `${basis} liegt ausserhalb 07:00–18:00 (bis ${formatZeit(einsatzEnde(einsatz))})`,
      });
    }

    const offeneTeile = kontext.auftrag.ersatzteile.filter((teil) => isTeilOffen(teil) && teil.liefertermin && teil.liefertermin > einsatz.datum);
    const spaetestes = offeneTeile[0];
    if (spaetestes?.liefertermin) {
      konflikte.push({
        id: `K-teil-${einsatz.id}`, art: 'teil-nicht-geliefert', einsatzId: einsatz.id, technikerId: einsatz.technikerId, datum: einsatz.datum,
        text: `${basis}: ${spaetestes.bezeichnung} kommt erst ${formatDatumKurz(spaetestes.liefertermin)}`,
      });
    }

    const vorgaenger = tagesKollegen.filter((anderer) => einsatzEnde(anderer) <= einsatz.startMin).sort((a, b) => b.startMin - a.startMin)[0];
    const von = vorgaenger ? resolveAuftrag(stammdaten, vorgaenger.auftragId).koordinaten : SUTT_HQ;
    const fahrzeit = fahrzeitMin(von, kontext.koordinaten);
    if (vorgaenger) {
      const luecke = einsatz.startMin - einsatzEnde(vorgaenger);
      if (luecke < fahrzeit) {
        konflikte.push({
          id: `K-fz-${einsatz.id}`, art: 'fahrzeit-knapp', einsatzId: einsatz.id, technikerId: einsatz.technikerId, datum: einsatz.datum,
          text: `${basis}: ${fahrzeit} min Fahrt, ${luecke} min Lücke – ${fahrzeit - luecke} min zu knapp`,
        });
      }
    }

    const absenz = isAbwesend(stammdaten.absenzen, einsatz.technikerId, einsatz.datum);
    if (absenz) {
      konflikte.push({
        id: `K-ab-${einsatz.id}`, art: 'absenz', einsatzId: einsatz.id, technikerId: einsatz.technikerId, datum: einsatz.datum,
        text: `${basis}: Techniker hat ${ABSENZ_LABEL[absenz.art]}`,
      });
    }
  }

  return konflikte.sort((a, b) => a.datum.localeCompare(b.datum) || a.einsatzId.localeCompare(b.einsatzId));
}

/* ◆ jh · eof */
