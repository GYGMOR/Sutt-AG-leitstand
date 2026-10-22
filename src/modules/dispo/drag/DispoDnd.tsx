/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/drag/DispoDnd.tsx                    │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Drag & Drop (dnd-kit): Zeiger + Tastatur, Vorschau, Smart-Slots       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { CollisionDetection, DragEndEvent, DragMoveEvent, DragStartEvent, KeyboardCoordinateGetter } from '@dnd-kit/core';
import type { IsoDatum, Minuten } from '../../../core/datum';
import { formatDatumKurz, formatZeit, formatZeitspanne } from '../../../core/format';
import { isAbwesend } from '../../../core/domain/stammdaten';
import type { DispoStammdaten, PlanZiel } from '../dispo.types';
import type { Einsatz } from '../dispo.types';
import { bewerteFenster, profilOf, scoreSlot } from '../scoring';
import type { BewertetesFenster, SlotBewertung } from '../scoring';
import { resolveAuftrag, technikerOf } from '../store/dispo.selectors';
import { MITTAG, clampStart, findFreeSlot, floorToRaster, minOfX, overlaps, roundToRaster } from '../zeitraster';
import type { Skala } from '../zeitraster';
import styles from './DispoDnd.module.css';

// ── §1 · Typen ───────────────────────────────────────────────────

export type DragPayload =
  | { art: 'pendenz'; pendenzId: string; auftragId: string; dauerMin: Minuten; fruehestensAm?: IsoDatum; titel: string }
  | { art: 'einsatz'; einsatzId: string; auftragId: string; technikerId: string; dauerMin: Minuten; titel: string };

export interface DropPruefung {
  konflikt: boolean;
  hinweise: string[];
}

export interface DropVorschau extends PlanZiel {
  /** null = kein freier Slot an diesem Tag (Kompakt-/Wochenzelle). */
  startMin: Minuten;
  passt: boolean;
  dauerMin: Minuten;
  pruefung: DropPruefung;
  bewertung: SlotBewertung | null;
}

/** Was eine Drop-Zone über sich verrät – wird in `useDroppable({ data })` abgelegt. */
export type DropZoneData =
  | { art: 'spur'; technikerId: string; datum: IsoDatum; getRect: () => DOMRect; getSkala: () => Skala }
  | { art: 'tag'; technikerId: string; datum: IsoDatum; rasterMin: Minuten }
  | { art: 'kalender'; technikerId: string | null; datum: IsoDatum; getRect: () => DOMRect; minOfY: (y: number) => Minuten; rasterMin: Minuten }
  | { art: 'eingang' };

interface DndState {
  payload: DragPayload | null;
  vorschau: DropVorschau | null;
  ueberEingang: boolean;
  /** Bewertete freie Fenster einer Zeile während eines Drags, sonst null. */
  slotsFor: (technikerId: string, datum: IsoDatum) => BewertetesFenster[] | null;
}

const DndStateContext = createContext<DndState>({ payload: null, vorschau: null, ueberEingang: false, slotsFor: () => null });

export function useDispoDnd(): DndState {
  return useContext(DndStateContext);
}

// ── §2 · Prüfung eines Ziels ─────────────────────────────────────

interface PruefArgs {
  stammdaten: DispoStammdaten;
  einsaetze: readonly Einsatz[];
  heute: IsoDatum;
  jetztMin: Minuten;
}

function pruefeZiel(args: PruefArgs, payload: DragPayload, ziel: PlanZiel): DropPruefung {
  const fenster = { startMin: ziel.startMin, dauerMin: payload.dauerMin };
  const ignorierenId = payload.art === 'einsatz' ? payload.einsatzId : null;
  const hinweise: string[] = [];
  const konflikt = args.einsaetze.some(
    (einsatz) => einsatz.id !== ignorierenId && einsatz.technikerId === ziel.technikerId && einsatz.datum === ziel.datum && overlaps(einsatz, fenster),
  );
  if (konflikt) hinweise.push('Überschneidung');
  if (isAbwesend(args.stammdaten.absenzen, ziel.technikerId, ziel.datum)) hinweise.push('Techniker abwesend');
  const vergangen = ziel.datum < args.heute || (ziel.datum === args.heute && ziel.startMin < args.jetztMin);
  if (vergangen) hinweise.push('in der Vergangenheit');
  // jh? Planen vor dem Liefertermin nur als Hinweis – oder soll der Drop gesperrt werden?
  if (payload.art === 'pendenz' && payload.fruehestensAm && ziel.datum < payload.fruehestensAm) hinweise.push(`vor ${formatDatumKurz(payload.fruehestensAm)}`);
  if (overlaps(MITTAG, fenster) && !konflikt) hinweise.push('über Mittag');
  return { konflikt: konflikt || hinweise.includes('Techniker abwesend'), hinweise };
}

// ── §3 · Provider ────────────────────────────────────────────────

interface DispoDndProps extends PruefArgs {
  /** Rasterschritt in px (Tastatur ←/→) und Zeilenhöhe in px (↑/↓). */
  tastaturSchritt: () => { x: number; y: number };
  onPlan: (pendenzId: string, ziel: PlanZiel) => void;
  onMove: (einsatzId: string, ziel: PlanZiel) => void;
  onUnplan: (einsatzId: string) => void;
  children: ReactNode;
}

export function DispoDnd({ stammdaten, einsaetze, heute, jetztMin, tastaturSchritt, onPlan, onMove, onUnplan, children }: DispoDndProps) {
  const [payload, setPayload] = useState<DragPayload | null>(null);
  const [vorschau, setVorschau] = useState<DropVorschau | null>(null);
  const [ueberEingang, setUeberEingang] = useState(false);
  // jh! Start-, Move- und End-Ereignis können im selben Tick kommen (Tastatur,
  //     Automation) – die Logik liest darum Refs, der State dient nur dem Rendern.
  const payloadRef = useRef<DragPayload | null>(null);
  const vorschauRef = useRef<DropVorschau | null>(null);
  const slotCache = useRef(new Map<string, BewertetesFenster[]>());
  const schrittRef = useRef(tastaturSchritt);
  useEffect(() => {
    schrittRef.current = tastaturSchritt;
  });

  const setzeVorschau = useCallback((neu: DropVorschau | null) => {
    vorschauRef.current = neu;
    setVorschau(neu);
  }, []);

  const coordinateGetter = useCallback<KeyboardCoordinateGetter>((event, { currentCoordinates }) => {
    const schritt = schrittRef.current();
    switch (event.code) {
      case 'ArrowRight':
        return { ...currentCoordinates, x: currentCoordinates.x + schritt.x };
      case 'ArrowLeft':
        return { ...currentCoordinates, x: currentCoordinates.x - schritt.x };
      case 'ArrowDown':
        return { ...currentCoordinates, y: currentCoordinates.y + schritt.y };
      case 'ArrowUp':
        return { ...currentCoordinates, y: currentCoordinates.y - schritt.y };
      default:
        return undefined;
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  );

  // jh› Zeiger zuerst, sonst Rechteck – so funktioniert dieselbe Zone mit Maus und Tastatur.
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const perZeiger = pointerWithin(args);
    return perZeiger.length > 0 ? perZeiger : rectIntersection(args);
  }, []);

  const slotsFor = useCallback(
    (technikerId: string, datum: IsoDatum): BewertetesFenster[] | null => {
      if (!payload) return null;
      const schluessel = `${technikerId}|${datum}`;
      const vorhanden = slotCache.current.get(schluessel);
      if (vorhanden) return vorhanden;
      const techniker = technikerOf(stammdaten, technikerId);
      if (isAbwesend(stammdaten.absenzen, technikerId, datum)) return [];
      const ignorierenId = payload.art === 'einsatz' ? payload.einsatzId : null;
      const tagesEinsaetze = einsaetze.filter((einsatz) => einsatz.technikerId === technikerId && einsatz.datum === datum && einsatz.id !== ignorierenId);
      const fenster = bewerteFenster(
        profilOf(stammdaten, payload.auftragId),
        { techniker, tagesEinsaetze, koordinatenOf: (einsatz) => resolveAuftrag(stammdaten, einsatz.auftragId).koordinaten },
        payload.dauerMin,
        30,
      );
      slotCache.current.set(schluessel, fenster);
      return fenster;
    },
    [payload, stammdaten, einsaetze],
  );

  const bewerten = useCallback(
    (aktiv: DragPayload, ziel: PlanZiel): SlotBewertung | null => {
      if (isAbwesend(stammdaten.absenzen, ziel.technikerId, ziel.datum)) return null;
      const ignorierenId = aktiv.art === 'einsatz' ? aktiv.einsatzId : null;
      const tagesEinsaetze = einsaetze.filter((einsatz) => einsatz.technikerId === ziel.technikerId && einsatz.datum === ziel.datum && einsatz.id !== ignorierenId);
      return scoreSlot(
        profilOf(stammdaten, aktiv.auftragId),
        { techniker: technikerOf(stammdaten, ziel.technikerId), tagesEinsaetze, koordinatenOf: (einsatz) => resolveAuftrag(stammdaten, einsatz.auftragId).koordinaten },
        ziel.startMin,
        aktiv.dauerMin,
      );
    },
    [stammdaten, einsaetze],
  );

  // jh! dnd-kit liefert kein Zeigerereignis, und sein Delta enthält den Scroll der Zielspur
  //     (Autoscroll am Rand) – Auslöser + Delta zeigte dann Stunden daneben. Darum lesen
  //     wir die echte Zeigerposition während des Ziehens selbst mit.
  const zeigerRef = useRef<{ x: number; y: number } | null>(null);
  const merkeZeiger = useCallback((event: PointerEvent) => {
    zeigerRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  function onDragStart(event: DragStartEvent) {
    const daten = event.active.data.current as DragPayload | undefined;
    if (!daten) return;
    slotCache.current.clear();
    payloadRef.current = daten;
    const ausloeser = event.activatorEvent;
    zeigerRef.current = ausloeser instanceof MouseEvent ? { x: ausloeser.clientX, y: ausloeser.clientY } : null;
    if (zeigerRef.current) document.addEventListener('pointermove', merkeZeiger);
    setPayload(daten);
  }

  function onDragMove(event: DragMoveEvent) {
    const aktiv = payloadRef.current;
    if (!aktiv) return;
    const zone = event.over?.data.current as DropZoneData | undefined;
    if (!zone) {
      setzeVorschau(null);
      setUeberEingang(false);
      return;
    }
    if (zone.art === 'eingang') {
      setUeberEingang(aktiv.art === 'einsatz');
      setzeVorschau(null);
      return;
    }
    setUeberEingang(false);

    let startMin: Minuten | null = null;
    let passt = true;
    // jh› Kalenderspalte ohne Techniker (Tag/Woche ohne Split): der Einsatz behält seinen Techniker.
    const technikerId = zone.technikerId ?? (aktiv.art === 'einsatz' ? aktiv.technikerId : null);

    if (zone.art === 'spur') {
      const rect = zone.getRect();
      const skala = zone.getSkala();
      const uebersetzt = event.active.rect.current.translated;
      // jh› Bei Tastatur gibt es keinen Zeiger – dann zählt das verschobene Rechteck.
      const zeigerX = zeigerRef.current?.x ?? null;
      // jh› Einsatz: linke Blockkante zählt (Griffpunkt bleibt). Neue Karte: Zeit unter dem Zeiger.
      const x = aktiv.art === 'einsatz' ? (uebersetzt?.left ?? rect.left) : (zeigerX ?? uebersetzt?.left ?? rect.left);
      const roh = minOfX(skala, x - rect.left);
      const gerastert = aktiv.art === 'einsatz' ? roundToRaster(roh, skala.rasterMin) : floorToRaster(roh, skala.rasterMin);
      startMin = clampStart(gerastert, aktiv.dauerMin);
    } else if (zone.art === 'kalender') {
      const rect = zone.getRect();
      const uebersetzt = event.active.rect.current.translated;
      const zeigerY = zeigerRef.current?.y ?? null;
      const y = aktiv.art === 'einsatz' ? (uebersetzt?.top ?? rect.top) : (zeigerY ?? uebersetzt?.top ?? rect.top);
      startMin = clampStart(roundToRaster(zone.minOfY(y - rect.top), zone.rasterMin), aktiv.dauerMin);
    } else {
      const ignorierenId = aktiv.art === 'einsatz' ? aktiv.einsatzId : null;
      const belegt = einsaetze.filter((einsatz) => einsatz.technikerId === zone.technikerId && einsatz.datum === zone.datum && einsatz.id !== ignorierenId);
      const frei = findFreeSlot(belegt, aktiv.dauerMin, undefined, zone.rasterMin);
      passt = frei !== null;
      startMin = frei ?? 0;
    }

    if (!technikerId) {
      setzeVorschau(null);
      return;
    }
    const ziel: PlanZiel = { technikerId, datum: zone.datum, startMin };
    const alt = vorschauRef.current;
    if (alt && alt.technikerId === ziel.technikerId && alt.datum === ziel.datum && alt.startMin === ziel.startMin && alt.passt === passt) return;
    const pruefung = passt ? pruefeZiel({ stammdaten, einsaetze, heute, jetztMin }, aktiv, ziel) : { konflikt: true, hinweise: ['kein freier Slot'] };
    setzeVorschau({ ...ziel, passt, dauerMin: aktiv.dauerMin, pruefung, bewertung: passt ? bewerten(aktiv, ziel) : null });
  }

  function beenden() {
    document.removeEventListener('pointermove', merkeZeiger);
    zeigerRef.current = null;
    payloadRef.current = null;
    vorschauRef.current = null;
    setPayload(null);
    setVorschau(null);
    setUeberEingang(false);
    slotCache.current.clear();
  }

  function onDragEnd(event: DragEndEvent) {
    // jh› Letzte Position noch einmal auswerten – das End-Ereignis kann ohne vorheriges Move kommen.
    onDragMove(event);
    const aktiv = payloadRef.current;
    const ziel = vorschauRef.current;
    const zone = event.over?.data.current as DropZoneData | undefined;
    if (aktiv && zone?.art === 'eingang' && aktiv.art === 'einsatz') {
      onUnplan(aktiv.einsatzId);
    } else if (aktiv && ziel && ziel.passt) {
      const planZiel: PlanZiel = { technikerId: ziel.technikerId, datum: ziel.datum, startMin: ziel.startMin };
      if (aktiv.art === 'pendenz') onPlan(aktiv.pendenzId, planZiel);
      if (aktiv.art === 'einsatz') onMove(aktiv.einsatzId, planZiel);
    }
    beenden();
  }

  const wert = useMemo<DndState>(() => ({ payload, vorschau, ueberEingang, slotsFor }), [payload, vorschau, ueberEingang, slotsFor]);

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={onDragStart} onDragMove={onDragMove} onDragOver={onDragMove} onDragEnd={onDragEnd} onDragCancel={beenden}>
      <DndStateContext.Provider value={wert}>{children}</DndStateContext.Provider>
      <DragOverlay dropAnimation={null} className={styles.overlay}>
        {payload && (
          <div className={styles.ghost}>
            <span className={styles.ghostTitel}>{payload.titel}</span>
            <span className={styles.ghostZeit}>
              {vorschau?.passt ? formatZeitspanne(vorschau.startMin, vorschau.dauerMin) : `${payload.dauerMin} min`}
              {vorschau && vorschau.datum !== heute && ` · ${formatDatumKurz(vorschau.datum)}`}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ── §4 · Hilfen für Komponenten ──────────────────────────────────

export function vorschauText(vorschau: DropVorschau): string {
  if (!vorschau.passt) return 'kein freier Slot';
  const zeit = formatZeit(vorschau.startMin);
  const grund = vorschau.bewertung?.gruende.slice(0, 3).join(' · ');
  const hinweis = vorschau.pruefung.hinweise.join(' · ');
  return [zeit, hinweis || grund].filter(Boolean).join(' – ');
}

/* ◆ jh · eof */
