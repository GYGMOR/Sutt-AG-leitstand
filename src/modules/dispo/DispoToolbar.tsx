/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/DispoToolbar.tsx                     │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Toolbar: Ansicht, Zeitraum, Zoom, Farbe nach, Filter, Undo, Neu       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useRef, useState } from 'react';
import { Funnel, Plus, Redo2, RotateCcw, ScrollText, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { ZEITRAUM_LABEL } from '../../core/arbeitstag';
import type { Zeitraum } from '../../core/arbeitstag';
import { EINSATZ_STATUS } from '../../core/domain/einsatz';
import type { EinsatzStatus } from '../../core/domain/einsatz';
import { KATEGORIEN } from '../../core/domain/kategorie';
import type { Kategorie } from '../../core/domain/kategorie';
import { REGIONEN, REGION_LABEL, fullName } from '../../core/domain/stammdaten';
import type { Region, Techniker } from '../../core/domain/stammdaten';
import { MOD_LABEL } from '../../core/hooks/useHotkey';
import { Avatar } from '../../core/ui/Avatar';
import { Button, IconButton } from '../../core/ui/Button';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { Chip } from '../../core/ui/Chip';
import { Kbd } from '../../core/ui/Kbd';
import { Popover } from '../../core/ui/Popover';
import { SegmentedControl } from '../../core/ui/SegmentedControl';
import type { SegmentOption } from '../../core/ui/SegmentedControl';
import { cx } from '../../core/ui/cx';
import { kategorieKlasse, statusKlasse } from '../../core/ui/farben';
import { ANSICHTEN, ANSICHT_LABEL, FARBE_NACH_LABEL, isFilterAktiv } from './dispo.types';
import type { Ansicht, DispoFilter, FarbeNach, Zoom } from './dispo.types';
import { ProtokollPopover } from './ProtokollPopover';
import type { ProtokollEintrag } from './store/dispo.reducer';
import styles from './DispoToolbar.module.css';

// ── §1 · Optionen ────────────────────────────────────────────────

const ANSICHT_OPTIONEN: readonly SegmentOption<Ansicht>[] = ANSICHTEN.map((ansicht, index) => ({ value: ansicht, label: ANSICHT_LABEL[ansicht], title: `${ANSICHT_LABEL[ansicht]} (${index + 1})` }));
const FARBE_OPTIONEN: readonly SegmentOption<FarbeNach>[] = (['kategorie', 'techniker', 'region', 'status'] as const).map((wert) => ({ value: wert, label: FARBE_NACH_LABEL[wert] }));
const REGION_OPTIONEN: readonly SegmentOption<Region | 'alle'>[] = [{ value: 'alle', label: 'Alle' }, ...REGIONEN.map((region) => ({ value: region, label: REGION_LABEL[region] }))];

// ── §2 · Komponente ──────────────────────────────────────────────

interface DispoToolbarProps {
  ansicht: Ansicht;
  onAnsicht: (ansicht: Ansicht) => void;
  zeitraum: Zeitraum;
  zeitraeume: readonly Zeitraum[];
  onZeitraum: (zeitraum: Zeitraum) => void;
  zoom: Zoom;
  onZoom: (richtung: 1 | -1) => void;
  farbeNach: FarbeNach;
  onFarbeNach: (farbeNach: FarbeNach) => void;
  filter: DispoFilter;
  techniker: readonly Techniker[];
  onToggleTechniker: (technikerId: string) => void;
  onToggleStatus: (status: EinsatzStatus) => void;
  onToggleKategorie: (kategorie: Kategorie) => void;
  onRegion: (region: Region | 'alle') => void;
  onResetFilter: () => void;
  protokoll: readonly ProtokollEintrag[];
  zukunft: readonly ProtokollEintrag[];
  onUndo: () => void;
  onRedo: () => void;
  onNeu: () => void;
}

export function DispoToolbar(props: DispoToolbarProps) {
  const { ansicht, onAnsicht, zeitraum, zeitraeume, onZeitraum, zoom, onZoom, farbeNach, onFarbeNach, filter, techniker, protokoll, zukunft, onUndo, onRedo, onNeu } = props;
  const [filterOffen, setFilterOffen] = useState(false);
  const [protokollOffen, setProtokollOffen] = useState(false);
  const filterRef = useRef<HTMLButtonElement>(null);
  const protokollRef = useRef<HTMLButtonElement>(null);
  const filterAnzahl = filter.technikerIds.length + filter.status.length + filter.kategorien.length + (filter.region !== 'alle' ? 1 : 0);
  const zeitraumOptionen: SegmentOption<Zeitraum>[] = zeitraeume.map((wert) => ({ value: wert, label: ZEITRAUM_LABEL[wert] }));

  return (
    <div className={styles.toolbar}>
      <SegmentedControl label="Ansicht" options={ANSICHT_OPTIONEN} value={ansicht} onChange={onAnsicht} />
      {zeitraumOptionen.length > 1 && <SegmentedControl label="Zeitraum" options={zeitraumOptionen} value={zeitraum} onChange={onZeitraum} />}

      {ansicht !== 'liste' && ansicht !== 'karte' && (
        <div className={styles.zoom} role="group" aria-label="Rasterdichte">
          <IconButton icon={ZoomOut} label="Gröberes Raster" size="sm" disabled={zoom === 60} onClick={() => onZoom(-1)} />
          <span className={styles.zoomWert} title={`Raster ${zoom} min · ${MOD_LABEL} + Mausrad`}>
            {zoom} min
          </span>
          <IconButton icon={ZoomIn} label="Feineres Raster" size="sm" disabled={zoom === 15} onClick={() => onZoom(1)} />
        </div>
      )}

      {ansicht !== 'liste' && (
        <div className={styles.gruppe}>
          <CapsLabel>Farbe</CapsLabel>
          <SegmentedControl label="Farbe nach" options={FARBE_OPTIONEN} value={farbeNach} onChange={onFarbeNach} />
        </div>
      )}

      <Button ref={filterRef} variant={filterAnzahl > 0 ? 'secondary' : 'ghost'} size="sm" icon={Funnel} onClick={() => setFilterOffen((wert) => !wert)} className={cx(filterAnzahl > 0 && styles.filterAktiv)}>
        Filter{filterAnzahl > 0 && <span className={styles.badge}>{filterAnzahl}</span>}
      </Button>

      <div className={styles.rechts}>
        <IconButton icon={Undo2} label={`Rückgängig (${MOD_LABEL} Z)`} size="md" disabled={protokoll.length === 0} onClick={onUndo} />
        <IconButton icon={Redo2} label={`Wiederherstellen (${MOD_LABEL} Y)`} size="md" disabled={zukunft.length === 0} onClick={onRedo} />
        <IconButton ref={protokollRef} icon={ScrollText} label="Änderungsprotokoll" size="md" pressed={protokollOffen} onClick={() => setProtokollOffen((wert) => !wert)} />
        {protokoll[0] && <span className={styles.letzte}>{protokoll[0].text}</span>}
        <Button variant="primary" size="md" icon={Plus} onClick={onNeu} title="Neuer Auftrag (N)">
          Neuer Auftrag <Kbd keys={['N']} />
        </Button>
      </div>

      <Popover anchor={filterRef.current} open={filterOffen} onClose={() => setFilterOffen(false)} placement="bottom-start" breite={420} label="Filter">
        <div className={styles.filter}>
          <div className={styles.filterGruppe}>
            <CapsLabel>Region</CapsLabel>
            <SegmentedControl label="Region" options={REGION_OPTIONEN} value={filter.region} onChange={props.onRegion} />
          </div>
          <div className={styles.filterGruppe}>
            <CapsLabel>Techniker</CapsLabel>
            <div className={styles.chips}>
              {techniker.map((person) => (
                <button key={person.id} type="button" className={cx(styles.technikerChip, filter.technikerIds.includes(person.id) && styles.chipAktiv)} aria-pressed={filter.technikerIds.includes(person.id)} title={`${fullName(person)} · ${REGION_LABEL[person.region]}`} onClick={() => props.onToggleTechniker(person.id)}>
                  <Avatar techniker={person} size="sm" /> {person.kuerzel}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.filterGruppe}>
            <CapsLabel>Status</CapsLabel>
            <div className={styles.chips}>
              {EINSATZ_STATUS.map(({ status, label }) => (
                <button key={status} type="button" className={cx(styles.statusChip, statusKlasse(status), filter.status.includes(status) && styles.chipAktiv)} aria-pressed={filter.status.includes(status)} onClick={() => props.onToggleStatus(status)}>
                  <span className={styles.swatch} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.filterGruppe}>
            <CapsLabel>Kategorie</CapsLabel>
            <div className={styles.chips}>
              {KATEGORIEN.map((meta) => (
                <button key={meta.id} type="button" className={cx(styles.kategorieChip, filter.kategorien.includes(meta.id) && styles.chipAktiv)} aria-pressed={filter.kategorien.includes(meta.id)} onClick={() => props.onToggleKategorie(meta.id)}>
                  <Chip tone="tint" className={kategorieKlasse(meta.id)} icon={meta.icon}>
                    {meta.kurz}
                  </Chip>
                </button>
              ))}
            </div>
          </div>
          <footer className={styles.filterFuss}>
            <span className={styles.filterHinweis}>Status, Kategorie und Region blenden ab – belegte Zeit bleibt sichtbar.</span>
            <Button variant="ghost" size="sm" icon={RotateCcw} disabled={!isFilterAktiv(filter)} onClick={props.onResetFilter}>
              Zurücksetzen
            </Button>
          </footer>
        </div>
      </Popover>

      <ProtokollPopover anchor={protokollRef.current} open={protokollOffen} protokoll={protokoll} zukunft={zukunft} onClose={() => setProtokollOffen(false)} onUndo={onUndo} onRedo={onRedo} />
    </div>
  );
}

/* ◆ jh · eof */
