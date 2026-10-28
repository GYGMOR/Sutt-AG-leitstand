/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/rahmen/AppRahmen.tsx                           │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Rahmen: Kopf, Tableiste (Handy), Rand (breit), Mehr-Blatt, Offline    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { LogOut, Menu, Monitor, Moon, Sun, WifiOff, X } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { abmelden } from '@sl/core/auth/authStore';
import { fullName } from '@sl/core/domain/stammdaten';
import { formatDatumKurz, formatWochentag } from '@sl/core/format';
import { useMediaQuery } from '@sl/core/hooks/useMediaQuery';
import { useTheme } from '@sl/core/theme';
import { LEITSTAND_URL } from '@sl/core/urls';
import { Avatar } from '@sl/core/ui/Avatar';
import { cx } from '@sl/core/ui/cx';
import { useApp } from './AppKontext';
import { HAUPT_NAVIGATION, NAVIGATION, WEITERE_NAVIGATION } from './navigation';
import type { NavEintrag } from './navigation';
import styles from './AppRahmen.module.css';

// ── §1 · Bausteine ───────────────────────────────────────────────

function NavEintragLink({ eintrag, pfad, klasse, aktivKlasse, onClick }: { eintrag: NavEintrag; pfad: (ziel: string) => string; klasse?: string; aktivKlasse?: string; onClick?: () => void }) {
  const Icon = eintrag.icon;
  return (
    <NavLink to={pfad(eintrag.pfad)} end={eintrag.ende} className={({ isActive }) => cx(klasse, isActive && aktivKlasse)} title={eintrag.beschreibung} onClick={onClick}>
      <Icon size={22} strokeWidth={1.5} aria-hidden />
      <span>{eintrag.label}</span>
    </NavLink>
  );
}

// ── §2 · Rahmen ──────────────────────────────────────────────────

// jh# 013 Offline ist nur ein Hinweis – echte Warteschlange (Service Worker, Wiederholung) für Status und Rapporte.
// jh› Ein Rahmen, zwei Formen: Unter 900 px Kopf oben und vier Tabs plus «Mehr» unten (Daumen),
//     darüber ein Rand links mit allen Bereichen (Tablet quer, Laptop). Inhalt bleibt derselbe.
export function AppRahmen({ children }: { children: ReactNode }) {
  const { techniker, mitarbeiter, heute, online, pfad, mandant } = useApp();
  const breit = useMediaQuery('(min-width: 900px)');
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mehrOffen, setMehrOffen] = useState(false);

  useEffect(() => {
    setMehrOffen(false);
  }, [location.pathname]);

  const name = mitarbeiter ? `${mitarbeiter.vorname} ${mitarbeiter.nachname}` : techniker ? fullName(techniker) : '';

  return (
    <div className={cx(styles.app, breit && styles.breit)}>
      <header className={styles.kopf}>
        <span className={styles.marke}>
          <span className={styles.raute} aria-hidden /> SUTT <span className={styles.markeApp}>App</span>
        </span>
        <span className={styles.datum}>
          {formatWochentag(heute, 'kurz')} {formatDatumKurz(heute)}
        </span>
        <span className={styles.rechts}>
          <span className={cx(styles.netz, !online && styles.netzAus)} title={online ? 'Online' : 'Offline'} aria-hidden />
          <NavLink to={pfad('/profil')} className={styles.profil} title={name || 'Profil'}>
            {techniker ? <Avatar techniker={techniker} size="sm" /> : <span className={styles.initialen}>{mitarbeiter?.kuerzel ?? '?'}</span>}
          </NavLink>
        </span>
      </header>

      {breit && (
        <nav className={styles.rand} aria-label="Bereiche">
          {NAVIGATION.map((eintrag) => (
            <NavEintragLink key={eintrag.pfad} eintrag={eintrag} pfad={pfad} klasse={styles.randEintrag} aktivKlasse={styles.randAktiv} />
          ))}
          <span className={styles.randFuss}>
            {mandant.firma} · v{__SL_VERSION__}
          </span>
        </nav>
      )}

      <div className={styles.flaeche}>
        {!online && (
          <p className={styles.offline} role="status">
            <WifiOff size={16} strokeWidth={1.5} aria-hidden /> Offline – Eingaben bleiben auf dem Gerät und werden später übertragen.
          </p>
        )}
        <main className={styles.inhalt} id="sl-app-inhalt">
          {children}
        </main>
      </div>

      {!breit && (
        <nav className={styles.tabs} aria-label="Bereiche">
          {HAUPT_NAVIGATION.map((eintrag) => (
            <NavEintragLink key={eintrag.pfad} eintrag={eintrag} pfad={pfad} klasse={styles.tab} aktivKlasse={styles.tabAktiv} />
          ))}
          <button type="button" className={cx(styles.tab, mehrOffen && styles.tabAktiv)} aria-expanded={mehrOffen} onClick={() => setMehrOffen((wert) => !wert)}>
            <Menu size={22} strokeWidth={1.5} aria-hidden />
            <span>Mehr</span>
          </button>
        </nav>
      )}

      {mehrOffen && !breit && (
        <div className={styles.blattHintergrund} onClick={() => setMehrOffen(false)} role="presentation">
          <div className={styles.blatt} role="dialog" aria-label="Weitere Bereiche" onClick={(event) => event.stopPropagation()}>
            <header className={styles.blattKopf}>
              <strong>{name}</strong>
              <button type="button" className={styles.blattSchliessen} aria-label="Schliessen" onClick={() => setMehrOffen(false)}>
                <X size={20} strokeWidth={1.5} aria-hidden />
              </button>
            </header>
            <ul className={styles.blattListe}>
              {WEITERE_NAVIGATION.map((eintrag) => (
                <li key={eintrag.pfad}>
                  <NavEintragLink eintrag={eintrag} pfad={pfad} klasse={styles.blattEintrag} aktivKlasse={styles.blattAktiv} onClick={() => setMehrOffen(false)} />
                </li>
              ))}
              <li>
                <button type="button" className={styles.blattEintrag} onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun size={22} strokeWidth={1.5} aria-hidden /> : <Moon size={22} strokeWidth={1.5} aria-hidden />}
                  <span>{theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}</span>
                </button>
              </li>
              <li>
                <a className={styles.blattEintrag} href={LEITSTAND_URL} target="_blank" rel="noreferrer">
                  <Monitor size={22} strokeWidth={1.5} aria-hidden />
                  <span>Leitstand öffnen</span>
                </a>
              </li>
              <li>
                <button
                  type="button"
                  className={cx(styles.blattEintrag, styles.blattAbmelden)}
                  onClick={() => {
                    abmelden();
                    navigate('/anmelden');
                  }}
                >
                  <LogOut size={22} strokeWidth={1.5} aria-hidden />
                  <span>Abmelden</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ◆ jh · eof */
