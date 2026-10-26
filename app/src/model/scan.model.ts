/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/model/scan.model.ts                            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Scan deuten: Artikel, Auftrag, Rapport, Gerät (Seriennummer), Link    │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Auftrag } from '@sl/core/domain/auftrag';
import type { Einsatz } from '@sl/core/domain/einsatz';
import { LAGER_GLATTBRUGG, bestandVon, fahrzeugOrt } from '@sl/core/domain/lager';
import type { Artikel } from '@sl/core/domain/lager';
import type { Rapport } from '@sl/core/domain/rapport';
import type { Geraet } from '@sl/core/domain/stammdaten';
import type { DispoState } from '@sl/modules/dispo/store/dispo.reducer';

// ── §1 · Typen ───────────────────────────────────────────────────

export type ScanErgebnis =
  | { art: 'artikel'; artikel: Artikel; anBord: number; glattbrugg: number }
  | { art: 'auftrag'; auftrag: Auftrag; einsatz: Einsatz | null }
  | { art: 'rapport'; rapport: Rapport }
  | { art: 'geraet'; geraet: Geraet }
  | { art: 'link'; url: string }
  | { art: 'unbekannt'; text: string };

export interface ScanBeispiel {
  label: string;
  code: string;
}

// ── §2 · Deuten ──────────────────────────────────────────────────

function normiert(wert: string): string {
  return wert.replace(/\s+/g, '').toUpperCase();
}

// jh› Reihenfolge mit Absicht: Rapport-QR (Druck) vor Auftragsnummer, Artikel vor Gerät – ein Code,
//     eine Bedeutung. Was nichts trifft, bleibt «unbekannt» und wird nicht erraten.
export function interpretiereScan(roh: string, state: DispoState, technikerId: string | null): ScanErgebnis {
  const text = roh.trim();
  if (text === '') return { art: 'unbekannt', text };
  const { stammdaten } = state;

  const rapportPfad = /\/rapporte\/([^/?#]+)/.exec(text);
  const rapportId = rapportPfad?.[1];
  const rapport = state.rapporte.find((kandidat) => (rapportId !== undefined && kandidat.id === rapportId) || normiert(kandidat.nummer) === normiert(text));
  if (rapport) return { art: 'rapport', rapport };

  const artikel = stammdaten.artikel.get(text) ?? [...stammdaten.artikel.values()].find((kandidat) => normiert(kandidat.artikelNummer) === normiert(text));
  if (artikel) {
    return {
      art: 'artikel',
      artikel,
      anBord: technikerId ? bestandVon(state.bestaende, artikel.artikelNummer, fahrzeugOrt(technikerId)) : 0,
      glattbrugg: bestandVon(state.bestaende, artikel.artikelNummer, LAGER_GLATTBRUGG),
    };
  }

  const auftrag = stammdaten.auftraege.get(text) ?? [...stammdaten.auftraege.values()].find((kandidat) => normiert(kandidat.nummer) === normiert(text));
  if (auftrag) {
    const eigene = state.einsaetze.filter((einsatz) => einsatz.auftragId === auftrag.id && (technikerId === null || einsatz.technikerId === technikerId)).sort((a, b) => b.datum.localeCompare(a.datum) || b.startMin - a.startMin);
    return { art: 'auftrag', auftrag, einsatz: eigene[0] ?? null };
  }

  const geraet = stammdaten.geraete.get(text) ?? [...stammdaten.geraete.values()].find((kandidat) => kandidat.seriennummer !== '' && normiert(kandidat.seriennummer) === normiert(text));
  if (geraet) return { art: 'geraet', geraet };

  if (/^https?:\/\//i.test(text)) return { art: 'link', url: text };
  return { art: 'unbekannt', text };
}

/** Demo-Codes zum Antippen, wenn kein Scanner läuft (Laptop, iOS ohne BarcodeDetector). */
export function scanBeispiele(state: DispoState, technikerId: string | null, heute: string): ScanBeispiel[] {
  const beispiele: ScanBeispiel[] = [];
  const bord = technikerId ? state.bestaende.find((bestand) => bestand.ort === fahrzeugOrt(technikerId) && bestand.menge > 0) : undefined;
  if (bord) beispiele.push({ label: 'Artikel im Fahrzeug', code: bord.artikelNummer });
  const einsatz = state.einsaetze.find((kandidat) => kandidat.datum === heute && (technikerId === null || kandidat.technikerId === technikerId));
  const auftrag = einsatz ? state.stammdaten.auftraege.get(einsatz.auftragId) : undefined;
  if (auftrag) beispiele.push({ label: 'Auftrag von heute', code: auftrag.nummer });
  const rapport = state.rapporte.find((kandidat) => technikerId === null || kandidat.technikerId === technikerId) ?? state.rapporte[0];
  if (rapport) beispiele.push({ label: 'Rapport-QR', code: `${window.location.origin}/rapporte/${rapport.id}/druck` });
  const geraet = auftrag ? state.stammdaten.geraete.get(auftrag.geraetId) : undefined;
  if (geraet && geraet.seriennummer) beispiele.push({ label: 'Seriennummer Gerät', code: geraet.seriennummer });
  return beispiele;
}

/* ◆ jh · eof */
