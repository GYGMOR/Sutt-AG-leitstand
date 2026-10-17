/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/panel/WartetTab.tsx                  │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Tab «Wartet auf Teil»: Liefertermin, Folgetermin vorschlagen          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import { CalendarCheck, CalendarPlus, PackageSearch } from 'lucide-react';
import type { IsoDatum, Minuten } from '../../../core/datum';
import { isTeilOffen } from '../../../core/domain/auftrag';
import { formatDatum, formatDatumKurz, formatWochentag, formatZeit } from '../../../core/format';
import { Avatar } from '../../../core/ui/Avatar';
import { Button } from '../../../core/ui/Button';
import { Typenschild } from '../../../core/ui/Typenschild';
import { cx } from '../../../core/ui/cx';
import { SlotVorschlaege } from '../akte/SlotVorschlaege';
import type { DispoStammdaten, Einsatz, PlanZiel } from '../dispo.types';
import type { WartetView } from '../store/dispo.selectors';
import styles from './PanelTabs.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface WartetTabProps {
  eintraege: readonly WartetView[];
  stammdaten: DispoStammdaten;
  einsaetze: readonly Einsatz[];
  heute: IsoDatum;
  jetztMin: Minuten;
  ausgewaehltId: string | null;
  onSelectEinsatz: (einsatzId: string) => void;
  onPlanFolgetermin: (einsatzId: string, ziel: PlanZiel) => void;
  onSelectPendenz: (pendenzId: string) => void;
  pendenzIdFuer: (auftragId: string) => string | null;
}

export function WartetTab({ eintraege, stammdaten, einsaetze, heute, jetztMin, ausgewaehltId, onSelectEinsatz, onPlanFolgetermin, onSelectPendenz, pendenzIdFuer }: WartetTabProps) {
  const [offen, setOffen] = useState<string | null>(null);

  return (
    <>
      <p className={styles.untertitel}>Einsatz unterbrochen · Ersatzteil bestellt · nach Liefertermin</p>
      <ul className={styles.liste}>
        {eintraege.map((view) => {
          const teile = view.auftrag.ersatzteile.filter(isTeilOffen);
          const pendenzId = pendenzIdFuer(view.auftrag.id);
          const folge = view.folgeGeplant;
          const zeigtVorschlaege = offen === view.einsatz.id;
          return (
            <li key={view.einsatz.id} className={cx(styles.eintrag, view.einsatz.id === ausgewaehltId && styles.eintragAktiv)}>
              <button type="button" className={styles.eintragKopf} onClick={() => onSelectEinsatz(view.einsatz.id)}>
                <Typenschild label="Auftrag" wert={view.auftrag.nummer} />
                <span className={styles.eintragKunde}>{view.kunde.name}</span>
                <span className={styles.eintragMeta}>
                  <Avatar techniker={view.techniker} size="sm" /> {view.techniker.kuerzel} · Einsatz {formatDatumKurz(view.einsatz.datum)}
                </span>
                <span className={styles.eintragText}>{view.auftrag.fehlerbild}</span>
              </button>
              <dl className={styles.teile}>
                {teile.map((teil) => (
                  <div key={teil.artikelNummer}>
                    <dt>
                      <PackageSearch size={16} strokeWidth={1.5} aria-hidden /> {teil.bezeichnung}
                    </dt>
                    <dd className={styles.mono}>{teil.liefertermin ? `Liefertermin ${formatDatum(teil.liefertermin)}` : 'ohne Termin'}</dd>
                  </div>
                ))}
                {teile.length === 0 && (
                  <div>
                    <dt>Teil</dt>
                    <dd className={styles.mono}>{view.liefertermin ? `eingetroffen ${formatDatum(view.liefertermin)}` : 'eingetroffen'}</dd>
                  </div>
                )}
              </dl>
              {folge ? (
                <Button variant="secondary" size="sm" icon={CalendarCheck} onClick={() => onSelectEinsatz(folge.id)} title="Geplanten Folgetermin öffnen">
                  Folgetermin {formatWochentag(folge.datum, 'kurz')} {formatDatumKurz(folge.datum)} {formatZeit(folge.startMin)}
                </Button>
              ) : pendenzId ? (
                <Button variant="secondary" size="sm" icon={CalendarPlus} onClick={() => onSelectPendenz(pendenzId)}>
                  Folgetermin im Eingang zeigen
                </Button>
              ) : (
                <Button variant={zeigtVorschlaege ? 'ghost' : 'secondary'} size="sm" icon={CalendarPlus} onClick={() => setOffen(zeigtVorschlaege ? null : view.einsatz.id)}>
                  {zeigtVorschlaege ? 'Vorschläge ausblenden' : 'Folgetermin vorschlagen'}
                </Button>
              )}
              {zeigtVorschlaege && !pendenzId && !folge && (
                <SlotVorschlaege
                  stammdaten={stammdaten}
                  einsaetze={einsaetze}
                  auftragId={view.auftrag.id}
                  dauerMin={Math.min(view.einsatz.dauerMin, 60)}
                  abDatum={view.liefertermin && view.liefertermin > heute ? view.liefertermin : heute}
                  heute={heute}
                  jetztMin={jetztMin}
                  titel={view.liefertermin ? `ab Liefertermin ${formatDatumKurz(view.liefertermin)}` : 'ab sofort'}
                  onPlan={(ziel) => {
                    onPlanFolgetermin(view.einsatz.id, ziel);
                    setOffen(null);
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>
      {eintraege.length === 0 && (
        <div className={styles.leer}>
          <PackageSearch size={20} strokeWidth={1.5} aria-hidden />
          <p>Kein Einsatz wartet auf ein Teil.</p>
        </div>
      )}
    </>
  );
}

/* ◆ jh · eof */
