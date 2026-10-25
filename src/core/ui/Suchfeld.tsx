/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Suchfeld.tsx                               │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Suchfeld mit Lupe und Leeren-Knopf – gleich in jedem Modul            │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Search, X } from 'lucide-react';
import { IconButton } from './Button';
import { cx } from './cx';
import { Eingabe } from './Form';
import styles from './Suchfeld.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface SuchfeldProps {
  wert: string;
  onChange: (wert: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}

export function Suchfeld({ wert, onChange, placeholder, label, className }: SuchfeldProps) {
  return (
    <div className={cx(styles.suche, className)}>
      <Search size={16} strokeWidth={1.5} aria-hidden className={styles.lupe} />
      <Eingabe value={wert} placeholder={placeholder} aria-label={label} className={styles.feld} onChange={(event) => onChange(event.target.value)} />
      {wert && <IconButton icon={X} label="Suche leeren" size="sm" className={styles.leeren} onClick={() => onChange('')} />}
    </div>
  );
}

/* ◆ jh · eof */
