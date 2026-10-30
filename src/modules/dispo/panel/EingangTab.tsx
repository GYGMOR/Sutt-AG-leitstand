/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/panel/EingangTab.tsx                 │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Tab Eingang: nicht disponierte Aufträge, neue Website-Anfragen        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Globe, Inbox } from 'lucide-react';
import { Link } from 'react-router';
import { useAnfragen } from '../../website/anfrageStore';
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

// jh› Anfragen von der Website sind noch keine Aufträge (ungeprüft, ohne Kunde) – der Eingang zeigt sie als
//     Hinweis mit Sprung ins Modul, angenommene Anfragen stehen dann als Pendenz mit Chip «Website» hier.
function WebsiteHinweis() {
  const neu = useAnfragen().filter((anfrage) => anfrage.status === 'neu');
  if (neu.length === 0) return null;
  const dringend = neu.filter((anfrage) => anfrage.dringend).length;
  return (
    <Link to="/sms-website/anfragen" className={styles.hinweis}>
      <Globe size={14} strokeWidth={1.5} aria-hidden />
      <span>
        {neu.length === 1 ? '1 neue Anfrage' : `${neu.length} neue Anfragen`} von der Website
        {dringend > 0 && ` · ${dringend} dringend`}
      </span>
      <span className={styles.hinweisPfeil} aria-hidden>
        →
      </span>
    </Link>
  );
}

export function EingangTab({ pendenzen, ausgewaehltId, markiertId, regionGefiltert, onSelectPendenz }: EingangTabProps) {
  return (
    <>
      <p className={styles.untertitel}>
        Nicht disponiert · nach Dringlichkeit{regionGefiltert && ' · Region gefiltert'}
      </p>
      <WebsiteHinweis />
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
