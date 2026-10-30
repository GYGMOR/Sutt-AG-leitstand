/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/ZeitSeite.tsx                           │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Zeit: Stempeluhr, Woche · Monat · Jahr, Saldo ab Eintritt, Vertrag    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Monitor, Send } from 'lucide-react';
import { addDays, startOfWeek } from '@sl/core/datum';
import type { IsoDatum } from '@sl/core/datum';
import { ABSENZ_LABEL } from '@sl/core/domain/absenz';
import { vertragsjahre } from '@sl/core/domain/personal';
import { ABSCHLUSS_STATUS_LABEL, monatVerschieben, monatVon } from '@sl/core/domain/zeit';
import type { MonatsSchluessel } from '@sl/core/domain/zeit';
import { formatDatumKurz, formatDauer, formatSaldo, formatWochentag, formatZeit } from '@sl/core/format';
import { Button, IconButton } from '@sl/core/ui/Button';
import { Chip } from '@sl/core/ui/Chip';
import { SegmentedControl } from '@sl/core/ui/SegmentedControl';
import type { SegmentOption } from '@sl/core/ui/SegmentedControl';
import { cx } from '@sl/core/ui/cx';
import { leitstandPfad } from '@sl/core/urls';
import { JAHR_ZUSTAND_LABEL, berechneJahr, berechneMonat, berechneTageFuer, monatLabelKurz, standHeute, systembeginn } from '@sl/modules/personal/personal.model';
import type { JahrMonat } from '@sl/modules/personal/personal.model';
import { StempeluhrGross } from '@sl/modules/personal/Stempeluhr';
import { TagChip } from '@sl/modules/zeiterfassung/WochenUebersicht';
import { AbschlussDialog, EintragDialog } from '@sl/modules/zeiterfassung/ZeitDialoge';
import { kannEinreichen, monatLabel, monatsabschlussEntwurf, wochenLabel, wochenTage } from '@sl/modules/zeiterfassung/zeiterfassung.model';
import raster from '@sl/modules/zeiterfassung/Zeitraster.module.css';
import styles from '../bausteine/Seiten.module.css';
import { useApp } from '../rahmen/AppKontext';

// ── §1 · Hilfen ──────────────────────────────────────────────────

type ZeitAnsicht = 'woche' | 'monat' | 'jahr';

const ANSICHTEN: readonly SegmentOption<ZeitAnsicht>[] = [
  { value: 'woche', label: 'Woche' },
  { value: 'monat', label: 'Monat' },
  { value: 'jahr', label: 'Jahr' },
];

const ABSCHLUSS_TON = { eingereicht: 'signal', genehmigt: 'ok', zurueckgewiesen: 'danger' } as const;

function saldoKlasse(minuten: number): string | undefined {
  if (minuten > 0) return styles.plus;
  if (minuten < 0) return styles.minus;
  return undefined;
}

function istGerechnet(monat: JahrMonat): boolean {
  return monat.zustand === 'laufend' || monat.zustand === 'vergangen';
}

// ── §2 · Komponente ──────────────────────────────────────────────

// jh› Die App stempelt für die angemeldete Person – auch wenn das Büro «als Techniker» hineinschaut.
//     Woche, Monat und Jahr sind die Selbstkontrolle über den ganzen Vertrag: Stimmt mein Saldo, fehlt ein Tag,
//     ist der Monat eingereicht, wie viele Ferien bleiben – vom Eintritt bis heute.
export function ZeitSeite() {
  const { mitarbeiter, heute, jetztMin, state, aktionen, rechte, mandant } = useApp();
  const [ansicht, setAnsicht] = useState<ZeitAnsicht>('woche');
  const [wochenStart, setWochenStart] = useState<IsoDatum>(() => startOfWeek(heute));
  const [monat, setMonat] = useState<MonatsSchluessel>(() => monatVon(heute));
  const [jahr, setJahr] = useState(() => Number(heute.slice(0, 4)));
  const [eintragOffen, setEintragOffen] = useState(false);
  const [abschlussOffen, setAbschlussOffen] = useState(false);

  const woche = useMemo(() => (mitarbeiter ? berechneTageFuer(mitarbeiter, wochenTage(wochenStart), state, mandant, heute, jetztMin) : []), [mitarbeiter, wochenStart, state, mandant, heute, jetztMin]);
  const konto = useMemo(() => (mitarbeiter ? berechneMonat(mitarbeiter, monat, state, mandant, heute, jetztMin) : null), [mitarbeiter, monat, state, mandant, heute, jetztMin]);
  const meinJahr = useMemo(() => (mitarbeiter && ansicht === 'jahr' ? berechneJahr(mitarbeiter, jahr, state, mandant, heute, jetztMin) : null), [mitarbeiter, ansicht, jahr, state, mandant, heute, jetztMin]);
  const stand = useMemo(() => (mitarbeiter ? standHeute(mitarbeiter, state, mandant, heute, jetztMin) : null), [mitarbeiter, state, mandant, heute, jetztMin]);

  if (!mitarbeiter || !konto || !stand) {
    return (
      <div className={styles.seite}>
        <p className={styles.hinweisKarte}>Keine Personalakte verknüpft – die Stempeluhr steht nur der eigenen Person zur Verfügung.</p>
      </div>
    );
  }

  const heutigerMonat = monatVon(heute);
  const jahre = vertragsjahre(mitarbeiter, heute);
  const erstesDatum = mitarbeiter.eintritt > systembeginn(mitarbeiter) ? mitarbeiter.eintritt : systembeginn(mitarbeiter);
  const ersterMonat = monatVon(erstesDatum);
  const ersteWoche = startOfWeek(erstesDatum);
  const aktuelleWoche = startOfWeek(heute);
  const bisHeute = woche.filter((tag) => !tag.zukunft);
  const erfasstMin = bisHeute.reduce((summe, tag) => summe + tag.arbeitMin, 0);
  const erwartetMin = bisHeute.reduce((summe, tag) => summe + tag.sollMin, 0);
  const darfErfassen = rechte.hat('zeit:erfassen') && !konto.gesperrt;
  const tageMitInhalt = konto.tage.filter((tag) => !tag.zukunft && (tag.eintraege.length > 0 || tag.grund === 'arbeitstag' || tag.grund === 'absenz'));
  const tageListe = (monat === heutigerMonat ? tageMitInhalt.slice(-6) : tageMitInhalt).slice().reverse();

  const monatOeffnen = (ziel: MonatsSchluessel) => {
    setMonat(ziel);
    setAnsicht('monat');
  };

  return (
    <div className={styles.seite}>
      <StempeluhrGross geraet="app" onNachtragen={darfErfassen ? () => setEintragOffen(true) : undefined} />
      <SegmentedControl label="Zeitraum" options={ANSICHTEN} value={ansicht} onChange={setAnsicht} />

      {ansicht === 'woche' && (
        <section className={styles.abschnitt} aria-label="Woche">
          <div className={styles.zeitNav}>
            <IconButton icon={ChevronLeft} label="Vorwoche" size="sm" disabled={wochenStart <= ersteWoche} onClick={() => setWochenStart(addDays(wochenStart, -7))} />
            <span className={styles.zeitNavLabel}>{wochenLabel(wochenStart)}</span>
            <IconButton icon={ChevronRight} label="Nächste Woche" size="sm" disabled={wochenStart >= aktuelleWoche} onClick={() => setWochenStart(addDays(wochenStart, 7))} />
          </div>
          <header className={styles.abschnittKopf}>
            <h2>{wochenStart === aktuelleWoche ? 'Diese Woche' : 'Woche'}</h2>
            <span className={styles.mono}>
              {formatDauer(erfasstMin)} von {formatDauer(erwartetMin)}
            </span>
          </header>
          <div className={raster.chipsReihe}>
            {woche.map((tag) => (
              <TagChip key={tag.datum} tag={tag} heute={heute} />
            ))}
          </div>
        </section>
      )}

      {ansicht === 'monat' && (
        <section className={styles.abschnitt} aria-label="Monat">
          <div className={styles.zeitNav}>
            <IconButton icon={ChevronLeft} label="Vormonat" size="sm" disabled={monat <= ersterMonat} onClick={() => setMonat(monatVerschieben(monat, -1))} />
            <span className={styles.zeitNavLabel}>{monatLabel(monat)}</span>
            <IconButton icon={ChevronRight} label="Nächster Monat" size="sm" disabled={monat >= heutigerMonat} onClick={() => setMonat(monatVerschieben(monat, 1))} />
          </div>
          <header className={styles.abschnittKopf}>
            <h2>{monat === heutigerMonat ? 'Laufender Monat' : 'Monat'}</h2>
            {konto.abschluss ? <Chip tone={ABSCHLUSS_TON[konto.abschluss.status]}>{ABSCHLUSS_STATUS_LABEL[konto.abschluss.status]}</Chip> : <span className={styles.tagMeta}>offen</span>}
          </header>
          <dl className={styles.zeitZahlen}>
            <div>
              <dt>Soll</dt>
              <dd>{formatDauer(konto.periode.sollMin)}</dd>
            </div>
            <div>
              <dt>Ist</dt>
              <dd>{formatDauer(konto.periode.arbeitMin)}</dd>
            </div>
            <div>
              <dt>Saldo</dt>
              <dd className={saldoKlasse(konto.periode.saldoMin)}>{formatSaldo(konto.periode.saldoMin)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd className={saldoKlasse(konto.saldoKumuliertMin)}>{formatSaldo(konto.saldoKumuliertMin)}</dd>
            </div>
          </dl>
          <ul className={styles.zeitTage} aria-label={monat === heutigerMonat ? 'Letzte Tage' : 'Tage'}>
            {tageListe.map((tag) => (
              <li key={tag.datum} className={cx(styles.zeitTag, tag.datum === heute && styles.zeitTagHeute)}>
                <span className={styles.mono}>
                  {formatWochentag(tag.datum, 'kurz')} {formatDatumKurz(tag.datum)}
                </span>
                <span className={styles.zeitTagText}>
                  {tag.kommenMin !== null ? `${formatZeit(tag.kommenMin)}–${tag.laeuft ? 'läuft' : tag.gehenMin === null ? 'offen' : formatZeit(tag.gehenMin)}` : tag.absenz ? ABSENZ_LABEL[tag.absenz.art] : tag.feiertag ? tag.feiertag.label : 'keine Zeiten'}
                  {tag.warnungen.length > 0 && ` · ${tag.warnungen.length} ${tag.warnungen.length === 1 ? 'Hinweis' : 'Hinweise'}`}
                </span>
                <span className={cx(styles.mono, saldoKlasse(tag.saldoMin))}>{formatSaldo(tag.saldoMin)}</span>
              </li>
            ))}
            {tageListe.length === 0 && <li className={styles.zeitTag}><span /><span className={styles.zeitTagText}>Keine Zeiten in diesem Monat.</span><span /></li>}
          </ul>
          <div className={styles.aktionen}>
            {darfErfassen && monat === heutigerMonat && (
              <Button variant="secondary" size="sm" icon={CalendarPlus} onClick={() => setEintragOffen(true)}>
                Zeit nachtragen
              </Button>
            )}
            {darfErfassen && kannEinreichen(konto, heute) && (
              <Button variant="primary" size="sm" icon={Send} onClick={() => setAbschlussOffen(true)}>
                {konto.abschluss?.status === 'zurueckgewiesen' ? 'Erneut einreichen' : 'Monat einreichen'}
              </Button>
            )}
            <Button variant="ghost" size="sm" icon={Monitor} onClick={() => window.open(leitstandPfad(`zeiterfassung/${mitarbeiter.id}?monat=${monat}`), '_blank', 'noopener')}>
              Zeitkonto im Leitstand
            </Button>
          </div>
        </section>
      )}

      {ansicht === 'jahr' && meinJahr && (
        <section className={styles.abschnitt} aria-label="Jahr">
          <div className={styles.zeitNav}>
            <IconButton icon={ChevronLeft} label="Vorjahr" size="sm" disabled={!jahre.includes(jahr - 1)} onClick={() => setJahr(jahr - 1)} />
            <span className={styles.zeitNavLabel}>Mein Jahr {jahr}</span>
            <IconButton icon={ChevronRight} label="Nächstes Jahr" size="sm" disabled={!jahre.includes(jahr + 1)} onClick={() => setJahr(jahr + 1)} />
          </div>
          <dl className={styles.zeitStand}>
            <div className={styles.zeitStandBreit}>
              <dt>Vertrag</dt>
              <dd>{stand.vertragText}</dd>
            </div>
            <div>
              <dt>Gleitzeit heute</dt>
              <dd className={saldoKlasse(stand.gleitzeitMin)}>{formatSaldo(stand.gleitzeitMin)}</dd>
            </div>
            <div>
              <dt>Ferien Rest {heute.slice(0, 4)}</dt>
              <dd>{stand.ferienRestTage} Tage</dd>
            </div>
            {stand.endetInTagen !== null && (
              <div className={styles.zeitStandBreit}>
                <dt>Vertragsende</dt>
                <dd>{stand.endetInTagen === 0 ? 'heute' : `in ${stand.endetInTagen} Tagen`}</dd>
              </div>
            )}
          </dl>
          <ul className={styles.zeitTage} aria-label="Monate">
            {meinJahr.monate.map((eintrag) => (
              <li key={eintrag.monat}>
                <button
                  type="button"
                  className={cx(styles.zeitMonat, !istGerechnet(eintrag) && styles.zeitMonatLeer, eintrag.monat === heutigerMonat && styles.zeitMonatAktuell)}
                  disabled={!istGerechnet(eintrag)}
                  onClick={() => monatOeffnen(eintrag.monat)}
                >
                  <span className={styles.mono}>{monatLabelKurz(eintrag.monat)}</span>
                  <span className={styles.zeitTagText}>
                    {istGerechnet(eintrag) ? `${formatDauer(eintrag.istMin)} von ${formatDauer(eintrag.sollMin)}` : JAHR_ZUSTAND_LABEL[eintrag.zustand]}
                    {eintrag.abschluss && ` · ${ABSCHLUSS_STATUS_LABEL[eintrag.abschluss]}`}
                    {eintrag.tageMitWarnung > 0 && ` · ${eintrag.tageMitWarnung} ${eintrag.tageMitWarnung === 1 ? 'Hinweis' : 'Hinweise'}`}
                  </span>
                  <span className={cx(styles.mono, istGerechnet(eintrag) && saldoKlasse(eintrag.saldoMin))}>{istGerechnet(eintrag) ? formatSaldo(eintrag.saldoMin) : '–'}</span>
                </button>
              </li>
            ))}
          </ul>
          <dl className={styles.zeitZahlen}>
            <div>
              <dt>Soll {jahr}</dt>
              <dd>{formatDauer(meinJahr.sollMin)}</dd>
            </div>
            <div>
              <dt>Ist {jahr}</dt>
              <dd>{formatDauer(meinJahr.istMin)}</dd>
            </div>
            <div>
              <dt>Saldo Jahr</dt>
              <dd className={saldoKlasse(meinJahr.saldoMin)}>{formatSaldo(meinJahr.saldoMin)}</dd>
            </div>
            <div>
              <dt>{jahr < Number(heute.slice(0, 4)) ? `Gleitzeit 31.12.` : 'Gleitzeit heute'}</dt>
              <dd className={saldoKlasse(meinJahr.kumuliertMin)}>{formatSaldo(meinJahr.kumuliertMin)}</dd>
            </div>
          </dl>
          <p className={styles.quelle}>
            Ferien {jahr}: {meinJahr.ferien.anspruchTage + meinJahr.ferien.uebertragTage} Anspruch · {meinJahr.ferien.bezogenTage} bezogen · {meinJahr.ferien.geplantTage} geplant · Rest {meinJahr.ferien.restTage} · Systembeginn {formatDatumKurz(meinJahr.systembeginn)}, davor Übertrag {formatSaldo(mitarbeiter.zeitUebertragMin)}
          </p>
        </section>
      )}

      <EintragDialog open={eintragOffen} mitarbeiter={mitarbeiter} datum={heute} heute={heute} eintraege={state.zeiteintraege} onClose={() => setEintragOffen(false)} onSpeichern={(entwurf) => aktionen.zeitEintraegeAnlegen([entwurf])} />
      <AbschlussDialog open={abschlussOffen} konto={konto} onClose={() => setAbschlussOffen(false)} onEinreichen={(bemerkung) => aktionen.monatEinreichen(monatsabschlussEntwurf(konto, bemerkung || undefined))} />
    </div>
  );
}

/* ◆ jh · eof */
