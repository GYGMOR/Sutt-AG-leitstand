/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/SegmentedControl.tsx                       │
   │  ◆ JH · 2026.10 · rev 01                                               │
   │  Umschalter mit Messmarke – Tag/Woche, Region                          │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { KeyboardEvent } from 'react';
import { cx } from './cx';
import styles from './SegmentedControl.module.css';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

const PFEIL_RICHTUNG: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowLeft: -1 };

// ── §2 · Komponente ──────────────────────────────────────────────

export function SegmentedControl<T extends string>({ label, options, value, onChange, className }: SegmentedControlProps<T>) {
  function onSegmentKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const richtung = PFEIL_RICHTUNG[event.key];
    if (!richtung) return;
    event.preventDefault();
    const naechste = options[(index + richtung + options.length) % options.length];
    if (naechste) onChange(naechste.value);
  }

  return (
    <div role="radiogroup" aria-label={label} className={cx(styles.segmented, className)}>
      {options.map((option, index) => {
        const aktiv = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={aktiv}
            tabIndex={aktiv ? 0 : -1}
            title={option.title}
            className={cx(styles.segment, aktiv && styles.aktiv)}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onSegmentKeyDown(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ◆ jh · eof */
