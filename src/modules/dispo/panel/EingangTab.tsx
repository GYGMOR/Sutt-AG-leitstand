/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/panel/EingangTab.tsx                 │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Tab Eingang: nicht disponierte Aufträge nach Dringlichkeit            │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Inbox } from 'lucide-react';
import type { PendenzView } from '../store/dispo.selectors';
import { PendenzCard } from './PendenzCard';
import styles from './PanelTabs.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface EingangTabProps {
  pendenzen: readonly PendenzView[];
  ausgewaehltId: string | null;
  markiertId: string | null;
  regionGefiltert: boolean;
  onSelectPendenz: (pendenzId: string) => void;
}

export function EingangTab({ pendenzen, ausgewaehltId, markiertId, regionGefiltert, onSelectPendenz }: EingangTabProps) {
  return (
    <>
      <p className={styles.untertitel}>
        Nicht disponiert · nach Dringlichkeit{regionGefiltert && ' · Region gefiltert'}
      </p>
      <ul className={styles.liste}>
        {pendenzen.map((view) => (
          <li key={view.pendenz.id}>
            <PendenzCard view={view} ausgewaehlt={view.pendenz.id === ausgewaehltId} markiert={view.pendenz.id === markiertId} onSelect={onSelectPendenz} />
          </li>
        ))}
      </ul>
      {pendenzen.length === 0 && (
        <div className={styles.leer}>
          <Inbox size={20} strokeWidth={1.5} aria-hidden />
          <p>Alles disponiert.</p>
        </div>
      )}
      <footer className={styles.fuss}>Karte in den Plan ziehen · Klick öffnet die Akte · N erfasst einen Auftrag</footer>
    </>
  );
}

/* ◆ jh · eof */
