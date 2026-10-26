/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/app/ZeitSeite.tsx                          │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Zeit in der App: grosse Stempeluhr, Woche als Chips, Monat, Nachtrag  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { CalendarPlus, Monitor, Send } from 'lucide-react';
import { useNavigate } from 'react-router';
import { startOfWeek } from '../../core/datum';
import { ABSENZ_LABEL } from '../../core/domain/absenz';
import { ABSCHLUSS_STATUS_LABEL, monatVon } from '../../core/domain/zeit';
import { formatDatumKurz, formatDauer, formatSaldo, formatWochentag, formatZeit } from '../../core/format';
import { useNow } from '../../core/hooks/useNow';
import { useMandant } from '../../core/mandant/mandantStore';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { cx } from '../../core/ui/cx';
import { jetztInZone } from '../../core/zeitzone';
import { berechneMonat, berechneTageFuer } from '../personal/personal.model';
import { useRechte } from '../personal/rechte';
import { StempeluhrGross } from '../personal/Stempeluhr';
import personal from '../personal/Personal.module.css';
import { TagChip } from '../zeiterfassung/WochenUebersicht';
import { AbschlussDialog, EintragDialog } from '../zeiterfassung/ZeitDialoge';
import { kannEinreichen, monatLabel, monatsabschlussEntwurf, wochenTage } from '../zeiterfassung/zeiterfassung.model';
import raster from '../zeiterfassung/Zeitraster.module.css';
import { useApp } from './AppKontext';
import styles from './Seiten.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

const ABSCHLUSS_TON = { eingereicht: 'signal', genehmigt: 'ok', zurueckgewiesen: 'danger' } as const;

function saldoKlasse(minuten: number): string | undefined {
  if (minuten > 0) return personal.plus;
  if (minuten < 0) return personal.minus;
  return undefined;
}

// jh› Die App stempelt für die angemeldete Person, nicht für den angezeigten Techniker (Demo «als Techniker»).
//     Woche und Monat sind die Selbstkontrolle: Stimmt mein Saldo, fehlt ein Tag, ist der Monat eingereicht?
export function ZeitSeite() {
  const { state, aktionen } = useApp();
  const rechte = useRechte();
  const mandant = useMandant();
  const navigate = useNavigate();
  const uhr = jetztInZone(mandant.zeitzone, useNow());
  const heute = uhr.datum;
  const jetztMin = uhr.minuten;
  const person = rechte.mitarbeiter;
  const [eintragOffen, setEintragOffen] = useState(false);
  const [abschlussOffen, setAbschlussOffen] = useState(false);

  const woche = useMemo(() => (person ? berechneTageFuer(person, wochenTage(startOfWeek(heute)), state, mandant, heute, jetztMin) : []), [person, state, mandant, heute, jetztMin]);
  const konto = useMemo(() => (person ? berechneMonat(person, monatVon(heute), state, mandant, heute, jetztMin) : null), [person, state, mandant, heute, jetztMin]);

  if (!person || !konto) {
    return (
      <div className={styles.seite}>
        <p className={styles.hinweisKarte}>Keine Personalakte verknüpft – die Stempeluhr steht nur der eigenen Person zur Verfügung.</p>
      </div>
    );
  }

  const bisHeute = woche.filter((tag) => !tag.zukunft);
  const erfasstMin = bisHeute.reduce((summe, tag) => summe + tag.arbeitMin, 0);
  const erwartetMin = bisHeute.reduce((summe, tag) => summe + tag.sollMin, 0);
  const darfErfassen = rechte.hat('zeit:erfassen') && !konto.gesperrt;
  const letzte = konto.tage.filter((tag) => !tag.zukunft && (tag.eintraege.length > 0 || tag.grund === 'arbeitstag' || tag.grund === 'absenz')).slice(-6).reverse();

  return (
    <div className={styles.seite}>
      <StempeluhrGross geraet="app" onNachtragen={darfErfassen ? () => setEintragOffen(true) : undefined} />

      <section className={styles.abschnitt} aria-label="Diese Woche">
        <header className={styles.abschnittKopf}>
          <h2>Diese Woche</h2>
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

      <section className={styles.abschnitt} aria-label="Monat">
        <header className={styles.abschnittKopf}>
          <h2>{monatLabel(konto.monat)}</h2>
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
        <ul className={styles.zeitTage} aria-label="Letzte Tage">
          {letzte.map((tag) => (
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
        </ul>
        <div className={styles.zeitAktionen}>
          {darfErfassen && (
            <Button variant="secondary" size="sm" icon={CalendarPlus} onClick={() => setEintragOffen(true)}>
              Zeit nachtragen
            </Button>
          )}
          {darfErfassen && kannEinreichen(konto, heute) && (
            <Button variant="primary" size="sm" icon={Send} onClick={() => setAbschlussOffen(true)}>
              {konto.abschluss?.status === 'zurueckgewiesen' ? 'Erneut einreichen' : 'Monat einreichen'}
            </Button>
          )}
          <Button variant="ghost" size="sm" icon={Monitor} onClick={() => navigate(`/zeiterfassung/${person.id}`)}>
            Zeitkonto
          </Button>
        </div>
      </section>

      <EintragDialog open={eintragOffen} mitarbeiter={person} datum={heute} heute={heute} eintraege={state.zeiteintraege} onClose={() => setEintragOffen(false)} onSpeichern={(entwurf) => aktionen.zeitEintraegeAnlegen([entwurf])} />
      <AbschlussDialog open={abschlussOffen} konto={konto} onClose={() => setAbschlussOffen(false)} onEinreichen={(bemerkung) => aktionen.monatEinreichen(monatsabschlussEntwurf(konto, bemerkung || undefined))} />
    </div>
  );
}

/* ◆ jh · eof */
