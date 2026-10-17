/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/PlantafelKompakt.tsx           │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Plantafel 3 Tage / Woche: Techniker × Tagesspalten, kompakte Blöcke   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useDroppable } from '@dnd-kit/core';
import type { IsoDatum } from '../../../core/datum';
import { ABSENZ_LABEL } from '../../../core/domain/stammdaten';
import { formatDatumKurz, formatDauer, formatWochentag, formatZeit } from '../../../core/format';
import { cx } from '../../../core/ui/cx';
import { useDispoDnd, vorschauText } from '../drag/DispoDnd';
import type { DropZoneData } from '../drag/DispoDnd';
import type { FarbeNach, Zoom } from '../dispo.types';
import type { MehrtagesZeile, Puls } from '../store/dispo.selectors';
import { KompaktBlock } from './KompaktBlock';
import { TechnikerZelle } from './TechnikerZelle';
import styles from './PlantafelKompakt.module.css';

// ── §1 · Tageszelle ──────────────────────────────────────────────

interface ZelleProps {
  technikerId: string;
  zelle: MehrtagesZeile['zellen'][number];
  heute: IsoDatum;
  zoom: Zoom;
  farbeNach: FarbeNach;
  ausgewaehltId: string | null;
  markiertId: string | null;
  onSelectEinsatz: (einsatzId: string) => void;
}

function Zelle({ technikerId, zelle, heute, zoom, farbeNach, ausgewaehltId, markiertId, onSelectEinsatz }: ZelleProps) {
  const dnd = useDispoDnd();
  const zone: DropZoneData = { art: 'tag', technikerId, datum: zelle.datum, rasterMin: zoom === 60 ? 30 : zoom };
  const { setNodeRef } = useDroppable({ id: `tag:${technikerId}:${zelle.datum}`, data: zone, disabled: zelle.absenz !== undefined });
  const vorschau = dnd.vorschau?.technikerId === technikerId && dnd.vorschau.datum === zelle.datum ? dnd.vorschau : null;

  return (
    <div ref={setNodeRef} className={cx(styles.zelle, zelle.datum < heute && styles.vergangen, vorschau && styles.zelleZiel)}>
      {zelle.absenz ? (
        <p className={styles.absenz}>{ABSENZ_LABEL[zelle.absenz.art]}</p>
      ) : (
        <ul className={styles.liste}>
          {zelle.einsaetze.map((view) => (
            <KompaktBlock
              key={view.einsatz.id}
              view={view}
              farbeNach={farbeNach}
              ausgewaehlt={view.einsatz.id === ausgewaehltId}
              markiert={view.einsatz.id === markiertId}
              onSelect={onSelectEinsatz}
            />
          ))}
        </ul>
      )}
      {vorschau && (
        <p className={cx(styles.vorschau, (!vorschau.passt || vorschau.pruefung.konflikt) && styles.vorschauKonflikt)}>
          {vorschau.passt ? `→ ${formatZeit(vorschau.startMin)}` : vorschauText(vorschau)}
        </p>
      )}
      {zelle.geplantMin > 0 && <span className={styles.summe}>{formatDauer(zelle.geplantMin)}</span>}
    </div>
  );
}

// ── §2 · Tafel ───────────────────────────────────────────────────

interface PlantafelKompaktProps {
  zeilen: readonly MehrtagesZeile[];
  tage: readonly IsoDatum[];
  datum: IsoDatum;
  heute: IsoDatum;
  zoom: Zoom;
  farbeNach: FarbeNach;
  pulse: ReadonlyMap<string, Puls>;
  ausgewaehltId: string | null;
  markiertId: string | null;
  onSelectEinsatz: (einsatzId: string) => void;
  onOpenDay: (tag: IsoDatum) => void;
  onDrucken: (technikerId: string) => void;
}

export function PlantafelKompakt({ zeilen, tage, datum, heute, zoom, farbeNach, pulse, ausgewaehltId, markiertId, onSelectEinsatz, onOpenDay, onDrucken }: PlantafelKompaktProps) {
  return (
    <div className={styles.tafel}>
      <div className={styles.kopf}>
        <div className={styles.ecke}>
          <span className={styles.eckeLabel}>Techniker</span>
        </div>
        {tage.map((tag) => {
          const anzahl = zeilen.reduce((summe, zeile) => summe + (zeile.zellen.find((zelle) => zelle.datum === tag)?.einsaetze.length ?? 0), 0);
          return (
            <button
              key={tag}
              type="button"
              className={cx(styles.tagKopf, tag === heute && styles.heute, tag === datum && styles.gewaehlt)}
              onClick={() => onOpenDay(tag)}
              title="Tag öffnen (hineinzoomen)"
            >
              <span className={styles.wochentag}>{formatWochentag(tag, 'kurz')}</span>
              <span className={styles.tagDatum}>{formatDatumKurz(tag)}</span>
              <span className={styles.tagAnzahl}>{anzahl}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.koerper}>
        {zeilen.map((zeile) => {
          const geplant = zeile.zellen.reduce((summe, zelle) => summe + zelle.geplantMin, 0);
          const arbeitstage = zeile.zellen.filter((zelle) => !zelle.absenz).length;
          return (
            <div key={zeile.techniker.id} className={styles.zeile}>
              <TechnikerZelle
                techniker={zeile.techniker}
                geplantMin={geplant}
                fahrzeitMin={0}
                sollMin={zeile.techniker.sollMinuten * arbeitstage}
                puls={pulse.get(zeile.techniker.id) ?? null}
                onDrucken={onDrucken}
              />
              {zeile.zellen.map((zelle) => (
                <Zelle
                  key={zelle.datum}
                  technikerId={zeile.techniker.id}
                  zelle={zelle}
                  heute={heute}
                  zoom={zoom}
                  farbeNach={farbeNach}
                  ausgewaehltId={ausgewaehltId}
                  markiertId={markiertId}
                  onSelectEinsatz={onSelectEinsatz}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ◆ jh · eof */
