/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/absenzen/AbsenzenPage.tsx                  │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Modul Ferien & Absenzen: Kacheln, Liste oder Planer, Dossier, Antrag  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, TreePalm } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { meldeAenderungen } from '../../core/aenderungen';
import { useHeute } from '../../core/arbeitstag';
import { ABSENZ_ARTEN, ABSENZ_LABEL, ABSENZ_STATUS_LABEL, absenzenFuerSicht } from '../../core/domain/absenz';
import type { Absenz, AbsenzArt } from '../../core/domain/absenz';
import { monatVerschieben, monatVon, tageImMonat } from '../../core/domain/zeit';
import type { MonatsSchluessel } from '../../core/domain/zeit';
import { formatDatumKurz, formatZeitpunktKurz } from '../../core/format';
import { useHotkey } from '../../core/hooks/useHotkey';
import { useRegisterKommandos } from '../../core/kommando';
import type { Kommando } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { useMandant } from '../../core/mandant/mandantStore';
import { findModul } from '../../core/modules.config';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { Auswahl } from '../../core/ui/Form';
import { Kacheln } from '../../core/ui/Kacheln';
import type { Kachel } from '../../core/ui/Kacheln';
import { Leer } from '../../core/ui/Leer';
import { ModulSeite, ModulWerkzeuge } from '../../core/ui/ModulSeite';
import { SegmentedControl } from '../../core/ui/SegmentedControl';
import { Suchfeld } from '../../core/ui/Suchfeld';
import { Tabelle } from '../../core/ui/Tabelle';
import type { Spalte } from '../../core/ui/Tabelle';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '../../mock';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { useDemoReset } from '../dispo/store/useDemoReset';
import { PersonZelle } from '../personal/PersonAvatar';
import { buildPersonViews } from '../personal/personal.model';
import { useRechte } from '../personal/rechte';
import personal from '../personal/Personal.module.css';
import { useGlobaleSuchquellen } from '../suche/globaleSuche';
import { isMonat, monatLabel } from '../zeiterfassung/zeiterfassung.model';
import { AbsenzDialog } from './AbsenzDialog';
import type { AbsenzVorgabe } from './AbsenzDialog';
import { AbsenzDossier } from './AbsenzDossier';
import { Jahresplaner } from './Jahresplaner';
import { ABSENZ_SICHTEN, ABSENZ_STATUS_TON, LEERER_ABSENZ_FILTER, buildAbsenzViews, buildPlaner, filterAbsenzen, jahreVon, zaehleAbsenzen } from './absenzen.model';
import type { AbsenzFilter, AbsenzSicht, AbsenzView } from './absenzen.model';
import styles from './AbsenzenPage.module.css';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Spalten ─────────────────────────────────────────────────

const SICHT_TON = { alle: 'neutral', beantragt: 'signal', heute: 'ok', kommend: 'neutral', ferien: 'neutral', gesundheit: 'mute' } as const;

const SPALTEN: readonly Spalte<AbsenzView>[] = [
  { id: 'person', label: 'Mitarbeiter/in', render: (view) => <PersonZelle mitarbeiter={view.person.mitarbeiter} techniker={view.person.techniker} />, sortWert: (view) => `${view.person.mitarbeiter.nachname} ${view.person.mitarbeiter.vorname}` },
  { id: 'art', label: 'Art', render: (view) => <Chip tone={view.absenz.art === 'ferien' ? 'tint' : 'neutral'} className={view.absenz.art === 'ferien' ? styles.ferienChip : undefined}>{ABSENZ_LABEL[view.absenz.art]}</Chip>, sortWert: (view) => ABSENZ_LABEL[view.absenz.art] },
  {
    id: 'von',
    label: 'Zeitraum',
    render: (view) => (view.absenz.von === view.absenz.bis ? `${formatDatumKurz(view.absenz.von)}${view.absenz.halberTag ? ' ½' : ''}` : `${formatDatumKurz(view.absenz.von)} – ${formatDatumKurz(view.absenz.bis)}`),
    sortWert: (view) => view.absenz.von,
    mono: true,
  },
  { id: 'tage', label: 'Tage', render: (view) => view.tage, sortWert: (view) => view.tage, align: 'right', mono: true },
  { id: 'status', label: 'Status', render: (view) => <Chip tone={ABSENZ_STATUS_TON[view.absenz.status]}>{ABSENZ_STATUS_LABEL[view.absenz.status]}</Chip>, sortWert: (view) => view.absenz.status },
  { id: 'beantragt', label: 'Beantragt', render: (view) => (view.absenz.beantragtAm ? `${formatZeitpunktKurz(view.absenz.beantragtAm)} · ${view.absenz.beantragtVon ?? ''}` : <span className={personal.leerWert}>–</span>), sortWert: (view) => view.absenz.beantragtAm ?? '', mono: true, nebensaechlich: true },
  { id: 'konflikt', label: 'Plan', render: (view) => (view.einsaetze.length > 0 ? <Chip tone="danger">{view.einsaetze.length} Einsätze</Chip> : <span className={personal.leerWert}>–</span>), sortWert: (view) => view.einsaetze.length, nebensaechlich: true },
];

type Ansicht = 'liste' | 'planer';

// ── §2 · Seite ───────────────────────────────────────────────────

export function AbsenzenPage() {
  const { absenzId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const heute = useHeute();
  const state = useDispoState();
  const mandant = useMandant();
  const rechte = useRechte();
  const aktionen = useDispoAktionen();

  const ansicht: Ansicht = params.get('ansicht') === 'planer' ? 'planer' : 'liste';
  const monatParam = params.get('monat');
  const monat: MonatsSchluessel = isMonat(monatParam) ? monatParam : monatVon(heute);
  const [sicht, setSicht] = useState<AbsenzSicht>('alle');
  const [filter, setFilter] = useState<AbsenzFilter>(() => ({ ...LEERER_ABSENZ_FILTER, mitarbeiterId: params.get('mitarbeiter') ?? 'alle' }));
  const [dialog, setDialog] = useState<{ offen: boolean; absenz?: Absenz; vorgabe?: AbsenzVorgabe }>({ offen: false });

  const sichtbare = useMemo(() => rechte.sichtbare('absenzen'), [rechte]);
  const personen = useMemo(() => buildPersonViews(state.stammdaten, heute, sichtbare), [state.stammdaten, heute, sichtbare]);
  const absenzen = useMemo(() => absenzenFuerSicht(state.stammdaten.absenzen, rechte.gesundheit), [state.stammdaten.absenzen, rechte.gesundheit]);
  const views = useMemo(() => buildAbsenzViews(absenzen, personen, state.einsaetze, heute, mandant.kanton, mandant.betrieblicheFeiertage), [absenzen, personen, state.einsaetze, heute, mandant]);
  const zaehler = useMemo(() => zaehleAbsenzen(views, heute), [views, heute]);
  const sichtbar = useMemo(() => filterAbsenzen(views, sicht, filter, heute), [views, sicht, filter, heute]);
  const jahre = useMemo(() => jahreVon(views, heute), [views, heute]);
  const tage = useMemo(() => tageImMonat(monat), [monat]);
  const planer = useMemo(() => buildPlaner(filter.mitarbeiterId === 'alle' ? personen : personen.filter((person) => person.mitarbeiter.id === filter.mitarbeiterId), absenzen, tage, heute, mandant.kanton, mandant.betrieblicheFeiertage), [personen, filter.mitarbeiterId, absenzen, tage, heute, mandant]);
  const gewaehlt = absenzId ? (views.find((view) => view.absenz.id === absenzId) ?? null) : null;
  const erfassenFuer = useMemo(() => (rechte.hat('absenzen:bearbeiten') ? personen : personen.filter((person) => person.mitarbeiter.id === rechte.mitarbeiter?.id)), [personen, rechte]);
  const darfErfassen = rechte.hat('absenzen:erfassen') && erfassenFuer.length > 0;

  useGlobaleSuchquellen();
  useEffect(() => {
    meldeAenderungen('dispo', state.protokoll.length);
  }, [state.protokoll.length]);

  const setParam = useCallback(
    (name: string, wert: string | null) => {
      const naechste = new URLSearchParams(params);
      if (wert === null) naechste.delete(name);
      else naechste.set(name, wert);
      setParams(naechste, { replace: true });
    },
    [params, setParams],
  );
  const zurListe = useCallback(() => navigate(`/absenzen?${params.toString()}`), [navigate, params]);
  useHotkey({ key: 'Escape', inInputs: true }, () => {
    if (dialog.offen) setDialog({ offen: false });
    else if (absenzId) zurListe();
  });
  useHotkey({ key: 'n' }, () => darfErfassen && setDialog({ offen: true }));

  const kacheln = useMemo<Kachel[]>(() => ABSENZ_SICHTEN.filter((eintrag) => eintrag.id !== 'gesundheit' || rechte.gesundheit).map((eintrag) => ({ id: eintrag.id, label: eintrag.label, zahl: zaehler[eintrag.id], ton: zaehler[eintrag.id] > 0 ? SICHT_TON[eintrag.id] : 'neutral' })), [zaehler, rechte.gesundheit]);
  const demoReset = useDemoReset();
  const kommandos = useMemo<Kommando[]>(
    () => [
      ...(darfErfassen ? [{ id: 'absenzen:neu', label: 'Absenz beantragen', gruppe: 'aktion' as const, icon: Plus, kuerzel: 'N', run: () => setDialog({ offen: true }) }] : []),
      ...ABSENZ_SICHTEN.map<Kommando>((eintrag) => ({ id: `absenzen:${eintrag.id}`, label: `Absenzen: ${eintrag.label}`, gruppe: 'ansicht', icon: TreePalm, run: () => setSicht(eintrag.id) })),
      { id: 'absenzen:planer', label: 'Absenzen: Planer', gruppe: 'ansicht', icon: TreePalm, run: () => setParam('ansicht', 'planer') },
      demoReset.kommando,
    ],
    [darfErfassen, demoReset.kommando, setParam],
  );
  useRegisterKommandos('absenzen', kommandos);

  const speichern = (entwurf: Parameters<typeof aktionen.absenzBeantragen>[0], bestehend: Absenz | null) => {
    if (bestehend) {
      aktionen.absenzAendern({ ...bestehend, ...entwurf });
      return;
    }
    const absenz = aktionen.absenzBeantragen(entwurf);
    navigate(`/absenzen/${absenz.id}?${params.toString()}`);
  };

  return (
    <AppShell modul={findModul('absenzen')} menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <ModulSeite
        label="Ferien & Absenzen"
        detailOffen={absenzId !== undefined}
        onZurueck={zurListe}
        liste={
          <>
            <Kacheln kacheln={kacheln} aktiv={sicht} onWahl={(id) => setSicht(id as AbsenzSicht)} label="Sicht" />
            <ModulWerkzeuge anzahl={ansicht === 'liste' ? `${sichtbar.length} von ${views.length}` : `${planer.length} Personen`}>
              <SegmentedControl label="Ansicht" options={[{ value: 'liste', label: 'Liste' }, { value: 'planer', label: 'Planer' }]} value={ansicht} onChange={(wert) => setParam('ansicht', wert === 'liste' ? null : wert)} />
              <Suchfeld wert={filter.suche} onChange={(suche) => setFilter((aktuell) => ({ ...aktuell, suche }))} placeholder="Name, Art, Notiz …" label="Absenzen durchsuchen" />
              <Auswahl value={filter.mitarbeiterId} aria-label="Person" onChange={(event) => setFilter((aktuell) => ({ ...aktuell, mitarbeiterId: event.target.value }))}>
                <option value="alle">Alle Mitarbeitenden</option>
                {personen.map((person) => (
                  <option key={person.mitarbeiter.id} value={person.mitarbeiter.id}>
                    {person.mitarbeiter.kuerzel} · {person.mitarbeiter.vorname} {person.mitarbeiter.nachname}
                  </option>
                ))}
              </Auswahl>
              <Auswahl value={filter.art} aria-label="Art" onChange={(event) => setFilter((aktuell) => ({ ...aktuell, art: event.target.value as AbsenzArt | 'alle' }))}>
                <option value="alle">Alle Arten</option>
                {ABSENZ_ARTEN.filter((art) => rechte.gesundheit || (art !== 'krank' && art !== 'unfall')).map((art) => (
                  <option key={art} value={art}>
                    {ABSENZ_LABEL[art]}
                  </option>
                ))}
              </Auswahl>
              <Auswahl value={String(filter.jahr)} aria-label="Jahr" onChange={(event) => setFilter((aktuell) => ({ ...aktuell, jahr: event.target.value === 'alle' ? 'alle' : Number(event.target.value) }))}>
                <option value="alle">Alle Jahre</option>
                {jahre.map((jahr) => (
                  <option key={jahr} value={jahr}>
                    {jahr}
                  </option>
                ))}
              </Auswahl>
              {darfErfassen && (
                <Button variant="primary" size="sm" icon={Plus} onClick={() => setDialog({ offen: true })}>
                  Beantragen
                </Button>
              )}
            </ModulWerkzeuge>
            {ansicht === 'liste' ? (
              <Tabelle spalten={SPALTEN} zeilen={sichtbar} zeilenId={(view) => view.absenz.id} label="Absenzen" aktivId={absenzId ?? null} onZeile={(view) => navigate(`/absenzen/${view.absenz.id}?${params.toString()}`)} standardSortierung={{ id: 'von', richtung: 'ab' }} leer="Keine Absenzen in dieser Sicht." />
            ) : (
              <Jahresplaner
                zeilen={planer}
                tage={tage}
                titel={monatLabel(monat)}
                onZurueck={() => setParam('monat', monatVerschieben(monat, -1))}
                onVor={() => setParam('monat', monatVerschieben(monat, 1))}
                onHeute={() => setParam('monat', null)}
                onAbsenz={(id) => navigate(`/absenzen/${id}?${params.toString()}`)}
                {...(darfErfassen ? { onNeu: (mitarbeiterId: string, datum: typeof heute) => erfassenFuer.some((person) => person.mitarbeiter.id === mitarbeiterId) && setDialog({ offen: true, vorgabe: { mitarbeiterId, von: datum, bis: datum } }) } : {})}
              />
            )}
          </>
        }
        detail={
          gewaehlt ? (
            <AbsenzDossier view={gewaehlt} alleViews={views} stammdaten={state.stammdaten} rechte={rechte} aktionen={aktionen} mandant={mandant} heute={heute} onBearbeiten={(absenz) => setDialog({ offen: true, absenz })} />
          ) : (
            <Leer icon={TreePalm} titel="Absenz nicht sichtbar" text="Die Absenz existiert nicht oder liegt ausserhalb Ihres Umfangs." fuellend>
              <Button variant="secondary" size="sm" onClick={zurListe}>
                Zur Liste
              </Button>
            </Leer>
          )
        }
      />
      <AbsenzDialog
        open={dialog.offen}
        personen={dialog.absenz ? personen.filter((person) => person.mitarbeiter.id === dialog.absenz?.mitarbeiterId) : erfassenFuer}
        vorgabe={dialog.vorgabe}
        absenz={dialog.absenz ?? null}
        rechte={rechte}
        mandant={mandant}
        absenzen={state.stammdaten.absenzen}
        heute={heute}
        onClose={() => setDialog({ offen: false })}
        onSpeichern={speichern}
      />
    </AppShell>
  );
}

/* ◆ jh · eof */
