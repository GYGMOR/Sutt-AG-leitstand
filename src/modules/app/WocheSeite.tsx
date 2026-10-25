/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/app/WocheSeite.tsx                         │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Woche: die nächsten sieben Tage als Liste, Absenzen als Hinweis       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { addDays, rangeDays } from '../../core/datum';
import { STATUS_LABEL } from '../../core/domain/einsatz';
import { ABSENZ_LABEL } from '../../core/domain/stammdaten';
import { formatDatumKurz, formatDauer, formatWochentag, formatZeit } from '../../core/format';
import { cx } from '../../core/ui/cx';
import { kategorieKlasse } from '../../core/ui/farben';
import { sortiert, tagesZeileFuer } from './app.model';
import { useApp } from './AppKontext';
import styles from './Seiten.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

export function WocheSeite() {
  const { techniker, heute, state, pfad } = useApp();
  const navigate = useNavigate();
  const tage = useMemo(() => rangeDays(heute, addDays(heute, 6)), [heute]);
  const zeilen = useMemo(() => tage.map((datum) => ({ datum, zeile: tagesZeileFuer(state.stammdaten, state.einsaetze, techniker.id, datum, null) })), [tage, state.stammdaten, state.einsaetze, techniker.id]);

  return (
    <div className={styles.seite}>
      {zeilen.map(({ datum, zeile }) => {
        const views = zeile ? sortiert(zeile.einsaetze) : [];
        return (
          <section key={datum} className={styles.tag}>
            <header className={cx(styles.tagKopf, datum === heute && styles.tagHeute)}>
              <span className={styles.tagName}>
                {formatWochentag(datum)} <span className={styles.mono}>{formatDatumKurz(datum)}</span>
              </span>
              <span className={styles.tagMeta}>
                {zeile?.absenz ? ABSENZ_LABEL[zeile.absenz.art] : views.length === 0 ? 'frei' : `${views.length} Einsätze · ${formatDauer(zeile?.geplantMin ?? 0)}`}
              </span>
            </header>
            {views.length > 0 && (
              <ul className={styles.tagListe}>
                {views.map((view) => (
                  <li key={view.einsatz.id}>
                    <button type="button" className={cx(styles.tagEintrag, kategorieKlasse(view.auftrag.kategorie))} onClick={() => navigate(pfad(`/app/einsatz/${view.einsatz.id}`))}>
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
  );
}

/* ◆ jh · eof */
