/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/geo.ts                                        │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Koordinaten, Distanz, Fahrzeit (Mock), Mercator für Schemakarten      │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Minuten } from './datum';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface Koordinaten {
  lat: number;
  lng: number;
}

export interface GeoRahmen {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface Punkt {
  x: number;
  y: number;
}

/** Sutt AG, Industriestrasse 24, 8152 Glattbrugg – Startpunkt jeder Tour. */
export const SUTT_HQ: Koordinaten = { lat: 47.4306, lng: 8.5667 };

// ── §2 · Distanz & Fahrzeit ──────────────────────────────────────

const ERDRADIUS_KM = 6371;

function toRad(grad: number): number {
  return (grad * Math.PI) / 180;
}

export function distanceKm(a: Koordinaten, b: Koordinaten): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * ERDRADIUS_KM * Math.asin(Math.sqrt(h));
}

// jh› Mock-Fahrzeit: Luftlinie × 1.35 (Strassenfaktor Agglomeration) bei
//     ~28 km/h Schnitt plus 4 min Parkieren/Anlaufen. Ersetzt später eine
//     Routing-API; die Form (Koordinaten → Minuten) bleibt gleich.
// jh# 008 Routing-API (Distance Matrix / OSRM) statt Luftlinie – gleiche Signatur.
export function fahrzeitMin(a: Koordinaten, b: Koordinaten): Minuten {
  const strasseKm = distanceKm(a, b) * 1.35;
  const minuten = 4 + (strasseKm / 28) * 60;
  return Math.max(3, Math.round(minuten));
}

export function strassenKm(a: Koordinaten, b: Koordinaten): number {
  return Math.round(distanceKm(a, b) * 1.35 * 10) / 10;
}

// ── §3 · Projektion ──────────────────────────────────────────────

function mercatorY(lat: number): number {
  const rad = toRad(lat);
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

export function boundsOf(punkte: readonly Koordinaten[], randAnteil = 0.12): GeoRahmen {
  const lats = punkte.map((p) => p.lat);
  const lngs = punkte.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  // jh! Mindestausdehnung, sonst wird ein einzelner Pin zu einem Punkt-Rahmen.
  const spanLat = Math.max(maxLat - minLat, 0.012);
  const spanLng = Math.max(maxLng - minLng, 0.018);
  const mitteLat = (minLat + maxLat) / 2;
  const mitteLng = (minLng + maxLng) / 2;
  return {
    minLat: mitteLat - (spanLat / 2) * (1 + randAnteil),
    maxLat: mitteLat + (spanLat / 2) * (1 + randAnteil),
    minLng: mitteLng - (spanLng / 2) * (1 + randAnteil),
    maxLng: mitteLng + (spanLng / 2) * (1 + randAnteil),
  };
}

/** Projiziert in ein Pixelfeld `breite × hoehe`, Seitenverhältnis bleibt erhalten (Letterbox). */
export function projectMercator(k: Koordinaten, rahmen: GeoRahmen, breite: number, hoehe: number): Punkt {
  const yMin = mercatorY(rahmen.minLat);
  const yMax = mercatorY(rahmen.maxLat);
  const spanX = rahmen.maxLng - rahmen.minLng;
  const spanY = yMax - yMin;
  // jh› Bei 47° N ist ein Längengrad ~0.68 Breitengrade «wert» – Mercator-Y gleicht das aus.
  const massstab = Math.min(breite / toRad(spanX), hoehe / spanY);
  const offsetX = (breite - toRad(spanX) * massstab) / 2;
  const offsetY = (hoehe - spanY * massstab) / 2;
  return {
    x: offsetX + toRad(k.lng - rahmen.minLng) * massstab,
    y: offsetY + (yMax - mercatorY(k.lat)) * massstab,
  };
}

// ── §4 · Google-Maps-Links ───────────────────────────────────────

function fmt(k: Koordinaten): string {
  return `${k.lat.toFixed(5)},${k.lng.toFixed(5)}`;
}

export function googleRouteUrl(ziel: Koordinaten, start?: Koordinaten): string {
  const params = new URLSearchParams({ api: '1', destination: fmt(ziel) });
  if (start) params.set('origin', fmt(start));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Tagestour: Start HQ, Zwischenziele als Waypoints (Google erlaubt max. 9). */
export function googleTourUrl(stationen: readonly Koordinaten[], start: Koordinaten = SUTT_HQ): string {
  const letzte = stationen[stationen.length - 1];
  if (!letzte) return googleRouteUrl(start);
  const zwischen = stationen.slice(0, -1).slice(0, 9).map(fmt).join('|');
  const params = new URLSearchParams({ api: '1', origin: fmt(start), destination: fmt(letzte), travelmode: 'driving' });
  if (zwischen) params.set('waypoints', zwischen);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function googlePlaceUrl(k: Koordinaten): string {
  return `https://www.google.com/maps/search/?api=1&query=${fmt(k)}`;
}

/* ◆ jh · eof */
