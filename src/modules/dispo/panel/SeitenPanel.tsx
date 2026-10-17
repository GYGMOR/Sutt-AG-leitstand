/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/panel/SeitenPanel.tsx                │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Rechtes Panel: Tabs Eingang/Wartet/Erledigt, Griff, Schiene, Akte     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Check, Inbox, PackageSearch, PanelRightClose, PanelRightOpen, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { IconButton } from '../../../core/ui/Button';
import { cx } from '../../../core/ui/cx';
import { useDispoDnd } from '../drag/DispoDnd';
import type { DropZoneData } from '../drag/DispoDnd';
import type { PanelTab } from '../dispo.types';
import styles from './SeitenPanel.module.css';

// ── §1 · Tabs ────────────────────────────────────────────────────

const TABS: readonly { id: PanelTab; label: string; icon: LucideIcon }[] = [
  { id: 'eingang', label: 'Eingang', icon: Inbox },
  { id: 'wartet', label: 'Wartet auf Teil', icon: PackageSearch },
  { id: 'erledigt', label: 'Erledigt', icon: Check },
];

export const PANEL_MIN = 300;
export const PANEL_MAX = 520;

// ── §2 · Komponente ──────────────────────────────────────────────

interface SeitenPanelProps {
  breite: number;
  eingeklappt: boolean;
  tab: PanelTab;
  zaehler: Readonly<Record<PanelTab, number>>;
  dringend: number;
  suche: string;
  /** Akte verdrängt die Tabs, solange eine Auswahl besteht. */
  akte: ReactNode | null;
  onTab: (tab: PanelTab) => void;
  onBreite: (breite: number) => void;
  onEingeklappt: (wert: boolean) => void;
  onSuche: (wert: string) => void;
  children: ReactNode;
}

export function SeitenPanel({ breite, eingeklappt, tab, zaehler, dringend, suche, akte, onTab, onBreite, onEingeklappt, onSuche, children }: SeitenPanelProps) {
  const dnd = useDispoDnd();
  const zone: DropZoneData = { art: 'eingang' };
  const { setNodeRef } = useDroppable({ id: 'eingang', data: zone });
  const nimmtEinsatz = dnd.payload?.art === 'einsatz';
  const [zieht, setZieht] = useState(false);
  const startRef = useRef<{ x: number; breite: number } | null>(null);

  // jh› Ziehgriff über Pointer-Capture: kein Verlieren des Griffs, wenn der Zeiger schnell ist.
  const onGriffDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      startRef.current = { x: event.clientX, breite };
      setZieht(true);
    },
    [breite],
  );
  const onGriffMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!startRef.current) return;
      const neu = Math.min(PANEL_MAX, Math.max(PANEL_MIN, startRef.current.breite + (startRef.current.x - event.clientX)));
      onBreite(neu);
    },
    [onBreite],
  );
  const onGriffUp = useCallback(() => {
    startRef.current = null;
    setZieht(false);
  }, []);

  if (eingeklappt) {
    return (
      <aside ref={setNodeRef} className={cx(styles.schiene, nimmtEinsatz && styles.nimmt, dnd.ueberEingang && styles.ueber)} aria-label="Rechtes Panel (eingeklappt)">
        <IconButton icon={PanelRightOpen} label="Panel ausklappen (])" size="md" onClick={() => onEingeklappt(false)} />
        {TABS.map((eintrag) => (
          <button
            key={eintrag.id}
            type="button"
            className={cx(styles.schieneTab, tab === eintrag.id && styles.schieneTabAktiv)}
            title={`${eintrag.label} · ${zaehler[eintrag.id]}`}
            onClick={() => {
              onTab(eintrag.id);
              onEingeklappt(false);
            }}
          >
            <eintrag.icon size={20} strokeWidth={1.5} aria-hidden />
            <span className={cx(styles.schieneZahl, eintrag.id === 'eingang' && dringend > 0 && styles.schieneZahlDringend)}>{zaehler[eintrag.id]}</span>
          </button>
        ))}
      </aside>
    );
  }

  return (
    <aside
      ref={setNodeRef}
      className={cx(styles.panel, nimmtEinsatz && styles.nimmt, dnd.ueberEingang && styles.ueber, zieht && styles.zieht)}
      style={{ width: breite }}
      aria-label="Rechtes Panel"
    >
      <div className={styles.griff} role="separator" aria-orientation="vertical" aria-label="Panelbreite ändern" onPointerDown={onGriffDown} onPointerMove={onGriffMove} onPointerUp={onGriffUp} onPointerCancel={onGriffUp} />

      {akte ?? (
        <>
          <header className={styles.kopf}>
            <div className={styles.tabs} role="tablist">
              {TABS.map((eintrag) => (
                <button
                  key={eintrag.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === eintrag.id}
                  className={cx(styles.tab, tab === eintrag.id && styles.tabAktiv)}
                  onClick={() => onTab(eintrag.id)}
                >
                  <eintrag.icon size={16} strokeWidth={1.5} aria-hidden />
                  <span className={styles.tabLabel}>{eintrag.label}</span>
                  <span className={cx(styles.zahl, eintrag.id === 'eingang' && dringend > 0 && styles.zahlDringend)}>{zaehler[eintrag.id]}</span>
                </button>
              ))}
            </div>
            <IconButton icon={PanelRightClose} label="Panel einklappen (])" size="sm" onClick={() => onEingeklappt(true)} />
          </header>

          <div className={styles.suchzeile}>
            <Search size={16} strokeWidth={1.5} aria-hidden className={styles.lupe} />
            <input
              type="search"
              className={styles.suche}
              placeholder="Im Panel suchen …"
              value={suche}
              spellCheck={false}
              onChange={(event) => onSuche(event.target.value)}
              aria-label="Im Panel suchen"
            />
          </div>

          {nimmtEinsatz && (
            <div className={styles.zurueck} aria-hidden>
              Hier ablegen: Einsatz zurück in den Eingang
            </div>
          )}

          <div className={styles.inhalt}>{children}</div>
        </>
      )}
    </aside>
  );
}

/* ◆ jh · eof */
