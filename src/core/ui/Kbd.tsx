/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Kbd.tsx                                    │
   │  ◆ JH · 2026.10 · rev 01                                               │
   │  Tastenhinweis, z. B. ⌘K / Strg K                                      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { cx } from './cx';
import styles from './Kbd.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface KbdProps {
  keys: readonly string[];
  tone?: 'light' | 'chrome';
}

export function Kbd({ keys, tone = 'light' }: KbdProps) {
  return (
    <span className={cx(styles.kbdGruppe, tone === 'chrome' && styles.chrome)} aria-hidden>
      {keys.map((taste) => (
        <kbd key={taste} className={styles.kbd}>
          {taste}
        </kbd>
      ))}
    </span>
  );
}

/* ◆ jh · eof */
