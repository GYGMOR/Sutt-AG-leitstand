/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/DateNav.tsx                            │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Datumsnavigation der Topbar: Heute, ‹ ›, Datumspicker, KW             │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useArbeitstag } from '../arbeitstag';
import type { Zeitraum } from '../arbeitstag';
import { useHotkey } from '../hooks/useHotkey';
import { isoWeek } from '../datum';
import type { IsoDatum } from '../datum';
import { formatDatum, formatDatumKurz, formatMonatJahr, formatWochentag } from '../format';
import { IconButton } from '../ui/Button';
import { Popover } from '../ui/Popover';
import { cx } from '../ui/cx';
import { MiniKalender } from './MiniKalender';
import styles from './DateNav.module.css';

// ── §1 · Beschriftung ────────────────────────────────────────────

function labelFor(datum: IsoDatum, zeitraum: Zeitraum, tage: readonly IsoDatum[]): string {
  const erster = tage[0] ?? datum;
  const letzter = tage[tage.length - 1] ?? datum;
  switch (zeitraum) {
    case 'tag':
      return `${formatWochentag(datum)}, ${formatDatum(datum)}`;
    case 'monat':
      return formatMonatJahr(datum);
    default:
      return `${formatDatumKurz(erster)}–${formatDatum(letzter)}`;
  }
}

const SCHRITT_LABEL: Readonly<Record<Zeitraum, string>> = {
  tag: 'Tag',
  '3tage': '3 Tage',
  arbeitswoche: 'Woche',
  woche: 'Woche',
  monat: 'Monat',
};

// ── §2 · Komponente ──────────────────────────────────────────────

export function DateNav() {
  const { datum, heute, zeitraum, tage, stepBack, stepForward, goToday } = useArbeitstag();
  const [pickerOffen, setPickerOffen] = useState(false);
  const datumRef = useRef<HTMLButtonElement>(null);

  const zeigtHeute = tage.includes(heute);
  const schritt = SCHRITT_LABEL[zeitraum];

  useHotkey({ key: 't' }, goToday);
  useHotkey({ key: 'ArrowLeft' }, stepBack);
  useHotkey({ key: 'ArrowRight' }, stepForward);

  return (
    <div className={styles.dateNav} role="group" aria-label="Datumsnavigation">
      <IconButton icon={ChevronLeft} label={`${schritt} zurück (←)`} size="sm" tone="chrome" onClick={stepBack} />
      <button type="button" className={cx(styles.heute, zeigtHeute && styles.heuteAktiv)} onClick={goToday} aria-pressed={zeigtHeute} title="Heute (T)">
        Heute
      </button>
      <IconButton icon={ChevronRight} label={`${schritt} vor (→)`} size="sm" tone="chrome" onClick={stepForward} />

      <button
        ref={datumRef}
        type="button"
        className={styles.datum}
        aria-live="polite"
        aria-haspopup="dialog"
        aria-expanded={pickerOffen}
        onClick={() => setPickerOffen((wert) => !wert)}
        title="Datum wählen"
      >
        {labelFor(datum, zeitraum, tage)}
      </button>
      <span className={styles.kw}>KW {isoWeek(datum)}</span>

      <Popover anchor={datumRef.current} open={pickerOffen} onClose={() => setPickerOffen(false)} placement="bottom-start" breite={248} label="Datum wählen">
        {/* jh› Derselbe Minikalender wie in der Seitenleiste – ein Bedienmuster, zwei Orte. */}
        <div onClick={(event) => event.target instanceof HTMLButtonElement && event.target.closest('table') && setPickerOffen(false)}>
          <MiniKalender />
        </div>
      </Popover>
    </div>
  );
}

/* ◆ jh · eof */
