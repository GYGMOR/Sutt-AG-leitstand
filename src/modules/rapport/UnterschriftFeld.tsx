/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/rapport/UnterschriftFeld.tsx               │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Unterschrift mit Finger oder Maus → SVG-Pfad (320 × 120), Anzeige     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '../../core/ui/Button';
import { cx } from '../../core/ui/cx';
import styles from './UnterschriftFeld.module.css';

// ── §1 · Geometrie ───────────────────────────────────────────────

export const UNTERSCHRIFT_BREITE = 320;
export const UNTERSCHRIFT_HOEHE = 120;

interface Punkt {
  x: number;
  y: number;
}

function runde(wert: number): number {
  return Math.round(wert * 10) / 10;
}

// jh› Pfad statt Bitmap: 2–3 kB Text, scharf in jeder Grösse, druckbar – und ohne Bibliothek.
function pfadAus(zuege: readonly Punkt[][]): string {
  return zuege
    .filter((zug) => zug.length > 0)
    .map((zug) => zug.map((punkt, index) => `${index === 0 ? 'M' : 'L'}${runde(punkt.x)} ${runde(punkt.y)}`).join(' '))
    .join(' ');
}

// ── §2 · Feld ────────────────────────────────────────────────────

interface UnterschriftFeldProps {
  wert: string;
  onChange: (pfad: string) => void;
  disabled?: boolean;
}

export function UnterschriftFeld({ wert, onChange, disabled = false }: UnterschriftFeldProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zuegeRef = useRef<Punkt[][]>([]);
  const [aktiv, setAktiv] = useState(false);

  const punktAus = (event: ReactPointerEvent<SVGSVGElement>): Punkt | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * UNTERSCHRIFT_BREITE,
      y: ((event.clientY - rect.top) / rect.height) * UNTERSCHRIFT_HOEHE,
    };
  };

  const start = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    const punkt = punktAus(event);
    if (!punkt) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    zuegeRef.current = [...zuegeRef.current, [punkt]];
    setAktiv(true);
    onChange(pfadAus(zuegeRef.current));
  };

  const ziehen = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!aktiv || disabled) return;
    const punkt = punktAus(event);
    const letzterZug = zuegeRef.current[zuegeRef.current.length - 1];
    if (!punkt || !letzterZug) return;
    letzterZug.push(punkt);
    onChange(pfadAus(zuegeRef.current));
  };

  const ende = () => setAktiv(false);

  const loeschen = () => {
    zuegeRef.current = [];
    onChange('');
  };

  return (
    <div className={cx(styles.feld, disabled && styles.gesperrt)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${UNTERSCHRIFT_BREITE} ${UNTERSCHRIFT_HOEHE}`}
        className={styles.flaeche}
        role="img"
        aria-label={wert ? 'Unterschrift vorhanden' : 'Hier unterschreiben'}
        onPointerDown={start}
        onPointerMove={ziehen}
        onPointerUp={ende}
        onPointerCancel={ende}
        onPointerLeave={ende}
      >
        <line x1="24" y1="92" x2={UNTERSCHRIFT_BREITE - 24} y2="92" className={styles.linie} />
        <text x="24" y="86" className={styles.kreuz}>
          ×
        </text>
        {wert && <path d={wert} className={styles.strich} />}
      </svg>
      {!wert && !disabled && <span className={styles.hinweis}>Mit Finger oder Maus unterschreiben</span>}
      {wert && !disabled && (
        <Button variant="ghost" size="sm" icon={Eraser} className={styles.loeschen} onClick={loeschen}>
          Neu
        </Button>
      )}
    </div>
  );
}

// ── §3 · Anzeige ─────────────────────────────────────────────────

interface UnterschriftBildProps {
  pfad: string;
  className?: string;
}

export function UnterschriftBild({ pfad, className }: UnterschriftBildProps) {
  return (
    <svg viewBox={`0 0 ${UNTERSCHRIFT_BREITE} ${UNTERSCHRIFT_HOEHE}`} className={cx(styles.bild, className)} role="img" aria-label="Unterschrift">
      <path d={pfad} className={styles.strich} />
    </svg>
  );
}

/* ◆ jh · eof */
