/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/zeiterfassung/TagesBild.tsx                │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Tag: Zeitstrahl je Person – Arbeit, Pause, laufend, Jetzt-Linie       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import type { IsoDatum, Minuten } from '../../core/datum';
import { ABSENZ_LABEL } from '../../core/domain/absenz';
import { formatSaldo, formatZeit } from '../../core/format';
import { Chip } from '../../core/ui/Chip';
import { cx } from '../../core/ui/cx';
import { PersonAvatar } from '../personal/PersonAvatar';
import { saldoKlasse, tagTitel } from './WochenUebersicht';
import { formatStunden, tagesTitel, zeitstrahl } from './zeiterfassung.model';
import type { TagesZeile } from './zeiterfassung.model';
import styles from './Zeitraster.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface TagesBildProps {
  zeilen: readonly TagesZeile[];
  datum: IsoDatum;
  heute: IsoDatum;
  jetztMin: Minuten;
  aktivId: string | null;
  onPerson: (mitarbeiterId: string) => void;
}

// jh› Das Tagesbild beantwortet die Frage der Disposition um halb neun: Wer ist schon da, wer macht Pause,
//     wer fehlt? Blöcke statt Zahlen – die Zahlen stehen rechts.
export function TagesBild({ zeilen, datum, heute, jetztMin, aktivId, onPerson }: TagesBildProps) {
  const istHeute = datum === heute;
  const strahl = useMemo(() => zeitstrahl(zeilen, istHeute ? jetztMin : null), [zeilen, istHeute, jetztMin]);
  const spanne = Math.max(60, strahl.bisMin - strahl.vonMin);
  const prozent = (minute: Minuten) => `${Math.min(100, Math.max(0, ((minute - strahl.vonMin) / spanne) * 100))}%`;
  const breite = (von: Minuten, bis: Minuten) => `${Math.max(0.4, ((Math.min(bis, strahl.bisMin) - Math.max(von, strahl.vonMin)) / spanne) * 100)}%`;

  return (
    <div className={styles.ansicht}>
      <div className={styles.strahl} role="table" aria-label={`Tagesbild ${datum}`}>
        <div className={cx(styles.strahlZeile, styles.strahlKopf)} role="row">
          <div className={styles.strahlPerson} role="columnheader">
            Mitarbeitende
          </div>
          <div className={styles.strahlSkala} role="columnheader" aria-label="Uhrzeit">
            {strahl.stunden.map((stunde) => (
              <span key={stunde} className={styles.strahlStunde} style={{ left: prozent(stunde) }}>
                <span>{formatZeit(stunde)}</span>
              </span>
            ))}
          </div>
          <div className={styles.strahlZahlen} role="columnheader">
            Ist / Soll
          </div>
        </div>
        {zeilen.map((zeile) => {
          const { mitarbeiter } = zeile.person;
          const { tag } = zeile;
          return (
            <div key={mitarbeiter.id} className={cx(styles.strahlZeile, mitarbeiter.id === aktivId && styles.aktiv)} role="row">
              <button type="button" role="rowheader" className={styles.strahlPerson} title={tagesTitel(zeile)} onClick={() => onPerson(mitarbeiter.id)}>
                <PersonAvatar mitarbeiter={mitarbeiter} techniker={zeile.person.techniker} size="sm" />
                <span className={styles.rasterName}>
                  {mitarbeiter.vorname} {mitarbeiter.nachname}
                </span>
                {istHeute && zeile.lage.status === 'arbeitet' && (
                  <Chip tone="ok" size="sm">
                    da
                  </Chip>
                )}
                {istHeute && zeile.lage.status === 'pause' && (
                  <Chip tone="neutral" size="sm">
                    Pause
                  </Chip>
                )}
              </button>
              <div className={styles.strahlBahn} role="cell" title={tagTitel(tag)}>
                {strahl.stunden.map((stunde) => (
                  <span key={stunde} className={styles.strahlStunde} style={{ left: prozent(stunde) }} aria-hidden />
                ))}
                {tag.absenz && zeile.eintraege.length === 0 && <span className={cx(styles.block, styles.blockAbsenz)} style={{ left: 0, right: 0 }}>{ABSENZ_LABEL[tag.absenz.art]}</span>}
                {zeile.eintraege.map((eintrag) => {
                  const bis = eintrag.bisMin ?? (istHeute ? jetztMin : eintrag.vonMin + 1);
                  return (
                    <span
                      key={eintrag.id}
                      className={cx(styles.block, eintrag.art === 'arbeit' ? styles.blockArbeit : styles.blockPause, eintrag.bisMin === null && istHeute && styles.blockLaeuft, (eintrag.quelle === 'manuell' || eintrag.korrekturen.length > 0) && styles.blockManuell)}
                      style={{ left: prozent(eintrag.vonMin), width: breite(eintrag.vonMin, bis) }}
                      title={`${formatZeit(eintrag.vonMin)}–${eintrag.bisMin === null ? 'läuft' : formatZeit(eintrag.bisMin)} · ${eintrag.art === 'arbeit' ? 'Arbeit' : 'Pause'}${eintrag.bemerkung ? ` · ${eintrag.bemerkung}` : ''}`}
                    />
                  );
                })}
                {istHeute && <span className={styles.jetzt} style={{ left: prozent(jetztMin) }} aria-hidden />}
              </div>
              <div className={styles.strahlZahlen} role="cell">
                {tag.zukunft || tag.grund === 'nicht-angestellt' ? (
                  <span className={styles.strahlMeta}>–</span>
                ) : (
                  <>
                    <span>
                      {formatStunden(tag.arbeitMin)} / {formatStunden(tag.sollMin)}
                    </span>
                    <span className={cx(styles.strahlMeta, saldoKlasse(tag.saldoMin))}>
                      {formatSaldo(tag.saldoMin)}
                      {tag.warnungen.length > 0 && ` · ${tag.warnungen.length} ${tag.warnungen.length === 1 ? 'Hinweis' : 'Hinweise'}`}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {zeilen.length === 0 && <p className={styles.leerHinweis}>Keine Personen in dieser Sicht.</p>}
      </div>
      <ul className={styles.legende} aria-label="Legende">
        <li>
          <span className={cx(styles.legendeFarbe, styles.blockArbeit)} aria-hidden /> Arbeit
        </li>
        <li>
          <span className={cx(styles.legendeFarbe, styles.blockPause)} aria-hidden /> Pause
        </li>
        <li>
          <span className={cx(styles.legendeFarbe, styles.blockArbeit, styles.blockLaeuft)} aria-hidden /> läuft
        </li>
        <li>
          <span className={cx(styles.legendeFarbe, styles.blockArbeit, styles.blockManuell)} aria-hidden /> manuell oder korrigiert
        </li>
        <li>
          <span className={styles.legendeFarbe} style={{ background: 'var(--sl-signal)' }} aria-hidden /> jetzt
        </li>
      </ul>
    </div>
  );
}

/* ◆ jh · eof */
