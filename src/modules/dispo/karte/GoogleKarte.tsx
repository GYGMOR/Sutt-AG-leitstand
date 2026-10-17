/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/karte/GoogleKarte.tsx                │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Google Maps (@vis.gl/react-google-maps): zurückhaltender Stil, Pins   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect } from 'react';
import { AdvancedMarker, APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { boundsOf } from '../../../core/geo';
import { cx } from '../../../core/ui/cx';
import { tokenFarbe } from './karte.types';
import type { KartenLinie, KartenProps } from './karte.types';
import styles from './GoogleKarte.module.css';

// ── §1 · Stil ────────────────────────────────────────────────────

// jh› Graustufen, helle Strassen, gedämpftes Wasser – gilt ohne Map-ID.
//     Mit VITE_GOOGLE_MAPS_MAP_ID kommt der Stil aus der Cloud-Konsole.
const STIL: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ saturation: -100 }, { lightness: 12 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b6b6b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f4f2ee' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#dad7d2' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d6dde3' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f4f2ee' }] },
];

// ── §2 · Linien & Ausschnitt ─────────────────────────────────────

function Linien({ linien }: { linien: readonly KartenLinie[] }) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib) return undefined;
    const polylines = linien.map(
      (linie) =>
        new mapsLib.Polyline({
          map,
          path: linie.punkte.map((k) => ({ lat: k.lat, lng: k.lng })),
          strokeColor: tokenFarbe(linie.farbeToken),
          strokeOpacity: linie.gestrichelt ? 0 : 0.85,
          strokeWeight: 3,
          ...(linie.gestrichelt
            ? { icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.85, strokeWeight: 3, scale: 3 }, offset: '0', repeat: '14px' }] }
            : {}),
        }),
    );
    return () => polylines.forEach((polyline) => polyline.setMap(null));
  }, [map, mapsLib, linien]);

  return null;
}

function Ausschnitt({ pins, linien }: Pick<KartenProps, 'pins'> & { linien: readonly KartenLinie[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const punkte = [...pins.map((pin) => pin.koordinaten), ...linien.flatMap((linie) => [...linie.punkte])];
    if (punkte.length === 0) return;
    const rahmen = boundsOf(punkte, 0.3);
    map.fitBounds({ north: rahmen.maxLat, south: rahmen.minLat, east: rahmen.maxLng, west: rahmen.minLng }, 24);
  }, [map, pins, linien]);
  return null;
}

// ── §3 · Komponente ──────────────────────────────────────────────

interface GoogleKarteProps extends KartenProps {
  apiKey: string;
  mapId?: string;
}

export function GoogleKarte({ apiKey, mapId, pins, linien = [], fokusId, onPinClick }: GoogleKarteProps) {
  return (
    <APIProvider apiKey={apiKey} language="de" region="CH">
      <Map
        className={styles.karte}
        defaultCenter={{ lat: 47.43, lng: 8.57 }}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        {...(mapId ? { mapId } : { styles: STIL })}
      >
        {pins.map((pin) => (
          <AdvancedMarker key={pin.id} position={{ lat: pin.koordinaten.lat, lng: pin.koordinaten.lng }} title={pin.titel} onClick={onPinClick ? () => onPinClick(pin.id) : undefined}>
            <span className={cx(styles.pin, pin.farbeKlasse, (pin.aktiv || pin.id === fokusId) && styles.pinAktiv, pin.gedimmt && styles.pinGedimmt)}>{pin.label}</span>
          </AdvancedMarker>
        ))}
        <Linien linien={linien} />
        <Ausschnitt pins={pins} linien={linien} />
      </Map>
    </APIProvider>
  );
}

/* ◆ jh · eof */
