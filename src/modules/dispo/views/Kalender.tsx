/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/Kalender.tsx                   │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Outlook-Kalender: Tag / AW / Woche / Monat, Split pro Techniker       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Zeitraum } from '../../../core/arbeitstag';
import { isSameMonth, isWeekend, monthGrid } from '../../../core/datum';
import type { IsoDatum, Minuten } from '../../../core/datum';
import { ABSENZ_LABEL, fullName, isAbwesend } from '../../../core/domain/stammdaten';
import type { Absenz, Techniker } from '../../../core/domain/stammdaten';
import { formatDatumKurz, formatWochentag, formatZeit, formatZeitspanne } from '../../../core/format';
import { Avatar } from '../../../core/ui/Avatar';
import { Popover } from '../../../core/ui/Popover';
import { cx } from '../../../core/ui/cx';
import { useDispoDnd, vorschauText } from '../drag/DispoDnd';
import type { DropZoneData } from '../drag/DispoDnd';
import type { FarbeNach, Zoom } from '../dispo.types';
import type { EinsatzView } from '../store/dispo.selectors';
import { ACHSE_ENDE, ACHSE_START, ARBEIT_ENDE, ARBEIT_START, MITTAG, assignLanes } from '../zeitraster';
import { EinsatzBlock } from './EinsatzBlock';
import { KompaktBlock } from './KompaktBlock';
import styles from './Kalender.module.css';

// ── §1 · Geometrie ───────────────────────────────────────────────

const RINNE_W = 56;

function pxPerMinY(zoom: Zoom): number {
  if (zoom === 15) return 2;
  if (zoom === 30) return 1.2;
  return 0.8;
}

function yOf(minuten: Minuten, skala: number): number {
  return (minuten - ACHSE_START) * skala;
}

// ── §2 · Spalte (Tag / Techniker) ────────────────────────────────

interface SpalteProps {
  datum: IsoDatum;
  techniker: Techniker | null;
  views: readonly EinsatzView[];
  heute: IsoDatum;
  jetztMin: Minuten;
  skala: number;
  zoom: Zoom;
  farbeNach: FarbeNach;
  absenz: Absenz | undefined;
  ausgewaehltId: string | null;
  markiertId: string | null;
  onSelectEinsatz: (einsatzId: string) => void;
}

function Spalte({ datum, techniker, views, heute, jetztMin, skala, zoom, farbeNach, absenz, ausgewaehltId, markiertId, onSelectEinsatz }: SpalteProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const dnd = useDispoDnd();
  const hoehe = yOf(ACHSE_ENDE, skala);
  const rasterMin = zoom === 60 ? 30 : zoom;

  const zone: DropZoneData = useMemo(
    () => ({
      art: 'kalender',
      technikerId: techniker?.id ?? null,
      datum,
      rasterMin,
      getRect: () => ref.current?.getBoundingClientRect() ?? new DOMRect(),
      minOfY: (y: number) => ACHSE_START + y / skala,
    }),
    [techniker?.id, datum, rasterMin, skala],
  );
  const { setNodeRef } = useDroppable({ id: `kalender:${techniker?.id ?? 'alle'}:${datum}`, data: zone, disabled: absenz !== undefined });
  const setRefs = useCallback(
    (knoten: HTMLDivElement | null) => {
      ref.current = knoten;
      setNodeRef(knoten);
    },
    [setNodeRef],
  );

  const { belegung, spuren } = useMemo(() => assignLanes(views.map((view) => ({ ...view.einsatz, view }))), [views]);
  const vorschau = dnd.vorschau && dnd.vorschau.datum === datum && (techniker === null || dnd.vorschau.technikerId === techniker.id) ? dnd.vorschau : null;
  const linien = useMemo(() => {
    const liste: { minuten: Minuten; stunde: boolean }[] = [];
    for (let minuten = ACHSE_START; minuten <= ACHSE_ENDE; minuten += zoom) liste.push({ minuten, stunde: minuten % 60 === 0 });
    return liste;
  }, [zoom]);

  return (
    <div ref={setRefs} className={cx(styles.spalte, datum === heute && styles.spalteHeute, vorschau && styles.spalteZiel, isWeekend(datum) && styles.spalteWochenende)} style={{ height: hoehe }}>
      <div className={styles.randzeit} style={{ top: 0, height: yOf(ARBEIT_START, skala) }} />
      <div className={styles.randzeit} style={{ top: yOf(ARBEIT_ENDE, skala), height: hoehe - yOf(ARBEIT_ENDE, skala) }} />
      <div className={styles.mittag} style={{ top: yOf(MITTAG.startMin, skala), height: MITTAG.dauerMin * skala }} />
      {linien.map((linie) => (
        <div key={linie.minuten} className={cx(styles.linie, linie.stunde && styles.linieStunde)} style={{ top: yOf(linie.minuten, skala) }} />
      ))}
      {absenz && (
        <div className={styles.absenz} style={{ top: yOf(ARBEIT_START, skala), height: (ARBEIT_ENDE - ARBEIT_START) * skala }}>
          <span>{ABSENZ_LABEL[absenz.art]}</span>
        </div>
      )}

      {belegung.map(({ eintrag, spur }) => {
        const breite = 100 / spuren;
        const position: CSSProperties = {
          top: yOf(eintrag.startMin, skala) + 1,
          height: Math.max(eintrag.dauerMin * skala - 2, 18),
          left: `calc(${spur * breite}% + 2px)`,
          width: `calc(${breite}% - 4px)`,
        };
        return (
          <EinsatzBlock
            key={eintrag.id}
            view={eintrag.view}
            position={position}
            farbeNach={farbeNach}
            ausgewaehlt={eintrag.id === ausgewaehltId}
            markiert={eintrag.id === markiertId}
            onSelect={onSelectEinsatz}
          />
        );
      })}

      {vorschau?.passt && (
        <div className={cx(styles.ghost, vorschau.pruefung.konflikt && styles.ghostKonflikt)} style={{ top: yOf(vorschau.startMin, skala) + 1, height: Math.max(vorschau.dauerMin * skala - 2, 18) }} aria-hidden>
          <span>{formatZeitspanne(vorschau.startMin, vorschau.dauerMin)}</span>
          <span className={styles.ghostGrund}>{vorschauText(vorschau).replace(/^[^–]*– ?/, '')}</span>
        </div>
      )}
      {datum === heute && jetztMin >= ACHSE_START && jetztMin <= ACHSE_ENDE && <div className={styles.jetzt} style={{ top: yOf(jetztMin, skala) }} />}
    </div>
  );
}

// ── §3 · Zeitraster (Tag / Woche) ────────────────────────────────

interface RasterProps extends Omit<KalenderProps, 'zeitraum'> {
  spalten: { schluessel: string; datum: IsoDatum; techniker: Techniker | null; titel: string; untertitel: string }[];
}

function Zeitraster({ spalten, views, heute, jetztMin, zoom, farbeNach, absenzen, ausgewaehltId, markiertId, onSelectEinsatz, onOpenDay }: RasterProps) {
  const skala = pxPerMinY(zoom);
  const stunden = useMemo(() => Array.from({ length: (ACHSE_ENDE - ACHSE_START) / 60 + 1 }, (_, index) => ACHSE_START + index * 60), []);
  const ganztag = spalten.map((spalte) => {
    const tage = spalte.techniker ? [spalte.techniker.id] : [...new Set(views.map((view) => view.techniker.id))];
    const alle: Absenz[] = [];
    for (const absenz of absenzen) {
      if (absenz.von <= spalte.datum && absenz.bis >= spalte.datum && (spalte.techniker ? absenz.technikerId === spalte.techniker.id : true)) alle.push(absenz);
    }
    return { spalte, absenzen: alle, technikerIds: tage };
  });
  const zeigeGanztag = ganztag.some((eintrag) => eintrag.absenzen.length > 0);

  return (
    <div className={styles.raster}>
      <div className={styles.kopf}>
        <div className={styles.kopfEcke} style={{ width: RINNE_W }} />
        {spalten.map((spalte) => (
          <button key={spalte.schluessel} type="button" className={cx(styles.spaltenKopf, spalte.datum === heute && styles.kopfHeute)} onClick={() => onOpenDay(spalte.datum)} title="Tag öffnen">
            {spalte.techniker ? <Avatar techniker={spalte.techniker} size="sm" /> : null}
            <span className={styles.spaltenTitel}>{spalte.titel}</span>
            <span className={styles.spaltenUntertitel}>{spalte.untertitel}</span>
          </button>
        ))}
      </div>
      {zeigeGanztag && (
        <div className={styles.ganztag}>
          <div className={styles.ganztagLabel} style={{ width: RINNE_W }}>
            Ganztag
          </div>
          {ganztag.map(({ spalte, absenzen: liste }) => (
            <div key={spalte.schluessel} className={styles.ganztagZelle}>
              {liste.map((absenz) => (
                <span key={absenz.id} className={styles.ganztagChip} title={absenz.notiz}>
                  {!spalte.techniker && <strong>{views.find((view) => view.techniker.id === absenz.technikerId)?.techniker.kuerzel ?? absenz.technikerId.replace('T-', '')}</strong>} {ABSENZ_LABEL[absenz.art]}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
      <div className={styles.koerper}>
        <div className={styles.rinne} style={{ width: RINNE_W, height: yOf(ACHSE_ENDE, skala) }}>
          {stunden
            .filter((minuten) => minuten > ACHSE_START && minuten < ACHSE_ENDE)
            .map((minuten) => (
              <span key={minuten} className={styles.stunde} style={{ top: yOf(minuten, skala) }}>
                {formatZeit(minuten)}
              </span>
            ))}
        </div>
        {spalten.map((spalte) => (
          <Spalte
            key={spalte.schluessel}
            datum={spalte.datum}
            techniker={spalte.techniker}
            views={views.filter((view) => view.einsatz.datum === spalte.datum && (spalte.techniker === null || view.techniker.id === spalte.techniker.id))}
            heute={heute}
            jetztMin={jetztMin}
            skala={skala}
            zoom={zoom}
            farbeNach={farbeNach}
            absenz={spalte.techniker ? isAbwesend(absenzen, spalte.techniker.id, spalte.datum) : undefined}
            ausgewaehltId={ausgewaehltId}
            markiertId={markiertId}
            onSelectEinsatz={onSelectEinsatz}
          />
        ))}
      </div>
    </div>
  );
}

// ── §4 · Monat ───────────────────────────────────────────────────

const MAX_PILLEN = 3;

function Monat({ views, datum, heute, farbeNach, ausgewaehltId, markiertId, onSelectEinsatz, onOpenDay }: KalenderProps) {
  const wochen = useMemo(() => monthGrid(datum), [datum]);
  const [mehr, setMehr] = useState<{ tag: IsoDatum; anker: HTMLElement } | null>(null);
  const proTag = useMemo(() => {
    const map = new Map<IsoDatum, EinsatzView[]>();
    for (const view of views) {
      const liste = map.get(view.einsatz.datum) ?? [];
      liste.push(view);
      map.set(view.einsatz.datum, liste);
    }
    for (const liste of map.values()) liste.sort((a, b) => a.einsatz.startMin - b.einsatz.startMin);
    return map;
  }, [views]);

  return (
    <div className={styles.monat}>
      <div className={styles.monatKopf}>
        {['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'].map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className={styles.monatRaster}>
        {wochen.flat().map((tag) => {
          const liste = proTag.get(tag) ?? [];
          const rest = liste.length - MAX_PILLEN;
          return (
            <div key={tag} className={cx(styles.monatZelle, !isSameMonth(tag, datum) && styles.monatFremd, tag === heute && styles.monatHeute, isWeekend(tag) && styles.spalteWochenende)}>
              <button type="button" className={styles.monatTag} onClick={() => onOpenDay(tag)} title="Tag öffnen">
                {Number(tag.slice(8))}
              </button>
              <ul className={styles.pillen}>
                {liste.slice(0, MAX_PILLEN).map((view) => (
                  <KompaktBlock key={view.einsatz.id} view={view} farbeNach={farbeNach} ausgewaehlt={view.einsatz.id === ausgewaehltId} markiert={view.einsatz.id === markiertId} onSelect={onSelectEinsatz} pille />
                ))}
              </ul>
              {rest > 0 && (
                <button type="button" className={styles.mehr} onClick={(event) => setMehr({ tag, anker: event.currentTarget })}>
                  +{rest} weitere
                </button>
              )}
            </div>
          );
        })}
      </div>
      <Popover anchor={mehr?.anker ?? null} open={mehr !== null} onClose={() => setMehr(null)} breite={320} label="Alle Einsätze des Tages">
        {mehr && (
          <div className={styles.tagesPopover}>
            <header className={styles.tagesPopoverKopf}>
              <strong>
                {formatWochentag(mehr.tag)}, {formatDatumKurz(mehr.tag)}
              </strong>
              <button type="button" className={styles.tagesPopoverLink} onClick={() => onOpenDay(mehr.tag)}>
                Tag öffnen
              </button>
            </header>
            <ul className={styles.pillen}>
              {(proTag.get(mehr.tag) ?? []).map((view) => (
                <KompaktBlock key={view.einsatz.id} view={view} farbeNach={farbeNach} ausgewaehlt={view.einsatz.id === ausgewaehltId} markiert={false} onSelect={onSelectEinsatz} />
              ))}
            </ul>
          </div>
        )}
      </Popover>
    </div>
  );
}

// ── §5 · Kalender ────────────────────────────────────────────────

export interface KalenderProps {
  views: readonly EinsatzView[];
  tage: readonly IsoDatum[];
  zeitraum: Zeitraum;
  datum: IsoDatum;
  heute: IsoDatum;
  jetztMin: Minuten;
  zoom: Zoom;
  farbeNach: FarbeNach;
  techniker: readonly Techniker[];
  absenzen: readonly Absenz[];
  nebeneinander: boolean;
  ausgewaehltId: string | null;
  markiertId: string | null;
  onSelectEinsatz: (einsatzId: string) => void;
  onOpenDay: (tag: IsoDatum) => void;
}

export function Kalender(props: KalenderProps) {
  const { zeitraum, tage, datum, techniker, nebeneinander } = props;
  if (zeitraum === 'monat') return <Monat {...props} />;

  // jh› «Nebeneinander» wie Outlooks Split view: eine Spalte pro Techniker im Tag.
  const spalten =
    zeitraum === 'tag' && nebeneinander
      ? techniker.map((person) => ({ schluessel: person.id, datum, techniker: person, titel: fullName(person), untertitel: `${formatWochentag(datum, 'kurz')} ${formatDatumKurz(datum)}` }))
      : tage.map((tag) => ({ schluessel: tag, datum: tag, techniker: null, titel: formatWochentag(tag, zeitraum === 'tag' ? 'lang' : 'kurz'), untertitel: formatDatumKurz(tag) }));

  return <Zeitraster {...props} spalten={spalten} />;
}

/* ◆ jh · eof */
