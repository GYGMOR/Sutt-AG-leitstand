/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/Kalender.tsx                   │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Outlook-Kalender: Techniker-Kalender, Tag/AW/Woche/Monat, Split       │
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
import { useElementSize } from '../../../core/hooks/useElementSize';
import { Avatar } from '../../../core/ui/Avatar';
import { CapsLabel } from '../../../core/ui/CapsLabel';
import { Popover } from '../../../core/ui/Popover';
import { SegmentedControl } from '../../../core/ui/SegmentedControl';
import type { SegmentOption } from '../../../core/ui/SegmentedControl';
import { cx } from '../../../core/ui/cx';
import { balkenKlasse, technikerKlasse } from '../../../core/ui/farben';
import { useDispoDnd, vorschauText } from '../drag/DispoDnd';
import type { DropZoneData } from '../drag/DispoDnd';
import type { FarbeNach, Zoom } from '../dispo.types';
import type { EinsatzView } from '../store/dispo.selectors';
import { ACHSE_ENDE, ACHSE_START, ARBEIT_ENDE, ARBEIT_START, MITTAG, assignLanes } from '../zeitraster';
import { EinsatzBlock } from './EinsatzBlock';
import { KompaktBlock } from './KompaktBlock';
import { BlockRegistryProvider, Verbindungen } from './Verbindungen';
import styles from './Kalender.module.css';

// ── §1 · Geometrie ───────────────────────────────────────────────

const RINNE_W = 56;
/** Nebeneinander in Arbeitswoche/Woche nur bis zu dieser Zahl Kalender – sonst werden Spalten zu Strichen. */
const MAX_SPLIT_WOCHE = 3;

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
  verwandteIds: ReadonlySet<string>;
  /** Überlagerte Kalender: Kürzel im Block, Technikerfarbe als Balken. */
  ueberlagert: boolean;
  onSelectEinsatz: (einsatzId: string) => void;
}

function Spalte({ datum, techniker, views, heute, jetztMin, skala, zoom, farbeNach, absenz, ausgewaehltId, markiertId, verwandteIds, ueberlagert, onSelectEinsatz }: SpalteProps) {
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
            verwandt={verwandteIds.has(eintrag.id)}
            zeigeTechniker={ueberlagert}
            balkenKlasse={ueberlagert && farbeNach !== 'techniker' ? balkenKlasse(eintrag.view.techniker.farbe) : undefined}
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

// ── §3 · Kalenderleiste: welche Kalender, wie dargestellt ────────

type Darstellung = 'ueberlagert' | 'nebeneinander';

const DARSTELLUNG_OPTIONEN: readonly SegmentOption<Darstellung>[] = [
  { value: 'ueberlagert', label: 'Überlagert', title: 'Gewählte Kalender in einer Spalte, Techniker als Kürzel und Balken' },
  { value: 'nebeneinander', label: 'Nebeneinander', title: 'Eine Spalte pro Techniker' },
];

interface LeisteProps {
  techniker: readonly Techniker[];
  auswahl: readonly string[] | null;
  onAuswahl: (ids: readonly string[] | null) => void;
  darstellung: Darstellung;
  onDarstellung: (wert: Darstellung) => void;
  splitMoeglich: boolean;
  zeitraum: Zeitraum;
}

// jh› Wie Outlooks Kalenderliste: jeder Techniker ist ein Kalender mit eigener Farbe,
//     per Klick ein- und ausblendbar, Doppelklick zeigt nur ihn.
function KalenderLeiste({ techniker, auswahl, onAuswahl, darstellung, onDarstellung, splitMoeglich, zeitraum }: LeisteProps) {
  const aktivIds = auswahl ?? techniker.map((person) => person.id);
  const toggle = (id: string) => {
    const neu = aktivIds.includes(id) ? aktivIds.filter((eintrag) => eintrag !== id) : [...aktivIds, id];
    // jh› Mindestens ein Kalender bleibt sichtbar – ein leeres Raster hilft niemandem.
    if (neu.length === 0) return;
    onAuswahl(neu.length === techniker.length ? null : neu);
  };

  return (
    <div className={styles.leiste} role="group" aria-label="Kalender wählen">
      <CapsLabel>Kalender</CapsLabel>
      <div className={styles.kalenderListe}>
        {techniker.map((person) => {
          const aktiv = aktivIds.includes(person.id);
          return (
            <button
              key={person.id}
              type="button"
              className={cx(styles.kalenderChip, technikerKlasse(person.farbe), !aktiv && styles.kalenderChipAus)}
              aria-pressed={aktiv}
              title={`${fullName(person)} · Klick: ein-/ausblenden · Doppelklick: nur diesen Kalender`}
              onClick={() => toggle(person.id)}
              onDoubleClick={() => onAuswahl([person.id])}
            >
              <span className={styles.kalenderPunkt} aria-hidden />
              <span className={styles.kalenderKuerzel}>{person.kuerzel}</span>
              <span className={styles.kalenderName}>{person.nachname}</span>
            </button>
          );
        })}
        <button type="button" className={styles.kalenderAlle} onClick={() => onAuswahl(null)} disabled={auswahl === null}>
          Alle
        </button>
      </div>
      {zeitraum !== 'monat' && (
        <div className={styles.leisteRechts}>
          {!splitMoeglich && <span className={styles.leisteHinweis}>Nebeneinander in der Woche bis {MAX_SPLIT_WOCHE} Kalender</span>}
          <SegmentedControl label="Darstellung" options={DARSTELLUNG_OPTIONEN} value={darstellung} onChange={onDarstellung} />
        </div>
      )}
    </div>
  );
}

// ── §4 · Zeitraster (Tag / Woche) ────────────────────────────────

interface Spalte {
  schluessel: string;
  datum: IsoDatum;
  techniker: Techniker | null;
  titel: string;
  untertitel: string;
}

interface RasterProps extends Omit<KalenderProps, 'zeitraum'> {
  spalten: readonly Spalte[];
  split: boolean;
  /** Spalten pro Tag im Split – für die Tageszeile im Kopf. */
  proTag: number;
  aktiv: EinsatzView | null;
  verwandteIds: ReadonlySet<string>;
}

function Zeitraster({ spalten, split, proTag, aktiv, verwandteIds, views, tage, heute, jetztMin, zoom, farbeNach, absenzen, ausgewaehltId, markiertId, onSelectEinsatz, onOpenDay }: RasterProps) {
  const skala = pxPerMinY(zoom);
  const koerperRef = useRef<HTMLDivElement>(null);
  const inhaltRef = useRef<HTMLDivElement>(null);
  const groesse = useElementSize(koerperRef);
  const stunden = useMemo(() => Array.from({ length: (ACHSE_ENDE - ACHSE_START) / 60 + 1 }, (_, index) => ACHSE_START + index * 60), []);
  const ganztag = spalten.map((spalte) => {
    const alle: Absenz[] = [];
    for (const absenz of absenzen) {
      if (absenz.von <= spalte.datum && absenz.bis >= spalte.datum && (spalte.techniker ? absenz.technikerId === spalte.techniker.id : true)) alle.push(absenz);
    }
    return { spalte, absenzen: alle };
  });
  const zeigeGanztag = ganztag.some((eintrag) => eintrag.absenzen.length > 0);
  const zeigeTagZeile = split && tage.length > 1;

  return (
    <div className={styles.raster}>
      {zeigeTagZeile && (
        <div className={styles.tagZeile}>
          <div className={styles.kopfEcke} style={{ width: RINNE_W }} />
          {tage.map((tag) => (
            <button key={tag} type="button" className={cx(styles.tagKopf, tag === heute && styles.kopfHeute)} style={{ flex: proTag }} onClick={() => onOpenDay(tag)} title="Tag öffnen">
              {formatWochentag(tag, 'kurz')} <span className={styles.spaltenUntertitel}>{formatDatumKurz(tag)}</span>
            </button>
          ))}
        </div>
      )}
      <div className={styles.kopf}>
        <div className={styles.kopfEcke} style={{ width: RINNE_W }} />
        {spalten.map((spalte) => (
          <button
            key={spalte.schluessel}
            type="button"
            className={cx(styles.spaltenKopf, spalte.datum === heute && spalte.techniker === null && styles.kopfHeute, spalte.techniker && technikerKlasse(spalte.techniker.farbe), spalte.techniker && styles.spaltenKopfTechniker)}
            onClick={() => onOpenDay(spalte.datum)}
            title="Tag öffnen"
          >
            {spalte.techniker ? <Avatar techniker={spalte.techniker} size="sm" /> : null}
            <span className={styles.spaltenTitel}>{spalte.titel}</span>
            {spalte.untertitel && <span className={styles.spaltenUntertitel}>{spalte.untertitel}</span>}
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
                  {!spalte.techniker && <strong>{views.find((view) => view.techniker.id === absenz.technikerId)?.techniker.kuerzel ?? (absenz.technikerId ?? absenz.mitarbeiterId).replace(/^[TM]-/, '')}</strong>} {ABSENZ_LABEL[absenz.art]}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
      <div ref={koerperRef} className={styles.koerper}>
        <BlockRegistryProvider>
          <div ref={inhaltRef} className={styles.koerperInhalt}>
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
                verwandteIds={verwandteIds}
                ueberlagert={!split}
                onSelectEinsatz={onSelectEinsatz}
              />
            ))}
            <Verbindungen containerRef={inhaltRef} aktiv={aktiv} signatur={`${skala}:${spalten.length}:${groesse.width}`} richtung="vertikal" />
          </div>
        </BlockRegistryProvider>
      </div>
    </div>
  );
}

// ── §5 · Monat ───────────────────────────────────────────────────

// jh# 011 Verknüpfungslinien auch im Monat und in der Mehrtages-Plantafel – Pillen melden sich nicht bei der Block-Registry.
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

// ── §6 · Kalender ────────────────────────────────────────────────

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
  onNebeneinander: (wert: boolean) => void;
  /** Sichtbare Kalender (Techniker-IDs); null = alle. */
  technikerAuswahl: readonly string[] | null;
  onTechnikerAuswahl: (ids: readonly string[] | null) => void;
  ausgewaehltId: string | null;
  markiertId: string | null;
  onSelectEinsatz: (einsatzId: string) => void;
  onOpenDay: (tag: IsoDatum) => void;
}

export function Kalender(props: KalenderProps) {
  const { views, tage, zeitraum, techniker, nebeneinander, onNebeneinander, technikerAuswahl, onTechnikerAuswahl, ausgewaehltId } = props;
  const gewaehlt = useMemo(() => (technikerAuswahl === null ? techniker : techniker.filter((person) => technikerAuswahl.includes(person.id))), [techniker, technikerAuswahl]);
  const sichtbar = useMemo(() => (technikerAuswahl === null ? views : views.filter((view) => technikerAuswahl.includes(view.techniker.id))), [views, technikerAuswahl]);
  const aktiv = useMemo(() => sichtbar.find((view) => view.einsatz.id === ausgewaehltId) ?? null, [sichtbar, ausgewaehltId]);
  const verwandteIds = useMemo(() => new Set((aktiv?.verknuepfungen ?? []).flatMap((verknuepfung) => (verknuepfung.einsatzId ? [verknuepfung.einsatzId] : []))), [aktiv]);

  // jh› «Nebeneinander» wie Outlooks Split view: eine Spalte pro Techniker – im Tag immer,
  //     in der Woche bis drei Kalender; darüber überlagert mit Kürzel und Technikerbalken.
  const splitMoeglich = zeitraum === 'tag' || gewaehlt.length <= MAX_SPLIT_WOCHE;
  const split = zeitraum !== 'monat' && nebeneinander && splitMoeglich;

  const spalten = useMemo<Spalte[]>(() => {
    if (split) {
      return tage.flatMap((tag) =>
        gewaehlt.map((person) => ({
          schluessel: `${tag}:${person.id}`,
          datum: tag,
          techniker: person,
          titel: zeitraum === 'tag' ? fullName(person) : person.kuerzel,
          untertitel: '',
        })),
      );
    }
    return tage.map((tag) => ({ schluessel: tag, datum: tag, techniker: null, titel: formatWochentag(tag, zeitraum === 'tag' ? 'lang' : 'kurz'), untertitel: formatDatumKurz(tag) }));
  }, [split, tage, gewaehlt, zeitraum]);

  return (
    <div className={styles.kalender}>
      <KalenderLeiste
        techniker={techniker}
        auswahl={technikerAuswahl}
        onAuswahl={onTechnikerAuswahl}
        darstellung={split ? 'nebeneinander' : 'ueberlagert'}
        onDarstellung={(wert) => onNebeneinander(wert === 'nebeneinander')}
        splitMoeglich={splitMoeglich}
        zeitraum={zeitraum}
      />
      {zeitraum === 'monat' ? (
        <Monat {...props} views={sichtbar} />
      ) : (
        <Zeitraster {...props} views={sichtbar} spalten={spalten} split={split} proTag={gewaehlt.length} aktiv={aktiv} verwandteIds={verwandteIds} />
      )}
    </div>
  );
}

/* ◆ jh · eof */
