/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/TechnikerZelle.tsx             │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Zeilenkopf: Avatar mit Puls, Name (Druck), Region, Auslastung         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Printer } from 'lucide-react';
import type { Minuten } from '../../../core/datum';
import { REGION_LABEL, fullName } from '../../../core/domain/stammdaten';
import type { Techniker } from '../../../core/domain/stammdaten';
import { formatDauer } from '../../../core/format';
import { Avatar } from '../../../core/ui/Avatar';
import { cx } from '../../../core/ui/cx';
import { LivePuls } from '../LivePuls';
import type { Puls } from '../store/dispo.selectors';
import styles from './TechnikerZelle.module.css';

// ── §1 · Auslastung ──────────────────────────────────────────────

interface AuslastungProps {
  geplantMin: Minuten;
  fahrzeitMin?: Minuten;
  sollMin: Minuten;
}

// jh› Balkenbreite ist eine Zeitgrösse (geplant/Soll) – Inline-Breite erlaubt
//     wie bei den Positionen im Zeitraster.
export function Auslastung({ geplantMin, fahrzeitMin = 0, sollMin }: AuslastungProps) {
  const anteilGeplant = sollMin > 0 ? Math.min(geplantMin / sollMin, 1) : 0;
  const anteilFahrt = sollMin > 0 ? Math.min(fahrzeitMin / sollMin, 1 - anteilGeplant) : 0;
  const ueber = sollMin > 0 && geplantMin + fahrzeitMin > sollMin;
  return (
    <span
      className={cx(styles.balken, ueber && styles.ueber)}
      role="meter"
      aria-label="Auslastung"
      aria-valuemin={0}
      aria-valuemax={sollMin}
      aria-valuenow={geplantMin + fahrzeitMin}
      title={`${formatDauer(geplantMin)} Einsatz · ${formatDauer(fahrzeitMin)} Fahrt · Soll ${formatDauer(sollMin)}`}
    >
      <span className={styles.fuellung} style={{ width: `${anteilGeplant * 100}%` }} />
      <span className={styles.fahrt} style={{ left: `${anteilGeplant * 100}%`, width: `${anteilFahrt * 100}%` }} />
    </span>
  );
}

// ── §2 · Zelle ───────────────────────────────────────────────────

interface TechnikerZelleProps {
  techniker: Techniker;
  geplantMin: Minuten;
  fahrzeitMin: Minuten;
  sollMin: Minuten;
  puls: Puls | null;
  onDrucken: (technikerId: string) => void;
}

export function TechnikerZelle({ techniker, geplantMin, fahrzeitMin, sollMin, puls, onDrucken }: TechnikerZelleProps) {
  return (
    <div className={styles.zelle}>
      <Avatar techniker={techniker} size="md" puls={puls ? <LivePuls puls={puls} kompakt /> : undefined} />
      <div className={styles.text}>
        <button type="button" className={styles.name} onClick={() => onDrucken(techniker.id)} title="Tagesplan drucken / teilen">
          <span className={styles.nameText}>{fullName(techniker)}</span>
          <Printer size={16} strokeWidth={1.5} aria-hidden className={styles.drucker} />
        </button>
        <span className={styles.meta}>
          {puls ? <LivePuls puls={puls} /> : <span>{REGION_LABEL[techniker.region]}</span>}
          <span className={styles.stunden}>{formatDauer(geplantMin)}</span>
        </span>
        <Auslastung geplantMin={geplantMin} fahrzeitMin={fahrzeitMin} sollMin={sollMin} />
      </div>
    </div>
  );
}

/* ◆ jh · eof */
