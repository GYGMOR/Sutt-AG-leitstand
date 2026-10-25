/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/app/HeuteSeite.tsx                         │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Heute: Tagesleiste, Planänderungen, Einsatzkarten, Status, SMS        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useState } from 'react';
import { BellRing, Check, Coffee } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { ABSENZ_LABEL } from '../../core/domain/stammdaten';
import { formatDauer, formatZeit } from '../../core/format';
import { Button } from '../../core/ui/Button';
import { rapportFuerEinsatz } from '../dispo/store/dispo.selectors';
import type { EinsatzView } from '../dispo/store/dispo.selectors';
import { NachrichtDialog } from '../rapport/NachrichtDialog';
import { aktiverEinsatz, planAenderungen, planBestaetigen, sortiert, tagesZeileFuer } from './app.model';
import { useApp } from './AppKontext';
import { EinsatzKarte } from './EinsatzKarte';
import styles from './Seiten.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

export function HeuteSeite() {
  const { techniker, heute, jetztMin, state, aktionen, pfad } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const meldung = (location.state as { meldung?: string } | null)?.meldung;
  const [smsFuer, setSmsFuer] = useState<EinsatzView | null>(null);
  const [bestaetigt, setBestaetigt] = useState(0);

  const zeile = useMemo(() => tagesZeileFuer(state.stammdaten, state.einsaetze, techniker.id, heute, jetztMin), [state.stammdaten, state.einsaetze, techniker.id, heute, jetztMin]);
  const views = useMemo(() => (zeile ? sortiert(zeile.einsaetze) : []), [zeile]);
  const aktiv = useMemo(() => aktiverEinsatz(views), [views]);
  const erledigt = views.filter((view) => view.einsatz.status === 'erledigt' || view.einsatz.status === 'wartet-teil').length;
  const aenderungen = useMemo(() => planAenderungen(techniker.id, heute, views), [techniker.id, heute, views, bestaetigt]);

  // jh› Beim ersten Öffnen gilt der Plan als gesehen – ab dann meldet die App Verschiebungen.
  useEffect(() => {
    if (views.length > 0 && aenderungen.length === 0) planBestaetigen(techniker.id, heute, views);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techniker.id, heute]);

  const schritt = (view: EinsatzView, ziel: Parameters<typeof aktionen.setStatus>[1] | 'rapport') => {
    if (ziel === 'rapport') {
      navigate(pfad(`/app/rapport/${view.einsatz.id}`));
      return;
    }
    aktionen.setStatus(view.einsatz.id, ziel, 'app');
  };

  return (
    <div className={styles.seite}>
      <section className={styles.leiste}>
        <div>
          <span className={styles.leisteZahl}>
            {erledigt} <span className={styles.leisteVon}>von {views.length}</span>
          </span>
          <span className={styles.leisteLabel}>erledigt</span>
        </div>
        <div>
          <span className={styles.leisteZahl}>{zeile ? formatDauer(zeile.geplantMin) : '–'}</span>
          <span className={styles.leisteLabel}>Einsatz</span>
        </div>
        <div>
          <span className={styles.leisteZahl}>{zeile ? formatDauer(zeile.fahrzeitMin) : '–'}</span>
          <span className={styles.leisteLabel}>Fahrt</span>
        </div>
        <div>
          <span className={styles.leisteZahl}>{formatZeit(jetztMin)}</span>
          <span className={styles.leisteLabel}>jetzt</span>
        </div>
      </section>

      {meldung && (
        <p className={styles.bestaetigung} role="status">
          <Check size={16} strokeWidth={1.5} aria-hidden /> {meldung}
        </p>
      )}

      {aenderungen.length > 0 && (
        <section className={styles.banner} role="status">
          <header className={styles.bannerKopf}>
            <BellRing size={16} strokeWidth={1.5} aria-hidden /> Plan geändert
          </header>
          <ul className={styles.bannerListe}>
            {aenderungen.map((aenderung) => (
              <li key={aenderung.einsatzId}>
                {aenderung.kunde}: {aenderung.vorherMin !== null ? `${formatZeit(aenderung.vorherMin)} → ` : 'neu '}
                <strong className={styles.mono}>{formatZeit(aenderung.nachherMin)}</strong>
              </li>
            ))}
          </ul>
          <Button
            variant="primary"
            size="sm"
            icon={Check}
            onClick={() => {
              planBestaetigen(techniker.id, heute, views);
              setBestaetigt((wert) => wert + 1);
            }}
          >
            Gesehen
          </Button>
        </section>
      )}

      {zeile?.absenz && (
        <p className={styles.hinweisKarte}>
          <Coffee size={16} strokeWidth={1.5} aria-hidden /> Heute {ABSENZ_LABEL[zeile.absenz.art]}
          {zeile.absenz.notiz && ` · ${zeile.absenz.notiz}`}
        </p>
      )}

      {views.length === 0 && !zeile?.absenz && <p className={styles.leer}>Heute keine Einsätze geplant.</p>}

      <ul className={styles.liste}>
        {views.map((view) => (
          <li key={view.einsatz.id}>
            <EinsatzKarte
              view={view}
              aktiv={view.einsatz.id === aktiv?.einsatz.id}
              rapport={rapportFuerEinsatz(state.rapporte, view.einsatz.id)}
              onSchritt={(ziel) => schritt(view, ziel)}
              onDetails={() => navigate(pfad(`/app/einsatz/${view.einsatz.id}`))}
              onInformieren={() => setSmsFuer(view)}
              onRapport={() => navigate(pfad(`/app/rapport/${view.einsatz.id}`))}
            />
          </li>
        ))}
      </ul>

      {smsFuer && (
        <NachrichtDialog
          open
          art="unterwegs"
          auftrag={smsFuer.auftrag}
          einsatz={smsFuer.einsatz}
          techniker={techniker}
          ankunftMin={jetztMin + smsFuer.anfahrtMin}
          onSenden={aktionen.sendeNachricht}
          onClose={() => setSmsFuer(null)}
        />
      )}
    </div>
  );
}

/* ◆ jh · eof */
