/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dashboard/dashboard.model.ts               │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Tagesbild: Feld, Eingang, Konflikte, Rapporte, Lager · Auswertung     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays, isoWeek, rangeDays, startOfWeek } from '../../core/datum';
import type { IsoDatum, Minuten } from '../../core/datum';
import { isDringend } from '../../core/domain/auftrag';
import { KATEGORIEN } from '../../core/domain/kategorie';
import type { Kategorie } from '../../core/domain/kategorie';
import { istAngestellt, vertragEndetIn } from '../../core/domain/personal';
import type { Mitarbeiter } from '../../core/domain/personal';
import { isAbwesend } from '../../core/domain/stammdaten';
import type { Absenz, Techniker } from '../../core/domain/stammdaten';
import { rapportBetrag, summeBetraege } from '../../core/domain/verrechnung';
import type { Betrag } from '../../core/domain/verrechnung';
import type { Mandant } from '../../core/mandant/mandant.types';
import { LEERER_FILTER } from '../dispo/dispo.types';
import type { DispoState } from '../dispo/store/dispo.reducer';
import { buildFehlendeRapporte, buildPendenzViews, buildRapportViews, buildTagesZeilen, kapazitaetFor, pulsFor, zaehleRapporte } from '../dispo/store/dispo.selectors';
import type { EinsatzView, ErledigtView, PendenzView, Puls, RapportView, TagesZeile } from '../dispo/store/dispo.selectors';
import { preisVonFuer } from '../auftraege/auftraege.model';
import { buildArtikelViews, buildBestellungViews } from '../lager/lager.model';
import type { BestellungView } from '../lager/lager.model';
import { stempelLage } from '../personal/personal.model';

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

export interface VertragsEnde {
  mitarbeiter: Mitarbeiter;
  ende: IsoDatum;
  inTagen: number;
}

export interface Tagesbild {
  einsaetze: { total: number; erledigt: number; laufend: number; geplant: number };
  eingang: { total: number; dringend: number };
  konflikte: number;
  rapporte: { fehlend: number; pruefen: number; verrechnen: number; verrechnenChf: Betrag };
  lager: { ueberfaellig: number; heute: number; knapp: number; leer: number };
  abwesend: { techniker: Techniker; absenz: Absenz }[];
  /** Verträge, die im Vorlauf (60 Tage) enden – nach Dringlichkeit. */
  vertraege: VertragsEnde[];
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
    vertraege: [...stammdaten.mitarbeiter.values()]
      .flatMap<VertragsEnde>((mitarbeiter) => {
        const inTagen = vertragEndetIn(mitarbeiter, heute);
        return inTagen === null || mitarbeiter.austritt === undefined ? [] : [{ mitarbeiter, ende: mitarbeiter.austritt, inTagen }];
      })
      .sort((a, b) => a.inTagen - b.inTagen),
    feld,
    zeilen,
    pendenzen: pendenzViews.slice(0, LISTEN_LAENGE),
    fehlendeRapporte: buildFehlendeRapporte(stammdaten, einsaetze, rapporte).slice(0, LISTEN_LAENGE),
    zuPruefen: rapportViews.filter((view) => view.rapport.status === 'erstellt' || view.rapport.status === 'unterschrieben').slice(0, LISTEN_LAENGE),
    lieferungen: lieferungen.slice(0, LISTEN_LAENGE),
  };
}

// ── §3 · Auswertung (Diagramme) ──────────────────────────────────

export interface DienstStand {
  eingestempelt: number;
  pause: number;
  draussen: number;
  gesamt: number;
}

export interface AuslastungZeile {
  techniker: Techniker;
  /** Verplant inklusive Fahrzeit im Verhältnis zum Soll, 0–1 (kann über 1 liegen). */
  anteil: number;
  verplantMin: Minuten;
  fahrzeitMin: Minuten;
  sollMin: Minuten;
}

export interface TagesWert {
  datum: IsoDatum;
  anzahl: number;
}

export interface WochenRapporte {
  montag: IsoDatum;
  label: string;
  /** erstellt oder unterschrieben – noch nicht freigegeben. */
  pruefen: number;
  freigegeben: number;
  verrechnet: number;
}

export interface KategorieAnteil {
  id: Kategorie | 'andere';
  label: string;
  anzahl: number;
}

export interface Auswertung {
  tage: number;
  von: IsoDatum;
  dienst: DienstStand;
  auslastung: AuslastungZeile[];
  erledigt: TagesWert[];
  rapporte: WochenRapporte[];
  kategorien: KategorieAnteil[];
}

const KATEGORIEN_MAX = 4;
const WOCHEN = 8;

// jh› Dieselben Quellen wie die Module (Selektoren, Stempellage) – ein Diagramm darf nie etwas anderes
//     behaupten als die Liste daneben. Mehr als vier Kategorien falten sich in «Andere» (Farben bleiben lesbar).
export function buildAuswertung(state: DispoState, mandant: Mandant, heute: IsoDatum, jetztMin: Minuten, tage = 28): Auswertung {
  const von = addDays(heute, -(tage - 1));
  const imZeitraum = state.einsaetze.filter((einsatz) => einsatz.datum >= von && einsatz.datum <= heute);

  const angestellte = [...state.stammdaten.mitarbeiter.values()].filter((mitarbeiter) => istAngestellt(mitarbeiter, heute));
  const dienst: DienstStand = { eingestempelt: 0, pause: 0, draussen: 0, gesamt: angestellte.length };
  for (const mitarbeiter of angestellte) {
    const lage = stempelLage(mitarbeiter, state, mandant, heute, jetztMin);
    if (lage.status === 'arbeitet') dienst.eingestempelt += 1;
    else if (lage.status === 'pause') dienst.pause += 1;
    else dienst.draussen += 1;
  }

  const auslastung = buildTagesZeilen(state.stammdaten, state.einsaetze, heute, LEERER_FILTER, jetztMin)
    .map<AuslastungZeile>((zeile) => {
      const kapazitaet = kapazitaetFor(zeile);
      return { techniker: zeile.techniker, anteil: kapazitaet.anteil, verplantMin: kapazitaet.verplantMin, fahrzeitMin: kapazitaet.fahrzeitMin, sollMin: kapazitaet.sollMin };
    })
    .sort((a, b) => b.anteil - a.anteil || a.techniker.nachname.localeCompare(b.techniker.nachname, 'de-CH'));

  const erledigt = rangeDays(von, heute).map<TagesWert>((datum) => ({ datum, anzahl: imZeitraum.filter((einsatz) => einsatz.datum === datum && (einsatz.status === 'erledigt' || einsatz.status === 'wartet-teil')).length }));

  const ersterMontag = startOfWeek(addDays(heute, -7 * (WOCHEN - 1)));
  const rapporte = Array.from({ length: WOCHEN }, (_, index): WochenRapporte => {
    const montag = addDays(ersterMontag, index * 7);
    const sonntag = addDays(montag, 6);
    const dieserWoche = state.rapporte.filter((rapport) => {
      const datum = rapport.erstelltAm.slice(0, 10);
      return datum >= montag && datum <= sonntag;
    });
    return {
      montag,
      label: `KW ${isoWeek(montag)}`,
      pruefen: dieserWoche.filter((rapport) => rapport.status === 'erstellt' || rapport.status === 'unterschrieben').length,
      freigegeben: dieserWoche.filter((rapport) => rapport.status === 'freigegeben').length,
      verrechnet: dieserWoche.filter((rapport) => rapport.status === 'verrechnet').length,
    };
  });

  const zaehler = new Map<Kategorie, number>();
  for (const einsatz of imZeitraum) {
    const auftrag = state.stammdaten.auftraege.get(einsatz.auftragId);
    if (!auftrag) continue;
    zaehler.set(auftrag.kategorie, (zaehler.get(auftrag.kategorie) ?? 0) + 1);
  }
  const sortiert = [...zaehler.entries()].sort((a, b) => b[1] - a[1]);
  const kategorien: KategorieAnteil[] = sortiert.slice(0, KATEGORIEN_MAX).map(([id, anzahl]) => ({ id, label: KATEGORIEN.find((meta) => meta.id === id)?.label ?? id, anzahl }));
  const rest = sortiert.slice(KATEGORIEN_MAX).reduce((summe, [, anzahl]) => summe + anzahl, 0);
  if (rest > 0) kategorien.push({ id: 'andere', label: 'Andere', anzahl: rest });

  return { tage, von, dienst, auslastung, erledigt, rapporte, kategorien };
}

/* ◆ jh · eof */
