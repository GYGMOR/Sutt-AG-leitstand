/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/BenutzerMenu.tsx                       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Benutzermenü: Name, Rolle, Meine Daten, Moduleinträge, Abmelden       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useRef, useState } from 'react';
import { Keyboard, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ROLLEN, ROLLE_LABEL } from '../auth/auth.types';
import type { Benutzer, Rolle } from '../auth/auth.types';
import { rolleWechseln } from '../auth/authStore';
import { useTheme } from '../theme';
import { Auswahl } from '../ui/Form';
import { Kbd } from '../ui/Kbd';
import { Popover } from '../ui/Popover';
import { cx } from '../ui/cx';
import styles from './BenutzerMenu.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

/** Modulspezifischer Menüpunkt (z. B. «Demo zurücksetzen» aus der Disposition). */
export interface MenueEintrag {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
  gefaehrlich?: boolean;
}

interface BenutzerMenuProps {
  benutzer: Benutzer;
  eintraege?: readonly MenueEintrag[];
  onHilfe: () => void;
  onAbmelden: () => void;
}

export function BenutzerMenu({ benutzer, eintraege = [], onHilfe, onAbmelden }: BenutzerMenuProps) {
  const [offen, setOffen] = useState(false);
  const ankerRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <>
      <button
        ref={ankerRef}
        type="button"
        className={cx(styles.kuerzel, offen && styles.offen)}
        onClick={() => setOffen((wert) => !wert)}
        aria-haspopup="menu"
        aria-expanded={offen}
        title={`${benutzer.vorname} ${benutzer.nachname} · ${ROLLE_LABEL[benutzer.rolle]}`}
      >
        {benutzer.kuerzel}
      </button>

      <Popover anchor={ankerRef.current} open={offen} onClose={() => setOffen(false)} placement="bottom-end" breite={264} label="Benutzermenü">
        <div className={styles.menu} role="menu">
          <div className={styles.kopf}>
            <span className={styles.name}>
              {benutzer.vorname} {benutzer.nachname}
            </span>
            <span className={styles.benutzername}>@{benutzer.benutzername}</span>
          </div>

          <label className={styles.rolle}>
            <span className={styles.rolleLabel}>Rolle (Demo)</span>
            {/* jh› Rollenwechsel im Menü, damit die Schlösser live vorgeführt werden können. */}
            <Auswahl value={benutzer.rolle} onChange={(event) => rolleWechseln(event.target.value as Rolle)}>
              {ROLLEN.map((rolle) => (
                <option key={rolle} value={rolle}>
                  {ROLLE_LABEL[rolle]}
                </option>
              ))}
            </Auswahl>
          </label>

          {/* jh› Auskunftsrecht (DSG Art. 25) ist einen Klick entfernt – in jedem Modul, nicht nur im Personalbereich. */}
          <button
            type="button"
            role="menuitem"
            className={styles.eintrag}
            onClick={() => {
              setOffen(false);
              navigate('/meine-daten');
            }}
          >
            <ShieldCheck size={16} strokeWidth={1.5} aria-hidden />
            <span>Meine Daten & Datenschutz</span>
          </button>
          {eintraege.map((eintrag) => (
            <button
              key={eintrag.id}
              type="button"
              role="menuitem"
              className={cx(styles.eintrag, eintrag.gefaehrlich && styles.abmelden)}
              onClick={() => {
                setOffen(false);
                eintrag.run();
              }}
            >
              <eintrag.icon size={16} strokeWidth={1.5} aria-hidden />
              <span>{eintrag.label}</span>
            </button>
          ))}
          <button type="button" role="menuitem" className={styles.eintrag} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} strokeWidth={1.5} aria-hidden /> : <Moon size={16} strokeWidth={1.5} aria-hidden />}
            <span>{theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.eintrag}
            onClick={() => {
              setOffen(false);
              onHilfe();
            }}
          >
            <Keyboard size={16} strokeWidth={1.5} aria-hidden />
            <span>Tastaturkürzel</span>
            <Kbd keys={['?']} />
          </button>
          <button
            type="button"
            role="menuitem"
            className={cx(styles.eintrag, styles.abmelden)}
            onClick={() => {
              setOffen(false);
              onAbmelden();
            }}
          >
            <LogOut size={16} strokeWidth={1.5} aria-hidden />
            <span>Abmelden</span>
          </button>
        </div>
      </Popover>
    </>
  );
}

/* ◆ jh · eof */
