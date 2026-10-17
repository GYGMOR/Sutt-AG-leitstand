/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/karte/LibreKarte.tsx                 │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  MapLibre + OpenStreetMap-Kacheln (entsättigt) – Fallback ohne Key     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { boundsOf } from '../../../core/geo';
import { tokenFarbe } from './karte.types';
import type { KartenProps } from './karte.types';
import styles from './LibreKarte.module.css';

// ── §1 · Stil ────────────────────────────────────────────────────

// jh› Graustufen über raster-saturation statt eigenem Vektorstil: eine Quelle,
//     kein Schlüssel, und die Karte tritt hinter die Pins zurück.
// jh# 007 OSM-Kacheln nur fürs Mockup – vor dem Rollout eigener Kachelserver oder Google-Key.
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap-Mitwirkende',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.9, 'raster-contrast': -0.12, 'raster-brightness-min': 0.1 } }],
};

// ── §2 · Komponente ──────────────────────────────────────────────

interface LibreKarteProps extends KartenProps {
  onFehler: () => void;
}

export function LibreKarte({ pins, linien = [], fokusId, onPinClick, onFehler }: LibreKarteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker[]>([]);
  const fehlerRef = useRef(onFehler);
  fehlerRef.current = onFehler;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const map = new maplibregl.Map({ container, style: OSM_STYLE, center: [8.57, 47.43], zoom: 12, attributionControl: false });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    // jh! Kacheln können im Intranet blockiert sein – dann meldet die Karte Fehler und die Schemakarte übernimmt.
    map.on('error', (ereignis: { error?: { message?: string } }) => {
      const text = ereignis.error?.message ?? '';
      if (/tile|fetch|NetworkError|AJAXError|Worker/i.test(text)) fehlerRef.current();
    });
    // jh› Kommt innert 10 s kein «load» (Intranet, Proxy, WebGL aus), übernimmt die Schemakarte.
    const wache = window.setTimeout(() => {
      if (!map.loaded()) fehlerRef.current();
    }, 10000);
    map.once('load', () => window.clearTimeout(wache));
    mapRef.current = map;
    return () => {
      window.clearTimeout(wache);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const zeichnen = () => {
      markerRef.current.forEach((marker) => marker.remove());
      markerRef.current = pins.map((pin) => {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = [styles.pin, pin.farbeKlasse, (pin.aktiv || pin.id === fokusId) && styles.pinAktiv, pin.gedimmt && styles.pinGedimmt].filter(Boolean).join(' ');
        element.textContent = pin.label;
        element.title = pin.titel ?? '';
        if (onPinClick) element.addEventListener('click', () => onPinClick(pin.id));
        return new maplibregl.Marker({ element }).setLngLat([pin.koordinaten.lng, pin.koordinaten.lat]).addTo(map);
      });

      linien.forEach((linie, index) => {
        const quelleId = `sl-linie-${index}`;
        const daten: GeoJSON.Feature<GeoJSON.LineString> = {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: linie.punkte.map((k) => [k.lng, k.lat]) },
        };
        const quelle = map.getSource(quelleId) as maplibregl.GeoJSONSource | undefined;
        if (quelle) {
          quelle.setData(daten);
        } else {
          map.addSource(quelleId, { type: 'geojson', data: daten });
          map.addLayer({
            id: quelleId,
            type: 'line',
            source: quelleId,
            paint: { 'line-color': tokenFarbe(linie.farbeToken), 'line-width': 3, 'line-opacity': 0.85, ...(linie.gestrichelt ? { 'line-dasharray': [2, 2] } : {}) },
          });
        }
      });

      const punkte = [...pins.map((pin) => pin.koordinaten), ...linien.flatMap((linie) => [...linie.punkte])];
      if (punkte.length > 0) {
        const rahmen = boundsOf(punkte, 0.3);
        map.fitBounds([[rahmen.minLng, rahmen.minLat], [rahmen.maxLng, rahmen.maxLat]], { padding: 24, duration: 300, maxZoom: 15 });
      }
    };

    if (map.isStyleLoaded()) zeichnen();
    else map.once('load', zeichnen);
    return undefined;
  }, [pins, linien, fokusId, onPinClick]);

  return <div ref={containerRef} className={styles.container} />;
}

/* ◆ jh · eof */
