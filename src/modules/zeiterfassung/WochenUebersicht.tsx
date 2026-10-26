/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/zeiterfassung/WochenUebersicht.tsx         │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Woche: ein farbiger Chip je Tag und Person, Erfasst, Erwartet, Saldo  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { MouseEvent } from 'react';
import { parseIsoDate } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import { ABSENZ_LABEL } from '../../core/domain/absenz';
import { ZEIT_WARNUNG_LABEL } from '../../core/domain/zeit';
import { formatDatum, formatDatumKurz, formatDauer, formatSaldo, formatWochentag, formatZeit } from '../../core/format';
import { Chip } from '../../core/ui/Chip';
import { Tabelle } from '../../core/ui/Tabelle';
import type { Spalte } from '../../core/ui/Tabelle';
import { cx, modulKlasse } from '../../core/ui/cx';
import absenzen from '../absenzen/AbsenzenPage.module.css';
import { PersonZelle } from '../personal/PersonAvatar';
import type { TagMitPlan } from '../personal/personal.model';
import personal from '../personal/Personal.module.css';
import { TAG_TON_LABEL, formatStunden, tagKurz, tagTon } from './zeiterfassung.model';
import type { TagTon, WochenZeile } from './zeiterfassung.model';
import styles from './Zeitraster.module.css';

// ── §1 · Chip ────────────────────────────────────────────────────

export function tagTitel(tag: TagMitPlan): string {
  const ton = tagTon(tag);
  const teile = [`${formatWochentag(tag.datum)}, ${formatDatum(tag.datum)}`, TAG_TON_LABEL[ton]];
  if (tag.feiertag) teile.push(tag.feiertag.label);
  if (tag.absenz) teile.push(ABSENZ_LABEL[tag.absenz.art]);
  if (tag.kommenMin !== null) teile.push(`${formatZeit(tag.kommenMin)}–${tag.laeuft ? 'läuft' : tag.gehenMin === null ? 'offen' : formatZeit(tag.gehenMin)}`);
  if (!tag.zukunft && tag.grund !== 'nicht-angestellt') teile.push(`Ist ${formatStunden(tag.arbeitMin)} · Soll ${formatStunden(tag.sollMin)} · ${formatSaldo(tag.saldoMin)}`);
  for (const warnung of tag.warnungen) teile.push(ZEIT_WARNUNG_LABEL[warnung]);
  if (tag.umstellung) teile.push(tag.umstellung.art === 'sommerzeit' ? 'Zeitumstellung · 23 Stunden' : 'Zeitumstellung · 25 Stunden');
  return teile.join(' · ');
}

export function saldoKlasse(minuten: number): string | undefined {
  if (minuten > 0) return styles.plus;
  if (minuten < 0) return styles.minus;
  return undefined;
}

interface TagChipProps {
  tag: TagMitPlan;
  heute: IsoDatum;
  onClick?: () => void;
}

// jh› Der Chip ist die kleinste Einheit der Zeiterfassung: Wochentag, Stunden, Farbe – mehr braucht der Blick nicht.
export function TagChip({ tag, heute, onClick }: TagChipProps) {
  const ton = tagTon(tag);
  const klasse = cx(styles.chip, modulKlasse(styles, `ton-${ton}`), ton === 'absenz' && tag.absenz && modulKlasse(absenzen, `art-${tag.absenz.art}`), tag.datum === heute && styles.chipHeute, ton === 'leer' && styles.chipLeer);
  const inhalt = (
    <>
      <span className={styles.chipTag}>
        {formatWochentag(tag.datum, 'kurz')} {parseIsoDate(tag.datum).getDate()}
      </span>
      <span className={styles.chipWert}>{ton === 'leer' ? '' : tagKurz(tag)}</span>
    </>
  );
  if (onClick && ton !== 'leer') {
    const klick = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onClick();
    };
    return (
      <button type="button" className={klasse} title={tagTitel(tag)} onClick={klick}>
        {inhalt}
      </button>
    );
  }
  return (
    <span className={klasse} title={tagTitel(tag)}>
      {inhalt}
    </span>
  );
}

// ── §2 · Legende ─────────────────────────────────────────────────

const LEGENDE: readonly TagTon[] = ['ok', 'laeuft', 'abweichung', 'warnung', 'fehlt', 'absenz', 'frei'];

export function TonLegende() {
  return (
    <ul className={styles.legende} aria-label="Legende">
      {LEGENDE.map((ton) => (
        <li key={ton}>
          <span className={cx(styles.legendeFarbe, modulKlasse(styles, `ton-${ton}`))} aria-hidden /> {TAG_TON_LABEL[ton]}
        </li>
      ))}
    </ul>
  );
}

// ── §3 · Tabelle ─────────────────────────────────────────────────

interface WochenUebersichtProps {
  zeilen: readonly WochenZeile[];
  tage: readonly IsoDatum[];
  heute: IsoDatum;
  aktivId: string | null;
  onPerson: (mitarbeiterId: string, datum?: IsoDatum) => void;
}

export function WochenUebersicht({ zeilen, tage, heute, aktivId, onPerson }: WochenUebersichtProps) {
  const spalten = useMemo<Spalte<WochenZeile>[]>(
    () => [
      { id: 'person', label: 'Mitarbeiter/in', render: (zeile) => <PersonZelle mitarbeiter={zeile.person.mitarbeiter} techniker={zeile.person.techniker} />, sortWert: (zeile) => `${zeile.person.mitarbeiter.nachname} ${zeile.person.mitarbeiter.vorname}` },
      ...tage.map<Spalte<WochenZeile>>((datum, index) => ({
        id: datum,
        label: `${formatWochentag(datum, 'kurz')} ${formatDatumKurz(datum)}`,
        render: (zeile) => {
          const tag = zeile.tage[index];
          return tag ? <TagChip tag={tag} heute={heute} onClick={() => onPerson(zeile.person.mitarbeiter.id, datum)} /> : null;
        },
        sortWert: (zeile) => zeile.tage[index]?.arbeitMin ?? 0,
      })),
      {
        id: 'erfasst',
        label: 'Erfasst / Erwartet',
        render: (zeile) => (
          <span className={styles.zwei}>
            <span className={styles.zweiHaupt}>{formatDauer(zeile.erfasstMin)}</span>
            <span className={styles.zweiMeta}>von {formatDauer(zeile.erwartetMin)}</span>
          </span>
        ),
        sortWert: (zeile) => zeile.erfasstMin,
        align: 'right',
      },
      { id: 'saldo', label: 'Saldo Woche', render: (zeile) => <span className={saldoKlasse(zeile.saldoMin)}>{formatSaldo(zeile.saldoMin)}</span>, sortWert: (zeile) => zeile.saldoMin, align: 'right', mono: true },
      {
        id: 'ueberstunden',
        label: 'Überstunden / Kompensiert',
        render: (zeile) => (
          <span className={styles.zwei}>
            <span className={cx(styles.zweiHaupt, saldoKlasse(zeile.kumuliertMin))}>{formatSaldo(zeile.kumuliertMin)}</span>
            <span className={styles.zweiMeta}>{zeile.kompensiertMin > 0 ? `kompensiert ${formatDauer(zeile.kompensiertMin)}` : 'nichts kompensiert'}</span>
          </span>
        ),
        sortWert: (zeile) => zeile.kumuliertMin,
        align: 'right',
      },
      {
        id: 'status',
        label: 'Status',
        render: (zeile) => {
          if (zeile.lage.status === 'arbeitet') return <Chip tone="ok">seit {formatZeit(zeile.lage.seitMin ?? 0)}</Chip>;
          if (zeile.lage.status === 'pause') return <Chip tone="neutral">Pause</Chip>;
          if (zeile.tageMitWarnung > 0) {
            return (
              <Chip tone="danger" icon={AlertTriangle}>
                {zeile.tageMitWarnung} {zeile.tageMitWarnung === 1 ? 'Tag' : 'Tage'}
              </Chip>
            );
          }
          return <span className={personal.leerWert}>–</span>;
        },
        sortWert: (zeile) => ({ arbeitet: 0, pause: 1, draussen: 2 })[zeile.lage.status],
        nebensaechlich: true,
      },
    ],
    [tage, heute, onPerson],
  );

  return (
    <div className={styles.ansicht}>
      <Tabelle spalten={spalten} zeilen={zeilen} zeilenId={(zeile) => zeile.person.mitarbeiter.id} label="Wochenübersicht" aktivId={aktivId} onZeile={(zeile) => onPerson(zeile.person.mitarbeiter.id)} standardSortierung={{ id: 'person', richtung: 'auf' }} leer="Keine Personen in dieser Sicht." />
      <TonLegende />
    </div>
  );
}

/* ◆ jh · eof */
