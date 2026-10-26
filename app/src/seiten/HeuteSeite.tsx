/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/HeuteSeite.tsx                          │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Heute: Stempelstreifen, Tagesleiste, Plan geändert, Einsatzkarten     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useState } from 'react';
import { BellRing, Check, Coffee, Smartphone } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { ABSENZ_LABEL } from '@sl/core/domain/stammdaten';
import { formatDauer, formatZeit } from '@sl/core/format';
import { Button } from '@sl/core/ui/Button';
import { aktiverEinsatz, planAenderungen, planBestaetigen, sortiert, tagesZeileFuer } from '@sl/modules/app/app.model';
import { rapportFuerEinsatz } from '@sl/modules/dispo/store/dispo.selectors';
import type { EinsatzView } from '@sl/modules/dispo/store/dispo.selectors';
import { StempeluhrStreifen } from '@sl/modules/personal/Stempeluhr';
import { NachrichtDialog } from '@sl/modules/rapport/NachrichtDialog';
import { EinsatzKarte } from '../bausteine/EinsatzKarte';
import styles from '../bausteine/Seiten.module.css';
import { useApp } from '../rahmen/AppKontext';

// ── §1 · Komponente ──────────────────────────────────────────────

export function HeuteSeite() {
  const { techniker, heute, jetztMin, state, aktionen, pfad } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const meldung = (location.state as { meldung?: string } | null)?.meldung;
  const [smsFuer, setSmsFuer] = useState<EinsatzView | null>(null);
  const [bestaetigt, setBestaetigt] = useState(0);
  const technikerId = techniker?.id ?? null;

  const zeile = useMemo(() => (technikerId ? tagesZeileFuer(state.stammdaten, state.einsaetze, technikerId, heute, jetztMin) : null), [state.stammdaten, state.einsaetze, technikerId, heute, jetztMin]);
  const views = useMemo(() => (zeile ? sortiert(zeile.einsaetze) : []), [zeile]);
  const aktiv = useMemo(() => aktiverEinsatz(views), [views]);
  const erledigt = views.filter((view) => view.einsatz.status === 'erledigt' || view.einsatz.status === 'wartet-teil').length;
  const aenderungen = useMemo(() => (technikerId ? planAenderungen(technikerId, heute, views) : []), [technikerId, heute, views, bestaetigt]);

  // jh› Beim ersten Öffnen gilt der Plan als gesehen – ab dann meldet die App Verschiebungen.
  useEffect(() => {
    if (technikerId && views.length > 0 && aenderungen.length === 0) planBestaetigen(technikerId, heute, views);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technikerId, heute]);

  const schritt = (view: EinsatzView, ziel: Parameters<typeof aktionen.setStatus>[1] | 'rapport') => {
    if (ziel === 'rapport') {
      navigate(pfad(`/rapport/${view.einsatz.id}`));
      return;
    }
    aktionen.setStatus(view.einsatz.id, ziel, 'app');
  };

  return (
    <div className={styles.seite}>
      <StempeluhrStreifen geraet="app" onOeffnen={() => navigate(pfad('/zeit'))} />

      {!techniker && (
        <p className={styles.hinweisKarte}>
          <Smartphone size={16} strokeWidth={1.5} aria-hidden /> Dieses Konto fährt nicht selbst – Einsätze erscheinen hier für Techniker. Stempeluhr, Zeit und Absenzen stehen trotzdem bereit.
        </p>
      )}

      {techniker && (
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
      )}

      {meldung && (
        <p className={styles.bestaetigung} role="status">
          <Check size={16} strokeWidth={1.5} aria-hidden /> {meldung}
        </p>
      )}

      {aenderungen.length > 0 && technikerId && (
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
              planBestaetigen(technikerId, heute, views);
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

      {techniker && views.length === 0 && !zeile?.absenz && <p className={styles.leer}>Heute keine Einsätze geplant.</p>}

      <ul className={styles.karten}>
        {views.map((view, index) => (
          <li key={view.einsatz.id}>
            <EinsatzKarte
              view={view}
              aktiv={view.einsatz.id === aktiv?.einsatz.id}
              nummer={index + 1}
              rapport={rapportFuerEinsatz(state.rapporte, view.einsatz.id)}
              onSchritt={(ziel) => schritt(view, ziel)}
              onDetails={() => navigate(pfad(`/einsatz/${view.einsatz.id}`))}
              onInformieren={() => setSmsFuer(view)}
              onRapport={() => navigate(pfad(`/rapport/${view.einsatz.id}`))}
            />
          </li>
        ))}
      </ul>

      {smsFuer && techniker && (
        <NachrichtDialog open art="unterwegs" auftrag={smsFuer.auftrag} einsatz={smsFuer.einsatz} techniker={techniker} ankunftMin={jetztMin + smsFuer.anfahrtMin} onSenden={aktionen.sendeNachricht} onClose={() => setSmsFuer(null)} />
      )}
    </div>
  );
}

/* ◆ jh · eof */
