/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/suche/globaleSuche.ts                      │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Suchquellen für die Palette: Aufträge, Kunden, Geräte – überall       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useHeute } from '../../core/arbeitstag';
import { useRegisterSuchQuelle } from '../../core/kommando';
import type { SuchQuelle } from '../../core/kommando';
import { ZIEL } from '../../core/ui/Verweis';
import { useDispoState } from '../dispo/store/dispoStore';
import { buildAuftraegeSuchIndex, buildAuftragViews } from '../auftraege/auftraege.model';
import { buildGeraeteSuchIndex, buildGeraeteViews } from '../geraete/geraete.model';
import { buildKundenSuchIndex, buildKundenViews } from '../kunden/kunden.model';

// ── §1 · Hook ────────────────────────────────────────────────────

interface Optionen {
  /** Die Disposition bringt ihre eigene Auftragssuche mit (öffnet im Plan statt im Modul). */
  ohneAuftraege?: boolean;
}

// jh› Strg+K findet von jeder Seite aus Auftrag, Kunde und Gerät – die Quellen rechnen auf
//     demselben Stand wie die Module, der Treffer springt ins passende Dossier.
export function useGlobaleSuchquellen({ ohneAuftraege = false }: Optionen = {}): void {
  const state = useDispoState();
  const heute = useHeute();
  const navigate = useNavigate();
  const { stammdaten, einsaetze, pendenzen, rapporte, nachrichten } = state;

  const auftragViews = useMemo(() => buildAuftragViews(stammdaten, einsaetze, pendenzen, rapporte, heute), [stammdaten, einsaetze, pendenzen, rapporte, heute]);
  const auftraegeIndex = useMemo(() => (ohneAuftraege ? [] : buildAuftraegeSuchIndex(auftragViews)), [auftragViews, ohneAuftraege]);
  const kundenIndex = useMemo(() => buildKundenSuchIndex(buildKundenViews(stammdaten, auftragViews, nachrichten)), [stammdaten, auftragViews, nachrichten]);
  const geraeteIndex = useMemo(() => buildGeraeteSuchIndex(buildGeraeteViews(stammdaten, auftragViews, rapporte, heute)), [stammdaten, auftragViews, rapporte, heute]);

  const auftraege = useMemo<SuchQuelle>(() => ({ id: 'auftraege', label: 'Aufträge', eintraege: auftraegeIndex, onSelect: (id) => navigate(ZIEL.auftrag(id)) }), [auftraegeIndex, navigate]);
  const kunden = useMemo<SuchQuelle>(() => ({ id: 'kunden', label: 'Kunden & Liegenschaften', eintraege: kundenIndex, onSelect: (id) => navigate(ZIEL.kunde(id)) }), [kundenIndex, navigate]);
  const geraete = useMemo<SuchQuelle>(() => ({ id: 'geraete', label: 'Geräte', eintraege: geraeteIndex, onSelect: (id) => navigate(ZIEL.geraet(id)) }), [geraeteIndex, navigate]);

  useRegisterSuchQuelle(auftraege);
  useRegisterSuchQuelle(kunden);
  useRegisterSuchQuelle(geraete);
}

/* ◆ jh · eof */
