/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/Verbindungen.tsx               │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Verknüpfungslinien: Block-Registry + SVG-Winkel zu Folge/Bezug        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { createContext, useContext, useId, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { toZeitpunkt } from '../../../core/datum';
import { cx } from '../../../core/ui/cx';
import type { EinsatzView } from '../store/dispo.selectors';
import styles from './Verbindungen.module.css';

// ── §1 · Registry: welcher Block steht wo ────────────────────────

export interface BlockRegistry {
  melden: (einsatzId: string, knoten: HTMLElement) => void;
  abmelden: (einsatzId: string) => void;
  knoten: (einsatzId: string) => HTMLElement | undefined;
}

const BlockRegistryContext = createContext<BlockRegistry | null>(null);

// jh› Die Registry ist bewusst kein State: Blöcke tragen sich im Layout-Effekt
//     ein, die Linien lesen erst danach – ohne Re-Render-Kaskade pro Block.
export function BlockRegistryProvider({ children }: { children: ReactNode }) {
  const registry = useMemo<BlockRegistry>(() => {
    const knoten = new Map<string, HTMLElement>();
    return {
      melden: (einsatzId, element) => {
        knoten.set(einsatzId, element);
      },
      abmelden: (einsatzId) => {
        knoten.delete(einsatzId);
      },
      knoten: (einsatzId) => knoten.get(einsatzId),
    };
  }, []);
  return <BlockRegistryContext.Provider value={registry}>{children}</BlockRegistryContext.Provider>;
}

export function useBlockRegistry(): BlockRegistry | null {
  return useContext(BlockRegistryContext);
}

// ── §2 · Geometrie ───────────────────────────────────────────────

interface Rechteck {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Zeichnung {
  linien: { id: string; pfad: string; gestrichelt: boolean; label: string; labelX: number; labelY: number; startX: number; startY: number }[];
  stummel: { id: string; pfad: string; gestrichelt: boolean; label: string; labelX: number; labelY: number; links: boolean }[];
}

const LEER: Zeichnung = { linien: [], stummel: [] };
const STUMMEL_LAENGE = 26;

// jh› Winkel statt Gerade: läuft zwischen den Blöcken durch wie eine Gantt-Abhängigkeit.
//     Seitlich, wenn die Blöcke sich horizontal nicht überlappen (Plantafel), sonst
//     oben/unten (Kalender-Spalten).
function winkel(von: Rechteck, nach: Rechteck, richtung: 'horizontal' | 'vertikal'): { pfad: string; mitte: { x: number; y: number }; start: { x: number; y: number } } {
  const rechtsFrei = nach.x >= von.x + von.w;
  const linksFrei = nach.x + nach.w <= von.x;
  const untenFrei = nach.y >= von.y + von.h;
  const obenFrei = nach.y + nach.h <= von.y;
  const seitlich = (rechtsFrei || linksFrei) && (richtung === 'horizontal' || !(untenFrei || obenFrei));

  if (seitlich) {
    const sx = rechtsFrei ? von.x + von.w : von.x;
    const ex = rechtsFrei ? nach.x : nach.x + nach.w;
    const sy = von.y + von.h / 2;
    const ey = nach.y + nach.h / 2;
    const mx = (sx + ex) / 2;
    return { pfad: `M${sx} ${sy} H${mx} V${ey} H${ex}`, mitte: { x: mx, y: (sy + ey) / 2 }, start: { x: sx, y: sy } };
  }
  if (untenFrei || obenFrei) {
    const sy = untenFrei ? von.y + von.h : von.y;
    const ey = untenFrei ? nach.y : nach.y + nach.h;
    const sx = von.x + von.w / 2;
    const ex = nach.x + nach.w / 2;
    const my = (sy + ey) / 2;
    return { pfad: `M${sx} ${sy} V${my} H${ex} V${ey}`, mitte: { x: (sx + ex) / 2, y: my }, start: { x: sx, y: sy } };
  }
  const sx = von.x + von.w / 2;
  const sy = von.y + von.h / 2;
  const ex = nach.x + nach.w / 2;
  const ey = nach.y + nach.h / 2;
  return { pfad: `M${sx} ${sy} L${ex} ${ey}`, mitte: { x: (sx + ex) / 2, y: (sy + ey) / 2 }, start: { x: sx, y: sy } };
}

// ── §3 · Linien ──────────────────────────────────────────────────

interface VerbindungenProps {
  /** Element, in dem die Blöcke liegen (position: relative, scrollt mit). */
  containerRef: RefObject<HTMLElement | null>;
  /** Gewählter Einsatz – seine Verknüpfungen werden gezeichnet. */
  aktiv: EinsatzView | null;
  /** Ändert sich, sobald Blöcke anders liegen (Zoom, Breite, Spalten). */
  signatur: string;
  /** Hauptachse der Zeit: waagrecht (Plantafel) oder senkrecht (Kalender). */
  richtung: 'horizontal' | 'vertikal';
}

export function Verbindungen({ containerRef, aktiv, signatur, richtung }: VerbindungenProps) {
  const registry = useBlockRegistry();
  const pfeilId = useId();
  const [zeichnung, setZeichnung] = useState<Zeichnung>(LEER);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !registry || !aktiv || aktiv.verknuepfungen.length === 0) {
      setZeichnung(LEER);
      return;
    }
    const basis = container.getBoundingClientRect();
    const rechteck = (einsatzId: string): Rechteck | null => {
      const knoten = registry.knoten(einsatzId);
      if (!knoten) return null;
      const rect = knoten.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return null;
      return { x: rect.left - basis.left, y: rect.top - basis.top, w: rect.width, h: rect.height };
    };

    const von = rechteck(aktiv.einsatz.id);
    if (!von) {
      setZeichnung(LEER);
      return;
    }
    const eigenerZeitpunkt = toZeitpunkt(aktiv.einsatz.datum, aktiv.einsatz.startMin);
    const neu: Zeichnung = { linien: [], stummel: [] };
    // jh› Mehrere Stummel auf derselben Seite rücken je 18 px nach unten, statt sich zu überdecken.
    const stummelProSeite = { links: 0, rechts: 0 };

    aktiv.verknuepfungen.forEach((verknuepfung, index) => {
      if (!verknuepfung.einsatzId) return;
      const gestrichelt = verknuepfung.art === 'bezug' || verknuepfung.art === 'bezogen';
      const id = `${verknuepfung.einsatzId}-${index}`;
      const nach = rechteck(verknuepfung.einsatzId);
      if (nach) {
        const { pfad, mitte, start } = winkel(von, nach, richtung);
        neu.linien.push({ id, pfad, gestrichelt, label: verknuepfung.kurz, labelX: mitte.x, labelY: mitte.y, startX: start.x, startY: start.y });
        return;
      }
      // jh› Ziel liegt an einem anderen Tag: kurzer Pfeil aus dem Block heraus, Beschriftung sagt wohin.
      if (!verknuepfung.datum) return;
      const spaeter = toZeitpunkt(verknuepfung.datum, verknuepfung.startMin ?? 0) > eigenerZeitpunkt;
      const seite = spaeter ? 'rechts' : 'links';
      const y = von.y + Math.min(von.h / 2, 11) + stummelProSeite[seite] * 18;
      stummelProSeite[seite] += 1;
      const x0 = spaeter ? von.x + von.w : von.x;
      const x1 = spaeter ? x0 + STUMMEL_LAENGE : x0 - STUMMEL_LAENGE;
      const label = verknuepfung.wann ? `${verknuepfung.kurz} · ${verknuepfung.wann}` : verknuepfung.kurz;
      neu.stummel.push({ id, pfad: `M${x0} ${y} H${x1}`, gestrichelt, label, labelX: spaeter ? x1 + 4 : x1 - 4, labelY: y, links: !spaeter });
    });
    setZeichnung(neu);
  }, [containerRef, registry, aktiv, richtung, signatur]);

  if (zeichnung.linien.length === 0 && zeichnung.stummel.length === 0) return null;

  return (
    <div className={styles.overlay} aria-hidden>
      <svg className={styles.svg}>
        <defs>
          <marker id={pfeilId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0.5 L7.5 4 L0 7.5 Z" fill="currentColor" />
          </marker>
        </defs>
        {zeichnung.linien.map((linie) => (
          <g key={linie.id}>
            <path d={linie.pfad} className={cx(styles.linie, linie.gestrichelt && styles.gestrichelt)} markerEnd={`url(#${pfeilId})`} />
            <circle cx={linie.startX} cy={linie.startY} r={3} className={styles.punkt} />
          </g>
        ))}
        {zeichnung.stummel.map((stummel) => (
          <path key={stummel.id} d={stummel.pfad} className={cx(styles.linie, stummel.gestrichelt && styles.gestrichelt)} markerEnd={`url(#${pfeilId})`} />
        ))}
      </svg>
      {zeichnung.linien.map((linie) => (
        <span key={linie.id} className={styles.label} style={{ left: linie.labelX, top: linie.labelY }}>
          {linie.label}
        </span>
      ))}
      {zeichnung.stummel.map((stummel) => (
        <span key={stummel.id} className={cx(styles.label, stummel.links ? styles.labelLinks : styles.labelRechts)} style={{ left: stummel.labelX, top: stummel.labelY }}>
          {stummel.label}
        </span>
      ))}
    </div>
  );
}

/* ◆ jh · eof */
