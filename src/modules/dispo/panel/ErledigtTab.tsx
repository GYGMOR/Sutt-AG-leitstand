/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/panel/ErledigtTab.tsx                │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Tab Erledigt: Rapport- und Rechnungsstatus der erledigten Einsätze    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Check, Receipt } from 'lucide-react';
import { RAPPORT_LABEL, RECHNUNG_LABEL } from '../../../core/domain/auftrag';
import type { RechnungStatus } from '../../../core/domain/auftrag';
import { formatDatumKurz, formatWochentag, formatZeitspanne } from '../../../core/format';
import { Avatar } from '../../../core/ui/Avatar';
import { Chip } from '../../../core/ui/Chip';
import type { ChipTone } from '../../../core/ui/Chip';
import { Typenschild } from '../../../core/ui/Typenschild';
import { cx } from '../../../core/ui/cx';
import { RAPPORT_ICON, RAPPORT_TON } from '../../rapport/rapportStatus';
import type { ErledigtView } from '../store/dispo.selectors';
import styles from './PanelTabs.module.css';

// ── §1 · Status-Chips ────────────────────────────────────────────

// jh› Rapport-Icon und -Ton kommen aus modules/rapport – eine Sprache für Panel, Akte und Modul.
const RECHNUNG_TON: Readonly<Record<RechnungStatus, ChipTone>> = { offen: 'mute', gestellt: 'neutral', bezahlt: 'ok' };

// ── §2 · Komponente ──────────────────────────────────────────────

interface ErledigtTabProps {
  eintraege: readonly ErledigtView[];
  zeitraumLabel: string;
  ausgewaehltId: string | null;
  onSelectEinsatz: (einsatzId: string) => void;
}

export function ErledigtTab({ eintraege, zeitraumLabel, ausgewaehltId, onSelectEinsatz }: ErledigtTabProps) {
  const rapporteOffen = eintraege.filter((view) => view.auftrag.rapport === 'offen').length;
  return (
    <>
      <p className={styles.untertitel}>
        {zeitraumLabel} · {eintraege.length} erledigt{rapporteOffen > 0 && ` · ${rapporteOffen} Rapport${rapporteOffen === 1 ? '' : 'e'} offen`}
      </p>
      <ul className={styles.liste}>
        {eintraege.map((view) => (
          <li key={view.einsatz.id} className={cx(styles.eintrag, view.einsatz.id === ausgewaehltId && styles.eintragAktiv)}>
            <button type="button" className={styles.eintragKopf} onClick={() => onSelectEinsatz(view.einsatz.id)}>
              <Typenschild label="Auftrag" wert={view.auftrag.nummer} />
              <span className={styles.eintragKunde}>{view.kunde.name}</span>
              <span className={styles.eintragMeta}>
                <Avatar techniker={view.techniker} size="sm" /> {formatWochentag(view.einsatz.datum, 'kurz')} {formatDatumKurz(view.einsatz.datum)} ·{' '}
                {formatZeitspanne(view.einsatz.startMin, view.einsatz.dauerMin)}
              </span>
              <span className={styles.eintragText}>{view.auftrag.fehlerbild}</span>
            </button>
            <div className={styles.chips}>
              <Chip icon={RAPPORT_ICON[view.auftrag.rapport]} tone={RAPPORT_TON[view.auftrag.rapport]} size="md">
                {RAPPORT_LABEL[view.auftrag.rapport]}
              </Chip>
              <Chip icon={Receipt} tone={RECHNUNG_TON[view.auftrag.rechnungStatus]} size="md">
                {RECHNUNG_LABEL[view.auftrag.rechnungStatus]}
              </Chip>
            </div>
          </li>
        ))}
      </ul>
      {eintraege.length === 0 && (
        <div className={styles.leer}>
          <Check size={20} strokeWidth={1.5} aria-hidden />
          <p>Noch nichts erledigt in diesem Zeitraum.</p>
        </div>
      )}
    </>
  );
}

/* ◆ jh · eof */
