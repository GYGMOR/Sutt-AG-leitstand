/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/signature.ts                                  │
   │  ◆ JH · 2026.10 · rev 01                                               │
   │  Code-Handschrift ◆ JH – Konstante und Dev-Konsolengruss               │
   └────────────────────────────────────────────────────────────────────────┘ */

// ── §1 · Signatur ────────────────────────────────────────────────

export const SIG = '◆ JH · SUTT·LEITSTAND' as const;

// ── §2 · Konsolengruss ───────────────────────────────────────────

let announced = false;

export function announceSignature(): void {
  if (!import.meta.env.DEV) return;
  // jh! StrictMode und HMR laden Module mehrfach – Flag hält es bei einer Zeile.
  if (announced) return;
  announced = true;

  const mono = 'font-family:"IBM Plex Mono",ui-monospace,monospace';
  console.info(
    `%c◆%c ${SIG.slice(2)} %c· build ${__SL_BUILD_DATUM__}`,
    'color:#F86C04;font-size:14px',
    `color:#1A1A1A;font-weight:600;letter-spacing:.06em;${mono}`,
    `color:#6B6B6B;${mono}`,
  );
}

/* ◆ jh · eof */
