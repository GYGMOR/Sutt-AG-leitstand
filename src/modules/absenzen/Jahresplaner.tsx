/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/absenzen/Jahresplaner.tsx                  │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Planer: Personen × Tage eines Monats, Absenzen als Blöcke, Legende    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { parseIsoDate } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import { ABSENZ_ARTEN, ABSENZ_LABEL } from '../../core/domain/absenz';
import { formatDatum } from '../../core/format';
import { Button, IconButton } from '../../core/ui/Button';
import { cx, modulKlasse } from '../../core/ui/cx';
import { PersonAvatar } from '../personal/PersonAvatar';
import type { PlanerZeile } from './absenzen.model';
import styles from './AbsenzenPage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface JahresplanerProps {
  zeilen: readonly PlanerZeile[];
  tage: readonly IsoDatum[];
  titel: string;
  onZurueck: () => void;
  onVor: () => void;
  onHeute: () => void;
  onAbsenz: (absenzId: string) => void;
  /** Klick auf eine freie Zelle – fehlt, wenn die Person nicht erfassen darf. */
  onNeu?: (mitarbeiterId: string, datum: IsoDatum) => void;
}

const WOCHENTAG = ['S', 'M', 'D', 'M', 'D', 'F', 'S'];

// jh› Ein Monat auf einen Blick: Wer fehlt wann, wo häufen sich Ferien – mit beantragten Absenzen gestrichelt,
//     damit die Disposition Engpässe sieht, bevor sie genehmigt sind.
export function Jahresplaner({ zeilen, tage, titel, onZurueck, onVor, onHeute, onAbsenz, onNeu }: JahresplanerProps) {
  const spalten = `200px repeat(${tage.length}, minmax(22px, 1fr))`;
  return (
    <section className={styles.planer} aria-label="Absenzenplaner">
      <header className={styles.planerKopf}>
        <div className={styles.monatNav} role="group" aria-label="Monat">
          <IconButton icon={ChevronLeft} label="Vormonat" size="sm" onClick={onZurueck} />
          <span className={styles.monatLabel}>{titel}</span>
          <IconButton icon={ChevronRight} label="Nächster Monat" size="sm" onClick={onVor} />
          <Button variant="ghost" size="sm" onClick={onHeute}>
            Heute
          </Button>
        </div>
        <ul className={styles.legende}>
          {ABSENZ_ARTEN.map((art) => (
            <li key={art}>
              <span className={cx(styles.legendeFarbe, modulKlasse(styles, `art-${art}`))} aria-hidden /> {ABSENZ_LABEL[art]}
            </li>
          ))}
          <li>
            <span className={cx(styles.legendeFarbe, styles.beantragt)} aria-hidden /> beantragt
          </li>
        </ul>
      </header>
      <div className={styles.raster} role="table" aria-label={titel}>
        <div className={styles.rasterZeile} role="row" style={{ gridTemplateColumns: spalten }}>
          <div className={styles.rasterPerson} role="columnheader">
            Mitarbeitende
          </div>
          {tage.map((datum) => {
            const tag = parseIsoDate(datum);
            const wochenende = tag.getDay() === 0 || tag.getDay() === 6;
            return (
              <div key={datum} role="columnheader" className={cx(styles.rasterTagKopf, wochenende && styles.frei)} title={formatDatum(datum)}>
                <span>{WOCHENTAG[tag.getDay()]}</span>
                <span className={styles.rasterTagNummer}>{tag.getDate()}</span>
              </div>
            );
          })}
        </div>
        {zeilen.map((zeile) => (
          <div key={zeile.person.mitarbeiter.id} className={styles.rasterZeile} role="row" style={{ gridTemplateColumns: spalten }}>
            <div className={styles.rasterPerson} role="rowheader">
              <PersonAvatar mitarbeiter={zeile.person.mitarbeiter} techniker={zeile.person.techniker} size="sm" />
              <span className={styles.rasterName}>
                {zeile.person.mitarbeiter.vorname} {zeile.person.mitarbeiter.nachname}
              </span>
              {zeile.tageAbwesend > 0 && <span className={styles.rasterZaehler}>{zeile.tageAbwesend}</span>}
            </div>
            {zeile.tage.map((tag) => {
              const frei = tag.wochenende || (tag.feiertag !== undefined && !tag.feiertag.halb);
              const titelText = [formatDatum(tag.datum), tag.feiertag?.label, tag.absenz ? `${ABSENZ_LABEL[tag.absenz.art]}${tag.absenz.status === 'beantragt' ? ' (beantragt)' : ''}` : undefined].filter(Boolean).join(' · ');
              if (tag.absenz) {
                const { absenz } = tag;
                return (
                  <button key={tag.datum} type="button" role="cell" className={cx(styles.rasterZelle, styles.rasterAbsenz, modulKlasse(styles, `art-${absenz.art}`), absenz.status === 'beantragt' && styles.beantragt, tag.heute && styles.heute)} title={titelText} onClick={() => onAbsenz(absenz.id)}>
                  </button>
                );
              }
              if (onNeu && !frei) {
                return <button key={tag.datum} type="button" role="cell" className={cx(styles.rasterZelle, styles.rasterLeer, tag.heute && styles.heute)} title={`${titelText} · Absenz eintragen`} onClick={() => onNeu(zeile.person.mitarbeiter.id, tag.datum)} />;
              }
              return <div key={tag.datum} role="cell" className={cx(styles.rasterZelle, frei && styles.frei, tag.heute && styles.heute)} title={titelText} />;
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ◆ jh · eof */
