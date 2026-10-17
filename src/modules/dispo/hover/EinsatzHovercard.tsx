/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/hover/EinsatzHovercard.tsx           │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Kurzansicht nach 250 ms: Kunde, Adresse, Gerät, Zeit, Status, Karte   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { STATUS_LABEL } from '../../../core/domain/einsatz';
import { KATEGORIE_LABEL } from '../../../core/domain/kategorie';
import { formatAdresse } from '../../../core/domain/stammdaten';
import { formatDatumKurz, formatWochentag, formatZeitspanne } from '../../../core/format';
import { Chip } from '../../../core/ui/Chip';
import { Hovercard } from '../../../core/ui/Hovercard';
import { Typenschild } from '../../../core/ui/Typenschild';
import { kategorieKlasse, statusKlasse } from '../../../core/ui/farben';
import { cx } from '../../../core/ui/cx';
import type { DispoStammdaten, Einsatz } from '../dispo.types';
import { SchemaKarte } from '../karte/SchemaKarte';
import { KundenChips } from '../KundenChips';
import { resolveAuftrag, technikerOf } from '../store/dispo.selectors';
import { useHovercard } from './HovercardContext';
import styles from './EinsatzHovercard.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface EinsatzHovercardProps {
  stammdaten: DispoStammdaten;
  einsaetze: readonly Einsatz[];
  /** Während eines Drags bleibt die Karte weg. */
  unterdrueckt: boolean;
}

export function EinsatzHovercard({ stammdaten, einsaetze, unterdrueckt }: EinsatzHovercardProps) {
  const { ziel } = useHovercard();
  if (!ziel || unterdrueckt) return null;
  if (!stammdaten.auftraege.has(ziel.auftragId)) return null;

  const { auftrag, kunde, liegenschaft, geraet, koordinaten } = resolveAuftrag(stammdaten, ziel.auftragId);
  const einsatz = ziel.einsatzId ? einsaetze.find((kandidat) => kandidat.id === ziel.einsatzId) : undefined;
  const techniker = einsatz ? technikerOf(stammdaten, einsatz.technikerId) : null;

  return (
    <Hovercard anchor={ziel.anker} breite={320}>
      <div className={styles.karte}>
        <div className={styles.kopf}>
          <Typenschild label="Auftrag" wert={auftrag.nummer} />
          <Chip tone="tint" className={kategorieKlasse(auftrag.kategorie)}>
            {KATEGORIE_LABEL[auftrag.kategorie]}
          </Chip>
        </div>
        <p className={styles.kunde}>{kunde.name}</p>
        <p className={styles.adresse}>
          {formatAdresse(liegenschaft.adresse)}
          {auftrag.wohnung && <span className={styles.mono}> · {auftrag.wohnung.nummer}</span>}
        </p>
        <p className={styles.geraet}>
          {geraet.marke} {geraet.modell} <span className={styles.mono}>· SN {geraet.seriennummer}</span>
        </p>
        <p className={styles.fehler}>{auftrag.fehlerbild}</p>
        {einsatz && techniker && (
          <p className={cx(styles.zeit, statusKlasse(einsatz.status))}>
            <span className={styles.swatch} aria-hidden />
            <span className={styles.mono}>
              {formatWochentag(einsatz.datum, 'kurz')} {formatDatumKurz(einsatz.datum)} · {formatZeitspanne(einsatz.startMin, einsatz.dauerMin)}
            </span>
            <span>
              {STATUS_LABEL[einsatz.status]} · {techniker.kuerzel}
            </span>
          </p>
        )}
        <KundenChips kunde={kunde} liegenschaft={liegenschaft} kompakt />
        <div className={styles.minikarte}>
          <SchemaKarte pins={[{ id: auftrag.id, koordinaten, label: '', farbeKlasse: kategorieKlasse(auftrag.kategorie) }]} breite={296} hoehe={90} kompakt />
        </div>
      </div>
    </Hovercard>
  );
}

/* ◆ jh · eof */
