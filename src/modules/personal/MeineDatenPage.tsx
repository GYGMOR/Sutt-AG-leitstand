/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/personal/MeineDatenPage.tsx                │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Meine Daten: Konto, Personalakte, Einsichten, Kategorien, Rechte      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import { Eye, FileDown, ShieldCheck } from 'lucide-react';
import { useHeute } from '../../core/arbeitstag';
import { ROLLE_LABEL } from '../../core/auth/auth.types';
import { ANBIETER_INFO } from '../../core/auth/identitaet';
import { rechteVon } from '../../core/berechtigung/rechte';
import { ladeHerunter } from '../../core/datei';
import { DATENKATEGORIEN, FRISTBEGINN_LABEL, aufbewahrungJahre } from '../../core/datenschutz/aufbewahrung';
import { JOURNAL_BEREICH_LABEL } from '../../core/domain/journal';
import { FUNKTION_LABEL, mitarbeiterName } from '../../core/domain/personal';
import { formatDatum, formatZeitpunktKurz } from '../../core/format';
import { AppShell } from '../../core/layout/AppShell';
import { useMandant } from '../../core/mandant/mandantStore';
import { Button } from '../../core/ui/Button';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { Chip } from '../../core/ui/Chip';
import { DossierAbschnitt, Fakten } from '../../core/ui/ModulSeite';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '../../mock';
import { auskunftFuer } from '../benutzer/benutzer.model';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { jahreLabel } from '../einstellungen/einstellungen.model';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { useDemoReset } from '../dispo/store/useDemoReset';
import { exportName } from './personal.model';
import { useRechte } from './rechte';
import personal from './Personal.module.css';
import styles from './MeineDaten.module.css';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Seite ───────────────────────────────────────────────────

// jh› Transparenz ist der halbe Datenschutz: Jede angemeldete Person sieht hier, was gespeichert ist, wer es
//     angesehen hat und wie lange es bleibt – und holt ihre Auskunft (DSG Art. 25 / DSGVO Art. 15) selbst.
export function MeineDatenPage() {
  const heute = useHeute();
  const state = useDispoState();
  const rechte = useRechte();
  const mandant = useMandant();
  const aktionen = useDispoAktionen();
  const demoReset = useDemoReset();
  const sitzung = rechte.benutzer;
  const konto = sitzung ? (state.stammdaten.benutzer.get(sitzung.id) ?? sitzung) : null;
  const person = rechte.mitarbeiter;

  const eintraege = useMemo(
    () => state.journal.filter((eintrag) => (person !== null && eintrag.mitarbeiterId === person.id) || (konto !== null && (eintrag.betrifft === konto.id || eintrag.benutzer === konto.kuerzel))),
    [state.journal, person, konto],
  );
  const einsichten = useMemo(() => eintraege.filter((eintrag) => eintrag.art === 'einsicht' && eintrag.benutzer !== konto?.kuerzel).slice(0, 20), [eintraege, konto?.kuerzel]);
  const fremde = useMemo(() => eintraege.filter((eintrag) => eintrag.benutzer !== konto?.kuerzel && eintrag.art !== 'einsicht').slice(0, 12), [eintraege, konto?.kuerzel]);
  const kategorien = DATENKATEGORIEN.filter((kategorie) => kategorie.betroffene !== 'Kundinnen und Kunden');
  const darfExport = rechte.hat('datenschutz:exportieren') && person !== null;

  const exportieren = () => {
    if (!person) return;
    const daten = auskunftFuer(person, state, heute);
    ladeHerunter(exportName('meine-daten', [person.kuerzel, heute], 'json'), JSON.stringify(daten, null, 2), 'application/json');
    aktionen.protokolliere({ bereich: 'datenschutz', art: 'export', text: 'Eigene Daten exportiert (Auskunftsrecht, DSG Art. 25)', mitarbeiterId: person.id });
  };

  return (
    <AppShell menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <div className={styles.seite}>
        <header className={styles.kopf}>
          <div>
            <CapsLabel>Meine Daten & Datenschutz</CapsLabel>
            <h1 className={styles.titel}>{person ? mitarbeiterName(person) : konto ? `${konto.vorname} ${konto.nachname}` : 'Nicht angemeldet'}</h1>
          </div>
          <p className={styles.kopfText}>Was der Leitstand über Sie speichert, wer es ansieht und wie lange es bleibt – nach Schweizer DSG und EU-DSGVO.</p>
        </header>

        <div className={styles.raster}>
          <section className={styles.karte} aria-label="Konto">
            <DossierAbschnitt titel="Konto">
              {konto ? (
                <Fakten
                  eintraege={[
                    { label: 'Benutzername', wert: `@${konto.benutzername}`, mono: true },
                    { label: 'Rolle', wert: ROLLE_LABEL[konto.rolle] },
                    { label: 'Anmeldung', wert: konto.sso ? `${ANBIETER_INFO[konto.sso.anbieter].label} · ${konto.sso.email}${konto.mfa ? ' · MFA' : ''}` : 'lokal (Benutzername)' },
                    { label: 'Letzte Anmeldung', wert: konto.letzteAnmeldung ? formatZeitpunktKurz(konto.letzteAnmeldung) : '–', mono: true },
                    { label: 'Rechte', wert: `${rechteVon(konto).size} Rechte aus Rolle${(konto.zusatzRechte?.length ?? 0) > 0 ? ` + ${konto.zusatzRechte?.length} Zusatz` : ''}${(konto.entzogeneRechte?.length ?? 0) > 0 ? ` − ${konto.entzogeneRechte?.length} entzogen` : ''}` },
                  ]}
                />
              ) : (
                <p className={personal.fussnote}>Kein Konto.</p>
              )}
            </DossierAbschnitt>
          </section>

          <section className={styles.karte} aria-label="Personalakte">
            <DossierAbschnitt titel="Personalakte">
              {person ? (
                <Fakten
                  eintraege={[
                    { label: 'Funktion', wert: `${FUNKTION_LABEL[person.funktion]} · ${person.pensum} %` },
                    { label: 'Eintritt', wert: formatDatum(person.eintritt), mono: true },
                    { label: 'E-Mail', wert: person.email, mono: true },
                    { label: 'Vorgesetzte/r', wert: person.vorgesetzterId ? mitarbeiterName(state.stammdaten.mitarbeiter.get(person.vorgesetzterId) ?? person) : 'Geschäftsleitung' },
                    { label: 'Ferien / Jahr', wert: `${person.ferienTageProJahr} Tage (100 %)`, mono: true },
                    { label: `Gleitzeit per ${formatDatum(person.zeitUebertragPer)}`, wert: `${(person.zeitUebertragMin / 60).toFixed(2)} h`, mono: true },
                  ]}
                />
              ) : (
                <p className={personal.fussnote}>Mit diesem Konto ist keine Personalakte verknüpft.</p>
              )}
            </DossierAbschnitt>
          </section>

          <section className={styles.karte} aria-label="Einsichten">
            <DossierAbschnitt titel="Wer hat meine Daten angesehen" zusatz={<Chip tone={einsichten.length > 0 ? 'neutral' : 'ok'} icon={Eye}>{einsichten.length > 0 ? `${einsichten.length} Einsichten` : 'niemand ausser Ihnen'}</Chip>}>
              <ul className={personal.liste}>
                {einsichten.map((eintrag) => (
                  <li key={eintrag.id} className={personal.listenZeile}>
                    <span className={personal.mono}>{formatZeitpunktKurz(eintrag.zeitpunkt)}</span>
                    <span className={personal.listenText}>
                      <span className={personal.listenHaupt}>{eintrag.benutzer}</span> · {eintrag.text}
                    </span>
                    <Chip tone="mute">{JOURNAL_BEREICH_LABEL[eintrag.bereich]}</Chip>
                  </li>
                ))}
              </ul>
              {fremde.length > 0 && (
                <>
                  <p className={personal.fussnote}>Änderungen durch andere (letzte {fremde.length})</p>
                  <ul className={personal.liste}>
                    {fremde.map((eintrag) => (
                      <li key={eintrag.id} className={personal.listenZeile}>
                        <span className={personal.mono}>{formatZeitpunktKurz(eintrag.zeitpunkt)}</span>
                        <span className={personal.listenText}>
                          <span className={personal.listenHaupt}>{eintrag.benutzer}</span> · {eintrag.text}
                        </span>
                        <Chip tone="mute">{JOURNAL_BEREICH_LABEL[eintrag.bereich]}</Chip>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className={personal.fussnote}>Jede Einsicht in Personendaten durch andere wird protokolliert (DSV Art. 4) und hier gezeigt.</p>
            </DossierAbschnitt>
          </section>

          <section className={styles.karte} aria-label="Datenkategorien">
            <DossierAbschnitt titel="Was gespeichert wird und wie lange">
              <table className={styles.tabelle}>
                <thead>
                  <tr>
                    <th scope="col">Kategorie</th>
                    <th scope="col">Zweck</th>
                    <th scope="col">Aufbewahrung</th>
                  </tr>
                </thead>
                <tbody>
                  {kategorien.map((kategorie) => (
                    <tr key={kategorie.id}>
                      <td>
                        {kategorie.label}
                        {kategorie.besondersSchuetzenswert && (
                          <>
                            {' '}
                            <Chip tone="signal" size="sm">
                              besonders schützenswert
                            </Chip>
                          </>
                        )}
                      </td>
                      <td>{kategorie.zweck}</td>
                      <td className={styles.mono}>
                        {jahreLabel(aufbewahrungJahre(kategorie, mandant.aufbewahrung))} {FRISTBEGINN_LABEL[kategorie.ab]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DossierAbschnitt>
          </section>

          <section className={styles.karte} aria-label="Rechte">
            <DossierAbschnitt titel="Ihre Rechte" zusatz={<Chip tone="neutral" icon={ShieldCheck}>DSG · DSGVO</Chip>}>
              <ul className={styles.rechte}>
                <li>
                  <strong>Auskunft</strong> (DSG Art. 25, DSGVO Art. 15): alle gespeicherten Daten als Datei – inklusive Journal, wer sie angesehen hat.
                </li>
                <li>
                  <strong>Berichtigung</strong> (DSG Art. 32, DSGVO Art. 16): Stammdaten korrigiert die Personaladministration; Zeiten korrigieren Sie selbst mit Grund.
                </li>
                <li>
                  <strong>Löschung</strong> (DSG Art. 32, DSGVO Art. 17): nach Ablauf der Frist automatisch; früher, wenn keine gesetzliche Pflicht entgegensteht.
                </li>
                <li>
                  <strong>Keine Verhaltensüberwachung</strong> (ArGV 3 Art. 26): Zeitstempel dienen der Zeiterfassung und dem Rapport, nicht der Kontrolle.
                </li>
              </ul>
              <Fakten
                eintraege={[
                  { label: 'Verantwortliche Stelle', wert: mandant.datenschutz.verantwortlich, breit: true },
                  { label: 'Kontakt', wert: `${mandant.datenschutz.email} · ${mandant.datenschutz.telefon}`, mono: true, breit: true },
                  ...(mandant.datenschutz.beraterName ? [{ label: 'Datenschutzberater/in', wert: mandant.datenschutz.beraterName }] : []),
                  { label: 'Aufsicht', wert: 'Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB), Bern', breit: true },
                ]}
              />
              <div className={personal.aktionen}>
                <Button variant="primary" size="sm" icon={FileDown} disabled={!darfExport} onClick={exportieren}>
                  Meine Daten exportieren (JSON)
                </Button>
                {!darfExport && <span className={personal.fussnote}>Export braucht eine Personalakte und das Recht «Meine Daten exportieren».</span>}
              </div>
            </DossierAbschnitt>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

/* ◆ jh · eof */
