/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/ZeitSeite.tsx                           │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Zeit: grosse Stempeluhr, Woche als Chips, Monat, Nachtragen, Monat    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { CalendarPlus, Monitor, Send } from 'lucide-react';
import { startOfWeek } from '@sl/core/datum';
import { ABSENZ_LABEL } from '@sl/core/domain/absenz';
import { ABSCHLUSS_STATUS_LABEL, monatVon } from '@sl/core/domain/zeit';
import { formatDatumKurz, formatDauer, formatSaldo, formatWochentag, formatZeit } from '@sl/core/format';
import { Button } from '@sl/core/ui/Button';
import { Chip } from '@sl/core/ui/Chip';
import { cx } from '@sl/core/ui/cx';
import { berechneMonat, berechneTageFuer } from '@sl/modules/personal/personal.model';
import { StempeluhrGross } from '@sl/modules/personal/Stempeluhr';
import { TagChip } from '@sl/modules/zeiterfassung/WochenUebersicht';
import { AbschlussDialog, EintragDialog } from '@sl/modules/zeiterfassung/ZeitDialoge';
import { kannEinreichen, monatLabel, monatsabschlussEntwurf, wochenTage } from '@sl/modules/zeiterfassung/zeiterfassung.model';
import raster from '@sl/modules/zeiterfassung/Zeitraster.module.css';
import styles from '../bausteine/Seiten.module.css';
import { useApp } from '../rahmen/AppKontext';

// ── §1 · Komponente ──────────────────────────────────────────────

const ABSCHLUSS_TON = { eingereicht: 'signal', genehmigt: 'ok', zurueckgewiesen: 'danger' } as const;

function saldoKlasse(minuten: number): string | undefined {
  if (minuten > 0) return styles.plus;
  if (minuten < 0) return styles.minus;
  return undefined;
}

// jh› Die App stempelt für die angemeldete Person – auch wenn das Büro «als Techniker» hineinschaut.
//     Woche und Monat sind die Selbstkontrolle: Stimmt mein Saldo, fehlt ein Tag, ist der Monat eingereicht?
export function ZeitSeite() {
  const { mitarbeiter, heute, jetztMin, state, aktionen, rechte, mandant } = useApp();
  const [eintragOffen, setEintragOffen] = useState(false);
  const [abschlussOffen, setAbschlussOffen] = useState(false);

  const woche = useMemo(() => (mitarbeiter ? berechneTageFuer(mitarbeiter, wochenTage(startOfWeek(heute)), state, mandant, heute, jetztMin) : []), [mitarbeiter, state, mandant, heute, jetztMin]);
  const konto = useMemo(() => (mitarbeiter ? berechneMonat(mitarbeiter, monatVon(heute), state, mandant, heute, jetztMin) : null), [mitarbeiter, state, mandant, heute, jetztMin]);

  if (!mitarbeiter || !konto) {
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

      <div className={styles.zweispaltig}>
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
          <div className={styles.aktionen}>
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
            <Button variant="ghost" size="sm" icon={Monitor} onClick={() => window.open(`/zeiterfassung/${mitarbeiter.id}`, '_blank', 'noopener')}>
              Zeitkonto im Leitstand
            </Button>
          </div>
        </section>
      </div>

      <EintragDialog open={eintragOffen} mitarbeiter={mitarbeiter} datum={heute} heute={heute} eintraege={state.zeiteintraege} onClose={() => setEintragOffen(false)} onSpeichern={(entwurf) => aktionen.zeitEintraegeAnlegen([entwurf])} />
      <AbschlussDialog open={abschlussOffen} konto={konto} onClose={() => setAbschlussOffen(false)} onEinreichen={(bemerkung) => aktionen.monatEinreichen(monatsabschlussEntwurf(konto, bemerkung || undefined))} />
    </div>
  );
}

/* ◆ jh · eof */
