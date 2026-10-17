/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/cx.ts                                      │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Klassennamen zusammensetzen und per Kebab-Namen nachschlagen          │
   └────────────────────────────────────────────────────────────────────────┘ */

// ── §1 · Helfer ──────────────────────────────────────────────────

export type ClassToken = string | false | null | undefined;

// jh› CSS-Module liefern unter noUncheckedIndexedAccess `string | undefined` –
//     cx() schluckt die Lücken, statt «undefined» in den DOM zu schreiben.
export function cx(...tokens: ClassToken[]): string {
  return tokens.filter(Boolean).join(' ');
}

// jh! Vite exportiert mit localsConvention «camelCaseOnly» nur styles.statusVorOrt –
//     styles['status-vor-ort'] ist still undefined. Alle dynamischen Zugriffe
//     laufen deshalb hier durch.
export function modulKlasse(styles: Readonly<Record<string, string>>, name: string): string | undefined {
  return styles[name.replace(/-([a-z0-9])/g, (_, zeichen: string) => zeichen.toUpperCase())];
}

/* ◆ jh · eof */
