/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/CapsLabel.tsx                              │
   │  ◆ JH · 2026.10 · rev 01                                               │
   │  Versal-Label 11 px · Feld- und Bereichstitel                          │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './CapsLabel.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface CapsLabelProps {
  children: ReactNode;
  as?: 'span' | 'h2' | 'h3' | 'dt' | 'label';
  tone?: 'mute' | 'ink' | 'signal';
  htmlFor?: string;
  id?: string;
  className?: string;
}

export function CapsLabel({ children, as: Tag = 'span', tone = 'mute', htmlFor, id, className }: CapsLabelProps) {
  const tonKlasse = tone === 'mute' ? undefined : styles[tone];
  if (Tag === 'label') {
    return (
      <label id={id} htmlFor={htmlFor} className={cx(styles.capsLabel, tonKlasse, className)}>
        {children}
      </label>
    );
  }
  return (
    <Tag id={id} className={cx(styles.capsLabel, tonKlasse, className)}>
      {children}
    </Tag>
  );
}

/* ◆ jh · eof */
