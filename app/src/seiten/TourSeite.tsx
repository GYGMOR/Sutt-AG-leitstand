/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/TourSeite.tsx                           │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Tour: Karte mit Pins und Linie, Stopps in Reihenfolge, Navigation     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import { Navigation, Route } from 'lucide-react';
import { useNavigate } from 'react-router';
import { formatDauer, formatKm, formatZeit } from '@sl/core/format';
import { googleRouteUrl } from '@sl/core/geo';
import { Button } from '@sl/core/ui/Button';
import { CapsLabel } from '@sl/core/ui/CapsLabel';
import { cx } from '@sl/core/ui/cx';
import { kategorieKlasse } from '@sl/core/ui/farben';
import { sortiert, tagesZeileFuer } from '@sl/modules/app/app.model';
import { MapCanvas } from '@sl/modules/dispo/karte/MapCanvas';
import { STATUS_LABEL } from '@sl/core/domain/einsatz';
import styles from '../bausteine/Seiten.module.css';
import { buildTour } from '../model/tour.model';
import { useApp } from '../rahmen/AppKontext';
import werkzeuge from './Werkzeuge.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

// jh› «Routen sehen»: die Tour des Tages mit Werkhof als Start, Pins in Fahrreihenfolge, ein Tipp
//     pro Stopp zur Navigation – und die ganze Resttour als Google-Maps-Link für das Auto.
export function TourSeite() {
  const { techniker, heute, jetztMin, state, pfad } = useApp();
  const navigate = useNavigate();
  const technikerId = techniker?.id ?? null;
  const zeile = useMemo(() => (technikerId ? tagesZeileFuer(state.stammdaten, state.einsaetze, technikerId, heute, jetztMin) : null), [state.stammdaten, state.einsaetze, technikerId, heute, jetztMin]);
  const tour = useMemo(() => buildTour(zeile ? sortiert(zeile.einsaetze) : [], `--sl-tech-${techniker?.farbe ?? 1}`), [zeile, techniker?.farbe]);
  const naechster = tour.stopps.find((stopp) => stopp.naechster);

  if (!techniker) return <p className={styles.leer}>Kein Techniker verknüpft – die Tour zeigt die Fahrreihenfolge eines Technikers.</p>;

  return (
    <div className={styles.seite}>
      <header className={styles.seitentitel}>
        <h1>Tour heute</h1>
        <span>{techniker.fahrzeug}</span>
      </header>

      <section className={styles.leiste}>
        <div>
          <span className={styles.leisteZahl}>
            {tour.stopps.length - tour.offen} <span className={styles.leisteVon}>von {tour.stopps.length}</span>
          </span>
          <span className={styles.leisteLabel}>Stopps</span>
        </div>
        <div>
          <span className={styles.leisteZahl}>{formatKm(tour.fahrtKm)}</span>
          <span className={styles.leisteLabel}>Strecke</span>
        </div>
        <div>
          <span className={styles.leisteZahl}>{formatDauer(tour.fahrtMin)}</span>
          <span className={styles.leisteLabel}>Fahrt</span>
        </div>
        <div>
          <span className={styles.leisteZahl}>{formatDauer(tour.einsatzMin)}</span>
          <span className={styles.leisteLabel}>Einsatz</span>
        </div>
      </section>

      {tour.stopps.length === 0 ? (
        <p className={styles.leer}>Heute keine Fahrt – kein Einsatz geplant.</p>
      ) : (
        <div className={styles.zweispaltig}>
          <div className={styles.spalte}>
            <div className={werkzeuge.karte}>
              <MapCanvas pins={tour.pins} linien={tour.linien} fokusId={naechster?.view.einsatz.id} uebersicht typwahl onPinClick={(id) => navigate(pfad(`/einsatz/${id}`))} />
            </div>
            <div className={styles.aktionen}>
              {tour.mapsUrl && (
                <Button variant="primary" size="md" icon={Navigation} onClick={() => window.open(tour.mapsUrl ?? '', '_blank', 'noopener')}>
                  Resttour in Google Maps ({tour.offen} Stopps)
                </Button>
              )}
              {naechster && (
                <Button variant="secondary" size="md" icon={Route} onClick={() => window.open(googleRouteUrl(naechster.view.koordinaten), '_blank', 'noopener')}>
                  Nächster Stopp: {naechster.view.kunde.kurzname}
                </Button>
              )}
            </div>
          </div>

          <section className={cx(styles.abschnitt, styles.spalte)}>
            <CapsLabel as="h3">Reihenfolge ab Werkhof Glattbrugg</CapsLabel>
            <ol className={werkzeuge.stopps}>
              {tour.stopps.map((stopp) => (
                <li key={stopp.view.einsatz.id} className={cx(werkzeuge.stopp, kategorieKlasse(stopp.view.auftrag.kategorie), stopp.naechster && werkzeuge.stoppNaechster, stopp.erledigt && werkzeuge.stoppErledigt)}>
                  <span className={werkzeuge.stoppNummer}>{stopp.nummer}</span>
                  <span className={werkzeuge.stoppZeit}>
                    {formatZeit(stopp.view.einsatz.startMin)}
                    <span>ab {formatZeit(stopp.abfahrtMin)}</span>
                  </span>
                  <button type="button" className={werkzeuge.stoppText} onClick={() => navigate(pfad(`/einsatz/${stopp.view.einsatz.id}`))}>
                    <strong>{stopp.view.kunde.kurzname}</strong>
                    <span className={werkzeuge.stoppMeta}>
                      {stopp.view.liegenschaft.adresse.ort} · {stopp.view.anfahrtMin} min / {formatKm(stopp.view.anfahrtKm)} · {STATUS_LABEL[stopp.view.einsatz.status]}
                    </span>
                  </button>
                  <a className={werkzeuge.stoppNav} href={googleRouteUrl(stopp.view.koordinaten)} target="_blank" rel="noreferrer" title="Navigation starten" aria-label={`Navigation zu ${stopp.view.kunde.kurzname}`}>
                    <Navigation size={18} strokeWidth={1.5} aria-hidden />
                  </a>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}

/* ◆ jh · eof */
