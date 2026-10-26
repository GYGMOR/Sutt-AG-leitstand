/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/LoginPage.tsx                            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Anmeldeseite: Microsoft/Google (SSO), lokal (Mock), Rollen-Weiche     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import type { NavigateFunction } from 'react-router';
import { useMandant } from '../mandant/mandantStore';
import { Button, IconButton } from '../ui/Button';
import { Auswahl, Eingabe, Feld, Schalter } from '../ui/Form';
import { Kbd } from '../ui/Kbd';
import { cx } from '../ui/cx';
import { AuthLayout } from './AuthLayout';
import { ROLLEN, ROLLE_LABEL } from './auth.types';
import type { Rolle } from './auth.types';
import { anmelden, listBenutzer, useSitzung } from './authStore';
import { ANBIETER, ANBIETER_INFO } from './identitaet';
import type { IdentitaetsAnbieter } from './identitaet';
import { IdentitaetDialog } from './IdentitaetDialog';
import type { LoginZustand } from './RequireAuth';
import styles from './LoginPage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

const STANDARD_ZIEL = '/dispo/plantafel';
const DASHBOARD_ZIEL = '/dashboard';
const APP_ZIEL = '/app/';

// jh› Aussendienst landet in der Techniker-App, die Disposition in der Plantafel, Büro und
//     Administration im Tagesüberblick – ausser jemand kam von einer bestimmten Seite.
function zielFuer(rolle: Rolle, von: string | undefined): string {
  if (von && von !== STANDARD_ZIEL && von !== DASHBOARD_ZIEL && von !== '/') return von;
  if (rolle === 'aussendienst') return APP_ZIEL;
  if (rolle === 'disposition') return STANDARD_ZIEL;
  return DASHBOARD_ZIEL;
}

// jh› Die App ist eine eigene Auslieferung unter /app/ (ADR-008): Vollseiten-Sprung statt Router –
//     Sitzung und Stand teilt sie über dieselbe Origin.
function springe(ziel: string, navigate: NavigateFunction): void {
  if (ziel === APP_ZIEL) window.location.assign(APP_ZIEL);
  else navigate(ziel, { replace: true });
}

export function LoginPage() {
  const sitzung = useSitzung();
  const navigate = useNavigate();
  const location = useLocation();
  const mandant = useMandant();
  const von = (location.state as LoginZustand | null)?.von;

  const [benutzername, setBenutzername] = useState('');
  const [passwort, setPasswort] = useState('');
  const [zeigePasswort, setZeigePasswort] = useState(false);
  const [rolle, setRolle] = useState<Rolle | ''>('');
  const [bleibt, setBleibt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [vergessen, setVergessen] = useState(false);
  const [anbieterDialog, setAnbieterDialog] = useState<IdentitaetsAnbieter | null>(null);

  const ziel = sitzung ? zielFuer(sitzung.benutzer.rolle, von) : null;
  useEffect(() => {
    if (ziel === APP_ZIEL) window.location.assign(APP_ZIEL);
  }, [ziel]);

  if (ziel) return ziel === APP_ZIEL ? null : <Navigate to={ziel} replace />;

  // jh› Welche Anbieter die Administration unter Einstellungen → Anmeldung aktiviert hat; «nur SSO» blendet
  //     die lokale Anmeldung aus – das Produkt kennt dann kein Passwort mehr.
  const aktiveAnbieter = ANBIETER.filter((anbieter) => mandant.anbieter[anbieter].aktiv);
  const lokalErlaubt = !mandant.nurSso || aktiveAnbieter.length === 0;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!lokalErlaubt) return;
    // jh! Das Passwort verlässt dieses Formular nie – Mock ohne Prüfung.
    const ergebnis = anmelden({ benutzername, rolle: rolle || undefined, bleibtAngemeldet: bleibt });
    if (!ergebnis.ok) {
      setFehler(ergebnis.fehler);
      return;
    }
    springe(zielFuer(ergebnis.sitzung.benutzer.rolle, von), navigate);
  }

  return (
    <AuthLayout>
      <form className={styles.formular} onSubmit={onSubmit} noValidate>
        <h1 className={styles.titel}>Anmelden</h1>
        <p className={styles.untertitel}>Leitstand der {mandant.firma} · Zugang für Büro, Disposition und Aussendienst</p>

        {aktiveAnbieter.length > 0 && (
          <div className={styles.anbieter} role="group" aria-label="Anmeldung mit Geschäftskonto">
            {aktiveAnbieter.map((anbieter) => (
              <button key={anbieter} type="button" className={styles.anbieterKnopf} onClick={() => setAnbieterDialog(anbieter)}>
                <span className={cx(styles.anbieterMarke, anbieter === 'google' && styles.google)} aria-hidden>
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                Mit {ANBIETER_INFO[anbieter].kurz}-Konto anmelden
              </button>
            ))}
            <p className={styles.hinweis}>Geschäftskonto der {mandant.firma} – Mehrfaktor-Prüfung beim Anbieter, kein Passwort im Leitstand.</p>
          </div>
        )}

        {aktiveAnbieter.length > 0 && lokalErlaubt && <p className={styles.trenner}>oder lokal</p>}

        {lokalErlaubt ? (
          <>
            <Feld
              label="Benutzername"
              fehler={fehler ?? undefined}
              render={(id) => (
                <Eingabe
                  id={id}
                  value={benutzername}
                  autoComplete="username"
                  autoFocus={aktiveAnbieter.length === 0}
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
          </>
        ) : (
          <p className={styles.hinweis}>Die lokale Anmeldung ist abgeschaltet – bitte das Geschäftskonto verwenden. Bei Problemen hilft die Administration.</p>
        )}

        <div className={styles.zeile}>
          <Schalter checked={bleibt} onChange={setBleibt}>
            Angemeldet bleiben
          </Schalter>
          {lokalErlaubt && (
            <button type="button" className={styles.link} onClick={() => setVergessen((wert) => !wert)}>
              Passwort vergessen?
            </button>
          )}
        </div>
        {vergessen && lokalErlaubt && (
          <p className={styles.hinweis}>
            Mockup: Passwörter werden hier nicht geprüft. Im Produkt setzt die Administration das Passwort zurück
            und schickt einen Link per SMS – oder der Betrieb stellt ganz auf das Geschäftskonto um.
          </p>
        )}

        {lokalErlaubt && (
          <Button type="submit" variant="primary" icon={LogIn} className={styles.absenden}>
            Anmelden
          </Button>
        )}

        {lokalErlaubt && (
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
        )}
      </form>

      <IdentitaetDialog anbieter={anbieterDialog} bleibtAngemeldet={bleibt} onClose={() => setAnbieterDialog(null)} onAngemeldet={(neu) => springe(zielFuer(neu.benutzer.rolle, von), navigate)} />
    </AuthLayout>
  );
}

/* ◆ jh · eof */
