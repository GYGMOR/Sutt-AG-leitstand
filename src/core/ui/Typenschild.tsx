/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Typenschild.tsx                            │
   │  ◆ JH · 2026.10 · rev 01                                               │
   │  Typenschild-Motiv: Nummern wie ein Geräteschild                       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { cx } from './cx';
import styles from './Typenschild.module.css';

// ── §1 · Typenschild (inline) ────────────────────────────────────

interface TypenschildProps {
  label: string;
  wert: string;
  /** Zweiter Wert hinter einem Mittelpunkt, z. B. die Seriennummer. */
  zusatz?: string;
  size?: 'sm' | 'md';
  className?: string;
}

// jh› Wiedererkennung: jede Geräte- und Auftragsnummer im System sieht
//     gleich aus – der Disponent erkennt sie, ohne das Label zu lesen.
export function Typenschild({ label, wert, zusatz, size = 'sm', className }: TypenschildProps) {
  return (
    <span className={cx(styles.typenschild, size === 'md' && styles.md, className)}>
      <span className={styles.label}>{label}</span>
      <span className={styles.wert}>
        {wert}
        {zusatz && <span className={styles.zusatz}>{zusatz}</span>}
      </span>
    </span>
  );
}

// ── §2 · Typenschild-Platte (Detail) ─────────────────────────────

export interface PlattenZeile {
  schluessel: string;
  wert: string;
}

interface TypenschildPlatteProps {
  titel: string;
  marke: string;
  zeilen: readonly PlattenZeile[];
  className?: string;
}

export function TypenschildPlatte({ titel, marke, zeilen, className }: TypenschildPlatteProps) {
  return (
    <figure className={cx(styles.platte, className)}>
      <figcaption className={styles.platteKopf}>
        <span className={styles.label}>{titel}</span>
        <span className={styles.marke}>{marke}</span>
      </figcaption>
      <dl className={styles.platteZeilen}>
        {zeilen.map((zeile) => (
          <div key={zeile.schluessel} className={styles.platteZeile}>
            <dt>{zeile.schluessel}</dt>
            <dd>{zeile.wert}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

/* ◆ jh · eof */
