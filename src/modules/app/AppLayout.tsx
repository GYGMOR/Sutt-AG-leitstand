/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/app/AppLayout.tsx                          │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Handy-Layout: Telefonrahmen am Desktop, Kopf, Offline, vier Tabs      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarCheck, CalendarRange, LogOut, Menu, Monitor, Moon, Package, Sun, Timer, WifiOff } from 'lucide-react';
import { NavLink, useNavigate, useSearchParams } from 'react-router';
import { abmelden, useBenutzer } from '../../core/auth/authStore';
import { fullName } from '../../core/domain/stammdaten';
import { formatDatumKurz, formatWochentag } from '../../core/format';
import { useMediaQuery } from '../../core/hooks/useMediaQuery';
import { useTheme } from '../../core/theme';
import { Avatar } from '../../core/ui/Avatar';
import { Button, IconButton } from '../../core/ui/Button';
import { Auswahl } from '../../core/ui/Form';
import { Popover } from '../../core/ui/Popover';
import { cx } from '../../core/ui/cx';
import { useApp } from './AppKontext';
import styles from './AppLayout.module.css';

// ── §1 · Online-Zustand ──────────────────────────────────────────

// jh# 013 Offline ist nur ein Hinweis – echte Warteschlange (Service Worker, Wiederholung) für Status und Rapporte.
function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const an = () => setOnline(true);
    const aus = () => setOnline(false);
    window.addEventListener('online', an);
    window.addEventListener('offline', aus);
    return () => {
      window.removeEventListener('online', an);
      window.removeEventListener('offline', aus);
    };
  }, []);
  return online;
}

// ── §2 · Handy-Fläche ────────────────────────────────────────────

// jh› global.css setzt für den Leitstand min-width 1024 px; die App meldet sich am <html>
//     ab, solange sie sichtbar ist – sonst scrollt das Telefon seitwärts.
function useHandyFlaeche(): void {
  useEffect(() => {
    document.documentElement.dataset.flaeche = 'app';
    return () => {
      delete document.documentElement.dataset.flaeche;
    };
  }, []);
}

// ── §3 · Layout ──────────────────────────────────────────────────

export function AppLayout({ children }: { children: ReactNode }) {
  useHandyFlaeche();
  const { techniker, heute, state, pfad } = useApp();
  const benutzer = useBenutzer();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const breit = useMediaQuery('(min-width: 720px)');
  const online = useOnline();
  const { theme, toggleTheme } = useTheme();
  const [menueOffen, setMenueOffen] = useState(false);
  const menueRef = useRef<HTMLButtonElement>(null);

  // jh› Am Desktop steht die App im Telefonrahmen neben der Plantafel – ?rahmen=0 schaltet ihn ab.
  const rahmen = breit && params.get('rahmen') !== '0';
  const innendienst = benutzer?.rolle !== 'aussendienst';

  const technikerWechseln = (id: string) => {
    const neu = new URLSearchParams(params);
    neu.set('als', id);
    navigate({ pathname: '/app', search: `?${neu.toString()}` });
    setMenueOffen(false);
  };

  const inhalt = (
    <div className={styles.app}>
      <header className={styles.kopf}>
        <span className={styles.marke}>
          <span className={styles.raute} aria-hidden /> SUTT
        </span>
        <span className={styles.datum}>
          {formatWochentag(heute, 'kurz')} {formatDatumKurz(heute)}
        </span>
        <span className={styles.rechts}>
          <Avatar techniker={techniker} size="sm" />
          <IconButton ref={menueRef} icon={Menu} label="Menü" tone="chrome" onClick={() => setMenueOffen((wert) => !wert)} />
        </span>
      </header>
      {!online && (
        <p className={styles.offline} role="status">
          <WifiOff size={16} strokeWidth={1.5} aria-hidden /> Offline – Statusmeldungen werden lokal gehalten und später übertragen.
        </p>
      )}
      <main className={styles.inhalt} id="sl-app-inhalt">
        {children}
      </main>
      <nav className={styles.tabs} aria-label="Bereiche">
        <NavLink to={pfad('/app')} end className={({ isActive }) => cx(styles.tab, isActive && styles.tabAktiv)}>
          <CalendarCheck size={20} strokeWidth={1.5} aria-hidden />
          Heute
        </NavLink>
        <NavLink to={pfad('/app/woche')} className={({ isActive }) => cx(styles.tab, isActive && styles.tabAktiv)}>
          <CalendarRange size={20} strokeWidth={1.5} aria-hidden />
          Woche
        </NavLink>
        <NavLink to={pfad('/app/zeit')} className={({ isActive }) => cx(styles.tab, isActive && styles.tabAktiv)}>
          <Timer size={20} strokeWidth={1.5} aria-hidden />
          Zeit
        </NavLink>
        <NavLink to={pfad('/app/lager')} className={({ isActive }) => cx(styles.tab, isActive && styles.tabAktiv)}>
          <Package size={20} strokeWidth={1.5} aria-hidden />
          Fahrzeug
        </NavLink>
      </nav>

      <Popover anchor={menueRef.current} open={menueOffen} onClose={() => setMenueOffen(false)} placement="bottom-end" breite={260} label="App-Menü">
        <div className={styles.menue} role="menu">
          <div className={styles.menueKopf}>
            <strong>{fullName(techniker)}</strong>
            <span>
              {techniker.kuerzel} · {techniker.fahrzeug}
            </span>
          </div>
          {innendienst && (
            <label className={styles.menueFeld}>
              <span>Als Techniker ansehen (Demo)</span>
              <Auswahl value={techniker.id} onChange={(event) => technikerWechseln(event.target.value)}>
                {state.stammdaten.techniker.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.kuerzel} · {fullName(person)}
                  </option>
                ))}
              </Auswahl>
            </label>
          )}
          {innendienst && (
            <button type="button" role="menuitem" className={styles.menueEintrag} onClick={() => navigate('/dispo/plantafel')}>
              <Monitor size={16} strokeWidth={1.5} aria-hidden /> Zum Leitstand
            </button>
          )}
          <button type="button" role="menuitem" className={styles.menueEintrag} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} strokeWidth={1.5} aria-hidden /> : <Moon size={16} strokeWidth={1.5} aria-hidden />}
            {theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
          </button>
          <button
            type="button"
            role="menuitem"
            className={cx(styles.menueEintrag, styles.menueAbmelden)}
            onClick={() => {
              abmelden();
              navigate('/abgemeldet');
            }}
          >
            <LogOut size={16} strokeWidth={1.5} aria-hidden /> Abmelden
          </button>
        </div>
      </Popover>
    </div>
  );

  if (!rahmen) return <div className={styles.vollbild}>{inhalt}</div>;
  return (
    <div className={styles.buehne}>
      <div className={styles.telefon}>
        <span className={styles.kerbe} aria-hidden />
        {inhalt}
      </div>
      <p className={styles.buehneHinweis}>Telefonrahmen für die Demo · auf dem Handy füllt die App den Bildschirm · ?rahmen=0 blendet ihn aus</p>
    </div>
  );
}

// ── §4 · Ohne Techniker ──────────────────────────────────────────

export function KeinTechniker() {
  const navigate = useNavigate();
  return (
    <div className={styles.buehne}>
      <div className={styles.leer}>
        <h1>Kein Techniker verknüpft</h1>
        <p>Dieses Konto fährt nicht selbst. Die Techniker-App zeigt den Tagesplan eines Technikers – zur Demo lässt sie sich aus dem Leitstand als Techniker öffnen.</p>
        <Button variant="primary" icon={Monitor} onClick={() => navigate('/dispo/plantafel')}>
          Zum Leitstand
        </Button>
      </div>
    </div>
  );
}

/* ◆ jh · eof */
