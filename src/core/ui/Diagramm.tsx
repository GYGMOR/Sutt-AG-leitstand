/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Diagramm.tsx                               │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Diagramme: Karte mit Tabelle, Donut, Balken, Linie, Säulen, Anteile   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react';
import { PieChart, Table } from 'lucide-react';
import { IconButton } from './Button';
import { cx } from './cx';
import styles from './Diagramm.module.css';

// ── §1 · Gemeinsames ─────────────────────────────────────────────

export interface Serie {
  id: string;
  label: string;
  /** CSS-Farbe, in der Regel ein Token wie var(--sl-dv-1). */
  farbe: string;
  form?: 'rect' | 'line';
}

export interface TooltipZeile {
  label: string;
  wert: string;
  farbe?: string;
}

export interface TooltipInhalt {
  titel: string;
  zeilen: readonly TooltipZeile[];
}

interface TooltipLage {
  x: number;
  y: number;
  inhalt: TooltipInhalt;
}

// jh› Diagramme sind interaktiv, aber nie nur so lesbar: Jede Karte hat die Tabelle als Zwilling, jede Zahl
//     steht auch als Beschriftung oder in der Tabelle. Farben tragen Marken, nie Text (Text bleibt Tinte).
function useBreite<T extends HTMLElement>(): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [breite, setBreite] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    setBreite(Math.round(element.getBoundingClientRect().width));
    const beobachter = new ResizeObserver((eintraege) => {
      const neu = eintraege[0]?.contentRect.width ?? 0;
      setBreite(Math.round(neu));
    });
    beobachter.observe(element);
    return () => beobachter.disconnect();
  }, []);
  return [ref, breite];
}

function useTooltip(wrapper: RefObject<HTMLDivElement>) {
  const [lage, setLage] = useState<TooltipLage | null>(null);
  const zeigen = useCallback(
    (clientX: number, clientY: number, inhalt: TooltipInhalt) => {
      const rect = wrapper.current?.getBoundingClientRect();
      if (!rect) return;
      setLage({ x: clientX - rect.left, y: clientY - rect.top, inhalt });
    },
    [wrapper],
  );
  const zeigenAn = useCallback(
    (element: Element, inhalt: TooltipInhalt) => {
      const rect = element.getBoundingClientRect();
      zeigen(rect.left + rect.width / 2, rect.top, inhalt);
    },
    [zeigen],
  );
  const verbergen = useCallback(() => setLage(null), []);
  return { lage, zeigen, zeigenAn, verbergen };
}

function Tooltip({ lage, breite }: { lage: TooltipLage; breite: number }) {
  const links = Math.min(Math.max(4, lage.x + 12), Math.max(4, breite - 190));
  return (
    <div className={styles.tooltip} style={{ left: links, top: Math.max(0, lage.y - 10) }} role="status">
      <span className={styles.tooltipTitel}>{lage.inhalt.titel}</span>
      {lage.inhalt.zeilen.map((zeile) => (
        <span key={`${zeile.label}-${zeile.wert}`} className={styles.tooltipZeile}>
          {zeile.farbe && <span className={styles.schluessel} style={{ background: zeile.farbe }} aria-hidden />}
          <strong>{zeile.wert}</strong>
          <span>{zeile.label}</span>
        </span>
      ))}
    </div>
  );
}

/** Schöne Achse: Schrittweite 1·2·5 × 10ⁿ, höchstens vier Teilstriche. */
export function achse(max: number): { oben: number; teilstriche: number[] } {
  const ziel = Math.max(1, max);
  const roh = ziel / 3;
  const exponent = Math.floor(Math.log10(roh));
  const basis = 10 ** exponent;
  const rest = roh / basis;
  const schritt = (rest <= 1 ? 1 : rest <= 2 ? 2 : rest <= 5 ? 5 : 10) * basis;
  const oben = Math.max(schritt, Math.ceil(ziel / schritt) * schritt);
  const teilstriche: number[] = [];
  for (let wert = 0; wert <= oben + 1e-9; wert += schritt) teilstriche.push(Math.round(wert * 1000) / 1000);
  return { oben, teilstriche };
}

function kompakt(wert: number): string {
  if (wert >= 1000) return `${(wert / 1000).toFixed(wert >= 10_000 ? 0 : 1).replace('.0', '')}K`;
  return String(wert);
}

// ── §2 · Karte mit Tabelle ───────────────────────────────────────

export interface DiagrammTabelle {
  kopf: readonly string[];
  zeilen: readonly (readonly (string | number)[])[];
}

interface KarteProps {
  titel: string;
  untertitel?: string;
  /** Legende – wird nur bei zwei oder mehr Serien gezeigt. */
  legende?: readonly Serie[];
  tabelle: DiagrammTabelle;
  leer?: boolean;
  children: ReactNode;
}

export function DiagrammKarte({ titel, untertitel, legende = [], tabelle, leer = false, children }: KarteProps) {
  const [alsTabelle, setAlsTabelle] = useState(false);
  return (
    <section className={styles.karte} aria-label={titel}>
      <header className={styles.kopf}>
        <div className={styles.kopfText}>
          <h3 className={styles.titel}>{titel}</h3>
          {untertitel && <p className={styles.untertitel}>{untertitel}</p>}
        </div>
        <IconButton icon={alsTabelle ? PieChart : Table} label={alsTabelle ? 'Als Diagramm' : 'Als Tabelle'} size="sm" onClick={() => setAlsTabelle((wert) => !wert)} />
      </header>
      {legende.length >= 2 && !alsTabelle && (
        <ul className={styles.legende} aria-label="Legende">
          {legende.map((serie) => (
            <li key={serie.id}>
              <span className={cx(styles.swatch, serie.form === 'line' && styles.swatchLinie)} style={{ background: serie.farbe }} aria-hidden /> {serie.label}
            </li>
          ))}
        </ul>
      )}
      {alsTabelle ? (
        <table className={styles.tabelle}>
          <thead>
            <tr>
              {tabelle.kopf.map((zelle) => (
                <th key={zelle} scope="col">
                  {zelle}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabelle.zeilen.map((zeile, index) => (
              <tr key={index}>
                {zeile.map((zelle, spalte) => (
                  <td key={spalte} className={cx(typeof zelle === 'number' && styles.zahl)}>
                    {zelle}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : leer ? (
        <p className={styles.leer}>Noch keine Daten.</p>
      ) : (
        children
      )}
    </section>
  );
}

// ── §3 · Donut ───────────────────────────────────────────────────

export interface DonutTeil {
  id: string;
  label: string;
  wert: number;
  farbe: string;
}

interface DonutProps {
  teile: readonly DonutTeil[];
  mitte: { wert: string; label: string };
}

const DONUT_R = 68;
const DONUT_UMFANG = 2 * Math.PI * DONUT_R;
const DONUT_LUECKE = 2;

export function Donut({ teile, mitte }: DonutProps) {
  const [wrapper] = useBreite<HTMLDivElement>();
  const tooltip = useTooltip(wrapper);
  const [aktiv, setAktiv] = useState<string | null>(null);
  const total = teile.reduce((summe, teil) => summe + teil.wert, 0);
  let start = 0;
  const segmente = teile
    .filter((teil) => teil.wert > 0)
    .map((teil) => {
      const laenge = total > 0 ? (teil.wert / total) * DONUT_UMFANG : 0;
      const segment = { ...teil, start, laenge: Math.max(0, laenge - DONUT_LUECKE) };
      start += laenge;
      return segment;
    });
  const inhaltFuer = (teil: DonutTeil): TooltipInhalt => ({ titel: teil.label, zeilen: [{ wert: String(teil.wert), label: total > 0 ? `${Math.round((teil.wert / total) * 100)} % von ${total}` : '', farbe: teil.farbe }] });

  return (
    <div ref={wrapper} className={cx(styles.wrapper, styles.donutWrapper)}>
      <svg viewBox="0 0 180 180" className={styles.donut} role="img" aria-label={`${mitte.wert} ${mitte.label}`}>
        <circle cx="90" cy="90" r={DONUT_R} className={styles.donutSpur} />
        {segmente.map((segment) => (
          <circle
            key={segment.id}
            cx="90"
            cy="90"
            r={DONUT_R}
            className={cx(styles.segment, aktiv === segment.id && styles.segmentAktiv)}
            style={{ stroke: segment.farbe }}
            strokeDasharray={`${segment.laenge} ${DONUT_UMFANG - segment.laenge}`}
            strokeDashoffset={-(segment.start + DONUT_LUECKE / 2)}
            transform="rotate(-90 90 90)"
            tabIndex={0}
            aria-label={`${segment.label}: ${segment.wert}`}
            onPointerMove={(event) => {
              setAktiv(segment.id);
              tooltip.zeigen(event.clientX, event.clientY, inhaltFuer(segment));
            }}
            onPointerLeave={() => {
              setAktiv(null);
              tooltip.verbergen();
            }}
            onFocus={(event: FocusEvent<SVGCircleElement>) => {
              setAktiv(segment.id);
              tooltip.zeigenAn(event.currentTarget, inhaltFuer(segment));
            }}
            onBlur={() => {
              setAktiv(null);
              tooltip.verbergen();
            }}
          />
        ))}
      </svg>
      <div className={styles.donutMitte} aria-hidden>
        <span className={styles.donutWert}>{mitte.wert}</span>
        <span className={styles.donutLabel}>{mitte.label}</span>
      </div>
      {tooltip.lage && <Tooltip lage={tooltip.lage} breite={wrapper.current?.clientWidth ?? 0} />}
    </div>
  );
}

// ── §4 · Balken (waagrecht, eine Farbe) ──────────────────────────

export interface BalkenZeile {
  id: string;
  label: string;
  wert: number;
  anzeige: string;
  tooltip: TooltipInhalt;
}

interface BalkenProps {
  zeilen: readonly BalkenZeile[];
  farbe: string;
  /** Bezugsmarke, z. B. 1 für 100 % – als Hairline in der Spur. */
  marke?: number;
}

export function Balken({ zeilen, farbe, marke }: BalkenProps) {
  const [wrapper, breite] = useBreite<HTMLDivElement>();
  const tooltip = useTooltip(wrapper);
  const max = Math.max(1e-9, marke ?? 0, ...zeilen.map((zeile) => zeile.wert));
  return (
    <div ref={wrapper} className={styles.wrapper}>
      <div className={styles.balken} role="list">
        {zeilen.map((zeile) => (
          <div
            key={zeile.id}
            className={styles.balkenZeile}
            role="listitem"
            tabIndex={0}
            aria-label={`${zeile.label}: ${zeile.anzeige}`}
            onPointerMove={(event) => tooltip.zeigen(event.clientX, event.clientY, zeile.tooltip)}
            onPointerLeave={tooltip.verbergen}
            onFocus={(event) => tooltip.zeigenAn(event.currentTarget, zeile.tooltip)}
            onBlur={tooltip.verbergen}
          >
            <span className={styles.balkenLabel}>{zeile.label}</span>
            <span className={styles.spur}>
              {marke !== undefined && <span className={styles.marke} style={{ left: `${(marke / max) * 100}%` }} aria-hidden />}
              <span className={styles.fuellung} style={{ width: `${Math.min(100, (zeile.wert / max) * 100)}%`, background: farbe }} />
            </span>
            <span className={styles.balkenWert}>{zeile.anzeige}</span>
          </div>
        ))}
      </div>
      {tooltip.lage && <Tooltip lage={tooltip.lage} breite={breite} />}
    </div>
  );
}

// ── §5 · Linie (eine Serie, Fläche, Fadenkreuz) ──────────────────

export interface LiniePunkt {
  id: string;
  /** Kurzlabel auf der X-Achse. */
  label: string;
  wert: number;
  titel: string;
}

interface LinieProps {
  punkte: readonly LiniePunkt[];
  farbe: string;
  einheit: string;
  hoehe?: number;
}

const RAND = { links: 30, rechts: 44, oben: 14, unten: 22 };

export function Linie({ punkte, farbe, einheit, hoehe = 170 }: LinieProps) {
  const [wrapper, breite] = useBreite<HTMLDivElement>();
  const tooltip = useTooltip(wrapper);
  const [aktiv, setAktiv] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const anzahl = punkte.length;
  const innenB = Math.max(10, breite - RAND.links - RAND.rechts);
  const innenH = hoehe - RAND.oben - RAND.unten;
  const { oben, teilstriche } = achse(Math.max(...punkte.map((punkt) => punkt.wert), 0));
  const x = (index: number) => RAND.links + (anzahl > 1 ? (index / (anzahl - 1)) * innenB : innenB / 2);
  const y = (wert: number) => RAND.oben + innenH - (wert / oben) * innenH;
  const pfad = punkte.map((punkt, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(punkt.wert).toFixed(1)}`).join(' ');
  const flaeche = anzahl > 0 ? `${pfad} L${x(anzahl - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z` : '';
  const letzter = punkte[anzahl - 1];

  const waehlen = (index: number, clientX?: number, clientY?: number) => {
    const punkt = punkte[index];
    if (!punkt) return;
    setAktiv(index);
    const inhalt: TooltipInhalt = { titel: punkt.titel, zeilen: [{ wert: `${punkt.wert} ${einheit}`, label: '', farbe }] };
    if (clientX !== undefined && clientY !== undefined) tooltip.zeigen(clientX, clientY, inhalt);
    else if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      tooltip.zeigen(rect.left + x(index), rect.top + y(punkt.wert), inhalt);
    }
  };
  const aufZeiger = (event: ReactPointerEvent<SVGRectElement>) => {
    if (!svgRef.current || anzahl === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = event.clientX - rect.left - RAND.links;
    const index = Math.min(anzahl - 1, Math.max(0, Math.round((px / innenB) * (anzahl - 1))));
    waehlen(index, event.clientX, event.clientY);
  };
  const aufTaste = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const naechster = Math.min(anzahl - 1, Math.max(0, (aktiv ?? anzahl - 1) + (event.key === 'ArrowRight' ? 1 : -1)));
    waehlen(naechster);
  };
  const verlassen = () => {
    setAktiv(null);
    tooltip.verbergen();
  };
  const xLabels = anzahl > 2 ? [0, Math.floor((anzahl - 1) / 2), anzahl - 1] : punkte.map((_, index) => index);

  return (
    <div ref={wrapper} className={styles.wrapper}>
      {breite > 0 && (
        <svg ref={svgRef} width={breite} height={hoehe} className={styles.svg} role="img" aria-label={letzter ? `Verlauf, zuletzt ${letzter.wert} ${einheit}` : 'Verlauf'} tabIndex={0} onKeyDown={aufTaste} onBlur={verlassen}>
          {teilstriche.map((wert) => (
            <g key={wert}>
              <line x1={RAND.links} x2={breite - RAND.rechts} y1={y(wert)} y2={y(wert)} className={styles.gitter} />
              <text x={RAND.links - 6} y={y(wert) + 3} className={styles.achsenText} textAnchor="end">
                {kompakt(wert)}
              </text>
            </g>
          ))}
          {xLabels.map((index) => (
            <text key={index} x={x(index)} y={hoehe - 6} className={styles.achsenText} textAnchor={index === 0 ? 'start' : index === anzahl - 1 ? 'end' : 'middle'}>
              {punkte[index]?.label}
            </text>
          ))}
          {flaeche && <path d={flaeche} className={styles.flaeche} style={{ fill: farbe }} />}
          {pfad && <path d={pfad} className={styles.linie} style={{ stroke: farbe }} />}
          {aktiv !== null && punkte[aktiv] && (
            <g>
              <line x1={x(aktiv)} x2={x(aktiv)} y1={RAND.oben} y2={RAND.oben + innenH} className={styles.fadenkreuz} />
              <circle cx={x(aktiv)} cy={y(punkte[aktiv].wert)} r={5} className={styles.marker} style={{ fill: farbe }} />
            </g>
          )}
          {letzter && (
            <g>
              <circle cx={x(anzahl - 1)} cy={y(letzter.wert)} r={4.5} className={styles.marker} style={{ fill: farbe }} />
              <text x={x(anzahl - 1) + 9} y={y(letzter.wert) + 4} className={styles.endLabel}>
                {letzter.wert}
              </text>
            </g>
          )}
          <rect x={RAND.links} y={RAND.oben} width={innenB} height={innenH} className={styles.treffer} onPointerMove={aufZeiger} onPointerLeave={verlassen} />
        </svg>
      )}
      {tooltip.lage && <Tooltip lage={tooltip.lage} breite={breite} />}
    </div>
  );
}

// ── §6 · Säulen (gestapelt, kategorisch) ─────────────────────────

export interface SaeulenGruppe {
  id: string;
  label: string;
  titel: string;
  werte: readonly number[];
}

interface SaeulenProps {
  gruppen: readonly SaeulenGruppe[];
  serien: readonly Serie[];
  hoehe?: number;
}

const SAEULE_MAX = 24;
const LUECKE = 2;
const RUNDUNG = 4;

function saeulenPfad(x: number, yOben: number, breite: number, hoehe: number): string {
  const r = Math.min(RUNDUNG, hoehe, breite / 2);
  return `M${x},${yOben + r} a${r},${r} 0 0 1 ${r},-${r} h${breite - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${hoehe - r} h-${breite} z`;
}

export function Saeulen({ gruppen, serien, hoehe = 170 }: SaeulenProps) {
  const [wrapper, breite] = useBreite<HTMLDivElement>();
  const tooltip = useTooltip(wrapper);
  const [aktiv, setAktiv] = useState<string | null>(null);
  const rand = { links: 30, rechts: 8, oben: 18, unten: 22 };
  const innenB = Math.max(10, breite - rand.links - rand.rechts);
  const innenH = hoehe - rand.oben - rand.unten;
  const totale = gruppen.map((gruppe) => gruppe.werte.reduce((summe, wert) => summe + wert, 0));
  const { oben, teilstriche } = achse(Math.max(...totale, 0));
  const band = gruppen.length > 0 ? innenB / gruppen.length : innenB;
  const saeuleB = Math.min(SAEULE_MAX, Math.max(6, band * 0.6));
  const y = (wert: number) => rand.oben + innenH - (wert / oben) * innenH;
  const inhaltFuer = (gruppe: SaeulenGruppe, total: number): TooltipInhalt => ({
    titel: `${gruppe.titel} · ${total}`,
    zeilen: serien.map((serie, index) => ({ wert: String(gruppe.werte[index] ?? 0), label: serie.label, farbe: serie.farbe })),
  });

  return (
    <div ref={wrapper} className={styles.wrapper}>
      {breite > 0 && (
        <svg width={breite} height={hoehe} className={styles.svg} role="img" aria-label={`${gruppen.length} Gruppen, ${serien.length} Serien`}>
          {teilstriche.map((wert) => (
            <g key={wert}>
              <line x1={rand.links} x2={breite - rand.rechts} y1={y(wert)} y2={y(wert)} className={styles.gitter} />
              <text x={rand.links - 6} y={y(wert) + 3} className={styles.achsenText} textAnchor="end">
                {kompakt(wert)}
              </text>
            </g>
          ))}
          {gruppen.map((gruppe, gruppenIndex) => {
            const total = totale[gruppenIndex] ?? 0;
            const x0 = rand.links + gruppenIndex * band + (band - saeuleB) / 2;
            let cursor = y(0);
            const segmente = gruppe.werte.map((wert, serienIndex) => {
              const h = (wert / oben) * innenH;
              const yOben = cursor - h;
              const segment = { serie: serien[serienIndex], yOben, hoehe: h, erstes: serienIndex === 0 };
              cursor -= h;
              return segment;
            });
            const letztesMitWert = [...segmente].reverse().find((segment) => segment.hoehe > 0);
            return (
              <g key={gruppe.id} className={cx(aktiv === gruppe.id && styles.gruppeAktiv)}>
                {segmente.map((segment, index) => {
                  if (segment.hoehe <= 0 || !segment.serie) return null;
                  const luecke = segment.erstes ? 0 : LUECKE;
                  const sichtbareHoehe = Math.max(0, segment.hoehe - luecke);
                  if (sichtbareHoehe <= 0) return null;
                  const rund = segment === letztesMitWert;
                  return rund ? (
                    <path key={index} d={saeulenPfad(x0, segment.yOben, saeuleB, sichtbareHoehe)} className={styles.segmentRect} style={{ fill: segment.serie.farbe }} />
                  ) : (
                    <rect key={index} x={x0} y={segment.yOben} width={saeuleB} height={sichtbareHoehe} className={styles.segmentRect} style={{ fill: segment.serie.farbe }} />
                  );
                })}
                {total > 0 && (
                  <text x={x0 + saeuleB / 2} y={y(total) - 5} className={styles.kappenLabel} textAnchor="middle">
                    {total}
                  </text>
                )}
                <text x={x0 + saeuleB / 2} y={hoehe - 6} className={styles.achsenText} textAnchor="middle">
                  {gruppe.label}
                </text>
                <rect
                  x={rand.links + gruppenIndex * band}
                  y={rand.oben}
                  width={band}
                  height={innenH}
                  className={styles.treffer}
                  tabIndex={0}
                  aria-label={`${gruppe.titel}: ${total}`}
                  onPointerMove={(event) => {
                    setAktiv(gruppe.id);
                    tooltip.zeigen(event.clientX, event.clientY, inhaltFuer(gruppe, total));
                  }}
                  onPointerLeave={() => {
                    setAktiv(null);
                    tooltip.verbergen();
                  }}
                  onFocus={(event) => {
                    setAktiv(gruppe.id);
                    tooltip.zeigenAn(event.currentTarget, inhaltFuer(gruppe, total));
                  }}
                  onBlur={() => {
                    setAktiv(null);
                    tooltip.verbergen();
                  }}
                />
              </g>
            );
          })}
        </svg>
      )}
      {tooltip.lage && <Tooltip lage={tooltip.lage} breite={breite} />}
    </div>
  );
}

// ── §7 · Anteile (ein gestapelter Balken) ────────────────────────

export interface AnteilTeil {
  id: string;
  label: string;
  wert: number;
  farbe: string;
}

export function Anteile({ teile }: { teile: readonly AnteilTeil[] }) {
  const [wrapper, breite] = useBreite<HTMLDivElement>();
  const tooltip = useTooltip(wrapper);
  const total = teile.reduce((summe, teil) => summe + teil.wert, 0);
  const prozent = (wert: number) => (total > 0 ? Math.round((wert / total) * 100) : 0);
  return (
    <div ref={wrapper} className={styles.wrapper}>
      <div className={styles.anteilBalken} role="img" aria-label={`${total} gesamt`}>
        {teile
          .filter((teil) => teil.wert > 0)
          .map((teil) => (
            <span
              key={teil.id}
              className={styles.anteil}
              style={{ flexGrow: teil.wert, background: teil.farbe }}
              tabIndex={0}
              aria-label={`${teil.label}: ${teil.wert} (${prozent(teil.wert)} %)`}
              onPointerMove={(event) => tooltip.zeigen(event.clientX, event.clientY, { titel: teil.label, zeilen: [{ wert: String(teil.wert), label: `${prozent(teil.wert)} %`, farbe: teil.farbe }] })}
              onPointerLeave={tooltip.verbergen}
              onFocus={(event) => tooltip.zeigenAn(event.currentTarget, { titel: teil.label, zeilen: [{ wert: String(teil.wert), label: `${prozent(teil.wert)} %`, farbe: teil.farbe }] })}
              onBlur={tooltip.verbergen}
            />
          ))}
      </div>
      <ul className={styles.anteilListe}>
        {teile.map((teil) => (
          <li key={teil.id}>
            <span className={styles.swatch} style={{ background: teil.farbe }} aria-hidden />
            <span className={styles.anteilLabel}>{teil.label}</span>
            <strong className={styles.anteilWert}>{teil.wert}</strong>
            <span className={styles.anteilProzent}>{prozent(teil.wert)} %</span>
          </li>
        ))}
      </ul>
      {tooltip.lage && <Tooltip lage={tooltip.lage} breite={breite} />}
    </div>
  );
}

/* ◆ jh · eof */
