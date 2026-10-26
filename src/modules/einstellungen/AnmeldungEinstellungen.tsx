/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/einstellungen/AnmeldungEinstellungen.tsx   │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Anmeldung: Microsoft Entra ID und Google Workspace (OIDC), nur SSO    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { CheckCircle2, Plug, Plus, Save, Trash2 } from 'lucide-react';
import { ROLLEN, ROLLE_LABEL } from '../../core/auth/auth.types';
import type { Rolle } from '../../core/auth/auth.types';
import { ANBIETER, ANBIETER_INFO, redirectUri } from '../../core/auth/identitaet';
import type { AnbieterKonfiguration, GruppenZuordnung, IdentitaetsAnbieter } from '../../core/auth/identitaet';
import { nowZeitpunkt } from '../../core/datum';
import { formatZeitpunktKurz } from '../../core/format';
import { Button, IconButton } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { Auswahl, Eingabe, Feld, Schalter } from '../../core/ui/Form';
import type { DispoAktionen } from '../dispo/store/useDispoAktionen';
import type { EinstellungProps } from './EinstellungenPage';
import { anbieterPruefen } from './einstellungen.model';
import styles from './Einstellungen.module.css';

// ── §1 · Anbieter-Karte ──────────────────────────────────────────

interface AnbieterKarteProps {
  konfig: AnbieterKonfiguration;
  darf: boolean;
  onSpeichern: (konfig: AnbieterKonfiguration, text: string) => void;
  onTesten: (konfig: AnbieterKonfiguration) => void;
}

// jh› Der Leitstand kennt keine Passwörter: Das Produkt holt ein ID-Token per OIDC (PKCE) vom Anbieter des
//     Mandanten, liest E-Mail, Name und Gruppen und ordnet die Rolle zu. Was hier steht, ist dieselbe
//     Konfiguration, die der echte Anbieter später braucht (ADR-006).
function AnbieterKarte({ konfig: start, darf, onSpeichern, onTesten }: AnbieterKarteProps) {
  const [konfig, setKonfig] = useState(start);
  const [gruppe, setGruppe] = useState('');
  const [rolle, setRolle] = useState<Rolle>('aussendienst');
  const info = ANBIETER_INFO[konfig.anbieter];
  const fehler = useMemo(() => anbieterPruefen(konfig), [konfig]);
  const geaendert = JSON.stringify(konfig) !== JSON.stringify(start);
  const origin = typeof window === 'undefined' ? 'https://leitstand.sutt.example' : window.location.origin;

  const setzen = (aenderung: Partial<AnbieterKonfiguration>) => setKonfig((alt) => ({ ...alt, ...aenderung }));
  const zuordnungHinzufuegen = () => {
    if (gruppe.trim() === '') return;
    const neu: GruppenZuordnung = { gruppe: gruppe.trim(), rolle };
    setzen({ gruppenZuordnung: [...konfig.gruppenZuordnung.filter((eintrag) => eintrag.gruppe !== neu.gruppe), neu] });
    setGruppe('');
  };

  return (
    <section className={styles.karte} aria-label={info.label}>
      <header className={styles.karteKopf}>
        <h2 className={styles.modulName}>{info.label}</h2>
        <div className={styles.aktionen}>
          {konfig.verifiziertAm ? (
            <Chip tone="ok" icon={CheckCircle2}>
              verbunden · {formatZeitpunktKurz(konfig.verifiziertAm)}
            </Chip>
          ) : (
            <Chip tone="mute">nicht geprüft</Chip>
          )}
          <Schalter checked={konfig.aktiv} onChange={(aktiv) => darf && setzen({ aktiv })}>
            Anmeldung über {info.kurz} erlauben
          </Schalter>
        </div>
      </header>
      <div className={styles.formular}>
        <Feld label={info.mandantFeld} render={(id) => <Eingabe id={id} value={konfig.mandantId} mono disabled={!darf} spellCheck={false} onChange={(event) => setzen({ mandantId: event.target.value })} />} />
        <Feld label="Client-ID (Anwendungs-ID)" render={(id) => <Eingabe id={id} value={konfig.clientId} mono disabled={!darf} spellCheck={false} onChange={(event) => setzen({ clientId: event.target.value })} />} />
        <Feld label="Zugelassene E-Mail-Domain" hinweis="Nur Konten dieser Domain dürfen sich anmelden – private Konten werden abgewiesen." render={(id) => <Eingabe id={id} value={konfig.domaene} mono disabled={!darf} spellCheck={false} onChange={(event) => setzen({ domaene: event.target.value })} />} />
        <Feld
          label="Standardrolle ohne Gruppentreffer"
          render={(id) => (
            <Auswahl id={id} value={konfig.standardRolle} disabled={!darf} onChange={(event) => setzen({ standardRolle: event.target.value as Rolle })}>
              {ROLLEN.map((wert) => (
                <option key={wert} value={wert}>
                  {ROLLE_LABEL[wert]}
                </option>
              ))}
            </Auswahl>
          )}
        />
        <Feld label="Umleitungs-URI (im Portal eintragen)" className={styles.formularBreit} render={(id) => <Eingabe id={id} value={redirectUri(konfig.anbieter, origin)} mono readOnly />} />
        <div className={styles.formularBreit}>
          <Schalter checked={konfig.jitAnlegen} onChange={(jitAnlegen) => darf && setzen({ jitAnlegen })}>
            Konto beim ersten Anmelden automatisch anlegen (Just-in-time) – sonst legt die Administration es vorher an
          </Schalter>
        </div>
      </div>

      <h3 className={styles.fussnote}>Gruppen → Rolle · {info.gruppenHinweis}</h3>
      <div className={styles.formular}>
        {konfig.gruppenZuordnung.map((eintrag) => (
          <div key={eintrag.gruppe} className={styles.zuordnung}>
            <span className={styles.mono}>{eintrag.gruppe}</span>
            <Auswahl value={eintrag.rolle} disabled={!darf} onChange={(event) => setzen({ gruppenZuordnung: konfig.gruppenZuordnung.map((kandidat) => (kandidat.gruppe === eintrag.gruppe ? { ...kandidat, rolle: event.target.value as Rolle } : kandidat)) })}>
              {ROLLEN.map((wert) => (
                <option key={wert} value={wert}>
                  {ROLLE_LABEL[wert]}
                </option>
              ))}
            </Auswahl>
            {darf ? <IconButton icon={Trash2} label={`Zuordnung ${eintrag.gruppe} entfernen`} size="sm" tone="danger" onClick={() => setzen({ gruppenZuordnung: konfig.gruppenZuordnung.filter((kandidat) => kandidat.gruppe !== eintrag.gruppe) })} /> : <span />}
          </div>
        ))}
        {darf && (
          <div className={styles.zuordnung}>
            <Eingabe value={gruppe} placeholder={konfig.anbieter === 'microsoft' ? 'SG-Lehrlinge' : 'lehrlinge@sutt.example'} mono spellCheck={false} onChange={(event) => setGruppe(event.target.value)} />
            <Auswahl value={rolle} onChange={(event) => setRolle(event.target.value as Rolle)}>
              {ROLLEN.map((wert) => (
                <option key={wert} value={wert}>
                  {ROLLE_LABEL[wert]}
                </option>
              ))}
            </Auswahl>
            <IconButton icon={Plus} label="Zuordnung hinzufügen" size="sm" onClick={zuordnungHinzufuegen} />
          </div>
        )}
      </div>

      <details>
        <summary className={styles.fussnote}>Einrichtung im Portal: {info.portal}</summary>
        <ol className={styles.schritte}>
          {info.schritte.map((schritt) => (
            <li key={schritt}>{schritt}</li>
          ))}
        </ol>
      </details>

      {fehler && konfig.aktiv && <p className={styles.fehler}>{fehler}</p>}
      <div className={styles.aktionen}>
        <Button variant="primary" size="sm" icon={Save} disabled={!darf || !geaendert || (konfig.aktiv && fehler !== null)} onClick={() => onSpeichern(konfig, `${info.label}: ${konfig.aktiv ? 'aktiv' : 'inaktiv'}, Domain ${konfig.domaene}, ${konfig.gruppenZuordnung.length} Gruppenzuordnungen, JIT ${konfig.jitAnlegen ? 'ein' : 'aus'}`)}>
          Speichern
        </Button>
        <Button variant="secondary" size="sm" icon={Plug} disabled={!darf || fehler !== null} onClick={() => onTesten(konfig)}>
          Verbindung testen (Mock)
        </Button>
        {geaendert && <span className={styles.fussnote}>nicht gespeichert</span>}
      </div>
    </section>
  );
}

// ── §2 · Bereich ─────────────────────────────────────────────────

interface AnmeldungProps extends EinstellungProps {
  aktionen: DispoAktionen;
}

export function AnmeldungEinstellungen({ mandant, darf, speichern, aktionen }: AnmeldungProps) {
  const einAnbieterAktiv = ANBIETER.some((anbieter) => mandant.anbieter[anbieter].aktiv);

  const anbieterSpeichern = (konfig: AnbieterKonfiguration, text: string) => {
    const anbieter = { ...mandant.anbieter, [konfig.anbieter]: konfig };
    const nurSso = mandant.nurSso && ANBIETER.some((kandidat) => anbieter[kandidat].aktiv);
    speichern({ anbieter, nurSso }, text);
  };

  const testen = (konfig: AnbieterKonfiguration) => {
    const geprueft: AnbieterKonfiguration = { ...konfig, verifiziertAm: nowZeitpunkt() };
    speichern({ anbieter: { ...mandant.anbieter, [konfig.anbieter]: geprueft } }, `${ANBIETER_INFO[konfig.anbieter].label}: Verbindung geprüft (Mock – Discovery-Dokument, Schlüssel, Umleitungs-URI)`);
    aktionen.protokolliere({ bereich: 'anmeldung', art: 'system', text: `Verbindungstest ${ANBIETER_INFO[konfig.anbieter].label} erfolgreich (Mock)` });
  };

  return (
    <>
      <section className={styles.karte} aria-label="Grundsatz">
        <p className={styles.karteText}>
          Mitarbeitende melden sich mit dem Geschäftskonto an (Single Sign-on über OpenID Connect). Der Leitstand speichert kein Passwort; Mehrfaktor-Prüfung und Sperren laufen beim Anbieter. Gruppen des Anbieters bestimmen die Rolle, die Administration kann sie je Konto anpassen.
        </p>
        <Schalter checked={mandant.nurSso} onChange={(nurSso) => darf && einAnbieterAktiv && speichern({ nurSso }, nurSso ? 'Lokale Anmeldung abgeschaltet – nur noch über Anbieter' : 'Lokale Anmeldung wieder erlaubt')}>
          Nur Anmeldung über Anbieter – lokale Benutzername-Anmeldung abschalten{!einAnbieterAktiv && ' (zuerst einen Anbieter aktivieren)'}
        </Schalter>
        {mandant.nurSso && <p className={styles.warnung}>Lokale Konten können sich nicht mehr anmelden. Die Demo-Zugänge auf der Anmeldeseite sind ausgeblendet; ein Notfallzugang bleibt der Administration über den Anbieter.</p>}
      </section>
      {ANBIETER.map((anbieter: IdentitaetsAnbieter) => (
        <AnbieterKarte key={`${anbieter}-${JSON.stringify(mandant.anbieter[anbieter])}`} konfig={mandant.anbieter[anbieter]} darf={darf} onSpeichern={anbieterSpeichern} onTesten={testen} />
      ))}
    </>
  );
}

/* ◆ jh · eof */
