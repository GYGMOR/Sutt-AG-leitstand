/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dashboard/DashboardPage.tsx                │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Dashboard: Kennzahlen, Auswertung (Diagramme), Feld, Eingang          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import { CalendarRange, ClipboardList, FileWarning, Inbox, PackageCheck, Receipt, TreePalm, TriangleAlert, Users, Warehouse } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useArbeitstag } from '../../core/arbeitstag';
import { minutesOfDay, splitZeitpunkt } from '../../core/datum';
import { DRINGLICHKEIT_LABEL, isDringend } from '../../core/domain/auftrag';
import { ABSENZ_LABEL, fullName } from '../../core/domain/stammdaten';
import { formatChf, formatDatum, formatDatumKurz, formatSeit, formatWochentag, formatZeit } from '../../core/format';
import { useNow } from '../../core/hooks/useNow';
import { useRegisterKommandos } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { useMandant } from '../../core/mandant/mandantStore';
import { findModul } from '../../core/modules.config';
import { Avatar } from '../../core/ui/Avatar';
import { Button } from '../../core/ui/Button';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { Chip } from '../../core/ui/Chip';
import { Kacheln } from '../../core/ui/Kacheln';
import type { Kachel } from '../../core/ui/Kacheln';
import { Typenschild } from '../../core/ui/Typenschild';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import { cx } from '../../core/ui/cx';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '../../mock';
import { KapazitaetsBand } from '../dispo/KapazitaetsBand';
import { findKonflikte } from '../dispo/konflikte';
import { LivePuls } from '../dispo/LivePuls';
import { initDispoStore, setAnsicht } from '../dispo/store/dispoStore';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { useDemoReset } from '../dispo/store/useDemoReset';
import { useStandFuerSicht } from '../personal/rechte';
import { useGlobaleSuchquellen } from '../suche/globaleSuche';
import { Auswertung } from './Auswertung';
import { buildAuswertung, buildTagesbild } from './dashboard.model';
import type { FeldZeile } from './dashboard.model';
import styles from './DashboardPage.module.css';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Hilfen ──────────────────────────────────────────────────

const PULS_RANG = { 'vor-ort': 0, ueberzieht: 0, unterwegs: 1, frei: 2, 'noch-nicht': 3, feierabend: 4, abwesend: 5 } as const;

function feldText(zeile: FeldZeile): string {
  if (zeile.aktuell) return `${zeile.aktuell.kunde.kurzname} · bis ${formatZeit(zeile.aktuell.einsatz.startMin + zeile.aktuell.einsatz.dauerMin)}`;
  if (zeile.naechster) return `nächster ${formatZeit(zeile.naechster.einsatz.startMin)} · ${zeile.naechster.kunde.kurzname}`;
  if (zeile.total > 0) return 'alle Einsätze erledigt';
  return 'kein Einsatz heute';
}

// ── §2 · Seite ───────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const { heute, setDatum } = useArbeitstag();
  const jetztMin = minutesOfDay(useNow());
  const state = useStandFuerSicht();
  const aktionen = useDispoAktionen();
  const { stammdaten, einsaetze, rapporte } = state;

  const mandant = useMandant();
  const konflikte = useMemo(() => findKonflikte(stammdaten, einsaetze, heute, rapporte), [stammdaten, einsaetze, heute, rapporte]);
  const bild = useMemo(() => buildTagesbild(state, heute, jetztMin, konflikte.length), [state, heute, jetztMin, konflikte.length]);
  const auswertung = useMemo(() => buildAuswertung(state, mandant, heute, jetztMin), [state, mandant, heute, jetztMin]);
  const feld = useMemo(() => [...bild.feld].sort((a, b) => PULS_RANG[a.puls.art] - PULS_RANG[b.puls.art] || a.techniker.nachname.localeCompare(b.techniker.nachname)), [bild.feld]);

  useGlobaleSuchquellen();
  const demoReset = useDemoReset();
  const kommandos = useMemo(() => [demoReset.kommando], [demoReset.kommando]);
  useRegisterKommandos('dashboard', kommandos);

  const zumEingang = () => {
    setAnsicht({ panelEingeklappt: false, panelTab: 'eingang' });
    navigate('/dispo/plantafel');
  };
  const zumPlan = (einsatzId?: string) => {
    setDatum(heute);
    if (einsatzId) aktionen.select({ art: 'einsatz', einsatzId });
    navigate('/dispo/plantafel');
  };

  const kacheln: Kachel[] = [
    { id: 'einsaetze', label: 'Einsätze heute', zahl: `${bild.einsaetze.erledigt} / ${bild.einsaetze.total}`, hinweis: `${bild.einsaetze.laufend} laufend · ${bild.einsaetze.geplant} geplant`, icon: CalendarRange },
    { id: 'eingang', label: 'Eingang', zahl: bild.eingang.total, hinweis: bild.eingang.dringend > 0 ? `${bild.eingang.dringend} dringend` : 'nichts Dringendes', ton: bild.eingang.dringend > 0 ? 'signal' : 'neutral', icon: Inbox },
    { id: 'konflikte', label: 'Konflikte', zahl: bild.konflikte, hinweis: bild.konflikte > 0 ? 'im Plan prüfen' : 'alles sauber', ton: bild.konflikte > 0 ? 'danger' : 'ok', icon: TriangleAlert },
    { id: 'rapporte', label: 'Rapporte zu prüfen', zahl: bild.rapporte.pruefen, hinweis: `${bild.rapporte.fehlend} fehlend`, ton: bild.rapporte.fehlend > 0 ? 'signal' : 'neutral', icon: FileWarning },
    { id: 'verrechnen', label: 'Zu verrechnen', zahl: formatChf(bild.rapporte.verrechnenChf.totalChf), hinweis: `${bild.rapporte.verrechnen} freigegebene Rapporte`, ton: 'ok', icon: Receipt },
    { id: 'lager', label: 'Lieferungen', zahl: bild.lager.ueberfaellig + bild.lager.heute, hinweis: `${bild.lager.ueberfaellig} überfällig · ${bild.lager.knapp} knapp · ${bild.lager.leer} leer`, ton: bild.lager.ueberfaellig > 0 ? 'danger' : bild.lager.heute > 0 ? 'ok' : 'neutral', icon: Warehouse },
    { id: 'abwesend', label: 'Abwesend', zahl: bild.abwesend.length, hinweis: bild.abwesend.map((eintrag) => eintrag.techniker.kuerzel).join(' · ') || 'alle da', ton: 'mute', icon: TreePalm },
  ];

  const kachelWahl = (id: string) => {
    switch (id) {
      case 'eingang':
        zumEingang();
        return;
      case 'rapporte':
      case 'verrechnen':
        navigate('/rapporte');
        return;
      case 'lager':
        navigate('/lager/bestellungen');
        return;
      default:
        zumPlan();
    }
  };

  return (
    <AppShell modul={findModul('dashboard')} menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <div className={styles.seite}>
        <header className={styles.kopf}>
          <div>
            <CapsLabel>Tagesüberblick</CapsLabel>
            <h1 className={styles.titel}>
              {formatWochentag(heute)}, {formatDatum(heute)}
            </h1>
          </div>
          <p className={styles.kopfText}>
            Stand {formatZeit(jetztMin)} · {stammdaten.techniker.length - bild.abwesend.length} Techniker im Feld · {bild.einsaetze.total} Einsätze geplant
          </p>
        </header>

        <Kacheln kacheln={kacheln} onWahl={kachelWahl} label="Kennzahlen" gross />

        <Auswertung auswertung={auswertung} heute={heute} jetztMin={jetztMin} onPerson={(mitarbeiterId) => navigate(`/zeiterfassung/${mitarbeiterId}`)} onZeit={() => navigate('/zeiterfassung?ansicht=tag')} onRapporte={() => navigate('/rapporte')} />

        <div className={styles.raster}>
          <section className={cx(styles.karte, styles.karteFeld)} aria-label="Im Feld">
            <header className={styles.karteKopf}>
              <CapsLabel as="h2">Im Feld jetzt</CapsLabel>
              <Button variant="ghost" size="sm" icon={CalendarRange} onClick={() => zumPlan()}>
                Plantafel
              </Button>
            </header>
            <ul className={styles.feld}>
              {feld.map((zeile) => (
                <li key={zeile.techniker.id} className={styles.feldZeile}>
                  <Avatar techniker={zeile.techniker} size="md" />
                  <div className={styles.feldText}>
                    <span className={styles.feldName}>{fullName(zeile.techniker)}</span>
                    <span className={styles.feldMeta}>{feldText(zeile)}</span>
                  </div>
                  <LivePuls puls={zeile.puls} />
                  <button type="button" className={cx(styles.mono, styles.feldZaehler)} onClick={() => zumPlan(zeile.aktuell?.einsatz.id ?? zeile.naechster?.einsatz.id)} title="Im Plan zeigen">
                    {zeile.erledigt}/{zeile.total}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={cx(styles.karte, styles.karteKapazitaet)} aria-label="Kapazität">
            <KapazitaetsBand tagesZeilen={bild.zeilen} />
          </section>

          <section className={styles.karte} aria-label="Eingang">
            <header className={styles.karteKopf}>
              <CapsLabel as="h2">Eingang · dringend zuerst</CapsLabel>
              <Button variant="ghost" size="sm" icon={Inbox} onClick={zumEingang}>
                Alle {bild.eingang.total}
              </Button>
            </header>
            {bild.pendenzen.length === 0 && <p className={styles.leer}>Der Eingang ist leer.</p>}
            <ul className={styles.liste}>
              {bild.pendenzen.map((view) => (
                <li key={view.pendenz.id} className={styles.listenZeile}>
                  <Verweis zu={ZIEL.auftrag(view.auftrag.id)} label="Auftrag" wert={view.auftrag.nummer} />
                  <span className={styles.listenText}>
                    <span className={styles.listenHaupt}>{view.kunde.kurzname}</span> · {view.auftrag.fehlerbild}
                  </span>
                  {isDringend(view.auftrag.dringlichkeit) ? (
                    <Chip tone="signal">{DRINGLICHKEIT_LABEL[view.auftrag.dringlichkeit]}</Chip>
                  ) : (
                    <span className={styles.listenMeta}>{view.pendenz.anlass === 'folgetermin' ? 'Folgetermin' : formatSeit(splitZeitpunkt(view.pendenz.erstelltAm).datum, heute)}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.karte} aria-label="Rapporte">
            <header className={styles.karteKopf}>
              <CapsLabel as="h2">Rapporte</CapsLabel>
              <Button variant="ghost" size="sm" icon={ClipboardList} onClick={() => navigate('/rapporte')}>
                Modul
              </Button>
            </header>
            {bild.fehlendeRapporte.length === 0 && bild.zuPruefen.length === 0 && <p className={styles.leer}>Nichts fällig.</p>}
            <ul className={styles.liste}>
              {bild.fehlendeRapporte.map((view) => (
                <li key={view.einsatz.id} className={styles.listenZeile}>
                  <Verweis zu={ZIEL.auftrag(view.auftrag.id)} label="Auftrag" wert={view.auftrag.nummer} />
                  <span className={styles.listenText}>
                    <span className={styles.listenHaupt}>{view.kunde.kurzname}</span> · {view.techniker.kuerzel} · {formatDatumKurz(view.einsatz.datum)}
                  </span>
                  <Chip tone="signal" icon={FileWarning}>
                    fehlt
                  </Chip>
                </li>
              ))}
              {bild.zuPruefen.map((view) => (
                <li key={view.rapport.id} className={styles.listenZeile}>
                  <Verweis zu={ZIEL.rapport(view.rapport.id)} label="Rapport" wert={view.rapport.nummer} />
                  <span className={styles.listenText}>
                    <span className={styles.listenHaupt}>{view.kunde.kurzname}</span> · {view.auftrag.fehlerbild}
                  </span>
                  <Chip tone={view.rapport.status === 'unterschrieben' ? 'ok' : 'neutral'}>{view.rapport.status === 'unterschrieben' ? 'unterschrieben' : 'erstellt'}</Chip>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.karte} aria-label="Lager">
            <header className={styles.karteKopf}>
              <CapsLabel as="h2">Lager & Lieferungen</CapsLabel>
              <Button variant="ghost" size="sm" icon={Warehouse} onClick={() => navigate('/lager/bestellungen')}>
                Modul
              </Button>
            </header>
            {bild.lieferungen.length === 0 && <p className={styles.leer}>Keine Lieferung fällig.</p>}
            <ul className={styles.liste}>
              {bild.lieferungen.map((view) => (
                <li key={view.bestellung.id} className={styles.listenZeile}>
                  <Verweis zu={ZIEL.bestellung(view.bestellung.id)} label="Best." wert={view.bestellung.nummer} />
                  <span className={styles.listenText}>
                    <span className={styles.listenHaupt}>
                      {view.bestellung.menge}× {view.bestellung.bezeichnung}
                    </span>
                    {view.auftrag && ` · ${view.auftrag.nummer}`}
                  </span>
                  <Chip tone={view.ueberfaellig ? 'danger' : 'ok'} icon={PackageCheck}>
                    {view.ueberfaellig ? `seit ${formatDatumKurz(view.bestellung.liefertermin)}` : 'heute'}
                  </Chip>
                </li>
              ))}
            </ul>
            <p className={styles.karteFuss}>
              {bild.lager.knapp} Artikel knapp · {bild.lager.leer} nicht am Lager
            </p>
          </section>

          <section className={styles.karte} aria-label="Abwesenheiten">
            <header className={styles.karteKopf}>
              <CapsLabel as="h2">Abwesend heute</CapsLabel>
              <Button variant="ghost" size="sm" icon={Users} onClick={() => zumPlan()}>
                Plan
              </Button>
            </header>
            {bild.abwesend.length === 0 && <p className={styles.leer}>Alle Techniker sind da.</p>}
            <ul className={styles.liste}>
              {bild.abwesend.map((eintrag) => (
                <li key={eintrag.techniker.id} className={styles.listenZeile}>
                  <Avatar techniker={eintrag.techniker} size="sm" />
                  <span className={styles.listenText}>
                    <span className={styles.listenHaupt}>{fullName(eintrag.techniker)}</span> · {ABSENZ_LABEL[eintrag.absenz.art]} bis {formatDatumKurz(eintrag.absenz.bis)}
                  </span>
                  <Typenschild label="Region" wert={eintrag.techniker.region} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

/* ◆ jh · eof */
