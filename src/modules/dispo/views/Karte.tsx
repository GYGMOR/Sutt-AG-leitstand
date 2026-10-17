/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/Karte.tsx                      │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Kartenansicht: Pins in Tagesreihenfolge, Touren pro Techniker         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import type { IsoDatum } from '../../../core/datum';
import { fullName } from '../../../core/domain/stammdaten';
import type { Techniker } from '../../../core/domain/stammdaten';
import { formatDatum, formatKm, formatWochentag, formatZeit } from '../../../core/format';
import { SUTT_HQ, strassenKm } from '../../../core/geo';
import type { Koordinaten } from '../../../core/geo';
import { Avatar } from '../../../core/ui/Avatar';
import { cx } from '../../../core/ui/cx';
import { technikerKlasse } from '../../../core/ui/farben';
import { MapCanvas } from '../karte/MapCanvas';
import type { KartenLinie, KartenPin } from '../karte/karte.types';
import type { EinsatzView } from '../store/dispo.selectors';
import styles from './Karte.module.css';

// ── §1 · Touren ──────────────────────────────────────────────────

interface Tour {
  techniker: Techniker;
  stationen: EinsatzView[];
  km: number;
}

function buildTouren(views: readonly EinsatzView[], techniker: readonly Techniker[]): Tour[] {
  return techniker
    .map((person) => {
      const stationen = views.filter((view) => view.techniker.id === person.id).sort((a, b) => a.einsatz.startMin - b.einsatz.startMin);
      let km = 0;
      let von: Koordinaten = SUTT_HQ;
      for (const station of stationen) {
        km += strassenKm(von, station.koordinaten);
        von = station.koordinaten;
      }
      return { techniker: person, stationen, km: Math.round(km * 10) / 10 };
    })
    .filter((tour) => tour.stationen.length > 0);
}

// ── §2 · Komponente ──────────────────────────────────────────────

interface KarteProps {
  views: readonly EinsatzView[];
  techniker: readonly Techniker[];
  datum: IsoDatum;
  ausgewaehltId: string | null;
  onSelectEinsatz: (einsatzId: string) => void;
}

export function Karte({ views, techniker, datum, ausgewaehltId, onSelectEinsatz }: KarteProps) {
  const touren = useMemo(() => buildTouren(views, techniker), [views, techniker]);

  const pins = useMemo<KartenPin[]>(
    () =>
      touren.flatMap((tour) =>
        tour.stationen.map((station, index) => ({
          id: station.einsatz.id,
          koordinaten: station.koordinaten,
          label: String(index + 1),
          farbeKlasse: technikerKlasse(tour.techniker.farbe),
          farbeToken: `--sl-tech-${tour.techniker.farbe}`,
          aktiv: station.einsatz.id === ausgewaehltId,
          gedimmt: !station.imFilter,
          titel: `${tour.techniker.kuerzel} ${index + 1} · ${formatZeit(station.einsatz.startMin)} · ${station.kunde.kurzname} · ${station.liegenschaft.adresse.ort}`,
        })),
      ),
    [touren, ausgewaehltId],
  );

  // jh› Linie pro Techniker in dessen Farbe, ab Werkhof – die Tour liest sich als Weg, nicht als Punktwolke.
  const linien = useMemo<KartenLinie[]>(
    () =>
      touren.map((tour) => ({
        id: tour.techniker.id,
        punkte: [SUTT_HQ, ...tour.stationen.map((station) => station.koordinaten)],
        farbeToken: `--sl-tech-${tour.techniker.farbe}`,
      })),
    [touren],
  );

  return (
    <div className={styles.karte}>
      <aside className={styles.liste} aria-label="Touren">
        <header className={styles.listeKopf}>
          <span className={styles.titel}>
            {formatWochentag(datum)}, {formatDatum(datum)}
          </span>
          <span className={styles.untertitel}>
            {touren.length} Touren · {views.length} Einsätze
          </span>
        </header>
        {touren.map((tour) => (
          <section key={tour.techniker.id} className={cx(styles.tour, technikerKlasse(tour.techniker.farbe))}>
            <header className={styles.tourKopf}>
              <Avatar techniker={tour.techniker} size="md" />
              <span className={styles.tourName}>{fullName(tour.techniker)}</span>
              <span className={styles.tourMeta}>
                {tour.stationen.length} Stopps · {formatKm(tour.km)}
              </span>
            </header>
            <ol className={styles.stationen}>
              {tour.stationen.map((station, index) => (
                <li key={station.einsatz.id}>
                  <button
                    type="button"
                    className={cx(styles.station, station.einsatz.id === ausgewaehltId && styles.stationAktiv, !station.imFilter && styles.stationAbgeblendet)}
                    data-einsatz-id={station.einsatz.id}
                    onClick={() => onSelectEinsatz(station.einsatz.id)}
                  >
                    <span className={styles.nummer}>{index + 1}</span>
                    <span className={styles.zeit}>{formatZeit(station.einsatz.startMin)}</span>
                    <span className={styles.stationText}>
                      <span className={styles.stationKunde}>{station.kunde.kurzname}</span>
                      <span className={styles.stationOrt}>
                        {station.liegenschaft.adresse.ort} · {station.liegenschaft.adresse.strasse} {station.liegenschaft.adresse.hausnummer}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}
        {touren.length === 0 && <p className={styles.leer}>Keine Einsätze an diesem Tag.</p>}
      </aside>
      <div className={styles.flaeche}>
        <MapCanvas pins={pins} linien={linien} {...(ausgewaehltId ? { fokusId: ausgewaehltId } : {})} uebersicht typwahl onPinClick={onSelectEinsatz} />
      </div>
    </div>
  );
}

/* ◆ jh · eof */
