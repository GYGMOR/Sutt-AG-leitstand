/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/datei.ts                                      │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Datei im Browser herunterladen (CSV, JSON) – ohne Server              │
   └────────────────────────────────────────────────────────────────────────┘ */

// ── §1 · Download ────────────────────────────────────────────────

export type DateiTyp = 'text/csv' | 'application/json';

// jh› Exporte entstehen im Browser als Blob: nichts verlässt das Gerät, bis der Nutzer die Datei ablegt.
export function ladeHerunter(dateiname: string, inhalt: string, typ: DateiTyp): void {
  const blob = new Blob([inhalt], { type: `${typ};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = dateiname;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ◆ jh · eof */
