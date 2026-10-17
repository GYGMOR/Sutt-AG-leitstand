/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/karte/MapCanvas.tsx                  │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Kartenwahl: Google (Key) → MapLibre/OSM → Schemakarte, nie leer       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Suspense, lazy, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import { useElementSize } from '../../../core/hooks/useElementSize';
import { IconButton } from '../../../core/ui/Button';
import { cx } from '../../../core/ui/cx';
import type { KartenProps } from './karte.types';
import { SchemaKarte } from './SchemaKarte';
import styles from './MapCanvas.module.css';

// ── §1 · Lazy-Karten ─────────────────────────────────────────────

// jh› Kartenbibliotheken laden erst, wenn eine Karte sichtbar wird (Akte, Kartenansicht).
const GoogleKarte = lazy(() => import('./GoogleKarte').then((m) => ({ default: m.GoogleKarte })));
const LibreKarte = lazy(() => import('./LibreKarte').then((m) => ({ default: m.LibreKarte })));

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
const GOOGLE_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? '';

export type KartenTyp = 'karte' | 'schema';

// ── §2 · Komponente ──────────────────────────────────────────────

interface MapCanvasProps extends KartenProps {
  className?: string;
  /** Umschalter Karte/Schema einblenden. */
  typwahl?: boolean;
  /** Startwert des Umschalters. */
  typ?: KartenTyp;
}

export function MapCanvas({ className, typwahl = false, typ: startTyp = 'karte', ...karte }: MapCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(ref);
  const [typ, setTyp] = useState<KartenTyp>(startTyp);
  const [libreGescheitert, setLibreGescheitert] = useState(false);

  const schema = <SchemaKarte {...karte} breite={Math.max(width, 120)} hoehe={Math.max(height, 90)} />;
  const zeigeSchema = typ === 'schema' || (!GOOGLE_KEY && libreGescheitert);

  return (
    <div ref={ref} className={cx(styles.canvas, className)}>
      {zeigeSchema ? (
        schema
      ) : (
        <Suspense fallback={schema}>
          {GOOGLE_KEY ? <GoogleKarte apiKey={GOOGLE_KEY} {...(GOOGLE_MAP_ID ? { mapId: GOOGLE_MAP_ID } : {})} {...karte} /> : <LibreKarte {...karte} onFehler={() => setLibreGescheitert(true)} />}
        </Suspense>
      )}
      {typwahl && (
        <div className={styles.typwahl}>
          <IconButton icon={Layers} label={typ === 'schema' ? 'Strassenkarte zeigen' : 'Schemakarte zeigen'} size="sm" pressed={typ === 'schema'} onClick={() => setTyp((wert) => (wert === 'schema' ? 'karte' : 'schema'))} />
        </div>
      )}
      {!GOOGLE_KEY && !zeigeSchema && <span className={styles.quelle}>OpenStreetMap · ohne Google-Key</span>}
    </div>
  );
}

/* ◆ jh · eof */
