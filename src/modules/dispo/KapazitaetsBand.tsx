/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/KapazitaetsBand.tsx                  │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Kapazitätsband: verplant · Fahrzeit · frei pro Techniker, Heatmap     │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum } from '../../core/datum';
import { formatDatumKurz, formatDauer, formatProzent, formatWochentag } from '../../core/format';
import { Avatar } from '../../core/ui/Avatar';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { cx } from '../../core/ui/cx';
import { kapazitaetFor } from './store/dispo.selectors';
import type { MehrtagesZeile, TagesZeile } from './store/dispo.selectors';
import styles from './KapazitaetsBand.module.css';

// ── §1 · Tag ─────────────────────────────────────────────────────

interface TagProps {
  zeilen: readonly TagesZeile[];
}

// jh› Drei Anteile in einem Balken, Zahlen in Mono daneben: der Disponent
//     sieht auf einen Blick, wo heute noch ein Notfall Platz hat.
function BandTag({ zeilen }: TagProps) {
  return (
    <ul className={styles.liste}>
      {zeilen.map((zeile) => {
        const kap = kapazitaetFor(zeile);
        const soll = kap.sollMin || zeile.techniker.sollMinuten;
        const pGeplant = Math.min(kap.verplantMin / soll, 1);
        const pFahrt = Math.min(kap.fahrzeitMin / soll, Math.max(0, 1 - pGeplant));
        return (
          <li key={zeile.techniker.id} className={styles.zeile}>
            <Avatar techniker={zeile.techniker} size="sm" />
            <span className={styles.name}>{zeile.techniker.nachname}</span>
            <span className={cx(styles.balken, kap.anteil > 1 && styles.ueber)} title={zeile.absenz ? 'abwesend' : `${formatProzent(kap.anteil)} ausgelastet`}>
              <span className={styles.verplant} style={{ width: `${pGeplant * 100}%` }} />
              <span className={styles.fahrt} style={{ left: `${pGeplant * 100}%`, width: `${pFahrt * 100}%` }} />
            </span>
            <span className={styles.zahlen}>
              <span title="verplant">{formatDauer(kap.verplantMin)}</span>
              <span className={styles.trenn}>·</span>
              <span title="Fahrzeit">{formatDauer(kap.fahrzeitMin)}</span>
              <span className={styles.trenn}>·</span>
              <span className={styles.frei} title="frei">
                {zeile.absenz ? '—' : `${formatDauer(kap.freiMin)} frei`}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ── §2 · Woche (Heatmap) ─────────────────────────────────────────

interface WocheProps {
  zeilen: readonly MehrtagesZeile[];
  tage: readonly IsoDatum[];
}

function stufe(anteil: number): string {
  if (anteil <= 0) return styles.heat0 ?? '';
  if (anteil < 0.4) return styles.heat1 ?? '';
  if (anteil < 0.7) return styles.heat2 ?? '';
  if (anteil < 0.95) return styles.heat3 ?? '';
  return styles.heat4 ?? '';
}

function BandWoche({ zeilen, tage }: WocheProps) {
  return (
    <table className={styles.heatmap}>
      <thead>
        <tr>
          <th scope="col" />
          {tage.map((tag) => (
            <th key={tag} scope="col">
              {formatWochentag(tag, 'kurz')} {formatDatumKurz(tag)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {zeilen.map((zeile) => (
          <tr key={zeile.techniker.id}>
            <th scope="row">
              <span className={styles.heatName}>
                <Avatar techniker={zeile.techniker} size="sm" />
                {zeile.techniker.nachname}
              </span>
            </th>
            {zeile.zellen.map((zelle) => {
              const anteil = zelle.absenz ? 0 : zelle.geplantMin / zeile.techniker.sollMinuten;
              return (
                <td key={zelle.datum} className={cx(styles.heatZelle, zelle.absenz ? styles.heatAbsenz : stufe(anteil))} title={zelle.absenz ? 'abwesend' : `${formatDauer(zelle.geplantMin)} · ${formatProzent(anteil)}`}>
                  {zelle.absenz ? '—' : formatDauer(zelle.geplantMin)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── §3 · Band ────────────────────────────────────────────────────

interface KapazitaetsBandProps {
  tagesZeilen?: readonly TagesZeile[];
  wochenZeilen?: readonly MehrtagesZeile[];
  tage?: readonly IsoDatum[];
}

export function KapazitaetsBand({ tagesZeilen, wochenZeilen, tage }: KapazitaetsBandProps) {
  return (
    <section className={styles.band} aria-label="Kapazität">
      <header className={styles.kopf}>
        <CapsLabel>Kapazität</CapsLabel>
        <span className={styles.legende}>
          <span className={cx(styles.legendeFeld, styles.legendeVerplant)} /> verplant
          <span className={cx(styles.legendeFeld, styles.legendeFahrt)} /> Fahrzeit
          <span className={cx(styles.legendeFeld, styles.legendeFrei)} /> frei
        </span>
      </header>
      {tagesZeilen && <BandTag zeilen={tagesZeilen} />}
      {wochenZeilen && tage && <BandWoche zeilen={wochenZeilen} tage={tage} />}
    </section>
  );
}

/* ◆ jh · eof */
