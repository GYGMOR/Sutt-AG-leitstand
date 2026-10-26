/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/Topbar.tsx                             │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Topbar 56 px: Wortmarke, Modul, Datum, Palette, Extras, Benutzer      │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router';
import { useBenutzer } from '../auth/authStore';
import { MOD_LABEL } from '../hooks/useHotkey';
import { MODUL_GRUPPEN } from '../modules.config';
import type { Modul } from '../modules.config';
import { Kbd } from '../ui/Kbd';
import { BenutzerMenu } from './BenutzerMenu';
import type { MenueEintrag } from './BenutzerMenu';
import { DateNav } from './DateNav';
import { useTopbarExtra } from './slots';
import styles from './Topbar.module.css';

// ── §1 · Wortmarke ───────────────────────────────────────────────

function Wortmarke() {
  return (
    <Link to="/dispo/plantafel" className={styles.wortmarke} aria-label="SUTT AG Leitstand – zur Plantafel">
      <span className={styles.raute} aria-hidden />
      <span className={styles.firma}>SUTT AG</span>
      <span className={styles.schraegstrich} aria-hidden>
        /
      </span>
      <span className={styles.produkt}>Leitstand</span>
    </Link>
  );
}

// ── §2 · Topbar ──────────────────────────────────────────────────

interface TopbarProps {
  modul?: Modul;
  extras?: ReactNode;
  menueEintraege?: readonly MenueEintrag[];
  onOpenPalette: () => void;
  onHilfe: () => void;
  onAbmelden: () => void;
}

export function Topbar({ modul, extras, menueEintraege, onOpenPalette, onHilfe, onAbmelden }: TopbarProps) {
  const benutzer = useBenutzer();
  // jh› Eingehängter Baustein aus main.tsx (rev 05: Stempeluhr) – core kennt das Modul nicht.
  const Extra = useTopbarExtra();
  const gruppe = modul ? MODUL_GRUPPEN.find((eintrag) => eintrag.id === modul.gruppe)?.label : undefined;

  return (
    <header className={styles.topbar}>
      <Wortmarke />
      {modul && (
        <div className={styles.modul}>
          <span className={styles.modulName}>{modul.label}</span>
          {gruppe && <span className={styles.modulZusatz}>{gruppe}</span>}
        </div>
      )}
      <DateNav />

      <button type="button" className={styles.suche} onClick={onOpenPalette} title={`Suchen oder Befehl (${MOD_LABEL} K)`}>
        <Search size={16} strokeWidth={1.5} aria-hidden />
        <span className={styles.sucheText}>Suchen oder Befehl …</span>
        <Kbd keys={[MOD_LABEL, 'K']} tone="chrome" />
      </button>

      <div className={styles.rechts}>
        {Extra && <Extra />}
        {extras}
        <span className={styles.mockup} title="Klickbares Mockup – alle Daten sind erfunden">
          Mockup · Testdaten
        </span>
        {benutzer && <BenutzerMenu benutzer={benutzer} eintraege={menueEintraege} onHilfe={onHilfe} onAbmelden={onAbmelden} />}
      </div>
    </header>
  );
}

/* ◆ jh · eof */
