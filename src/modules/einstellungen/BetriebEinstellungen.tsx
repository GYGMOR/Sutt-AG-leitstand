/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/einstellungen/BetriebEinstellungen.tsx     │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Betrieb: Firma, Kanton, Zeitzone, Arbeitszeit, Sitzung · Feiertage    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Save, Trash2 } from 'lucide-react';
import type { IsoDatum } from '../../core/datum';
import { BETRIEBLICHE_FEIERTAGE_STANDARD, KANTONE, feiertageImJahr } from '../../core/domain/feiertage';
import type { BetrieblicherFeiertag, Kanton } from '../../core/domain/feiertage';
import type { Arbeitszeitmodell } from '../../core/domain/zeit';
import { formatDatum, formatWochentag, formatZeit } from '../../core/format';
import { useNow } from '../../core/hooks/useNow';
import { Button, IconButton } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { Auswahl, Eingabe, Feld, Schalter } from '../../core/ui/Form';
import { cx } from '../../core/ui/cx';
import { ZEITZONEN, jetztInZone, naechsteUmstellung, umstellungLabel } from '../../core/zeitzone';
import { minutenAus } from '../zeiterfassung/zeiterfassung.model';
import type { EinstellungProps } from './EinstellungenPage';
import { betrieblicheFeiertageSortiert, betrieblicherTagGueltig } from './einstellungen.model';
import styles from './Einstellungen.module.css';

// ── §1 · Betrieb ─────────────────────────────────────────────────

function zahl(wert: string, fallback: number): number {
  const parsed = Number(wert);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// jh› Die Zeitzone steht hier bewusst neben dem Kanton: Beides sind Eigenschaften des Betriebs, nicht des
//     Geräts. Stempel, Tagesgrenzen und die Umstellung richten sich nach dieser Zone (Europe/Zurich).
export function BetriebEinstellungen({ mandant, darf, speichern }: EinstellungProps) {
  const [firma, setFirma] = useState(mandant.firma);
  const [adresse, setAdresse] = useState(mandant.adresse);
  const [kanton, setKanton] = useState<Kanton>(mandant.kanton);
  const [zeitzone, setZeitzone] = useState(mandant.zeitzone);
  const [wochenStunden, setWochenStunden] = useState(String(mandant.arbeitszeit.wochenStunden));
  const [tageProWoche, setTageProWoche] = useState(String(mandant.arbeitszeit.tageProWoche));
  const [gleitzeit, setGleitzeit] = useState(mandant.arbeitszeit.gleitzeit);
  const [kernVon, setKernVon] = useState(formatZeit(mandant.arbeitszeit.kernzeit?.vonMin ?? 9 * 60));
  const [kernBis, setKernBis] = useState(formatZeit(mandant.arbeitszeit.kernzeit?.bisMin ?? 16 * 60));
  const [hoechst, setHoechst] = useState<'45' | '50'>(String(mandant.arbeitszeit.hoechstWochenStunden) as '45' | '50');
  const [ferien, setFerien] = useState(String(mandant.ferienTageStandard));
  const [sitzung, setSitzung] = useState(String(mandant.sitzungMinuten));
  const jetzt = useNow(1000);
  const uhr = useMemo(() => jetztInZone(zeitzone, jetzt), [zeitzone, jetzt]);
  const umstellung = useMemo(() => naechsteUmstellung(zeitzone, uhr.datum), [zeitzone, uhr.datum]);

  const fehler = useMemo(() => {
    if (firma.trim() === '') return 'Firma fehlt.';
    const stunden = zahl(wochenStunden, 0);
    if (stunden < 1 || stunden > 50) return 'Wochenarbeitszeit zwischen 1 und 50 Stunden.';
    const tage = zahl(tageProWoche, 0);
    if (tage < 1 || tage > 7) return 'Arbeitstage pro Woche zwischen 1 und 7.';
    const von = minutenAus(kernVon);
    const bis = minutenAus(kernBis);
    if (gleitzeit && (von === null || bis === null || bis <= von)) return 'Kernzeit: Von vor Bis, als Uhrzeit (hh:mm).';
    if (zahl(ferien, 0) < 0 || zahl(ferien, 0) > 60) return 'Ferientage zwischen 0 und 60.';
    if (zahl(sitzung, 0) < 5 || zahl(sitzung, 0) > 1440) return 'Automatische Abmeldung zwischen 5 Minuten und 24 Stunden.';
    return null;
  }, [firma, wochenStunden, tageProWoche, gleitzeit, kernVon, kernBis, ferien, sitzung]);

  const sichern = () => {
    const von = minutenAus(kernVon);
    const bis = minutenAus(kernBis);
    const arbeitszeit: Arbeitszeitmodell = {
      wochenStunden: zahl(wochenStunden, 42),
      tageProWoche: zahl(tageProWoche, 5),
      gleitzeit,
      ...(gleitzeit && von !== null && bis !== null ? { kernzeit: { vonMin: von, bisMin: bis } } : {}),
      hoechstWochenStunden: hoechst === '50' ? 50 : 45,
    };
    speichern(
      { firma: firma.trim(), adresse: adresse.trim(), kanton, zeitzone, arbeitszeit, ferienTageStandard: zahl(ferien, 25), sitzungMinuten: zahl(sitzung, 480) },
      `Betrieb geändert: ${firma.trim()}, ${kanton}, ${zeitzone}, ${arbeitszeit.wochenStunden} h/Woche, ${arbeitszeit.gleitzeit ? 'Gleitzeit' : 'feste Zeiten'}`,
    );
  };

  return (
    <>
      <section className={styles.karte} aria-label="Betrieb">
        <header className={styles.karteKopf}>
          <h2 className={styles.modulName}>Betrieb</h2>
        </header>
        <div className={styles.formular}>
          <Feld label="Firma" render={(id) => <Eingabe id={id} value={firma} disabled={!darf} onChange={(event) => setFirma(event.target.value)} />} />
          <Feld label="Adresse" render={(id) => <Eingabe id={id} value={adresse} disabled={!darf} onChange={(event) => setAdresse(event.target.value)} />} />
          <Feld
            label="Kanton (Feiertage)"
            render={(id) => (
              <Auswahl id={id} value={kanton} disabled={!darf} onChange={(event) => setKanton(event.target.value as Kanton)}>
                {KANTONE.map((eintrag) => (
                  <option key={eintrag.id} value={eintrag.id}>
                    {eintrag.label} ({eintrag.id})
                  </option>
                ))}
              </Auswahl>
            )}
          />
          <Feld
            label="Zeitzone"
            hinweis="Stempel, Tagesgrenzen und Zeitumstellung gelten in dieser Zone – unabhängig vom Gerät."
            render={(id) => (
              <Auswahl id={id} value={zeitzone} disabled={!darf} onChange={(event) => setZeitzone(event.target.value)}>
                {ZEITZONEN.map((eintrag) => (
                  <option key={eintrag.id} value={eintrag.id}>
                    {eintrag.label}
                  </option>
                ))}
              </Auswahl>
            )}
          />
        </div>
        <p className={styles.zoneInfo}>
          <span>
            Jetzt {formatZeit(uhr.minuten)}:{String(uhr.sekunden).padStart(2, '0')} {uhr.kurz}
          </span>
          <span>UTC{uhr.offsetMin >= 0 ? '+' : '−'}{formatZeit(Math.abs(uhr.offsetMin))}</span>
          <span>{umstellung ? `Nächste Umstellung ${formatDatum(umstellung.datum)} · ${umstellungLabel(umstellung)}` : 'Keine Zeitumstellung in dieser Zone'}</span>
        </p>
      </section>

      <section className={styles.karte} aria-label="Arbeitszeitmodell">
        <header className={styles.karteKopf}>
          <h2 className={styles.modulName}>Arbeitszeitmodell</h2>
          <span className={styles.fussnote}>Tagessoll = Wochenstunden ÷ Arbeitstage × Pensum</span>
        </header>
        <div className={styles.formular}>
          <Feld label="Wochenarbeitszeit (100 %)" render={(id) => <Eingabe id={id} type="number" min={1} max={50} step={0.5} value={wochenStunden} mono disabled={!darf} onChange={(event) => setWochenStunden(event.target.value)} nachsatz="h" />} />
          <Feld label="Arbeitstage pro Woche" render={(id) => <Eingabe id={id} type="number" min={1} max={7} value={tageProWoche} mono disabled={!darf} onChange={(event) => setTageProWoche(event.target.value)} />} />
          <Feld
            label="Höchstarbeitszeit (ArG 9)"
            render={(id) => (
              <Auswahl id={id} value={hoechst} disabled={!darf} onChange={(event) => setHoechst(event.target.value as '45' | '50')}>
                <option value="45">45 Stunden (Büro, Technik, Verkauf)</option>
                <option value="50">50 Stunden (übrige)</option>
              </Auswahl>
            )}
          />
          <Feld label="Ferien neuer Mitarbeitender" render={(id) => <Eingabe id={id} type="number" min={0} max={60} value={ferien} mono disabled={!darf} onChange={(event) => setFerien(event.target.value)} nachsatz="Tage" />} />
          <div className={styles.formularBreit}>
            <Schalter checked={gleitzeit} onChange={setGleitzeit}>
              Gleitzeit mit Kernzeit – ausserhalb der Kernzeit frei einteilbar
            </Schalter>
          </div>
          {gleitzeit && (
            <>
              <Feld label="Kernzeit von" render={(id) => <Eingabe id={id} type="time" value={kernVon} mono disabled={!darf} onChange={(event) => setKernVon(event.target.value)} />} />
              <Feld label="Kernzeit bis" render={(id) => <Eingabe id={id} type="time" value={kernBis} mono disabled={!darf} onChange={(event) => setKernBis(event.target.value)} />} />
            </>
          )}
        </div>
      </section>

      <section className={styles.karte} aria-label="Sitzung">
        <header className={styles.karteKopf}>
          <h2 className={styles.modulName}>Sitzung</h2>
        </header>
        <div className={styles.formular}>
          <Feld label="Automatische Abmeldung nach Inaktivität" hinweis="DSG Art. 8: Ein offener Leitstand im leeren Büro ist ein Risiko – 8 Stunden decken einen Arbeitstag." render={(id) => <Eingabe id={id} type="number" min={5} max={1440} value={sitzung} mono disabled={!darf} onChange={(event) => setSitzung(event.target.value)} nachsatz="min" />} />
        </div>
        {fehler && <p className={styles.fehler}>{fehler}</p>}
        <div className={styles.aktionen}>
          <Button variant="primary" size="sm" icon={Save} disabled={!darf || fehler !== null} onClick={sichern}>
            Speichern
          </Button>
          <span className={styles.fussnote}>Änderungen gelten sofort für alle Fenster und werden protokolliert.</span>
        </div>
      </section>
    </>
  );
}

// ── §2 · Feiertage ───────────────────────────────────────────────

interface FeiertagProps extends EinstellungProps {
  heute: IsoDatum;
}

export function FeiertagEinstellungen({ mandant, darf, speichern, heute }: FeiertagProps) {
  const [jahr, setJahr] = useState(Number(heute.slice(0, 4)));
  const [tag, setTag] = useState('');
  const [label, setLabel] = useState('');
  const [halb, setHalb] = useState(false);
  const feiertage = useMemo(() => feiertageImJahr(jahr, mandant.kanton, mandant.betrieblicheFeiertage), [jahr, mandant.kanton, mandant.betrieblicheFeiertage]);
  const betriebliche = betrieblicheFeiertageSortiert(mandant.betrieblicheFeiertage);
  const eingabeOk = betrieblicherTagGueltig(tag) && label.trim() !== '' && !betriebliche.some((eintrag) => eintrag.tag === tag.trim());

  const hinzufuegen = () => {
    if (!eingabeOk) return;
    const neu: BetrieblicherFeiertag = { tag: tag.trim(), label: label.trim(), halb };
    speichern({ betrieblicheFeiertage: [...betriebliche, neu] }, `Betrieblicher Feiertag «${neu.label}» (${neu.tag}${neu.halb ? ', halb' : ''}) hinzugefügt`);
    setTag('');
    setLabel('');
    setHalb(false);
  };
  const entfernen = (eintrag: BetrieblicherFeiertag) => speichern({ betrieblicheFeiertage: betriebliche.filter((kandidat) => kandidat.tag !== eintrag.tag) }, `Betrieblicher Feiertag «${eintrag.label}» entfernt`);

  return (
    <>
      <section className={styles.karte} aria-label="Feiertage">
        <header className={styles.karteKopf}>
          <h2 className={styles.modulName}>
            Feiertage {jahr} · Kanton {mandant.kanton}
          </h2>
          <div className={styles.aktionen}>
            <IconButton icon={ChevronLeft} label="Vorjahr" size="sm" onClick={() => setJahr((wert) => wert - 1)} />
            <span className={styles.mono}>{jahr}</span>
            <IconButton icon={ChevronRight} label="Nächstes Jahr" size="sm" onClick={() => setJahr((wert) => wert + 1)} />
          </div>
        </header>
        <p className={styles.karteText}>Gesetzliche Feiertage rechnet das System aus Kanton und Osterformel; sie senken das Tagessoll (ganz oder halb) und zählen im Ferienkonto nicht als Ferientag.</p>
        <table className={styles.tabelle}>
          <thead>
            <tr>
              <th scope="col">Datum</th>
              <th scope="col">Tag</th>
              <th scope="col">Feiertag</th>
              <th scope="col">Art</th>
              <th scope="col">Soll</th>
            </tr>
          </thead>
          <tbody>
            {feiertage.map((feiertag) => {
              const wochenende = formatWochentag(feiertag.datum, 'kurz') === 'Sa' || formatWochentag(feiertag.datum, 'kurz') === 'So';
              return (
                <tr key={`${feiertag.datum}-${feiertag.label}`}>
                  <td className={styles.mono}>{formatDatum(feiertag.datum)}</td>
                  <td className={cx(wochenende && styles.frei)}>{formatWochentag(feiertag.datum)}</td>
                  <td>{feiertag.label}</td>
                  <td>
                    <Chip tone={feiertag.art === 'gesetzlich' ? 'neutral' : 'tint'}>{feiertag.art === 'gesetzlich' ? 'gesetzlich' : 'betrieblich'}</Chip>
                  </td>
                  <td className={styles.frei}>{wochenende ? 'Wochenende' : feiertag.halb ? 'halber Tag' : 'frei'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className={styles.karte} aria-label="Betriebliche freie Tage">
        <header className={styles.karteKopf}>
          <h2 className={styles.modulName}>Betriebliche freie Tage</h2>
          {darf && JSON.stringify(betriebliche) !== JSON.stringify(betrieblicheFeiertageSortiert(BETRIEBLICHE_FEIERTAGE_STANDARD)) && (
            <Button variant="ghost" size="sm" onClick={() => speichern({ betrieblicheFeiertage: BETRIEBLICHE_FEIERTAGE_STANDARD }, 'Betriebliche Feiertage auf Standard zurückgesetzt')}>
              Standard
            </Button>
          )}
        </header>
        <p className={styles.karteText}>Jedes Jahr am selben Kalendertag – zum Beispiel Heiligabend und Silvester halb, Betriebsferien oder der Brückentag nach Auffahrt.</p>
        <table className={styles.tabelle}>
          <thead>
            <tr>
              <th scope="col">Kalendertag</th>
              <th scope="col">Bezeichnung</th>
              <th scope="col">Soll</th>
              {darf && <th scope="col" />}
            </tr>
          </thead>
          <tbody>
            {betriebliche.map((eintrag) => (
              <tr key={eintrag.tag}>
                <td className={styles.mono}>{eintrag.tag}</td>
                <td>{eintrag.label}</td>
                <td className={styles.frei}>{eintrag.halb ? 'halber Tag' : 'frei'}</td>
                {darf && (
                  <td className={styles.zahl}>
                    <IconButton icon={Trash2} label={`${eintrag.label} entfernen`} size="sm" tone="danger" onClick={() => entfernen(eintrag)} />
                  </td>
                )}
              </tr>
            ))}
            {betriebliche.length === 0 && (
              <tr>
                <td colSpan={darf ? 4 : 3} className={styles.frei}>
                  Keine betrieblichen freien Tage.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {darf && (
          <div className={styles.formular}>
            <Feld label="Kalendertag (MM-TT)" render={(id) => <Eingabe id={id} value={tag} placeholder="05-15" mono onChange={(event) => setTag(event.target.value)} />} />
            <Feld label="Bezeichnung" render={(id) => <Eingabe id={id} value={label} placeholder="Brückentag Auffahrt" onChange={(event) => setLabel(event.target.value)} />} />
            <div className={styles.aktionen}>
              <Schalter checked={halb} onChange={setHalb}>
                halber Tag
              </Schalter>
              <Button variant="secondary" size="sm" icon={Plus} disabled={!eingabeOk} onClick={hinzufuegen}>
                Hinzufügen
              </Button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

/* ◆ jh · eof */
