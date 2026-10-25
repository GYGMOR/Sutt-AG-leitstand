/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/auftraege/auftraege.model.ts               │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Aufträge: Phase von der Anfrage bis zur Zahlung, Sichten, Suche       │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum } from '../../core/datum';
import type { Auftrag } from '../../core/domain/auftrag';
import type { Einsatz, Pendenz } from '../../core/domain/einsatz';
import { KATEGORIE_LABEL } from '../../core/domain/kategorie';
import type { Kategorie } from '../../core/domain/kategorie';
import type { Artikel } from '../../core/domain/lager';
import type { Rapport } from '../../core/domain/rapport';
import { formatStrasse, regionOf } from '../../core/domain/stammdaten';
import type { Region, Techniker } from '../../core/domain/stammdaten';
import { rapportBetrag } from '../../core/domain/verrechnung';
import type { Betrag } from '../../core/domain/verrechnung';
import { normalizeSuchtext } from '../../core/suche';
import type { SuchEintrag } from '../../core/suche';
import type { ChipTone } from '../../core/ui/Chip';
import type { DispoStammdaten } from '../dispo/dispo.types';
import { resolveAuftrag } from '../dispo/store/dispo.selectors';
import type { AuftragKontext } from '../dispo/store/dispo.selectors';

// ── §1 · Phasen ──────────────────────────────────────────────────

export type AuftragPhase = 'eingang' | 'disponiert' | 'in-arbeit' | 'wartet-teil' | 'rapport' | 'verrechnen' | 'verrechnet' | 'bezahlt' | 'ohne-termin';

export const PHASEN: readonly AuftragPhase[] = ['eingang', 'disponiert', 'in-arbeit', 'wartet-teil', 'rapport', 'verrechnen', 'verrechnet', 'bezahlt', 'ohne-termin'];

export const PHASE_LABEL: Readonly<Record<AuftragPhase, string>> = {
  eingang: 'Im Eingang',
  disponiert: 'Disponiert',
  'in-arbeit': 'In Arbeit',
  'wartet-teil': 'Wartet auf Teil',
  rapport: 'Rapport prüfen',
  verrechnen: 'Zu verrechnen',
  verrechnet: 'Rechnung offen',
  bezahlt: 'Bezahlt',
  'ohne-termin': 'Ohne Termin',
};

export const PHASE_TON: Readonly<Record<AuftragPhase, ChipTone>> = {
  eingang: 'signal',
  disponiert: 'neutral',
  'in-arbeit': 'ok',
  'wartet-teil': 'signal',
  rapport: 'signal',
  verrechnen: 'signal',
  verrechnet: 'neutral',
  bezahlt: 'mute',
  'ohne-termin': 'danger',
};

/** Offen = es liegt noch Arbeit bei Büro, Feld oder Buchhaltung. */
export function istOffen(phase: AuftragPhase): boolean {
  return phase !== 'bezahlt';
}

// jh› Die Phase ist abgeleitet, nie gespeichert: Rechnung schlägt Rapport schlägt Einsatz schlägt Pendenz.
//     So kann kein Feld «vergessen» werden – jede Aktion im Plan oder im Rapport ändert die Phase von selbst.
export function phaseVon(auftrag: Auftrag, eigene: readonly Einsatz[], pendenz: Pendenz | null): AuftragPhase {
  if (auftrag.rechnungStatus === 'bezahlt') return 'bezahlt';
  if (auftrag.rechnungStatus === 'gestellt') return 'verrechnet';
  if (auftrag.rapport === 'freigegeben') return 'verrechnen';
  if (eigene.some((einsatz) => einsatz.status === 'unterwegs' || einsatz.status === 'vor-ort')) return 'in-arbeit';
  if (eigene.some((einsatz) => einsatz.status === 'geplant')) return 'disponiert';
  if (eigene.some((einsatz) => einsatz.status === 'wartet-teil')) return 'wartet-teil';
  if (pendenz) return 'eingang';
  if (eigene.length === 0) return 'ohne-termin';
  return 'rapport';
}

// ── §2 · Sichten ─────────────────────────────────────────────────

export interface AuftragView extends AuftragKontext {
  phase: AuftragPhase;
  /** Alle Einsätze des Auftrags, älteste zuerst. */
  einsaetze: Einsatz[];
  pendenz: Pendenz | null;
  /** Nächster offener Einsatz ab heute – oder null. */
  naechster: Einsatz | null;
  letzter: Einsatz | null;
  techniker: Techniker | null;
  rapport: Rapport | null;
  betrag: Betrag | null;
  region: Region;
}

function sortiertNachZeit(einsaetze: readonly Einsatz[]): Einsatz[] {
  return [...einsaetze].sort((a, b) => a.datum.localeCompare(b.datum) || a.startMin - b.startMin);
}

/** Preis eines Teils: Artikelstamm vor Auftragsangabe. */
export function preisVonFuer(auftrag: Auftrag, artikel: ReadonlyMap<string, Artikel>): (artikelNummer: string) => number {
  return (artikelNummer) => artikel.get(artikelNummer)?.preisChf ?? auftrag.ersatzteile.find((teil) => teil.artikelNummer === artikelNummer)?.preisChf ?? 0;
}

export function buildAuftragViews(stammdaten: DispoStammdaten, einsaetze: readonly Einsatz[], pendenzen: readonly Pendenz[], rapporte: readonly Rapport[], heute: IsoDatum): AuftragView[] {
  const einsaetzeProAuftrag = new Map<string, Einsatz[]>();
  for (const einsatz of einsaetze) {
    const liste = einsaetzeProAuftrag.get(einsatz.auftragId) ?? [];
    liste.push(einsatz);
    einsaetzeProAuftrag.set(einsatz.auftragId, liste);
  }
  const pendenzProAuftrag = new Map(pendenzen.map((pendenz) => [pendenz.auftragId, pendenz]));
  const rapportProAuftrag = new Map<string, Rapport>();
  for (const rapport of rapporte) {
    const bisher = rapportProAuftrag.get(rapport.auftragId);
    if (!bisher || bisher.erstelltAm < rapport.erstelltAm) rapportProAuftrag.set(rapport.auftragId, rapport);
  }
  const technikerById = new Map(stammdaten.techniker.map((techniker) => [techniker.id, techniker]));

  const views: AuftragView[] = [];
  for (const auftrag of stammdaten.auftraege.values()) {
    if (!stammdaten.kunden.has(auftrag.kundeId) || !stammdaten.liegenschaften.has(auftrag.liegenschaftId) || !stammdaten.geraete.has(auftrag.geraetId)) continue;
    const kontext = resolveAuftrag(stammdaten, auftrag.id);
    const eigene = sortiertNachZeit(einsaetzeProAuftrag.get(auftrag.id) ?? []);
    const pendenz = pendenzProAuftrag.get(auftrag.id) ?? null;
    const naechster = eigene.find((einsatz) => einsatz.datum >= heute && einsatz.status !== 'erledigt' && einsatz.status !== 'wartet-teil') ?? null;
    const letzter = eigene[eigene.length - 1] ?? null;
    const massgebend = naechster ?? letzter;
    const rapport = rapportProAuftrag.get(auftrag.id) ?? null;
    views.push({
      ...kontext,
      phase: phaseVon(auftrag, eigene, pendenz),
      einsaetze: eigene,
      pendenz,
      naechster,
      letzter,
      techniker: massgebend ? (technikerById.get(massgebend.technikerId) ?? null) : null,
      rapport,
      betrag: rapport ? rapportBetrag(rapport, preisVonFuer(auftrag, stammdaten.artikel)) : null,
      region: regionOf(kontext.liegenschaft.adresse.ort),
    });
  }
  return views.sort((a, b) => b.auftrag.angefragtAm.localeCompare(a.auftrag.angefragtAm));
}

export function zaehlePhasen(views: readonly AuftragView[]): Readonly<Record<AuftragPhase, number>> {
  const zaehler: Record<AuftragPhase, number> = { eingang: 0, disponiert: 0, 'in-arbeit': 0, 'wartet-teil': 0, rapport: 0, verrechnen: 0, verrechnet: 0, bezahlt: 0, 'ohne-termin': 0 };
  for (const view of views) zaehler[view.phase] += 1;
  return zaehler;
}

/** Der massgebende Termin für Listen: nächster Einsatz, sonst letzter. */
export function terminVon(view: AuftragView): Einsatz | null {
  return view.naechster ?? view.letzter;
}

// ── §3 · Filter & Suche ──────────────────────────────────────────

export interface AuftragFilter {
  phase: AuftragPhase | 'alle';
  kategorie: Kategorie | 'alle';
  technikerId: string | 'alle';
  region: Region | 'alle';
  suche: string;
}

export const LEERER_AUFTRAG_FILTER: AuftragFilter = { phase: 'alle', kategorie: 'alle', technikerId: 'alle', region: 'alle', suche: '' };

export function suchtextVon(view: AuftragView): string {
  const { auftrag, kunde, liegenschaft, geraet } = view;
  return normalizeSuchtext(
    [
      auftrag.nummer, kunde.name, kunde.kurzname, liegenschaft.bezeichnung, formatStrasse(liegenschaft.adresse), liegenschaft.adresse.ort,
      auftrag.kontaktVorOrt.name, auftrag.kontaktVorOrt.telefon, geraet.marke, geraet.art, geraet.modell, geraet.seriennummer,
      auftrag.fehlerbild, KATEGORIE_LABEL[auftrag.kategorie], auftrag.art, PHASE_LABEL[view.phase], view.techniker?.kuerzel ?? '', view.rapport?.nummer ?? '',
    ].join(' '),
  );
}

export function passtZurSuche(suchtext: string, suche: string): boolean {
  const begriffe = normalizeSuchtext(suche).split(/\s+/).filter(Boolean);
  return begriffe.every((begriff) => suchtext.includes(begriff));
}

export function filterAuftraege(views: readonly AuftragView[], filter: AuftragFilter): AuftragView[] {
  return views.filter(
    (view) =>
      (filter.phase === 'alle' || view.phase === filter.phase) &&
      (filter.kategorie === 'alle' || view.auftrag.kategorie === filter.kategorie) &&
      (filter.technikerId === 'alle' || view.techniker?.id === filter.technikerId) &&
      (filter.region === 'alle' || view.region === filter.region) &&
      (filter.suche.trim() === '' || passtZurSuche(suchtextVon(view), filter.suche)),
  );
}

export function buildAuftraegeSuchIndex(views: readonly AuftragView[]): SuchEintrag[] {
  return views.map((view) => ({
    id: view.auftrag.id,
    kennung: view.auftrag.nummer,
    titel: `${view.kunde.name} · ${view.auftrag.fehlerbild}`,
    untertitel: `${formatStrasse(view.liegenschaft.adresse)}, ${view.liegenschaft.adresse.ort} · ${view.geraet.marke} ${view.geraet.modell} · ${PHASE_LABEL[view.phase]}`,
    suchtext: suchtextVon(view),
  }));
}

/* ◆ jh · eof */
