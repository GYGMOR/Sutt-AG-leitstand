/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/ProfilSeite.tsx                         │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Profil: Konto, Techniker, Darstellung, Installieren, Daten, Abmelden  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useState } from 'react';
import { Download, LogOut, Monitor, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ROLLE_LABEL } from '@sl/core/auth/auth.types';
import { abmelden } from '@sl/core/auth/authStore';
import { ANBIETER_INFO } from '@sl/core/auth/identitaet';
import { FUNKTION_LABEL } from '@sl/core/domain/personal';
import { fullName } from '@sl/core/domain/stammdaten';
import { formatDatum } from '@sl/core/format';
import { useTheme } from '@sl/core/theme';
import { leitstandPfad } from '@sl/core/urls';
import { Avatar } from '@sl/core/ui/Avatar';
import { Button } from '@sl/core/ui/Button';
import { CapsLabel } from '@sl/core/ui/CapsLabel';
import { Auswahl } from '@sl/core/ui/Form';
import styles from '../bausteine/Seiten.module.css';
import { useApp } from '../rahmen/AppKontext';
import werkzeuge from './Werkzeuge.module.css';

// ── §1 · Installieren (Browser-API) ──────────────────────────────

interface InstallAufforderung extends Event {
  prompt(): Promise<void>;
}

function useInstallAufforderung(): InstallAufforderung | null {
  const [aufforderung, setAufforderung] = useState<InstallAufforderung | null>(null);
  useEffect(() => {
    const merken = (event: Event) => {
      event.preventDefault();
      setAufforderung(event as InstallAufforderung);
    };
    window.addEventListener('beforeinstallprompt', merken);
    return () => window.removeEventListener('beforeinstallprompt', merken);
  }, []);
  return aufforderung;
}

// ── §2 · Komponente ──────────────────────────────────────────────

export function ProfilSeite() {
  const { techniker, mitarbeiter, rechte, state, mandant, zone } = useApp();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const installieren = useInstallAufforderung();
  const konto = rechte.benutzer;
  const innendienst = konto?.rolle !== 'aussendienst';

  return (
    <div className={styles.seite}>
      <header className={styles.seitentitel}>
        <h1>Profil</h1>
        <span>v{__SL_VERSION__}</span>
      </header>

      <div className={styles.zweispaltig}>
        <div className={styles.spalte}>
          <section className={styles.abschnitt}>
            <div className={werkzeuge.profilKopf}>
              {techniker && <Avatar techniker={techniker} size="lg" />}
              <div className={werkzeuge.profilName}>
                <strong>{mitarbeiter ? `${mitarbeiter.vorname} ${mitarbeiter.nachname}` : konto ? `${konto.vorname} ${konto.nachname}` : ''}</strong>
                <span>{mitarbeiter ? `${FUNKTION_LABEL[mitarbeiter.funktion]} · ${mitarbeiter.pensum} %` : konto ? ROLLE_LABEL[konto.rolle] : ''}</span>
              </div>
            </div>
            <dl className={werkzeuge.fakten}>
              {konto && (
                <>
                  <dt>Konto</dt>
                  <dd className={styles.mono}>@{konto.benutzername}</dd>
                  <dt>Rolle</dt>
                  <dd>{ROLLE_LABEL[konto.rolle]}</dd>
                  <dt>Anmeldung</dt>
                  <dd>{konto.sso ? `${ANBIETER_INFO[konto.sso.anbieter].label}${konto.mfa ? ' · MFA' : ''}` : 'lokal (Benutzername)'}</dd>
                </>
              )}
              {techniker && (
                <>
                  <dt>Fahrzeug</dt>
                  <dd>
                    {techniker.fahrzeug} · {fullName(techniker)}
                  </dd>
                  <dt>Region</dt>
                  <dd>{techniker.region}</dd>
                </>
              )}
              {mitarbeiter && (
                <>
                  <dt>Eintritt</dt>
                  <dd className={styles.mono}>{formatDatum(mitarbeiter.eintritt)}</dd>
                </>
              )}
              <dt>Zeitzone</dt>
              <dd className={styles.mono}>{zone}</dd>
              <dt>Betrieb</dt>
              <dd>{mandant.firma}</dd>
            </dl>
          </section>

          {innendienst && (
            <section className={styles.abschnitt}>
              <CapsLabel as="h3">Als Techniker ansehen (Demo)</CapsLabel>
              <label className={werkzeuge.auswahl}>
                <span>Der Innendienst sieht den Plan eines Technikers – Stempeluhr und Absenzen bleiben die eigenen.</span>
                <Auswahl value={techniker?.id ?? ''} onChange={(event) => navigate({ pathname: '/', search: event.target.value ? `?als=${encodeURIComponent(event.target.value)}` : '' })}>
                  {state.stammdaten.techniker.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.kuerzel} · {fullName(person)}
                    </option>
                  ))}
                </Auswahl>
              </label>
            </section>
          )}
        </div>

        <div className={styles.spalte}>
          <section className={styles.abschnitt}>
            <CapsLabel as="h3">Darstellung & Gerät</CapsLabel>
            <div className={styles.aktionen}>
              <Button variant="secondary" size="md" icon={theme === 'dark' ? Sun : Moon} onClick={toggleTheme}>
                {theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              </Button>
              {installieren && (
                <Button variant="primary" size="md" icon={Download} onClick={() => void installieren.prompt()}>
                  Auf dem Startbildschirm installieren
                </Button>
              )}
            </div>
            {!installieren && <p className={styles.quelle}>Installieren: im Browser-Menü «Zum Startbildschirm hinzufügen» – die App öffnet dann ohne Adresszeile.</p>}
          </section>

          <section className={styles.abschnitt}>
            <CapsLabel as="h3">Daten & Datenschutz</CapsLabel>
            <p className={styles.quelle}>Was gespeichert ist, wer es ansieht und wie lange – unter «Meine Daten» im Leitstand (gleiche Anmeldung).</p>
            <div className={styles.aktionen}>
              <Button variant="secondary" size="md" icon={ShieldCheck} onClick={() => window.open(leitstandPfad('meine-daten'), '_blank', 'noopener')}>
                Meine Daten
              </Button>
              {innendienst && (
                <Button variant="ghost" size="md" icon={Monitor} onClick={() => window.open(leitstandPfad('dashboard'), '_blank', 'noopener')}>
                  Leitstand
                </Button>
              )}
            </div>
          </section>

          <section className={styles.abschnitt}>
            <div className={styles.aktionen}>
              <Button
                variant="danger"
                size="md"
                icon={LogOut}
                onClick={() => {
                  abmelden();
                  navigate('/anmelden');
                }}
              >
                Abmelden
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ◆ jh · eof */
