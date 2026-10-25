/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Verweis.tsx                                │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Verweis: Sprung zu Auftrag, Kunde, Gerät, Rapport – als Typenschild   │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { cx } from './cx';
import { Typenschild } from './Typenschild';
import styles from './Verweis.module.css';

// ── §1 · Ziele ───────────────────────────────────────────────────

export const ZIEL = {
  auftrag: (id: string) => `/auftraege/${id}`,
  kunde: (id: string) => `/kunden/${id}`,
  liegenschaft: (kundeId: string, liegenschaftId: string) => `/kunden/${kundeId}?liegenschaft=${liegenschaftId}`,
  geraet: (id: string) => `/geraete/${id}`,
  rapport: (id: string) => `/rapporte/${id}`,
  artikel: (artikelNummer: string) => `/lager/artikel?artikel=${encodeURIComponent(artikelNummer)}`,
  bestellung: (id: string) => `/lager/bestellungen?bestellung=${encodeURIComponent(id)}`,
  bilder: (filter: string) => `/bilder?${filter}`,
} as const;

// ── §2 · Komponente ──────────────────────────────────────────────

interface VerweisProps {
  zu: string;
  label: string;
  wert: string;
  /** Text neben dem Schild, z. B. Kundenname. */
  text?: ReactNode;
  size?: 'sm' | 'md';
  title?: string;
  className?: string;
}

// jh› Ein Datensatz, viele Türen: Jede Nummer im System ist ein Sprung in ihr Modul –
//     dasselbe Typenschild wie überall, plus Pfeil, damit man den Sprung erkennt.
export function Verweis({ zu, label, wert, text, size = 'sm', title, className }: VerweisProps) {
  return (
    <Link to={zu} className={cx(styles.verweis, className)} title={title ?? `${label} ${wert} öffnen`}>
      <Typenschild label={label} wert={wert} size={size} />
      {text && <span className={styles.text}>{text}</span>}
      <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden className={styles.pfeil} />
    </Link>
  );
}

/* ◆ jh · eof */
