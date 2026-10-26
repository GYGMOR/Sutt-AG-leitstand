/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/AnmeldenSeite.tsx                       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Anmelden am Handy: Geschäftskonto (SSO), lokal (Mock), Demo-Zugänge   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ROLLE_LABEL } from '@sl/core/auth/auth.types';
import { anmelden, listBenutzer, useSitzung } from '@sl/core/auth/authStore';
import { ANBIETER, ANBIETER_INFO } from '@sl/core/auth/identitaet';
import type { IdentitaetsAnbieter } from '@sl/core/auth/identitaet';
import { IdentitaetDialog } from '@sl/core/auth/IdentitaetDialog';
import { useMandant } from '@sl/core/mandant/mandantStore';
import { Button } from '@sl/core/ui/Button';
import { Eingabe, Feld, Schalter } from '@sl/core/ui/Form';
import { cx } from '@sl/core/ui/cx';
import type { AnmeldeZustand } from '../rahmen/Geschuetzt';
import styles from './AnmeldenSeite.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

export function AnmeldenSeite() {
  const sitzung = useSitzung();
  const navigate = useNavigate();
  const location = useLocation();
  const mandant = useMandant();
  const von = (location.state as AnmeldeZustand | null)?.von;
  const ziel = von && von !== '/anmelden' ? von : '/';

  const [benutzername, setBenutzername] = useState('');
  const [passwort, setPasswort] = useState('');
  const [bleibt, setBleibt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [anbieterDialog, setAnbieterDialog] = useState<IdentitaetsAnbieter | null>(null);

  if (sitzung) return <Navigate to={ziel} replace />;

  const aktiveAnbieter = ANBIETER.filter((anbieter) => mandant.anbieter[anbieter].aktiv);
  const lokalErlaubt = !mandant.nurSso || aktiveAnbieter.length === 0;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!lokalErlaubt) return;
    // jh! Mock: Das Passwort wird nicht geprüft und verlässt das Formular nie.
    const ergebnis = anmelden({ benutzername, bleibtAngemeldet: bleibt });
    if (!ergebnis.ok) {
      setFehler(ergebnis.fehler);
      return;
    }
    navigate(ziel, { replace: true });
  }

  return (
    <div className={styles.seite}>
      <form className={styles.karte} onSubmit={onSubmit} noValidate>
        <header className={styles.kopf}>
          <span className={styles.raute} aria-hidden />
          <span className={styles.marke}>SUTT</span>
          <span className={styles.markeApp}>App</span>
        </header>
        <h1 className={styles.titel}>Anmelden</h1>
        <p className={styles.untertitel}>Techniker-App der {mandant.firma} – Einsätze, Tour, Zeit, Fotos, Fahrzeug</p>

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
                  autoCapitalize="none"
                  spellCheck={false}
                  onChange={(event) => {
                    setBenutzername(event.target.value);
                    setFehler(null);
                  }}
                />
              )}
            />
            <Feld label="Passwort" render={(id) => <Eingabe id={id} type="password" value={passwort} autoComplete="current-password" onChange={(event) => setPasswort(event.target.value)} />} />
            <Schalter checked={bleibt} onChange={setBleibt}>
              Angemeldet bleiben
            </Schalter>
            <Button type="submit" variant="primary" size="md" icon={LogIn} className={styles.absenden}>
              Anmelden
            </Button>
            <section className={styles.demo} aria-label="Demo-Zugänge">
              <h2 className={styles.demoTitel}>Demo-Zugänge · beliebiges Passwort</h2>
              <div className={styles.demoChips}>
                {listBenutzer().map((benutzer) => (
                  <button
                    key={benutzer.id}
                    type="button"
                    className={cx(styles.demoChip, benutzer.rolle === 'aussendienst' && styles.demoChipFeld)}
                    onClick={() => {
                      setBenutzername(benutzer.benutzername);
                      setFehler(null);
                    }}
                  >
                    <strong>{benutzer.benutzername}</strong> {benutzer.vorname} {benutzer.nachname.charAt(0)}. · {ROLLE_LABEL[benutzer.rolle]}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <p className={styles.hinweis}>Die lokale Anmeldung ist abgeschaltet – bitte das Geschäftskonto verwenden.</p>
        )}
      </form>

      <IdentitaetDialog anbieter={anbieterDialog} bleibtAngemeldet={bleibt} onClose={() => setAnbieterDialog(null)} onAngemeldet={() => navigate(ziel, { replace: true })} />
    </div>
  );
}

/* ◆ jh · eof */
