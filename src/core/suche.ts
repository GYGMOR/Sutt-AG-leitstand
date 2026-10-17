/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/suche.ts                                      │
   │  ◆ JH · 2026.10 · rev 01                                               │
   │  Suchindex-Format und Treffer-Logik der globalen Suche                 │
   └────────────────────────────────────────────────────────────────────────┘ */

// ── §1 · Typen ───────────────────────────────────────────────────

export interface SuchEintrag {
  id: string;
  kennung: string;
  titel: string;
  untertitel: string;
  /** Alle durchsuchbaren Felder, bereits normalisiert (siehe normalizeSuchtext). */
  suchtext: string;
}

// ── §2 · Suche ───────────────────────────────────────────────────

// jh› Diakritika weg: «zurich» findet «Zürich», «gerat» findet «Gerät».
export function normalizeSuchtext(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function findTreffer(eintraege: readonly SuchEintrag[], anfrage: string, maximum: number): SuchEintrag[] {
  const begriffe = normalizeSuchtext(anfrage).split(/\s+/).filter(Boolean);
  if (begriffe.length === 0) return [];
  return eintraege.filter((eintrag) => begriffe.every((begriff) => eintrag.suchtext.includes(begriff))).slice(0, maximum);
}

/* ◆ jh · eof */
