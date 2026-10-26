/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/Sidebar.tsx                            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Seitenleiste: Gruppen, Schlösser, Minikalender, ein-/ausklappbar      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, CircleQuestionMark, Lock, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink } from 'react-router';
import { useBenutzer } from '../auth/authStore';
import { useMandant } from '../mandant/mandantStore';
import { MODULE, MODUL_GRUPPEN, pruefeFreigabe } from '../modules.config';
import type { Modul, ModulGruppe } from '../modules.config';
import { cx } from '../ui/cx';
import { Popover } from '../ui/Popover';
import { MiniKalender } from './MiniKalender';
import { toggleSidebarGruppe, useSidebarState } from './sidebarStore';
import styles from './Sidebar.module.css';

// ── §1 · Gesperrt-Hinweis ────────────────────────────────────────

interface SperrInfo {
  modul: Modul;
  grund: 'nicht-freigeschaltet' | 'keine-berechtigung';
  anker: HTMLElement;
}

function sperrText(info: SperrInfo): string {
  if (info.grund === 'keine-berechtigung') return `Modul «${info.modul.label}» ist für Ihre Rolle nicht freigegeben.`;
  const version = info.modul.version ? ` · geplant für ${info.modul.version}` : '';
  return `Modul «${info.modul.label}» ist noch nicht freigeschaltet${version}.`;
}

// ── §2 · Eintrag ─────────────────────────────────────────────────

interface EintragProps {
  modul: Modul;
  eingeklappt: boolean;
  onGesperrt: (info: SperrInfo) => void;
  onHover: (gruppe: ModulGruppe | null, anker: HTMLElement | null) => void;
}

function Eintrag({ modul, eingeklappt, onGesperrt, onHover }: EintragProps) {
  const benutzer = useBenutzer();
  const { modulFreigaben } = useMandant();
  const freigabe = pruefeFreigabe(modul, benutzer?.rolle ?? null, modulFreigaben);
  const Icon = modul.icon;
  const inhalt: ReactNode = (
    <>
      <Icon size={20} strokeWidth={1.5} aria-hidden className={styles.icon} />
      {!freigabe.ok && <Lock size={12} strokeWidth={1.5} aria-hidden className={styles.schloss} />}
      <span className={styles.label}>{modul.label}</span>
    </>
  );

  if (!freigabe.ok) {
    return (
      <button
        type="button"
        className={cx(styles.eintrag, styles.gesperrt)}
        aria-disabled="true"
        title={eingeklappt ? undefined : `${modul.label} – ${freigabe.grund === 'keine-berechtigung' ? 'keine Berechtigung' : 'folgt'}`}
        onClick={(event) => onGesperrt({ modul, grund: freigabe.grund, anker: event.currentTarget })}
        onPointerEnter={(event) => onHover(modul.gruppe, event.currentTarget)}
        onPointerLeave={() => onHover(null, null)}
      >
        {inhalt}
      </button>
    );
  }

  return (
    <NavLink
      to={modul.pfad}
      className={({ isActive }) => cx(styles.eintrag, isActive && styles.aktiv)}
      title={eingeklappt ? undefined : modul.beschreibung}
      onPointerEnter={(event) => onHover(modul.gruppe, event.currentTarget)}
      onPointerLeave={() => onHover(null, null)}
    >
      {inhalt}
    </NavLink>
  );
}

// ── §3 · Flyout (eingeklappt) ────────────────────────────────────

interface FlyoutProps {
  gruppe: ModulGruppe;
  anker: HTMLElement;
  onClose: () => void;
  onEnter: () => void;
  onGesperrt: (info: SperrInfo) => void;
}

function Flyout({ gruppe, anker, onClose, onEnter, onGesperrt }: FlyoutProps) {
  const benutzer = useBenutzer();
  const { modulFreigaben } = useMandant();
  const label = MODUL_GRUPPEN.find((eintrag) => eintrag.id === gruppe)?.label ?? '';
  return (
    <Popover anchor={anker} open onClose={onClose} placement="right-start" abstand={4} label={label}>
      <div className={styles.flyout} onPointerEnter={onEnter} onPointerLeave={onClose}>
        <span className={styles.flyoutTitel}>{label}</span>
        {MODULE.filter((modul) => modul.gruppe === gruppe).map((modul) => {
          const freigabe = pruefeFreigabe(modul, benutzer?.rolle ?? null, modulFreigaben);
          const Icon = modul.icon;
          if (!freigabe.ok) {
            return (
              <button
                key={modul.id}
                type="button"
                className={cx(styles.flyoutEintrag, styles.gesperrt)}
                aria-disabled="true"
                onClick={(event) => onGesperrt({ modul, grund: freigabe.grund, anker: event.currentTarget })}
              >
                <Icon size={16} strokeWidth={1.5} aria-hidden />
                <Lock size={12} strokeWidth={1.5} aria-hidden className={styles.schloss} />
                <span>{modul.label}</span>
                {modul.version && <span className={styles.version}>{modul.version}</span>}
              </button>
            );
          }
          return (
            <NavLink key={modul.id} to={modul.pfad} className={({ isActive }) => cx(styles.flyoutEintrag, isActive && styles.aktiv)} onClick={onClose}>
              <Icon size={16} strokeWidth={1.5} aria-hidden />
              <span>{modul.label}</span>
            </NavLink>
          );
        })}
      </div>
    </Popover>
  );
}

// ── §4 · Seitenleiste ────────────────────────────────────────────

interface SidebarProps {
  eingeklappt: boolean;
  onToggle: () => void;
  onHilfe: () => void;
  onAbmelden: () => void;
}

export function Sidebar({ eingeklappt, onToggle, onHilfe, onAbmelden }: SidebarProps) {
  const { gruppenZu } = useSidebarState();
  const [sperre, setSperre] = useState<SperrInfo | null>(null);
  const [flyout, setFlyout] = useState<{ gruppe: ModulGruppe; anker: HTMLElement } | null>(null);
  const flyoutTimer = useRef<number | null>(null);

  // jh› Flyout schliesst mit 120 ms Verzögerung – genug, um vom Icon ins Flyout zu fahren.
  const onHover = useCallback(
    (gruppe: ModulGruppe | null, anker: HTMLElement | null) => {
      if (!eingeklappt) return;
      if (flyoutTimer.current !== null) window.clearTimeout(flyoutTimer.current);
      if (gruppe && anker) {
        setFlyout({ gruppe, anker });
        return;
      }
      flyoutTimer.current = window.setTimeout(() => setFlyout(null), 120);
    },
    [eingeklappt],
  );

  const flyoutHalten = useCallback(() => {
    if (flyoutTimer.current !== null) window.clearTimeout(flyoutTimer.current);
  }, []);

  const buildStempel = `Build ${__SL_BUILD_DATUM__} · Commit ${__SL_COMMIT__}`;

  return (
    <nav className={cx(styles.sidebar, eingeklappt && styles.eingeklappt)} aria-label="Module">
      <div className={styles.kopf}>
        <button
          type="button"
          className={styles.toggle}
          onClick={onToggle}
          aria-label={eingeklappt ? 'Seitenleiste ausklappen ([)' : 'Seitenleiste einklappen ([)'}
          title={eingeklappt ? 'Ausklappen  [' : 'Einklappen  ['}
        >
          {eingeklappt ? <PanelLeftOpen size={20} strokeWidth={1.5} aria-hidden /> : <PanelLeftClose size={20} strokeWidth={1.5} aria-hidden />}
          <span className={styles.label}>Navigation</span>
        </button>
      </div>

      <div className={styles.gruppen}>
        {MODUL_GRUPPEN.map((gruppe) => {
          const zu = !eingeklappt && gruppenZu.includes(gruppe.id);
          const module = MODULE.filter((modul) => modul.gruppe === gruppe.id);
          return (
            <section key={gruppe.id} className={styles.gruppe} aria-label={gruppe.label}>
              <button
                type="button"
                className={styles.gruppenKopf}
                onClick={() => toggleSidebarGruppe(gruppe.id)}
                aria-expanded={!zu}
                tabIndex={eingeklappt ? -1 : 0}
              >
                <span className={styles.gruppenLabel}>{gruppe.label}</span>
                <ChevronDown size={16} strokeWidth={1.5} aria-hidden className={cx(styles.chevron, zu && styles.chevronZu)} />
              </button>
              {!zu && (
                <ul className={styles.liste}>
                  {module.map((modul) => (
                    <li key={modul.id}>
                      <Eintrag modul={modul} eingeklappt={eingeklappt} onGesperrt={setSperre} onHover={onHover} />
                    </li>
                  ))}
                </ul>
              )}
              {gruppe.id === 'disposition' && !eingeklappt && !zu && <MiniKalender />}
            </section>
          );
        })}
      </div>

      <div className={styles.fuss}>
        <button type="button" className={styles.eintrag} onClick={onHilfe} title={eingeklappt ? 'Hilfe & Tastaturkürzel (?)' : undefined}>
          <CircleQuestionMark size={20} strokeWidth={1.5} aria-hidden className={styles.icon} />
          <span className={styles.label}>Hilfe</span>
        </button>
        <button type="button" className={styles.eintrag} onClick={onAbmelden} title={eingeklappt ? 'Abmelden' : undefined}>
          <LogOut size={20} strokeWidth={1.5} aria-hidden className={styles.icon} />
          <span className={styles.label}>Abmelden</span>
        </button>
        <p className={styles.version} title={buildStempel}>
          <span className={styles.versionKurz}>v{__SL_VERSION__}</span>
          <span className={styles.label}> · ◆ JH</span>
        </p>
      </div>

      <Popover anchor={sperre?.anker ?? null} open={sperre !== null} onClose={() => setSperre(null)} placement="right-start" breite={280} label="Modul gesperrt">
        {sperre && (
          <div className={styles.sperrHinweis}>
            <Lock size={16} strokeWidth={1.5} aria-hidden />
            <div>
              <p>{sperrText(sperre)}</p>
              <p className={styles.sperrBeschreibung}>{sperre.modul.beschreibung}</p>
            </div>
          </div>
        )}
      </Popover>

      {eingeklappt && flyout && !sperre && (
        <Flyout gruppe={flyout.gruppe} anker={flyout.anker} onClose={() => setFlyout(null)} onEnter={flyoutHalten} onGesperrt={setSperre} />
      )}
    </nav>
  );
}

/* ◆ jh · eof */
