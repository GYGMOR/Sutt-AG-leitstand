/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/AuthLayout.tsx                           │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Geteiltes Layout Anmelden/Abgemeldet: Anthrazit links, Form rechts    │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';

// ── §1 · Typenschild-Muster ──────────────────────────────────────

// jh› Sehr dezentes Raster aus Typenschild-Umrissen – Wiedererkennung ohne Bild.
function Muster() {
  return (
    <svg className={styles.muster} aria-hidden>
      <defs>
        <pattern id="sl-schild" width="96" height="64" patternUnits="userSpaceOnUse">
          <rect x="8" y="10" width="80" height="44" rx="2" fill="none" stroke="currentColor" strokeWidth="1" />
          <line x1="16" y1="22" x2="56" y2="22" stroke="currentColor" strokeWidth="1" />
          <line x1="16" y1="32" x2="72" y2="32" stroke="currentColor" strokeWidth="1" />
          <line x1="16" y1="42" x2="44" y2="42" stroke="currentColor" strokeWidth="1" />
          <circle cx="78" cy="18" r="2" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sl-schild)" />
    </svg>
  );
}

// ── §2 · Layout ──────────────────────────────────────────────────

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.seite}>
      <aside className={styles.links}>
        <Muster />
        <div className={styles.wortmarke}>
          <span className={styles.raute} aria-hidden />
          <span className={styles.firma}>SUTT AG</span>
          <span className={styles.schraegstrich} aria-hidden>
            /
          </span>
          <span className={styles.produkt}>Leitstand</span>
        </div>
        <p className={styles.claim}>
          Disposition, Service und Reparatur
          <br />
          für Haushalt-Grossgeräte.
        </p>
        <footer className={styles.fuss}>
          <span>Industriestrasse 24 · 8152 Glattbrugg</span>
          <span className={styles.version}>
            v{__SL_VERSION__} · ◆ JH
          </span>
        </footer>
      </aside>
      <main className={styles.rechts}>{children}</main>
    </div>
  );
}

/* ◆ jh · eof */
