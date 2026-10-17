/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/karte/SchemaKarte.tsx                │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Schemakarte (SVG): Mercator, Ortsnamen, Werkhof, Pins, Touren         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import { SUTT_HQ, boundsOf, distanceKm, projectMercator } from '../../../core/geo';
import type { Koordinaten } from '../../../core/geo';
import { cx } from '../../../core/ui/cx';
import type { KartenProps } from './karte.types';
import styles from './SchemaKarte.module.css';

// ── §1 · Orte ────────────────────────────────────────────────────

// jh› Ortsmittelpunkte als Orientierung – die Karte ist ein Schema, keine Topografie.
const ORTE: readonly { name: string; koordinaten: Koordinaten }[] = [
  { name: 'Glattbrugg', koordinaten: { lat: 47.4322, lng: 8.5629 } },
  { name: 'Opfikon', koordinaten: { lat: 47.4318, lng: 8.5756 } },
  { name: 'Kloten', koordinaten: { lat: 47.4515, lng: 8.5848 } },
  { name: 'Wallisellen', koordinaten: { lat: 47.415, lng: 8.5967 } },
  { name: 'Dübendorf', koordinaten: { lat: 47.397, lng: 8.6185 } },
  { name: 'Zürich-Seebach', koordinaten: { lat: 47.423, lng: 8.542 } },
];

// ── §2 · Komponente ──────────────────────────────────────────────

interface SchemaKarteProps extends KartenProps {
  breite: number;
  hoehe: number;
  kompakt?: boolean;
}

export function SchemaKarte({ pins, linien = [], fokusId, uebersicht = false, kompakt = false, breite, hoehe, onPinClick }: SchemaKarteProps) {
  // jh› Kompakt (Hovercard): Pin + Werkhof im Bild, damit die Lage lesbar ist – ein Punkt allein sagt nichts.
  const rahmen = useMemo(() => {
    const punkte: Koordinaten[] = [...pins.map((pin) => pin.koordinaten), ...linien.flatMap((linie) => [...linie.punkte])];
    if (uebersicht || kompakt) punkte.push(SUTT_HQ);
    if (uebersicht) punkte.push(...ORTE.map((ort) => ort.koordinaten));
    if (punkte.length === 0) punkte.push(SUTT_HQ);
    return boundsOf(punkte, kompakt ? 0.35 : 0.2);
  }, [pins, linien, uebersicht, kompakt]);

  const innerhalb = (k: Koordinaten) => k.lat >= rahmen.minLat && k.lat <= rahmen.maxLat && k.lng >= rahmen.minLng && k.lng <= rahmen.maxLng;

  const projizieren = (k: Koordinaten) => projectMercator(k, rahmen, breite, hoehe);

  // Massstab: 1 km in Pixeln am Kartenmittelpunkt
  const massstabPx = useMemo(() => {
    const mitte = { lat: (rahmen.minLat + rahmen.maxLat) / 2, lng: (rahmen.minLng + rahmen.maxLng) / 2 };
    const einKmOst = { lat: mitte.lat, lng: mitte.lng + 1 / (111.32 * Math.cos((mitte.lat * Math.PI) / 180)) };
    const a = projectMercator(mitte, rahmen, breite, hoehe);
    const b = projectMercator(einKmOst, rahmen, breite, hoehe);
    return Math.abs(b.x - a.x) * (1 / Math.max(distanceKm(mitte, einKmOst), 0.001));
  }, [rahmen, breite, hoehe]);

  const hq = projizieren(SUTT_HQ);

  return (
    <svg className={cx(styles.karte, kompakt && styles.kompakt)} viewBox={`0 0 ${breite} ${hoehe}`} width={breite} height={hoehe} role="img" aria-label="Schemakarte der Einsätze">
      <defs>
        <pattern id="sl-karte-raster" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" className={styles.raster} />
        </pattern>
      </defs>
      <rect width={breite} height={hoehe} className={styles.grund} />
      <rect width={breite} height={hoehe} fill="url(#sl-karte-raster)" />

      {(uebersicht || kompakt) &&
        ORTE.filter((ort) => uebersicht || innerhalb(ort.koordinaten)).map((ort) => {
          const p = projizieren(ort.koordinaten);
          return (
            <g key={ort.name} className={styles.ort}>
              <circle cx={p.x} cy={p.y} r={3} />
              <text x={p.x + 7} y={p.y + 4}>
                {ort.name}
              </text>
            </g>
          );
        })}

      {kompakt &&
        pins.map((pin) => {
          const a = projizieren(SUTT_HQ);
          const b = projizieren(pin.koordinaten);
          return <line key={`luft-${pin.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.luftlinie} />;
        })}

      {linien.map((linie) => {
        const d = linie.punkte.map((k, index) => `${index === 0 ? 'M' : 'L'}${projizieren(k).x.toFixed(1)} ${projizieren(k).y.toFixed(1)}`).join(' ');
        return <path key={linie.id} d={d} className={cx(styles.linie, linie.gestrichelt && styles.linieGestrichelt)} style={{ stroke: `var(${linie.farbeToken})` }} />;
      })}

      <g className={styles.hq} transform={`translate(${hq.x} ${hq.y})`}>
        <rect x={-5} y={-5} width={10} height={10} transform="rotate(45)" />
        <text x={9} y={4}>
          {kompakt ? 'Werkhof' : 'Sutt AG'}
        </text>
      </g>

      {pins.map((pin) => {
        const p = projizieren(pin.koordinaten);
        const aktiv = pin.aktiv || pin.id === fokusId;
        const r = kompakt ? 6 : aktiv ? 12 : 10;
        return (
          <g
            key={pin.id}
            className={cx(styles.pin, pin.farbeKlasse, aktiv && styles.pinAktiv, pin.gedimmt && styles.pinGedimmt, onPinClick && styles.pinKlickbar)}
            transform={`translate(${p.x} ${p.y})`}
            onClick={onPinClick ? () => onPinClick(pin.id) : undefined}
            role={onPinClick ? 'button' : undefined}
            tabIndex={onPinClick ? 0 : undefined}
            onKeyDown={onPinClick ? (event) => event.key === 'Enter' && onPinClick(pin.id) : undefined}
          >
            {pin.titel && <title>{pin.titel}</title>}
            {aktiv && <circle r={r + 5} className={styles.pinRing} />}
            <circle r={r} className={styles.pinKreis} />
            {!kompakt && pin.label && (
              <text y={4} className={styles.pinLabel}>
                {pin.label}
              </text>
            )}
          </g>
        );
      })}

      {uebersicht && massstabPx > 20 && (
        <g className={styles.massstab} transform={`translate(${breite - massstabPx - 16} ${hoehe - 14})`}>
          <line x1={0} y1={0} x2={massstabPx} y2={0} />
          <line x1={0} y1={-3} x2={0} y2={3} />
          <line x1={massstabPx} y1={-3} x2={massstabPx} y2={3} />
          <text x={massstabPx / 2} y={-5} textAnchor="middle">
            1 km
          </text>
        </g>
      )}
      {!kompakt && (
        <text x={8} y={hoehe - 8} className={styles.hinweis}>
          Schemakarte · Näherungswerte
        </text>
      )}
    </svg>
  );
}

/* ◆ jh · eof */
