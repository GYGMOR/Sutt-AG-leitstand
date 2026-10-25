/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/geraete/geraete.model.ts                   │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Gerätekartei: Standort, Einsätze, Teile-Historie, Fotos, Garantie     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { splitZeitpunkt } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import { TEIL_STATUS_LABEL } from '../../core/domain/auftrag';
import type { Foto } from '../../core/domain/auftrag';
import type { Einsatz } from '../../core/domain/einsatz';
import { TEIL_VERWENDUNG_LABEL } from '../../core/domain/rapport';
import type { Rapport } from '../../core/domain/rapport';
import { KENNUNG_LABEL, formatAdresse } from '../../core/domain/stammdaten';
import type { Geraet, Geraeteart, Kunde, Liegenschaft, Marke, Wohnung } from '../../core/domain/stammdaten';
import { normalizeSuchtext } from '../../core/suche';
import type { SuchEintrag } from '../../core/suche';
import type { DispoStammdaten } from '../dispo/dispo.types';
import { passtZurSuche } from '../auftraege/auftraege.model';
import type { AuftragView } from '../auftraege/auftraege.model';
import { geraetUnvollstaendig } from '../rapport/rapport.model';

// ── §1 · Sichten ─────────────────────────────────────────────────

export type GarantieStand = 'laeuft' | 'abgelaufen' | 'keine';

export const GARANTIE_LABEL: Readonly<Record<GarantieStand, string>> = {
  laeuft: 'Garantie läuft',
  abgelaufen: 'Garantie abgelaufen',
  keine: 'keine Garantie',
};

export function garantieStand(geraet: Pick<Geraet, 'garantieBis'>, heute: IsoDatum): GarantieStand {
  if (!geraet.garantieBis) return 'keine';
  return geraet.garantieBis >= heute ? 'laeuft' : 'abgelaufen';
}

export interface Standort {
  liegenschaft: Liegenschaft;
  kunde: Kunde;
  wohnung?: Wohnung;
}

export interface TeilEintrag {
  datum: IsoDatum;
  artikelNummer: string;
  bezeichnung: string;
  menge: number;
  text: string;
  auftragId: string;
  auftragNummer: string;
}

export interface GeraetView {
  geraet: Geraet;
  standort: Standort | null;
  /** Aufträge an diesem Gerät, neueste zuerst. */
  auftraege: AuftragView[];
  /** Einsätze an diesem Gerät, neueste zuerst. */
  einsaetze: Einsatz[];
  letzterEinsatz: Einsatz | null;
  teile: TeilEintrag[];
  fotos: Foto[];
  garantie: GarantieStand;
  unvollstaendig: boolean;
}

// jh› Teile-Historie aus zwei Quellen: was der Auftrag bestellte und was der Rapport verbaute –
//     doppelte Einträge (gleiches Teil, gleicher Auftrag) zeigt der Rapport, nicht der Auftrag.
function teileHistorie(auftraege: readonly AuftragView[], rapporteProAuftrag: ReadonlyMap<string, readonly Rapport[]>): TeilEintrag[] {
  const eintraege: TeilEintrag[] = [];
  for (const view of auftraege) {
    const rapporte = rapporteProAuftrag.get(view.auftrag.id) ?? [];
    const imRapport = new Set<string>();
    for (const rapport of rapporte) {
      for (const teil of rapport.teile) {
        imRapport.add(teil.artikelNummer);
        eintraege.push({ datum: splitZeitpunkt(rapport.erstelltAm).datum, artikelNummer: teil.artikelNummer, bezeichnung: teil.bezeichnung, menge: teil.menge, text: TEIL_VERWENDUNG_LABEL[teil.verwendung], auftragId: view.auftrag.id, auftragNummer: view.auftrag.nummer });
      }
    }
    const datum = view.letzter?.datum ?? splitZeitpunkt(view.auftrag.angefragtAm).datum;
    for (const teil of view.auftrag.ersatzteile) {
      if (imRapport.has(teil.artikelNummer)) continue;
      eintraege.push({ datum, artikelNummer: teil.artikelNummer, bezeichnung: teil.bezeichnung, menge: teil.menge, text: TEIL_STATUS_LABEL[teil.status], auftragId: view.auftrag.id, auftragNummer: view.auftrag.nummer });
    }
  }
  return eintraege.sort((a, b) => b.datum.localeCompare(a.datum));
}

export function buildGeraeteViews(stammdaten: DispoStammdaten, auftragViews: readonly AuftragView[], rapporte: readonly Rapport[], heute: IsoDatum): GeraetView[] {
  const auftraegeProGeraet = new Map<string, AuftragView[]>();
  for (const view of auftragViews) {
    const liste = auftraegeProGeraet.get(view.geraet.id) ?? [];
    liste.push(view);
    auftraegeProGeraet.set(view.geraet.id, liste);
  }
  const rapporteProAuftrag = new Map<string, Rapport[]>();
  for (const rapport of rapporte) {
    const liste = rapporteProAuftrag.get(rapport.auftragId) ?? [];
    liste.push(rapport);
    rapporteProAuftrag.set(rapport.auftragId, liste);
  }

  const views: GeraetView[] = [];
  for (const geraet of stammdaten.geraete.values()) {
    const auftraege = auftraegeProGeraet.get(geraet.id) ?? [];
    const juengster = auftraege[0];
    const einsaetze = auftraege.flatMap((view) => view.einsaetze).sort((a, b) => b.datum.localeCompare(a.datum) || b.startMin - a.startMin);
    const fotos = auftraege.flatMap((view) => view.auftrag.fotos).sort((a, b) => b.aufgenommenAm.localeCompare(a.aufgenommenAm));
    views.push({
      geraet,
      standort: juengster ? { liegenschaft: juengster.liegenschaft, kunde: juengster.kunde, ...(juengster.auftrag.wohnung ? { wohnung: juengster.auftrag.wohnung } : {}) } : null,
      auftraege,
      einsaetze,
      letzterEinsatz: einsaetze.find((einsatz) => einsatz.status === 'erledigt' || einsatz.status === 'wartet-teil') ?? null,
      teile: teileHistorie(auftraege, rapporteProAuftrag),
      fotos,
      garantie: garantieStand(geraet, heute),
      unvollstaendig: geraetUnvollstaendig(geraet),
    });
  }
  return views.sort((a, b) => (b.einsaetze[0]?.datum ?? '').localeCompare(a.einsaetze[0]?.datum ?? '') || a.geraet.marke.localeCompare(b.geraet.marke));
}

// ── §2 · Filter & Suche ──────────────────────────────────────────

export type GeraeteSicht = 'alle' | 'garantie' | 'abgelaufen' | 'unvollstaendig';

export const GERAETE_SICHTEN: readonly { id: GeraeteSicht; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'garantie', label: 'Garantie läuft' },
  { id: 'abgelaufen', label: 'Garantie abgelaufen' },
  { id: 'unvollstaendig', label: 'Typenschild fehlt' },
];

export function passtZurGeraeteSicht(view: GeraetView, sicht: GeraeteSicht): boolean {
  switch (sicht) {
    case 'alle':
      return true;
    case 'garantie':
      return view.garantie === 'laeuft';
    case 'abgelaufen':
      return view.garantie === 'abgelaufen';
    case 'unvollstaendig':
      return view.unvollstaendig;
  }
}

export function zaehleGeraete(views: readonly GeraetView[]): Readonly<Record<GeraeteSicht, number>> {
  return {
    alle: views.length,
    garantie: views.filter((view) => view.garantie === 'laeuft').length,
    abgelaufen: views.filter((view) => view.garantie === 'abgelaufen').length,
    unvollstaendig: views.filter((view) => view.unvollstaendig).length,
  };
}

export interface GeraeteFilter {
  sicht: GeraeteSicht;
  marke: Marke | 'alle';
  art: Geraeteart | 'alle';
  suche: string;
}

export const LEERER_GERAETE_FILTER: GeraeteFilter = { sicht: 'alle', marke: 'alle', art: 'alle', suche: '' };

export function suchtextVonGeraet(view: GeraetView): string {
  const { geraet, standort } = view;
  return normalizeSuchtext(
    [geraet.marke, geraet.art, geraet.modell, geraet.typNummer, geraet.seriennummer, String(geraet.baujahr), standort?.kunde.name ?? '', standort?.liegenschaft.bezeichnung ?? '', standort ? formatAdresse(standort.liegenschaft.adresse) : '', standort?.wohnung?.nummer ?? ''].join(' '),
  );
}

export function filterGeraete(views: readonly GeraetView[], filter: GeraeteFilter): GeraetView[] {
  return views.filter(
    (view) =>
      passtZurGeraeteSicht(view, filter.sicht) &&
      (filter.marke === 'alle' || view.geraet.marke === filter.marke) &&
      (filter.art === 'alle' || view.geraet.art === filter.art) &&
      (filter.suche.trim() === '' || passtZurSuche(suchtextVonGeraet(view), filter.suche)),
  );
}

export function buildGeraeteSuchIndex(views: readonly GeraetView[]): SuchEintrag[] {
  return views.map((view) => ({
    id: view.geraet.id,
    kennung: `${KENNUNG_LABEL[view.geraet.marke]} ${view.geraet.seriennummer}`,
    titel: `${view.geraet.marke} ${view.geraet.modell} · ${view.geraet.art}`,
    untertitel: view.standort ? `${view.standort.kunde.name} · ${formatAdresse(view.standort.liegenschaft.adresse)}${view.standort.wohnung ? ` · ${view.standort.wohnung.nummer}` : ''}` : 'ohne Standort',
    suchtext: suchtextVonGeraet(view),
  }));
}

/* ◆ jh · eof */
