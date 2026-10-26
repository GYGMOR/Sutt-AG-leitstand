/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/personal/rechte.ts                         │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  useRechte: Rechte, Umfang, sichtbare Leute · Stand für die Sicht      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import type { Benutzer } from '../../core/auth/auth.types';
import { useBenutzer } from '../../core/auth/authStore';
import { darfPerson, hatRecht, umfangVon } from '../../core/berechtigung/rechte';
import type { Bereich, Recht, RechteTraeger, Sichtkontext, Umfang } from '../../core/berechtigung/rechte';
import { absenzenFuerSicht } from '../../core/domain/absenz';
import { sortiertNachName, unterstellte } from '../../core/domain/personal';
import type { Mitarbeiter } from '../../core/domain/personal';
import type { DispoStammdaten } from '../dispo/dispo.types';
import type { DispoState } from '../dispo/store/dispo.reducer';
import { useDispoSelector, useDispoState } from '../dispo/store/dispoStore';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface Rechte {
  benutzer: Benutzer | null;
  /** Personalakte der angemeldeten Person – null ohne Verknüpfung. */
  mitarbeiter: Mitarbeiter | null;
  traeger: RechteTraeger;
  kontext: Sichtkontext;
  hat: (recht: Recht) => boolean;
  umfang: (bereich: Bereich) => Umfang;
  darfPerson: (bereich: Bereich, mitarbeiterId: string) => boolean;
  /** Mitarbeitende, deren Daten im Bereich sichtbar sind – nach Name sortiert. */
  sichtbare: (bereich: Bereich) => Mitarbeiter[];
  /** Darf Krankheit und Unfall als solche sehen. */
  gesundheit: boolean;
}

// ── §2 · Auswertung ──────────────────────────────────────────────

// jh› Die Rolle der Sitzung gewinnt (Rollenwechsel im Benutzermenü für die Demo); Zusatz, Entzug und
//     Umfang kommen aus dem Konto im Stand – so greift eine Änderung der Administration sofort.
export function rechteFuer(sitzung: Benutzer | null, konten: ReadonlyMap<string, Benutzer>, mitarbeiter: ReadonlyMap<string, Mitarbeiter>): Rechte {
  const konto = sitzung ? konten.get(sitzung.id) : undefined;
  const traeger: RechteTraeger = {
    rolle: sitzung?.rolle ?? 'aussendienst',
    zusatzRechte: konto?.zusatzRechte ?? sitzung?.zusatzRechte ?? [],
    entzogeneRechte: konto?.entzogeneRechte ?? sitzung?.entzogeneRechte ?? [],
    umfang: konto?.umfang ?? sitzung?.umfang ?? {},
  };
  const eigeneId = konto?.mitarbeiterId ?? sitzung?.mitarbeiterId ?? null;
  const alle = [...mitarbeiter.values()];
  const kontext: Sichtkontext = { eigeneId, teamIds: new Set(eigeneId ? unterstellte(alle, eigeneId).map((person) => person.id) : []) };
  const anonym = sitzung === null;

  return {
    benutzer: sitzung,
    mitarbeiter: eigeneId ? (mitarbeiter.get(eigeneId) ?? null) : null,
    traeger,
    kontext,
    hat: (recht) => !anonym && hatRecht(traeger, recht),
    umfang: (bereich) => umfangVon(traeger, bereich),
    darfPerson: (bereich, mitarbeiterId) => !anonym && darfPerson(traeger, bereich, mitarbeiterId, kontext),
    sichtbare: (bereich) => (anonym ? [] : sortiertNachName(alle.filter((person) => darfPerson(traeger, bereich, person.id, kontext)))),
    gesundheit: !anonym && hatRecht(traeger, 'personal:gesundheit'),
  };
}

export function useRechte(): Rechte {
  const sitzung = useBenutzer();
  const konten = useDispoSelector((state) => state.stammdaten.benutzer);
  const mitarbeiter = useDispoSelector((state) => state.stammdaten.mitarbeiter);
  return useMemo(() => rechteFuer(sitzung, konten, mitarbeiter), [sitzung, konten, mitarbeiter]);
}

// ── §3 · Sicht auf Stammdaten ────────────────────────────────────

/** Stammdaten für Plan, Dashboard und App: ohne Gesundheitsdaten, wenn das Recht fehlt – die eigenen bleiben sichtbar. */
export function stammdatenFuerSicht(stammdaten: DispoStammdaten, gesundheit: boolean, eigeneId: string | null = null): DispoStammdaten {
  if (gesundheit) return stammdaten;
  const eigene = eigeneId ? stammdaten.absenzen.filter((absenz) => absenz.mitarbeiterId === eigeneId) : [];
  const fremde = eigeneId ? stammdaten.absenzen.filter((absenz) => absenz.mitarbeiterId !== eigeneId) : stammdaten.absenzen;
  return { ...stammdaten, absenzen: [...eigene, ...absenzenFuerSicht(fremde, false)] };
}

// jh› Plantafel, Dashboard und App lesen den Stand nur durch diese Sicht: Wer «Krank» nicht sehen darf,
//     sieht «Abwesend» – an jeder Stelle gleich, ohne dass jede Ansicht selbst daran denken muss.
export function useStandFuerSicht(): DispoState {
  const state = useDispoState();
  const rechte = useRechte();
  const eigeneId = rechte.mitarbeiter?.id ?? null;
  return useMemo(() => (rechte.gesundheit ? state : { ...state, stammdaten: stammdatenFuerSicht(state.stammdaten, false, eigeneId) }), [state, rechte.gesundheit, eigeneId]);
}

/* ◆ jh · eof */
