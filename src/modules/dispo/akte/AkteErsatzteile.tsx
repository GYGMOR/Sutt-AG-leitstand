/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/akte/AkteErsatzteile.tsx             │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Ersatzteile mit Status und Liefertermin                               │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoDatum } from '../../../core/datum';
import { TEIL_STATUS_LABEL } from '../../../core/domain/auftrag';
import type { Ersatzteil, TeilStatus } from '../../../core/domain/auftrag';
import { formatChf, formatDatum } from '../../../core/format';
import { cx } from '../../../core/ui/cx';
import { statusKlasse } from '../../../core/ui/farben';
import styles from './AkteErsatzteile.module.css';

// ── §1 · Statusfarbe ─────────────────────────────────────────────

// jh› Teilestatus nutzt die Einsatz-Farbwelt: Violett = «wartet auf Teil».
const TEIL_KLASSE: Readonly<Record<TeilStatus, string | undefined>> = {
  'ab-lager': statusKlasse('vor-ort'),
  eingetroffen: statusKlasse('vor-ort'),
  bestellt: statusKlasse('wartet-teil'),
  unterwegs: statusKlasse('unterwegs'),
};

function terminText(teil: Ersatzteil, heute: IsoDatum): string {
  if (!teil.liefertermin) return '—';
  if (teil.status === 'eingetroffen') return `am ${formatDatum(teil.liefertermin)}`;
  if (teil.liefertermin === heute) return 'heute';
  return formatDatum(teil.liefertermin);
}

// ── §2 · Tabelle ─────────────────────────────────────────────────

interface AkteErsatzteileProps {
  teile: readonly Ersatzteil[];
  heute: IsoDatum;
}

export function AkteErsatzteile({ teile, heute }: AkteErsatzteileProps) {
  const total = teile.reduce((summe, teil) => summe + teil.preisChf * teil.menge, 0);
  if (teile.length === 0) return <p className={styles.leer}>Keine Ersatzteile erfasst.</p>;

  return (
    <table className={styles.tabelle}>
      <thead>
        <tr>
          <th scope="col">Teil</th>
          <th scope="col">Status</th>
          <th scope="col">Liefertermin</th>
        </tr>
      </thead>
      <tbody>
        {teile.map((teil) => (
          <tr key={teil.artikelNummer}>
            <td>
              <span className={styles.bezeichnung}>
                {teil.menge} × {teil.bezeichnung}
              </span>
              <span className={styles.artikel}>
                Art. {teil.artikelNummer} · {teil.lieferant}
              </span>
            </td>
            <td>
              <span className={cx(styles.status, TEIL_KLASSE[teil.status])}>
                <span className={styles.swatch} aria-hidden />
                {TEIL_STATUS_LABEL[teil.status]}
              </span>
            </td>
            <td className={styles.termin}>{terminText(teil, heute)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={2} className={styles.totalLabel}>
            Material
          </td>
          <td className={styles.total}>{formatChf(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

/* ◆ jh · eof */
