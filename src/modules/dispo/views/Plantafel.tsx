/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/Plantafel.tsx                  │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Plantafel Tag: Techniker × Zeitachse, Puffer, Smart-Slots, Jetzt      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { IsoDatum, Minuten } from '../../../core/datum';
import { ABSENZ_LABEL } from '../../../core/domain/stammdaten';
import { formatDauer, formatZeit, formatZeitspanne } from '../../../core/format';
import { useElementSize } from '../../../core/hooks/useElementSize';
import { cx } from '../../../core/ui/cx';
import { useDispoDnd, vorschauText } from '../drag/DispoDnd';
import type { DropZoneData } from '../drag/DispoDnd';
import type { FarbeNach, Zoom } from '../dispo.types';
import type { Puls, TagesZeile } from '../store/dispo.selectors';
import {
  ACHSE_ENDE,
  ACHSE_START,
  ARBEIT_ENDE,
  ARBEIT_START,
  MITTAG,
  breiteOf,
  createSkala,
  gesamtBreite,
  rasterLinien,
  xOf,
} from '../zeitraster';
import type { Skala } from '../zeitraster';
import { EinsatzBlock } from './EinsatzBlock';
import { TechnikerZelle } from './TechnikerZelle';
import styles from './Plantafel.module.css';

// ── §1 · Geometrie ───────────────────────────────────────────────

const ROW_MIN = 72;
const ROW_MAX = 120;
const HEAD_H = 36;

// jh› Nur Positionen im Zeitraster sind inline – alles andere über Klassen.
function blockPosition(skala: Skala, startMin: Minuten, dauerMin: Minuten, spur: number, rowH: number): CSSProperties {
  return {
    left: xOf(skala, startMin),
    width: Math.max(breiteOf(skala, dauerMin) - 2, 18),
    top: spur * rowH + 4,
    height: rowH - 8,
  };
}

// ── §2 · Zeitachse (Kopf) ────────────────────────────────────────

interface ZeitachseProps {
  skala: Skala;
  jetztMin: Minuten | null;
}

function Zeitachse({ skala, jetztMin }: ZeitachseProps) {
  const jetztX = jetztMin !== null ? xOf(skala, jetztMin) : null;
  return (
    <div className={styles.achse} style={{ width: gesamtBreite(skala) }} aria-hidden>
      {rasterLinien(skala)
        .filter((linie) => linie.stunde)
        .map((linie) => {
          const x = xOf(skala, linie.minuten);
          // jh› Stundenlabel weicht der Jetzt-Pille: innerhalb ±30 px wird es ausgeblendet.
          const kollidiert = jetztX !== null && Math.abs(x - jetztX) < 30;
          return (
            <span key={linie.minuten} className={cx(styles.stunde, kollidiert && styles.stundeVerdeckt)} style={{ left: x }}>
              {formatZeit(linie.minuten)}
            </span>
          );
        })}
      {jetztX !== null && jetztMin !== null && (
        <span className={styles.jetztPille} style={{ left: jetztX }}>
          {formatZeit(jetztMin)}
        </span>
      )}
    </div>
  );
}

// ── §3 · Spur einer Technikerzeile ───────────────────────────────

interface SpurProps {
  zeile: TagesZeile;
  skala: Skala;
  rowH: number;
  heute: IsoDatum;
  jetztMin: Minuten | null;
  farbeNach: FarbeNach;
  ausgewaehltId: string | null;
  markiertId: string | null;
  onSelectEinsatz: (einsatzId: string) => void;
}

function Spur({ zeile, skala, rowH, heute, jetztMin, farbeNach, ausgewaehltId, markiertId, onSelectEinsatz }: SpurProps) {
  const spurRef = useRef<HTMLDivElement | null>(null);
  const skalaRef = useRef(skala);
  skalaRef.current = skala;
  const dnd = useDispoDnd();

  const zone: DropZoneData = useMemo(
    () => ({
      art: 'spur',
      technikerId: zeile.techniker.id,
      datum: zeile.datum,
      getRect: () => spurRef.current?.getBoundingClientRect() ?? new DOMRect(),
      getSkala: () => skalaRef.current,
    }),
    [zeile.techniker.id, zeile.datum],
  );
  const { setNodeRef } = useDroppable({ id: `spur:${zeile.techniker.id}:${zeile.datum}`, data: zone, disabled: zeile.absenz !== undefined });

  const setRefs = useCallback(
    (knoten: HTMLDivElement | null) => {
      spurRef.current = knoten;
      setNodeRef(knoten);
    },
    [setNodeRef],
  );

  const vorschau = dnd.vorschau?.technikerId === zeile.techniker.id && dnd.vorschau.datum === zeile.datum ? dnd.vorschau : null;
  const slots = dnd.payload ? dnd.slotsFor(zeile.techniker.id, zeile.datum) : null;
  const vergangenBis = zeile.datum < heute ? ACHSE_ENDE : zeile.datum === heute && jetztMin !== null ? jetztMin : null;
  const hoehe = zeile.spuren * rowH;

  return (
    <div ref={setRefs} className={cx(styles.spur, vorschau && styles.spurZiel)} style={{ width: gesamtBreite(skala), height: hoehe }}>
      {/* Randzeiten gedimmt, Arbeitszeit hell */}
      <div className={styles.randzeit} style={{ left: 0, width: xOf(skala, ARBEIT_START) }} />
      <div className={styles.randzeit} style={{ left: xOf(skala, ARBEIT_ENDE), width: gesamtBreite(skala) - xOf(skala, ARBEIT_ENDE) }} />
      {vergangenBis !== null && <div className={styles.vergangen} style={{ width: xOf(skala, Math.min(vergangenBis, ACHSE_ENDE)) }} />}
      <div className={styles.mittag} style={{ left: xOf(skala, MITTAG.startMin), width: breiteOf(skala, MITTAG.dauerMin) }} />

      {rasterLinien(skala).map((linie) => (
        <div key={linie.minuten} className={cx(styles.linie, linie.stunde && styles.linieStunde)} style={{ left: xOf(skala, linie.minuten) }} />
      ))}

      {zeile.absenz && (
        <div className={styles.absenz} style={{ left: xOf(skala, ARBEIT_START), width: breiteOf(skala, ARBEIT_ENDE - ARBEIT_START) }}>
          <span className={styles.absenzLabel}>
            {ABSENZ_LABEL[zeile.absenz.art]}
            {zeile.absenz.notiz && <span className={styles.absenzNotiz}> · {zeile.absenz.notiz}</span>}
          </span>
        </div>
      )}

      {/* Smart-Slots: freie Rasterschritte gefärbt nach Bewertung */}
      {slots?.map((fenster) => (
        <div
          key={fenster.startMin}
          className={cx(styles.slot, styles[`slot-${fenster.bewertung.stufe}`])}
          style={{ left: xOf(skala, fenster.startMin), width: breiteOf(skala, skala.rasterMin) }}
          title={`${formatZeit(fenster.startMin)} · ${fenster.bewertung.gruende.join(' · ')}`}
        />
      ))}

      {/* Fahrzeit-Puffer */}
      {zeile.puffer.map((puffer) => (
        <div
          key={`${puffer.startMin}-${puffer.dauerMin}`}
          className={cx(styles.puffer, puffer.knapp && styles.pufferKnapp)}
          style={{ left: xOf(skala, puffer.startMin), width: Math.max(breiteOf(skala, puffer.dauerMin), 2), top: 4, height: rowH - 8 }}
          title={puffer.text}
        />
      ))}

      {zeile.einsaetze.map((view) => (
        <EinsatzBlock
          key={view.einsatz.id}
          view={view}
          position={blockPosition(skala, view.einsatz.startMin, view.einsatz.dauerMin, view.spur, rowH)}
          farbeNach={farbeNach}
          ausgewaehlt={view.einsatz.id === ausgewaehltId}
          markiert={view.einsatz.id === markiertId}
          onSelect={onSelectEinsatz}
        />
      ))}

      {vorschau && vorschau.passt && (
        <div
          className={cx(styles.ghost, vorschau.pruefung.konflikt && styles.ghostKonflikt, vorschau.bewertung && styles[`ghost-${vorschau.bewertung.stufe}`])}
          style={blockPosition(skala, vorschau.startMin, vorschau.dauerMin, 0, rowH)}
          aria-hidden
        >
          <span className={styles.ghostZeit}>{formatZeitspanne(vorschau.startMin, vorschau.dauerMin)}</span>
          <span className={styles.ghostGrund}>{vorschauText(vorschau).replace(/^[^–]*– ?/, '')}</span>
        </div>
      )}

      {jetztMin !== null && zeile.datum === heute && <div className={styles.jetzt} style={{ left: xOf(skala, jetztMin) }} />}
    </div>
  );
}

// ── §4 · Plantafel ───────────────────────────────────────────────

interface PlantafelProps {
  zeilen: readonly TagesZeile[];
  datum: IsoDatum;
  heute: IsoDatum;
  jetztMin: Minuten;
  zoom: Zoom;
  farbeNach: FarbeNach;
  pulse: ReadonlyMap<string, Puls>;
  ausgewaehltId: string | null;
  markiertId: string | null;
  onSelectEinsatz: (einsatzId: string) => void;
  onZoom: (richtung: 1 | -1) => void;
  onDrucken: (technikerId: string) => void;
  onSkala: (skala: Skala, rowH: number) => void;
  /** Platz unter den Zeilen (für das Kapazitätsband) melden. */
  onRestHoehe: (px: number) => void;
}

export function Plantafel({ zeilen, datum, heute, jetztMin, zoom, farbeNach, pulse, ausgewaehltId, markiertId, onSelectEinsatz, onZoom, onDrucken, onSkala, onRestHoehe }: PlantafelProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const groesse = useElementSize(scrollerRef);
  const techW = 176;

  const skala = useMemo(() => createSkala(Math.max(groesse.width - techW - 1, 320), zoom), [groesse.width, zoom]);
  const zeigeJetzt = datum === heute && jetztMin >= ACHSE_START && jetztMin <= ACHSE_ENDE;
  const jetztAnzeige = zeigeJetzt ? jetztMin : null;

  // jh› Zeilen teilen sich die Höhe (72–120 px); bleibt Platz, meldet die Tafel ihn fürs Kapazitätsband.
  // jh# 009 Virtuelle Zeilen ab 20 Technikern – heute werden alle Zeilen gerendert.
  const spurenTotal = zeilen.reduce((summe, zeile) => summe + zeile.spuren, 0) || 1;
  const verfuegbar = Math.max(groesse.height - HEAD_H, 0);
  const rowH = Math.round(Math.min(ROW_MAX, Math.max(ROW_MIN, verfuegbar / spurenTotal)));
  const inhaltHoehe = HEAD_H + spurenTotal * rowH;

  useEffect(() => {
    onRestHoehe(Math.max(0, groesse.height - inhaltHoehe));
  }, [groesse.height, inhaltHoehe, onRestHoehe]);

  useEffect(() => {
    onSkala(skala, rowH);
  }, [skala, rowH, onSkala]);

  // Arbeitsbeginn nach links scrollen (einmal und bei Zoomwechsel)
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollLeft = xOf(skala, ARBEIT_START) - 1;
  }, [skala.zoom, skala.pxPerMin]);

  // Strg + Mausrad zoomt (nativ, weil React das Wheel-Ereignis passiv registriert)
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onZoom(event.deltaY < 0 ? 1 : -1);
    }
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel);
  }, [onZoom]);

  // Gewählten Einsatz ins Bild holen (Konflikt-Wächter, Suche)
  useEffect(() => {
    if (!ausgewaehltId) return;
    const block = scrollerRef.current?.querySelector<HTMLElement>(`[data-einsatz-id="${ausgewaehltId}"]`);
    block?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [ausgewaehltId]);

  return (
    <div ref={scrollerRef} className={styles.scroller} style={{ maxHeight: inhaltHoehe + 2 }}>
      <div className={styles.inhalt} style={{ width: techW + gesamtBreite(skala) }}>
        <div className={styles.kopf}>
          <div className={styles.ecke}>
            <span className={styles.eckeLabel}>Techniker</span>
            <span className={styles.eckeAnzahl}>{zeilen.length}</span>
          </div>
          <Zeitachse skala={skala} jetztMin={jetztAnzeige} />
        </div>

        {zeilen.map((zeile) => (
          <div key={zeile.techniker.id} className={styles.zeile} style={{ height: zeile.spuren * rowH }}>
            <div className={styles.technikerSpalte}>
              <TechnikerZelle
                techniker={zeile.techniker}
                geplantMin={zeile.geplantMin}
                fahrzeitMin={zeile.fahrzeitMin}
                sollMin={zeile.absenz ? 0 : zeile.techniker.sollMinuten}
                puls={pulse.get(zeile.techniker.id) ?? null}
                onDrucken={onDrucken}
              />
            </div>
            <Spur
              zeile={zeile}
              skala={skala}
              rowH={rowH}
              heute={heute}
              jetztMin={jetztAnzeige}
              farbeNach={farbeNach}
              ausgewaehltId={ausgewaehltId}
              markiertId={markiertId}
              onSelectEinsatz={onSelectEinsatz}
            />
          </div>
        ))}
        {zeilen.length === 0 && <p className={styles.leer}>Kein Techniker im Filter – Filter zurücksetzen.</p>}
      </div>
      <span className={styles.srOnly}>{zeilen.length} Techniker · Summe geplant {formatDauer(zeilen.reduce((summe, zeile) => summe + zeile.geplantMin, 0))}</span>
    </div>
  );
}

/* ◆ jh · eof */
