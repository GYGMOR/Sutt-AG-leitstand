/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/model/tour.model.ts                            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Tour des Tages: Stopps in Reihenfolge, Fahrt, Pins, Linie, Maps       │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Minuten } from '@sl/core/datum';
import { formatZeit } from '@sl/core/format';
import { SUTT_HQ, googleTourUrl } from '@sl/core/geo';
import { kategorieKlasse } from '@sl/core/ui/farben';
import { aktiverEinsatz, sortiert } from '@sl/modules/app/app.model';
import type { KartenLinie, KartenPin } from '@sl/modules/dispo/karte/karte.types';
import type { EinsatzView } from '@sl/modules/dispo/store/dispo.selectors';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface TourStopp {
  nummer: number;
  view: EinsatzView;
  /** Geplante Abfahrt: Beginn minus Fahrzeit vom Vorgänger. */
  abfahrtMin: Minuten;
  /** Der Stopp, um den es jetzt geht (laufend oder nächster geplanter). */
  naechster: boolean;
  erledigt: boolean;
}

export interface Tour {
  stopps: TourStopp[];
  fahrtMin: Minuten;
  fahrtKm: number;
  einsatzMin: Minuten;
  offen: number;
  /** Google-Maps-Route ab Werkhof über alle offenen Stopps – null, wenn nichts mehr offen ist. */
  mapsUrl: string | null;
  pins: KartenPin[];
  linien: KartenLinie[];
}

// ── §2 · Aufbau ──────────────────────────────────────────────────

// jh› Die Tour ist der Tagesplan in Fahrreihenfolge – dieselben Views wie «Heute», nur mit Fahrt und Karte.
//     Fahrzeiten kommen aus dem Dispo-Selektor (Vorgänger → hier), die Linie beginnt am Werkhof.
export function buildTour(views: readonly EinsatzView[], farbeToken: string): Tour {
  const geordnet = sortiert(views);
  const aktiv = aktiverEinsatz(geordnet);
  const stopps = geordnet.map<TourStopp>((view, index) => ({
    nummer: index + 1,
    view,
    abfahrtMin: Math.max(0, view.einsatz.startMin - view.anfahrtMin),
    naechster: aktiv !== null && view.einsatz.id === aktiv.einsatz.id,
    erledigt: view.einsatz.status === 'erledigt' || view.einsatz.status === 'wartet-teil',
  }));
  const offene = stopps.filter((stopp) => !stopp.erledigt);
  return {
    stopps,
    fahrtMin: stopps.reduce((summe, stopp) => summe + stopp.view.anfahrtMin, 0),
    fahrtKm: Math.round(stopps.reduce((summe, stopp) => summe + stopp.view.anfahrtKm, 0) * 10) / 10,
    einsatzMin: stopps.reduce((summe, stopp) => summe + stopp.view.einsatz.dauerMin, 0),
    offen: offene.length,
    mapsUrl: offene.length > 0 ? googleTourUrl(offene.map((stopp) => stopp.view.koordinaten)) : null,
    pins: stopps.map((stopp) => ({
      id: stopp.view.einsatz.id,
      koordinaten: stopp.view.koordinaten,
      label: String(stopp.nummer),
      farbeKlasse: kategorieKlasse(stopp.view.auftrag.kategorie),
      farbeToken,
      aktiv: stopp.naechster,
      gedimmt: stopp.erledigt,
      titel: `${stopp.nummer} · ${formatZeit(stopp.view.einsatz.startMin)} ${stopp.view.kunde.kurzname}`,
    })),
    linien: stopps.length > 0 ? [{ id: 'tour', punkte: [SUTT_HQ, ...stopps.map((stopp) => stopp.view.koordinaten)], farbeToken }] : [],
  };
}

/* ◆ jh · eof */
