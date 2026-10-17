/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Popover.tsx                                │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Verankertes Popover (Portal), Klick ausserhalb / Esc schliesst        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import styles from './Popover.module.css';

// ── §1 · Typen ───────────────────────────────────────────────────

export type PopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'right-start' | 'left-start';

interface PopoverProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  placement?: PopoverPlacement;
  /** Abstand zum Anker in px. */
  abstand?: number;
  breite?: number;
  label?: string;
  className?: string;
  children: ReactNode;
}

const RAND = 8;

// ── §2 · Position ────────────────────────────────────────────────

function berechnePosition(anker: DOMRect, panel: DOMRect, placement: PopoverPlacement, abstand: number): { top: number; left: number } {
  let top = anker.bottom + abstand;
  let left = anker.left;
  if (placement === 'bottom-end') left = anker.right - panel.width;
  if (placement === 'top-start') top = anker.top - panel.height - abstand;
  if (placement === 'right-start') {
    top = anker.top;
    left = anker.right + abstand;
  }
  if (placement === 'left-start') {
    top = anker.top;
    left = anker.left - panel.width - abstand;
  }
  // jh› Lieber umklappen als abschneiden – unten/rechts am Fenster wird gespiegelt.
  if (top + panel.height > window.innerHeight - RAND) top = Math.max(RAND, anker.top - panel.height - abstand);
  if (left + panel.width > window.innerWidth - RAND) left = Math.max(RAND, window.innerWidth - RAND - panel.width);
  if (left < RAND) left = RAND;
  if (top < RAND) top = RAND;
  return { top, left };
}

// ── §3 · Komponente ──────────────────────────────────────────────

export function Popover({ anchor, open, onClose, placement = 'bottom-start', abstand = 6, breite, label, className, children }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!open || !anchor) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;

    const neuPositionieren = () => {
      const { top, left } = berechnePosition(anchor.getBoundingClientRect(), panel.getBoundingClientRect(), placement, abstand);
      setPosition({ top, left, ...(breite ? { width: breite } : {}) });
    };
    neuPositionieren();

    function onPointerDown(event: globalThis.PointerEvent) {
      const ziel = event.target;
      if (!(ziel instanceof Node)) return;
      if (panel?.contains(ziel) || anchor?.contains(ziel)) return;
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', neuPositionieren);
    window.addEventListener('scroll', neuPositionieren, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', neuPositionieren);
      window.removeEventListener('scroll', neuPositionieren, true);
    };
  }, [open, anchor, placement, abstand, breite, onClose]);

  if (!open || !anchor) return null;

  return createPortal(
    <div ref={panelRef} role="dialog" aria-label={label} className={cx(styles.popover, className)} style={position}>
      {children}
    </div>,
    document.body,
  );
}

/* ◆ jh · eof */
