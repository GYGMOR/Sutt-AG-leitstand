/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/kunden/kunden.model.ts                     │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Kunden & Liegenschaften: Sichten mit Geräten, Aufträgen, Rechnungen   │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoZeitpunkt } from '../../core/datum';
import type { Nachricht } from '../../core/domain/nachricht';
import { KUNDENART_LABEL, formatAdresse } from '../../core/domain/stammdaten';
import type { Geraet, Kunde, Kundenart, Liegenschaft, Wohnung } from '../../core/domain/stammdaten';
import { normalizeSuchtext } from '../../core/suche';
import type { SuchEintrag } from '../../core/suche';
import type { DispoStammdaten } from '../dispo/dispo.types';
import { istOffen, passtZurSuche } from '../auftraege/auftraege.model';
import type { AuftragView } from '../auftraege/auftraege.model';

// ── §1 · Sichten ─────────────────────────────────────────────────

export interface GeraetAnLiegenschaft {
  geraet: Geraet;
  wohnung?: Wohnung;
  letzterAuftrag: AuftragView;
}

export interface LiegenschaftView {
  liegenschaft: Liegenschaft;
  geraete: GeraetAnLiegenschaft[];
  /** Aufträge an dieser Liegenschaft, neueste zuerst. */
  auftraege: AuftragView[];
  offene: number;
}

export interface KundeView {
  kunde: Kunde;
  liegenschaften: LiegenschaftView[];
  auftraege: AuftragView[];
  offene: number;
  geraete: number;
  /** Aufträge mit gestellter, unbezahlter Rechnung. */
  rechnungenOffen: AuftragView[];
  letzterAuftragAm: IsoZeitpunkt | null;
  nachrichten: number;
}

// jh› Geräte hängen nicht an der Liegenschaft, sondern am Auftrag – der jüngste Auftrag
//     je Gerät sagt, wo es steht (Liegenschaft, Wohnung). Umzüge ergeben sich von selbst.
function geraeteAn(auftraege: readonly AuftragView[]): GeraetAnLiegenschaft[] {
  const proGeraet = new Map<string, GeraetAnLiegenschaft>();
  for (const view of auftraege) {
    if (proGeraet.has(view.geraet.id)) continue;
    proGeraet.set(view.geraet.id, { geraet: view.geraet, ...(view.auftrag.wohnung ? { wohnung: view.auftrag.wohnung } : {}), letzterAuftrag: view });
  }
  return [...proGeraet.values()].sort((a, b) => (a.wohnung?.nummer ?? '').localeCompare(b.wohnung?.nummer ?? '', 'de-CH', { numeric: true }) || a.geraet.art.localeCompare(b.geraet.art, 'de-CH'));
}

export function buildKundenViews(stammdaten: DispoStammdaten, auftragViews: readonly AuftragView[], nachrichten: readonly Nachricht[]): KundeView[] {
  const auftraegeProKunde = new Map<string, AuftragView[]>();
  for (const view of auftragViews) {
    const liste = auftraegeProKunde.get(view.kunde.id) ?? [];
    liste.push(view);
    auftraegeProKunde.set(view.kunde.id, liste);
  }
  const nachrichtenProAuftrag = new Map<string, number>();
  for (const nachricht of nachrichten) nachrichtenProAuftrag.set(nachricht.auftragId, (nachrichtenProAuftrag.get(nachricht.auftragId) ?? 0) + 1);

  const views: KundeView[] = [];
  for (const kunde of stammdaten.kunden.values()) {
    const auftraege = auftraegeProKunde.get(kunde.id) ?? [];
    const liegenschaften: LiegenschaftView[] = [...stammdaten.liegenschaften.values()]
      .filter((liegenschaft) => liegenschaft.kundeId === kunde.id)
      .map((liegenschaft) => {
        const eigene = auftraege.filter((view) => view.liegenschaft.id === liegenschaft.id);
        return { liegenschaft, geraete: geraeteAn(eigene), auftraege: eigene, offene: eigene.filter((view) => istOffen(view.phase)).length };
      })
      .sort((a, b) => a.liegenschaft.bezeichnung.localeCompare(b.liegenschaft.bezeichnung, 'de-CH'));
    views.push({
      kunde,
      liegenschaften,
      auftraege,
      offene: auftraege.filter((view) => istOffen(view.phase)).length,
      geraete: liegenschaften.reduce((summe, view) => summe + view.geraete.length, 0),
      rechnungenOffen: auftraege.filter((view) => view.auftrag.rechnungStatus === 'gestellt'),
      letzterAuftragAm: auftraege[0]?.auftrag.angefragtAm ?? null,
      nachrichten: auftraege.reduce((summe, view) => summe + (nachrichtenProAuftrag.get(view.auftrag.id) ?? 0), 0),
    });
  }
  return views.sort((a, b) => a.kunde.name.localeCompare(b.kunde.name, 'de-CH'));
}

// ── §2 · Filter & Suche ──────────────────────────────────────────

export type KundenSicht = 'alle' | Kundenart | 'rechnung-offen';

export const KUNDEN_SICHTEN: readonly { id: KundenSicht; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'verwaltung', label: 'Verwaltungen' },
  { id: 'privat', label: 'Private' },
  { id: 'gewerbe', label: 'Gewerbe' },
  { id: 'rechnung-offen', label: 'Rechnung offen' },
];

export function hatRechnungOffen(view: KundeView): boolean {
  return view.rechnungenOffen.length > 0 || view.kunde.rechnungOffenSeit !== undefined;
}

export function passtZurSicht(view: KundeView, sicht: KundenSicht): boolean {
  if (sicht === 'alle') return true;
  if (sicht === 'rechnung-offen') return hatRechnungOffen(view);
  return view.kunde.art === sicht;
}

export function zaehleKunden(views: readonly KundeView[]): Readonly<Record<KundenSicht, number>> {
  const zaehler: Record<KundenSicht, number> = { alle: views.length, verwaltung: 0, privat: 0, gewerbe: 0, 'rechnung-offen': 0 };
  for (const view of views) {
    zaehler[view.kunde.art] += 1;
    if (hatRechnungOffen(view)) zaehler['rechnung-offen'] += 1;
  }
  return zaehler;
}

export function suchtextVonKunde(view: KundeView): string {
  const { kunde } = view;
  return normalizeSuchtext(
    [
      kunde.nummer, kunde.name, kunde.kurzname, KUNDENART_LABEL[kunde.art], formatAdresse(kunde.adresse), kunde.kontakt.name, kunde.kontakt.telefon, kunde.kontakt.email ?? '',
      ...view.liegenschaften.flatMap((eintrag) => [eintrag.liegenschaft.bezeichnung, formatAdresse(eintrag.liegenschaft.adresse), eintrag.liegenschaft.objektNummer ?? '', eintrag.liegenschaft.hauswart?.name ?? '']),
    ].join(' '),
  );
}

export function filterKunden(views: readonly KundeView[], sicht: KundenSicht, suche: string): KundeView[] {
  return views.filter((view) => passtZurSicht(view, sicht) && (suche.trim() === '' || passtZurSuche(suchtextVonKunde(view), suche)));
}

export function buildKundenSuchIndex(views: readonly KundeView[]): SuchEintrag[] {
  return views.map((view) => ({
    id: view.kunde.id,
    kennung: view.kunde.nummer,
    titel: view.kunde.name,
    untertitel: `${KUNDENART_LABEL[view.kunde.art]} · ${formatAdresse(view.kunde.adresse)} · ${view.liegenschaften.length} Liegenschaft${view.liegenschaften.length === 1 ? '' : 'en'}`,
    suchtext: suchtextVonKunde(view),
  }));
}

/* ◆ jh · eof */
