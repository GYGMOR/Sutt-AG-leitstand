/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/zeiterfassung/MonatsMatrix.tsx             │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Matrix: Personen × Tage mit Tagessaldo, Personen × Monate im Jahr     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { parseIsoDate, weekdayIndex } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import { ABSCHLUSS_STATUS_LABEL } from '../../core/domain/zeit';
import type { MonatsSchluessel } from '../../core/domain/zeit';
import { formatDatum, formatDauer, formatSaldo } from '../../core/format';
import { cx, modulKlasse } from '../../core/ui/cx';
import absenzen from '../absenzen/AbsenzenPage.module.css';
import { PersonAvatar } from '../personal/PersonAvatar';
import type { TagMitPlan } from '../personal/personal.model';
import { TonLegende, saldoKlasse, tagTitel } from './WochenUebersicht';
import { absenzKuerzel, formatDelta, formatStunden, monatLabel, tagTon } from './zeiterfassung.model';
import type { JahresZeile, MatrixTag, TagTon, ZeitZeile } from './zeiterfassung.model';
import styles from './Zeitraster.module.css';

// ── §1 · Monat ───────────────────────────────────────────────────

const WOCHENTAG = ['M', 'D', 'M', 'D', 'F', 'S', 'S'];
const SUMMEN = ['Soll', 'Ist', 'Saldo', 'Total', 'Ferien'];

function zellenText(tag: TagMitPlan, ton: TagTon): string {
  if (ton === 'leer' || ton === 'zukunft') return '';
  if (ton === 'absenz') return tag.absenz ? absenzKuerzel(tag.absenz.art) : 'AB';
  if (ton === 'frei') return tag.feiertag && !tag.feiertag.halb ? 'FT' : '';
  if (ton === 'fehlt') return '–';
  if (ton === 'laeuft') return formatStunden(tag.arbeitMin);
  return formatDelta(tag.saldoMin);
}

function ferienText(zeile: { ferien: { restTage: number; anspruchTage: number; uebertragTage: number } }): string {
  return `${zeile.ferien.restTage} / ${zeile.ferien.anspruchTage + zeile.ferien.uebertragTage}`;
}

interface MonatsMatrixProps {
  zeilen: readonly ZeitZeile[];
  tage: readonly MatrixTag[];
  heute: IsoDatum;
  aktivId: string | null;
  onZelle: (mitarbeiterId: string, datum: IsoDatum) => void;
}

// jh› Die Matrix zeigt je Tag nur die Differenz zum Soll – wer +0:12 sieht, muss nichts rechnen.
//     Absenzen als Kürzel, Feiertage als eigene Zeile oben, Ferienrest rechts: ein Monat auf einen Blick.
export function MonatsMatrix({ zeilen, tage, heute, aktivId, onZelle }: MonatsMatrixProps) {
  const spalten = `220px repeat(${tage.length}, minmax(38px, 1fr)) 64px 64px 72px 72px 76px`;
  const total = zeilen.reduce((summe, zeile) => ({ soll: summe.soll + zeile.konto.periode.sollMin, ist: summe.ist + zeile.konto.periode.arbeitMin }), { soll: 0, ist: 0 });
  return (
    <div className={styles.ansicht}>
      <div className={styles.raster} role="table" aria-label="Monatsmatrix">
        <div className={cx(styles.rasterZeile, styles.rasterKopf)} role="row" style={{ gridTemplateColumns: spalten }}>
          <div className={styles.rasterPerson} role="columnheader">
            Mitarbeitende
          </div>
          {tage.map((tag) => (
            <div key={tag.datum} role="columnheader" className={cx(styles.rasterTagKopf, tag.wochenende && styles.frei, tag.heute && styles.heute)} title={formatDatum(tag.datum)}>
              <span>{WOCHENTAG[weekdayIndex(tag.datum)]}</span>
              <span className={styles.rasterTagNummer}>{parseIsoDate(tag.datum).getDate()}</span>
            </div>
          ))}
          {SUMMEN.map((label) => (
            <div key={label} role="columnheader" className={styles.rasterSumme}>
              {label}
            </div>
          ))}
        </div>
        <div className={cx(styles.rasterZeile, styles.rasterFeiertage)} role="row" style={{ gridTemplateColumns: spalten }}>
          <div className={styles.rasterPerson} role="rowheader">
            Feiertage
          </div>
          {tage.map((tag) => (
            <div key={tag.datum} role="cell" className={cx(styles.rasterZelle, tag.wochenende && styles.frei)} title={tag.feiertag ? `${tag.feiertag.label}${tag.feiertag.halb ? ' (halber Tag)' : ''}` : undefined}>
              {tag.feiertag && <span className={cx(styles.feiertagMarke, tag.feiertag.halb && styles.halb)} aria-hidden />}
            </div>
          ))}
          {SUMMEN.map((label) => (
            <div key={label} role="cell" className={styles.rasterSumme} />
          ))}
        </div>
        {zeilen.map((zeile) => {
          const { mitarbeiter } = zeile.person;
          return (
            <div key={mitarbeiter.id} className={cx(styles.rasterZeile, mitarbeiter.id === aktivId && styles.aktiv)} role="row" style={{ gridTemplateColumns: spalten }}>
              <div className={styles.rasterPerson} role="rowheader">
                <PersonAvatar mitarbeiter={mitarbeiter} techniker={zeile.person.techniker} size="sm" />
                <span className={styles.rasterName}>
                  {mitarbeiter.vorname} {mitarbeiter.nachname}
                </span>
                <span className={styles.rasterMeta}>{mitarbeiter.pensum} %</span>
              </div>
              {zeile.konto.tage.map((tag) => {
                const ton = tagTon(tag);
                if (ton === 'leer') return <div key={tag.datum} role="cell" className={styles.rasterZelle} />;
                const klasse = cx(styles.rasterZelle, modulKlasse(styles, `ton-${ton}`), ton === 'absenz' && tag.absenz && modulKlasse(absenzen, `art-${tag.absenz.art}`), tag.datum === heute && styles.heute);
                return (
                  <button key={tag.datum} type="button" role="cell" className={klasse} title={tagTitel(tag)} onClick={() => onZelle(mitarbeiter.id, tag.datum)}>
                    {zellenText(tag, ton)}
                  </button>
                );
              })}
              <div className={styles.rasterSumme} role="cell" title="Soll bis heute">
                {formatStunden(zeile.konto.periode.sollMin)}
              </div>
              <div className={styles.rasterSumme} role="cell" title="Ist bis heute">
                {formatStunden(zeile.konto.periode.arbeitMin)}
              </div>
              <div className={cx(styles.rasterSumme, styles.stark, saldoKlasse(zeile.konto.periode.saldoMin))} role="cell" title={`Saldo Monat ${formatSaldo(zeile.konto.periode.saldoMin)}`}>
                {formatDelta(zeile.konto.periode.saldoMin)}
              </div>
              <div className={cx(styles.rasterSumme, saldoKlasse(zeile.konto.saldoKumuliertMin))} role="cell" title={`Gleitzeit-Saldo total ${formatSaldo(zeile.konto.saldoKumuliertMin)}`}>
                {formatDelta(zeile.konto.saldoKumuliertMin)}
              </div>
              <div className={styles.rasterSumme} role="cell" title={`Ferien: ${zeile.ferien.restTage} Tage Rest von ${zeile.ferien.anspruchTage + zeile.ferien.uebertragTage} (${zeile.ferien.bezogenTage} bezogen, ${zeile.ferien.geplantTage} geplant)`}>
                {ferienText(zeile)}
              </div>
            </div>
          );
        })}
        {zeilen.length > 1 && (
          <div className={cx(styles.rasterZeile, styles.rasterFuss)} role="row" style={{ gridTemplateColumns: spalten }}>
            <div className={styles.rasterPerson} role="rowheader">
              Total · {zeilen.length} Personen
            </div>
            {tage.map((tag) => (
              <div key={tag.datum} role="cell" className={cx(styles.rasterZelle, tag.wochenende && styles.frei)} />
            ))}
            <div className={cx(styles.rasterSumme, styles.stark)} role="cell">
              {formatStunden(total.soll)}
            </div>
            <div className={cx(styles.rasterSumme, styles.stark)} role="cell">
              {formatStunden(total.ist)}
            </div>
            <div className={cx(styles.rasterSumme, styles.stark, saldoKlasse(total.ist - total.soll))} role="cell">
              {formatDelta(total.ist - total.soll)}
            </div>
            <div className={styles.rasterSumme} role="cell" />
            <div className={styles.rasterSumme} role="cell" />
          </div>
        )}
        {zeilen.length === 0 && <p className={styles.leerHinweis}>Keine Personen in dieser Sicht.</p>}
      </div>
      <TonLegende />
    </div>
  );
}

// ── §2 · Jahr ────────────────────────────────────────────────────

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const JAHR_SUMMEN = ['Soll', 'Ist', 'Saldo Jahr', 'Total', 'Ferien'];

interface JahresMatrixProps {
  zeilen: readonly JahresZeile[];
  jahr: number;
  aktivId: string | null;
  onZelle: (mitarbeiterId: string, monat: MonatsSchluessel) => void;
}

export function JahresMatrix({ zeilen, jahr, aktivId, onZelle }: JahresMatrixProps) {
  const spalten = '220px repeat(12, minmax(60px, 1fr)) 72px 72px 80px 80px 76px';
  return (
    <div className={styles.ansicht}>
      <div className={styles.raster} role="table" aria-label={`Jahresübersicht ${jahr}`}>
        <div className={cx(styles.rasterZeile, styles.rasterKopf)} role="row" style={{ gridTemplateColumns: spalten }}>
          <div className={styles.rasterPerson} role="columnheader">
            Mitarbeitende · {jahr}
          </div>
          {MONATE.map((label) => (
            <div key={label} role="columnheader" className={styles.rasterTagKopf}>
              <span className={styles.rasterTagNummer}>{label}</span>
            </div>
          ))}
          {JAHR_SUMMEN.map((label) => (
            <div key={label} role="columnheader" className={styles.rasterSumme}>
              {label}
            </div>
          ))}
        </div>
        {zeilen.map((zeile) => {
          const { mitarbeiter } = zeile.person;
          return (
            <div key={mitarbeiter.id} className={cx(styles.rasterZeile, mitarbeiter.id === aktivId && styles.aktiv)} role="row" style={{ gridTemplateColumns: spalten }}>
              <div className={styles.rasterPerson} role="rowheader">
                <PersonAvatar mitarbeiter={mitarbeiter} techniker={zeile.person.techniker} size="sm" />
                <span className={styles.rasterName}>
                  {mitarbeiter.vorname} {mitarbeiter.nachname}
                </span>
                <span className={styles.rasterMeta}>{mitarbeiter.pensum} %</span>
              </div>
              {zeile.monate.map((monat) => {
                if (monat.leer) {
                  return <div key={monat.monat} role="cell" className={cx(styles.rasterZelle, styles.tonZukunft)} title={monat.vorUebertrag ? `${monatLabel(monat.monat)} · im Übertrag per ${formatDatum(zeile.uebertragPer)} enthalten` : `${monatLabel(monat.monat)} · noch offen oder nicht angestellt`} />;
                }
                const ton: TagTon = Math.abs(monat.saldoMin) > 4 * 60 ? 'abweichung' : 'ok';
                const titel = `${monatLabel(monat.monat)} · Soll ${formatDauer(monat.sollMin)} · Ist ${formatDauer(monat.istMin)} · Saldo ${formatSaldo(monat.saldoMin)}${monat.abschluss ? ` · ${ABSCHLUSS_STATUS_LABEL[monat.abschluss]}` : ' · kein Abschluss'}`;
                return (
                  <button key={monat.monat} type="button" role="cell" className={cx(styles.rasterZelle, modulKlasse(styles, `ton-${ton}`))} title={titel} onClick={() => onZelle(mitarbeiter.id, monat.monat)}>
                    {formatDelta(monat.saldoMin)}
                    {monat.abschluss && <span className={cx(styles.marke, modulKlasse(styles, `marke-${monat.abschluss}`))} aria-hidden />}
                  </button>
                );
              })}
              <div className={styles.rasterSumme} role="cell">
                {formatStunden(zeile.sollMin)}
              </div>
              <div className={styles.rasterSumme} role="cell">
                {formatStunden(zeile.istMin)}
              </div>
              <div className={cx(styles.rasterSumme, styles.stark, saldoKlasse(zeile.saldoMin))} role="cell">
                {formatDelta(zeile.saldoMin)}
              </div>
              <div className={cx(styles.rasterSumme, saldoKlasse(zeile.kumuliertMin))} role="cell" title="Gleitzeit-Saldo inklusive Übertrag">
                {formatDelta(zeile.kumuliertMin)}
              </div>
              <div className={styles.rasterSumme} role="cell" title={`Ferien: ${zeile.ferien.restTage} Tage Rest von ${zeile.ferien.anspruchTage + zeile.ferien.uebertragTage}`}>
                {ferienText(zeile)}
              </div>
            </div>
          );
        })}
        {zeilen.length === 0 && <p className={styles.leerHinweis}>Keine Personen in dieser Sicht.</p>}
      </div>
      <ul className={styles.legende} aria-label="Legende">
        <li>
          <span className={cx(styles.legendeFarbe, styles.tonOk)} aria-hidden /> Saldo im Rahmen (bis 4 Stunden)
        </li>
        <li>
          <span className={cx(styles.legendeFarbe, styles.tonAbweichung)} aria-hidden /> mehr als 4 Stunden Abweichung
        </li>
        <li>
          <span className={cx(styles.feiertagMarke, styles.markeGenehmigt)} aria-hidden /> genehmigt
        </li>
        <li>
          <span className={cx(styles.feiertagMarke, styles.markeEingereicht)} aria-hidden /> eingereicht
        </li>
        <li>
          <span className={cx(styles.feiertagMarke, styles.markeZurueckgewiesen)} aria-hidden /> zurückgewiesen
        </li>
        <li>
          <span className={cx(styles.legendeFarbe, styles.tonZukunft)} aria-hidden /> leer: vor dem Übertrag-Stichtag oder noch offen
        </li>
      </ul>
    </div>
  );
}

/* ◆ jh · eof */
