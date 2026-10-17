/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Hovercard.tsx                              │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Schwebende Kurzansicht neben einem Anker – rechts, sonst links/unten  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Hovercard.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface HovercardProps {
  anchor: DOMRect;
  breite?: number;
  children: ReactNode;
}

const RAND = 8;
const ABSTAND = 8;

export function Hovercard({ anchor, breite = 300, children }: HovercardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden', width: breite });

  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const hoehe = panel.getBoundingClientRect().height;
    // jh› Reihenfolge rechts → links → unten: die Plantafel liegt links der
    //     Spalte, die Karte soll den Block selbst nie verdecken.
    let left = anchor.right + ABSTAND;
    if (left + breite > window.innerWidth - RAND) left = anchor.left - breite - ABSTAND;
    let top = anchor.top;
    if (left < RAND) {
      left = Math.min(Math.max(RAND, anchor.left), window.innerWidth - RAND - breite);
      top = anchor.bottom + ABSTAND;
    }
    if (top + hoehe > window.innerHeight - RAND) top = Math.max(RAND, window.innerHeight - RAND - hoehe);
    setPosition({ top, left, width: breite });
  }, [anchor, breite]);

  return createPortal(
    <div ref={ref} className={styles.hovercard} style={position} role="tooltip">
      {children}
    </div>,
    document.body,
  );
}

/* ◆ jh · eof */
