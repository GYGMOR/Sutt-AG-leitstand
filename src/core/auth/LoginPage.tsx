/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/LoginPage.tsx                            │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Anmeldeseite (Mock): Benutzername, Passwort, Rolle, Rollen-Weiche     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Button, IconButton } from '../ui/Button';
import { Auswahl, Eingabe, Feld, Schalter } from '../ui/Form';
import { Kbd } from '../ui/Kbd';
import { AuthLayout } from './AuthLayout';
import { ROLLEN, ROLLE_LABEL } from './auth.types';
import type { Rolle } from './auth.types';
import { anmelden, listBenutzer, useSitzung } from './authStore';
import type { LoginZustand } from './RequireAuth';
import styles from './LoginPage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

const STANDARD_ZIEL = '/dispo/plantafel';
const DASHBOARD_ZIEL = '/dashboard';
const APP_ZIEL = '/app';

// jh› Aussendienst landet auf dem Handy-Plan, die Disposition in der Plantafel, Büro und
//     Administration im Tagesüberblick – ausser jemand kam von einer bestimmten Seite.
function zielFuer(rolle: Rolle, von: string | undefined): string {
  if (von && von !== STANDARD_ZIEL && von !== DASHBOARD_ZIEL && von !== '/') return von;
  if (rolle === 'aussendienst') return APP_ZIEL;
  if (rolle === 'disposition') return STANDARD_ZIEL;
  return DASHBOARD_ZIEL;
}

export function LoginPage() {
  const sitzung = useSitzung();
  const navigate = useNavigate();
  const location = useLocation();
  const von = (location.state as LoginZustand | null)?.von;

  const [benutzername, setBenutzername] = useState('');
  const [passwort, setPasswort] = useState('');
  const [zeigePasswort, setZeigePasswort] = useState(false);
  const [rolle, setRolle] = useState<Rolle | ''>('');
  const [bleibt, setBleibt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [vergessen, setVergessen] = useState(false);

  if (sitzung) return <Navigate to={zielFuer(sitzung.benutzer.rolle, von)} replace />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    // jh! Das Passwort verlässt dieses Formular nie – Mock ohne Prüfung.
    const ergebnis = anmelden({ benutzername, rolle: rolle || undefined, bleibtAngemeldet: bleibt });
    if (!ergebnis.ok) {
      setFehler(ergebnis.fehler);
      return;
    }
    navigate(zielFuer(ergebnis.sitzung.benutzer.rolle, von), { replace: true });
  }

  return (
    <AuthLayout>
      <form className={styles.formular} onSubmit={onSubmit} noValidate>
        <h1 className={styles.titel}>Anmelden</h1>
        <p className={styles.untertitel}>Leitstand der Sutt AG · Zugang für Büro, Disposition und Aussendienst</p>

        <Feld
          label="Benutzername"
          fehler={fehler ?? undefined}
          render={(id) => (
            <Eingabe
              id={id}
              value={benutzername}
              autoComplete="username"
              autoFocus
              spellCheck={false}
              onChange={(event) => {
                setBenutzername(event.target.value);
                setFehler(null);
              }}
            />
          )}
        />

        <Feld
          label="Passwort"
          render={(id) => (
            <Eingabe
              id={id}
              type={zeigePasswort ? 'text' : 'password'}
              value={passwort}
              autoComplete="current-password"
              onChange={(event) => setPasswort(event.target.value)}
              nachsatz={
                <IconButton
                  icon={zeigePasswort ? EyeOff : Eye}
                  label={zeigePasswort ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  size="sm"
                  onClick={() => setZeigePasswort((wert) => !wert)}
                />
              }
            />
          )}
        />

        <Feld
          label="Rolle (Demo)"
          hinweis="Steuert, welche Module sichtbar oder gesperrt sind. Leer = Rolle des Benutzers."
          render={(id) => (
            <Auswahl id={id} value={rolle} onChange={(event) => setRolle(event.target.value as Rolle | '')}>
              <option value="">Rolle des Benutzers</option>
              {ROLLEN.map((wert) => (
                <option key={wert} value={wert}>
                  {ROLLE_LABEL[wert]}
                </option>
              ))}
            </Auswahl>
          )}
        />

        <div className={styles.zeile}>
          <Schalter checked={bleibt} onChange={setBleibt}>
            Angemeldet bleiben
          </Schalter>
          <button type="button" className={styles.link} onClick={() => setVergessen((wert) => !wert)}>
            Passwort vergessen?
          </button>
        </div>
        {vergessen && (
          <p className={styles.hinweis}>
            Mockup: Passwörter werden hier nicht geprüft. Im Produkt setzt die Administration das Passwort zurück
            und schickt einen Link per SMS.
          </p>
        )}

        <Button type="submit" variant="primary" icon={LogIn} className={styles.absenden}>
          Anmelden
        </Button>

        <section className={styles.demo} aria-label="Demo-Zugänge">
          <h2 className={styles.demoTitel}>Demo-Zugänge</h2>
          <ul className={styles.demoListe}>
            {listBenutzer().map((benutzer) => (
              <li key={benutzer.id}>
                <button
                  type="button"
                  className={styles.demoEintrag}
                  onClick={() => {
                    setBenutzername(benutzer.benutzername);
                    setFehler(null);
                  }}
                >
                  <Kbd keys={[benutzer.benutzername]} />
                  <span className={styles.demoName}>
                    {benutzer.vorname} {benutzer.nachname}
                  </span>
                  <span className={styles.demoRolle}>{ROLLE_LABEL[benutzer.rolle]}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.hinweis}>Beliebiges Passwort – es wird nicht geprüft.</p>
        </section>
      </form>
    </AuthLayout>
  );
}

/* ◆ jh · eof */
