/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/cx.ts                                      │
   │  ◆ JH · 2026.10 · rev 01                                               │
   │  Klassennamen zusammensetzen (CSS-Modules-tauglich)                    │
   └────────────────────────────────────────────────────────────────────────┘ */

// ── §1 · Helfer ──────────────────────────────────────────────────

export type ClassToken = string | false | null | undefined;

// jh› CSS-Module liefern unter noUncheckedIndexedAccess `string | undefined` –
//     cx() schluckt die Lücken, statt «undefined» in den DOM zu schreiben.
export function cx(...tokens: ClassToken[]): string {
  return tokens.filter(Boolean).join(' ');
}

/* ◆ jh · eof */
