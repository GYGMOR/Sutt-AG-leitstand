/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/WocheSeite.tsx                          │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Woche: die nächsten sieben Tage als Liste, Absenzen als Hinweis       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { addDays, rangeDays } from '@sl/core/datum';
import { STATUS_LABEL } from '@sl/core/domain/einsatz';
import { ABSENZ_LABEL } from '@sl/core/domain/stammdaten';
import { formatDatumKurz, formatDauer, formatWochentag, formatZeit } from '@sl/core/format';
import { cx } from '@sl/core/ui/cx';
import { kategorieKlasse } from '@sl/core/ui/farben';
import { sortiert, tagesZeileFuer } from '@sl/modules/app/app.model';
import styles from '../bausteine/Seiten.module.css';
import { useApp } from '../rahmen/AppKontext';

// ── §1 · Komponente ──────────────────────────────────────────────

export function WocheSeite() {
  const { techniker, heute, state, pfad } = useApp();
  const navigate = useNavigate();
  const technikerId = techniker?.id ?? null;
  const tage = useMemo(() => rangeDays(heute, addDays(heute, 6)), [heute]);
  const zeilen = useMemo(() => tage.map((datum) => ({ datum, zeile: technikerId ? tagesZeileFuer(state.stammdaten, state.einsaetze, technikerId, datum, null) : null })), [tage, state.stammdaten, state.einsaetze, technikerId]);

  if (!techniker) return <p className={styles.leer}>Kein Techniker verknüpft – die Woche zeigt den Plan eines Technikers.</p>;

  return (
    <div className={styles.seite}>
      <header className={styles.seitentitel}>
        <h1>Nächste sieben Tage</h1>
        <span>{techniker.fahrzeug}</span>
      </header>
      <div className={styles.karten}>
        {zeilen.map(({ datum, zeile }) => {
          const views = zeile ? sortiert(zeile.einsaetze) : [];
          return (
            <section key={datum} className={styles.tag}>
              <header className={cx(styles.tagKopf, datum === heute && styles.tagHeute)}>
                <span className={styles.tagName}>
                  {formatWochentag(datum)} <span className={styles.mono}>{formatDatumKurz(datum)}</span>
                </span>
                <span className={styles.tagMeta}>{zeile?.absenz ? ABSENZ_LABEL[zeile.absenz.art] : views.length === 0 ? 'frei' : `${views.length} Einsätze · ${formatDauer(zeile?.geplantMin ?? 0)}`}</span>
              </header>
              {views.length > 0 && (
                <ul className={styles.tagListe}>
                  {views.map((view) => (
                    <li key={view.einsatz.id}>
                      <button type="button" className={cx(styles.tagEintrag, kategorieKlasse(view.auftrag.kategorie))} onClick={() => navigate(pfad(`/einsatz/${view.einsatz.id}`))}>
                        <span className={styles.mono}>{formatZeit(view.einsatz.startMin)}</span>
                        <span className={styles.tagText}>
                          <strong>{view.kunde.kurzname}</strong> · {view.liegenschaft.adresse.ort} · {view.geraet.art}
                        </span>
                        <span className={styles.tagStatus}>{STATUS_LABEL[view.einsatz.status]}</span>
                        <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ◆ jh · eof */
