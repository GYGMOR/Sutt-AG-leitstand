/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dashboard/dashboard.model.ts               │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Tagesbild: Feld, Eingang, Konflikte, Rapporte, Rechnungen, Lager      │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum, Minuten } from '../../core/datum';
import { isDringend } from '../../core/domain/auftrag';
import { isAbwesend } from '../../core/domain/stammdaten';
import type { Absenz, Techniker } from '../../core/domain/stammdaten';
import { rapportBetrag, summeBetraege } from '../../core/domain/verrechnung';
import type { Betrag } from '../../core/domain/verrechnung';
import { LEERER_FILTER } from '../dispo/dispo.types';
import type { DispoState } from '../dispo/store/dispo.reducer';
import { buildFehlendeRapporte, buildPendenzViews, buildRapportViews, buildTagesZeilen, pulsFor, zaehleRapporte } from '../dispo/store/dispo.selectors';
import type { EinsatzView, ErledigtView, PendenzView, Puls, RapportView, TagesZeile } from '../dispo/store/dispo.selectors';
import { preisVonFuer } from '../auftraege/auftraege.model';
import { buildArtikelViews, buildBestellungViews } from '../lager/lager.model';
import type { BestellungView } from '../lager/lager.model';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface FeldZeile {
  techniker: Techniker;
  puls: Puls;
  /** Einsatz, der gerade läuft (unterwegs oder vor Ort). */
  aktuell: EinsatzView | null;
  /** Nächster geplanter Einsatz. */
  naechster: EinsatzView | null;
  erledigt: number;
  total: number;
}

export interface Tagesbild {
  einsaetze: { total: number; erledigt: number; laufend: number; geplant: number };
  eingang: { total: number; dringend: number };
  konflikte: number;
  rapporte: { fehlend: number; pruefen: number; verrechnen: number; verrechnenChf: Betrag };
  lager: { ueberfaellig: number; heute: number; knapp: number; leer: number };
  abwesend: { techniker: Techniker; absenz: Absenz }[];
  feld: FeldZeile[];
  zeilen: TagesZeile[];
  pendenzen: PendenzView[];
  fehlendeRapporte: ErledigtView[];
  zuPruefen: RapportView[];
  lieferungen: BestellungView[];
}

const LISTEN_LAENGE = 6;

// ── §2 · Aufbau ──────────────────────────────────────────────────

// jh› Das Dashboard rechnet nichts Eigenes: Jede Zahl kommt aus dem Selektor des Moduls,
//     das sie auch anzeigt – Klick auf die Kachel führt genau dorthin, und die Zahl stimmt.
export function buildTagesbild(state: DispoState, heute: IsoDatum, jetztMin: Minuten, konflikte: number): Tagesbild {
  const { stammdaten, einsaetze, pendenzen, rapporte, bestaende, bestellungen } = state;
  const heutige = einsaetze.filter((einsatz) => einsatz.datum === heute);
  const zeilen = buildTagesZeilen(stammdaten, einsaetze, heute, LEERER_FILTER, jetztMin);

  const feld: FeldZeile[] = zeilen.map((zeile) => {
    const absenz = isAbwesend(stammdaten.absenzen, zeile.techniker.id, heute);
    const eigene = heutige.filter((einsatz) => einsatz.technikerId === zeile.techniker.id);
    const views = [...zeile.einsaetze].sort((a, b) => a.einsatz.startMin - b.einsatz.startMin);
    return {
      techniker: zeile.techniker,
      puls: pulsFor(eigene, jetztMin, absenz),
      aktuell: views.find((view) => view.einsatz.status === 'unterwegs' || view.einsatz.status === 'vor-ort') ?? null,
      naechster: views.find((view) => view.einsatz.status === 'geplant') ?? null,
      erledigt: eigene.filter((einsatz) => einsatz.status === 'erledigt' || einsatz.status === 'wartet-teil').length,
      total: eigene.length,
    };
  });

  const pendenzViews = buildPendenzViews(stammdaten, pendenzen, LEERER_FILTER);
  const zaehler = zaehleRapporte(einsaetze, rapporte);
  const rapportViews = buildRapportViews(stammdaten, einsaetze, rapporte);
  const freigegeben = rapportViews.filter((view) => view.rapport.status === 'freigegeben');
  const verrechnenChf = summeBetraege(freigegeben.map((view) => rapportBetrag(view.rapport, preisVonFuer(view.auftrag, stammdaten.artikel))));
  const artikel = buildArtikelViews(stammdaten, bestaende, bestellungen);
  const bestellViews = buildBestellungViews(stammdaten, bestellungen, heute);
  const lieferungen = bestellViews.filter((view) => view.bestellung.status === 'offen' && view.bestellung.liefertermin <= heute);

  return {
    einsaetze: {
      total: heutige.length,
      erledigt: heutige.filter((einsatz) => einsatz.status === 'erledigt' || einsatz.status === 'wartet-teil').length,
      laufend: heutige.filter((einsatz) => einsatz.status === 'unterwegs' || einsatz.status === 'vor-ort').length,
      geplant: heutige.filter((einsatz) => einsatz.status === 'geplant').length,
    },
    eingang: { total: pendenzen.length, dringend: pendenzViews.filter((view) => isDringend(view.auftrag.dringlichkeit)).length },
    konflikte,
    rapporte: { fehlend: zaehler.fehlend, pruefen: zaehler.erstellt + zaehler.unterschrieben, verrechnen: zaehler.freigegeben, verrechnenChf },
    lager: {
      ueberfaellig: bestellViews.filter((view) => view.ueberfaellig).length,
      heute: bestellViews.filter((view) => view.heute).length,
      knapp: artikel.filter((view) => view.stufe === 'knapp').length,
      leer: artikel.filter((view) => view.stufe === 'leer').length,
    },
    abwesend: stammdaten.techniker.flatMap((techniker) => {
      const absenz = isAbwesend(stammdaten.absenzen, techniker.id, heute);
      return absenz ? [{ techniker, absenz }] : [];
    }),
    feld,
    zeilen,
    pendenzen: pendenzViews.slice(0, LISTEN_LAENGE),
    fehlendeRapporte: buildFehlendeRapporte(stammdaten, einsaetze, rapporte).slice(0, LISTEN_LAENGE),
    zuPruefen: rapportViews.filter((view) => view.rapport.status === 'erstellt' || view.rapport.status === 'unterschrieben').slice(0, LISTEN_LAENGE),
    lieferungen: lieferungen.slice(0, LISTEN_LAENGE),
  };
}

/* ◆ jh · eof */
