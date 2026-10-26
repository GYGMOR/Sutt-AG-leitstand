/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/personal/useStempeluhr.ts                  │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Stempeluhr-Zustand: Zonenzeit, Sekunden, Soll, Umstellung, Aktionen   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useMemo } from 'react';
import type { Minuten } from '../../core/datum';
import type { Einsatz } from '../../core/domain/einsatz';
import { istMonatGesperrt, moeglicheStempel } from '../../core/domain/zeit';
import type { StempelArt, ZeitGeraet } from '../../core/domain/zeit';
import { useNow } from '../../core/hooks/useNow';
import { useMandant } from '../../core/mandant/mandantStore';
import { jetztInZone, naechsteUmstellung, umstellungAm } from '../../core/zeitzone';
import type { Umstellung, ZonenZeit } from '../../core/zeitzone';
import { useDispoState } from '../dispo/store/dispoStore';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { stempelLage } from './personal.model';
import type { StempelLage } from './personal.model';
import { useRechte } from './rechte';

// ── §1 · Hook ────────────────────────────────────────────────────

export interface Stempeluhr extends StempelLage {
  /** Person, für die gestempelt wird – null ohne Personalakte. */
  mitarbeiterId: string | null;
  name: string;
  /** Stempeln erlaubt: eigene Akte, Recht «zeit:erfassen», Monat nicht genehmigt. */
  darf: boolean;
  moeglich: readonly StempelArt[];
  /** «Jetzt» in der Zone des Betriebs, sekundengenau. */
  uhr: ZonenZeit;
  zone: string;
  jetztMin: Minuten;
  /** Heute geleistete Arbeit in Sekunden – für die grosse Anzeige. */
  arbeitSekunden: number;
  /** Zeitumstellung heute bzw. die nächste. */
  umstellungHeute: Umstellung | undefined;
  naechsteUmstellung: Umstellung | undefined;
  /** Heutige Einsätze der Person (Techniker) – zum Zuordnen an den laufenden Eintrag. */
  einsaetzeHeute: readonly Einsatz[];
  stempeln: (art: StempelArt) => void;
}

// jh# 019 Stempel offline puffern: Ohne Netz geht ein Stempel aus der App heute verloren – Warteschlange mit
//         Gerätezeit, beim Senden in Zonenzeit umgerechnet (gehört zur Offline-Warteschlange, To-do 013).
// jh› Gestempelt wird nur für die eigene Personalakte – auch wenn das Büro die App «als Techniker» ansieht.
//     Die Uhr läuft in der Zone des Betriebs (Europe/Zurich), nicht in der des Geräts: Ein Techniker im Ausland
//     stempelt trotzdem Schweizer Zeit, und am Umstellungstag stimmt der Tag mit 23 oder 25 Stunden.
export function useStempeluhr(geraet: ZeitGeraet = 'leitstand', sekunden = false): Stempeluhr {
  const rechte = useRechte();
  const state = useDispoState();
  const mandant = useMandant();
  const jetzt = useNow(sekunden ? 1000 : 30_000);
  const aktionen = useDispoAktionen();
  const person = rechte.mitarbeiter;
  const zone = mandant.zeitzone;
  const uhr = useMemo(() => jetztInZone(zone, jetzt), [zone, jetzt]);
  const heute = uhr.datum;
  const jetztMin = uhr.minuten;

  const lage = useMemo<StempelLage>(() => {
    if (!person) return { status: 'draussen', laufender: undefined, arbeitMin: 0, pauseMin: 0, sollMin: 0, seitMin: null, kommenMin: null, gehenMin: null };
    return stempelLage(person, state, mandant, heute, jetztMin);
  }, [person, state, mandant, heute, jetztMin]);

  const gesperrt = person ? istMonatGesperrt(state.monatsabschluesse, person.id, heute) : true;
  const darf = person !== null && rechte.hat('zeit:erfassen') && !gesperrt;
  const stempeln = useCallback(
    (art: StempelArt) => {
      if (!person || !darf) return;
      aktionen.stempeln(person.id, art, geraet, zone);
    },
    [person, darf, aktionen, geraet, zone],
  );

  // jh› Sekunden kommen nur vom laufenden Arbeitsblock; abgeschlossene Blöcke sind minutengenau.
  const laufendeArbeit = lage.laufender?.art === 'arbeit';
  const arbeitSekunden = lage.arbeitMin * 60 + (laufendeArbeit ? uhr.sekunden : 0);
  const einsaetzeHeute = useMemo(() => (person?.technikerId ? state.einsaetze.filter((einsatz) => einsatz.technikerId === person.technikerId && einsatz.datum === heute).sort((a, b) => a.startMin - b.startMin) : []), [person?.technikerId, state.einsaetze, heute]);

  return {
    ...lage,
    mitarbeiterId: person?.id ?? null,
    name: person ? `${person.vorname} ${person.nachname}` : '',
    darf,
    moeglich: moeglicheStempel(lage.status),
    uhr,
    zone,
    jetztMin,
    arbeitSekunden,
    umstellungHeute: umstellungAm(zone, heute),
    naechsteUmstellung: naechsteUmstellung(zone, heute),
    einsaetzeHeute,
    stempeln,
  };
}

/* ◆ jh · eof */
