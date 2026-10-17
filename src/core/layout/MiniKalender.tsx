/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/MiniKalender.tsx                       │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Mini-Monatskalender in der Seitenleiste (Outlook-Stil, mit KW)        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useArbeitstag } from '../arbeitstag';
import { addMonths, isSameMonth, isWeekend, isoWeek, monthGrid, startOfMonth } from '../datum';
import { formatDatumLang, formatMonatJahr } from '../format';
import { IconButton } from '../ui/Button';
import { cx } from '../ui/cx';
import styles from './MiniKalender.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

const WOCHENTAGE = ['M', 'D', 'M', 'D', 'F', 'S', 'S'] as const;

export function MiniKalender() {
  const { datum, heute, setDatum } = useArbeitstag();
  const [monat, setMonat] = useState(() => startOfMonth(datum));

  // jh› Blättert der Hauptplan in einen anderen Monat, folgt der Minikalender.
  useEffect(() => {
    setMonat(startOfMonth(datum));
  }, [datum]);

  const wochen = monthGrid(monat);

  return (
    <div className={styles.kalender} aria-label="Monatskalender">
      <div className={styles.kopf}>
        <IconButton icon={ChevronLeft} label="Vormonat" size="sm" onClick={() => setMonat((wert) => addMonths(wert, -1))} />
        <button type="button" className={styles.monat} onClick={() => setMonat(startOfMonth(heute))} title="Zum aktuellen Monat">
          {formatMonatJahr(monat)}
        </button>
        <IconButton icon={ChevronRight} label="Folgemonat" size="sm" onClick={() => setMonat((wert) => addMonths(wert, 1))} />
      </div>

      <table className={styles.raster}>
        <thead>
          <tr>
            <th scope="col" className={styles.kw}>
              KW
            </th>
            {WOCHENTAGE.map((tag, index) => (
              <th key={index} scope="col">
                {tag}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {wochen.map((woche) => {
            const erster = woche[0];
            return (
              <tr key={erster}>
                <td className={styles.kw}>{erster ? isoWeek(erster) : ''}</td>
                {woche.map((tag) => (
                  <td key={tag}>
                    <button
                      type="button"
                      className={cx(
                        styles.tag,
                        !isSameMonth(tag, monat) && styles.fremd,
                        isWeekend(tag) && styles.wochenende,
                        tag === heute && styles.heute,
                        tag === datum && styles.gewaehlt,
                      )}
                      aria-pressed={tag === datum}
                      title={formatDatumLang(tag)}
                      onClick={() => setDatum(tag)}
                    >
                      {Number(tag.slice(8))}
                    </button>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ◆ jh · eof */
