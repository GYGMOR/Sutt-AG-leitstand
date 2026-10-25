/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/auftraege/AuftraegePage.tsx                │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Modul Aufträge: Phasen-Kacheln, Filter, Tabelle, Dossier, Neu         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { meldeAenderungen } from '../../core/aenderungen';
import { useArbeitstag } from '../../core/arbeitstag';
import { minutesOfDay } from '../../core/datum';
import { KATEGORIEN, KATEGORIE_LABEL } from '../../core/domain/kategorie';
import type { Kategorie } from '../../core/domain/kategorie';
import { REGIONEN, REGION_LABEL, fullName } from '../../core/domain/stammdaten';
import type { Region } from '../../core/domain/stammdaten';
import { formatChf, formatDatumKurz, formatWochentag, formatZeit } from '../../core/format';
import { useHotkey } from '../../core/hooks/useHotkey';
import { useNow } from '../../core/hooks/useNow';
import { useRegisterKommandos } from '../../core/kommando';
import type { Kommando } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { findModul } from '../../core/modules.config';
import { Avatar } from '../../core/ui/Avatar';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { Auswahl } from '../../core/ui/Form';
import { Kacheln } from '../../core/ui/Kacheln';
import type { Kachel } from '../../core/ui/Kacheln';
import { Leer } from '../../core/ui/Leer';
import { ModulSeite, ModulWerkzeuge } from '../../core/ui/ModulSeite';
import { Suchfeld } from '../../core/ui/Suchfeld';
import { Tabelle } from '../../core/ui/Tabelle';
import type { Spalte } from '../../core/ui/Tabelle';
import { Typenschild } from '../../core/ui/Typenschild';
import { kategorieKlasse } from '../../core/ui/farben';
import { MOCK_HEUTE, mockBestand, mockStammdaten, mockTelefonbuch } from '../../mock';
import { Schnellerfassung } from '../dispo/Schnellerfassung';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { useDemoReset } from '../dispo/store/useDemoReset';
import { useGlobaleSuchquellen } from '../suche/globaleSuche';
import { LEERER_AUFTRAG_FILTER, PHASEN, PHASE_LABEL, PHASE_TON, buildAuftragViews, filterAuftraege, terminVon, zaehlePhasen } from './auftraege.model';
import type { AuftragFilter, AuftragPhase, AuftragView } from './auftraege.model';
import { AuftragDossier } from './AuftragDossier';
import styles from './AuftraegePage.module.css';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Spalten ─────────────────────────────────────────────────

const KACHEL_TON = { signal: 'signal', ok: 'ok', danger: 'danger', mute: 'mute', neutral: 'neutral', tint: 'neutral' } as const;

function terminSort(view: AuftragView): string {
  const termin = terminVon(view);
  return termin ? `${termin.datum}T${String(termin.startMin).padStart(4, '0')}` : '';
}

const SPALTEN: readonly Spalte<AuftragView>[] = [
  { id: 'nummer', label: 'Auftrag', render: (view) => <Typenschild label="Auftrag" wert={view.auftrag.nummer} />, sortWert: (view) => view.auftrag.nummer, breite: '120px' },
  {
    id: 'kunde',
    label: 'Kunde · Ort',
    render: (view) => (
      <span className={styles.zelleKunde}>
        <span className={styles.kundeName}>{view.kunde.name}</span>
        <span className={styles.kundeOrt}>
          {view.liegenschaft.adresse.ort}
          {view.auftrag.wohnung && ` · ${view.auftrag.wohnung.nummer}`}
        </span>
      </span>
    ),
    sortWert: (view) => view.kunde.name,
  },
  { id: 'geraet', label: 'Gerät', render: (view) => `${view.geraet.marke} ${view.geraet.art}`, sortWert: (view) => `${view.geraet.marke} ${view.geraet.art}`, nebensaechlich: true },
  { id: 'fehlerbild', label: 'Fehlerbild', render: (view) => <span className={styles.zelleText}>{view.auftrag.fehlerbild}</span> },
  {
    id: 'kategorie',
    label: 'Kategorie',
    render: (view) => (
      <Chip tone="tint" className={kategorieKlasse(view.auftrag.kategorie)}>
        {KATEGORIE_LABEL[view.auftrag.kategorie]}
      </Chip>
    ),
    sortWert: (view) => KATEGORIE_LABEL[view.auftrag.kategorie],
    nebensaechlich: true,
  },
  { id: 'phase', label: 'Phase', render: (view) => <Chip tone={PHASE_TON[view.phase]}>{PHASE_LABEL[view.phase]}</Chip>, sortWert: (view) => PHASEN.indexOf(view.phase) },
  {
    id: 'techniker',
    label: 'Techniker',
    render: (view) =>
      view.techniker ? (
        <span className={styles.zelleTechniker}>
          <Avatar techniker={view.techniker} size="sm" /> {view.techniker.kuerzel}
        </span>
      ) : (
        <span className={styles.leerWert}>–</span>
      ),
    sortWert: (view) => view.techniker?.kuerzel ?? '',
    nebensaechlich: true,
  },
  {
    id: 'termin',
    label: 'Termin',
    render: (view) => {
      const termin = terminVon(view);
      return termin ? `${formatWochentag(termin.datum, 'kurz')} ${formatDatumKurz(termin.datum)} ${formatZeit(termin.startMin)}` : <span className={styles.leerWert}>–</span>;
    },
    sortWert: terminSort,
    mono: true,
  },
  { id: 'betrag', label: 'Betrag', render: (view) => (view.betrag ? formatChf(view.betrag.totalChf) : <span className={styles.leerWert}>–</span>), sortWert: (view) => view.betrag?.totalChf ?? -1, align: 'right', mono: true, nebensaechlich: true },
];

// ── §2 · Seite ───────────────────────────────────────────────────

export function AuftraegePage() {
  const { auftragId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { heute, setDatum } = useArbeitstag();
  const jetztMin = minutesOfDay(useNow());
  const state = useDispoState();
  const aktionen = useDispoAktionen();
  const { stammdaten, einsaetze, pendenzen, rapporte, nachrichten, bestellungen } = state;

  // jh› ?suche= aus anderen Modulen (Kunde → «Alle Aufträge»): Suche vorbelegt, Rest frei.
  const [filter, setFilter] = useState<AuftragFilter>(() => ({ ...LEERER_AUFTRAG_FILTER, suche: params.get('suche') ?? '' }));
  const [schnellOffen, setSchnellOffen] = useState(false);

  const views = useMemo(() => buildAuftragViews(stammdaten, einsaetze, pendenzen, rapporte, heute), [stammdaten, einsaetze, pendenzen, rapporte, heute]);
  const zaehler = useMemo(() => zaehlePhasen(views), [views]);
  const sichtbar = useMemo(() => filterAuftraege(views, filter), [views, filter]);
  const gewaehlt = auftragId ? (views.find((view) => view.auftrag.id === auftragId) ?? null) : null;

  useGlobaleSuchquellen();
  useEffect(() => {
    meldeAenderungen('dispo', state.protokoll.length);
  }, [state.protokoll.length]);

  const zurListe = useCallback(() => navigate('/auftraege'), [navigate]);
  useHotkey({ key: 'Escape', inInputs: true }, () => {
    if (schnellOffen) {
      setSchnellOffen(false);
      return;
    }
    if (auftragId) zurListe();
  });
  useHotkey({ key: 'n' }, () => setSchnellOffen(true));

  const kacheln = useMemo<Kachel[]>(
    () => [
      { id: 'alle', label: 'Alle', zahl: views.length },
      ...PHASEN.filter((phase) => phase !== 'ohne-termin' || zaehler[phase] > 0).map<Kachel>((phase) => ({ id: phase, label: PHASE_LABEL[phase], zahl: zaehler[phase], ton: KACHEL_TON[PHASE_TON[phase]] })),
    ],
    [views.length, zaehler],
  );

  const demoReset = useDemoReset();
  const kommandos = useMemo<Kommando[]>(
    () => [
      { id: 'auftraege:neu', label: 'Neuer Auftrag (Telefon-Schnellerfassung)', gruppe: 'aktion', icon: Plus, kuerzel: 'N', run: () => setSchnellOffen(true) },
      ...PHASEN.map<Kommando>((phase) => ({ id: `auftraege:${phase}`, label: `Aufträge: ${PHASE_LABEL[phase]}`, gruppe: 'ansicht', icon: ClipboardList, run: () => setFilter((aktuell) => ({ ...aktuell, phase })) })),
      demoReset.kommando,
    ],
    [demoReset.kommando],
  );
  useRegisterKommandos('auftraege', kommandos);

  const setzeFilter = (teil: Partial<AuftragFilter>) => setFilter((aktuell) => ({ ...aktuell, ...teil }));

  return (
    <AppShell modul={findModul('auftraege')} menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <ModulSeite
        label="Aufträge"
        detailOffen={auftragId !== undefined}
        onZurueck={zurListe}
        liste={
          <>
            <Kacheln kacheln={kacheln} aktiv={filter.phase} onWahl={(id) => setzeFilter({ phase: id as AuftragPhase | 'alle' })} label="Phase" />
            <ModulWerkzeuge anzahl={`${sichtbar.length} von ${views.length}`}>
              <Suchfeld wert={filter.suche} onChange={(suche) => setzeFilter({ suche })} placeholder="Nummer, Kunde, Adresse, Gerät, Fehlerbild …" label="Aufträge durchsuchen" />
              <Auswahl value={filter.kategorie} aria-label="Kategorie" onChange={(event) => setzeFilter({ kategorie: event.target.value as Kategorie | 'alle' })}>
                <option value="alle">Alle Kategorien</option>
                {KATEGORIEN.map((meta) => (
                  <option key={meta.id} value={meta.id}>
                    {meta.label}
                  </option>
                ))}
              </Auswahl>
              <Auswahl value={filter.technikerId} aria-label="Techniker" onChange={(event) => setzeFilter({ technikerId: event.target.value })}>
                <option value="alle">Alle Techniker</option>
                {stammdaten.techniker.map((techniker) => (
                  <option key={techniker.id} value={techniker.id}>
                    {techniker.kuerzel} · {fullName(techniker)}
                  </option>
                ))}
              </Auswahl>
              <Auswahl value={filter.region} aria-label="Region" onChange={(event) => setzeFilter({ region: event.target.value as Region | 'alle' })}>
                <option value="alle">Alle Regionen</option>
                {REGIONEN.map((region) => (
                  <option key={region} value={region}>
                    {REGION_LABEL[region]}
                  </option>
                ))}
              </Auswahl>
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setSchnellOffen(true)}>
                Neuer Auftrag
              </Button>
            </ModulWerkzeuge>
            <Tabelle
              spalten={SPALTEN}
              zeilen={sichtbar}
              zeilenId={(view) => view.auftrag.id}
              label="Aufträge"
              aktivId={auftragId ?? null}
              onZeile={(view) => navigate(`/auftraege/${view.auftrag.id}`)}
              standardSortierung={{ id: 'termin', richtung: 'ab' }}
              leer="Keine Aufträge in dieser Sicht."
            />
          </>
        }
        detail={
          gewaehlt ? (
            <AuftragDossier
              view={gewaehlt}
              stammdaten={stammdaten}
              rapporte={rapporte}
              bestellungen={bestellungen}
              nachrichten={nachrichten.filter((nachricht) => nachricht.auftragId === gewaehlt.auftrag.id)}
              heute={heute}
              jetztMin={jetztMin}
              aktionen={aktionen}
              setDatum={setDatum}
            />
          ) : (
            <Leer icon={ClipboardList} titel="Auftrag nicht gefunden" text="Der Auftrag existiert nicht mehr oder gehört zu einem anderen Stand." fuellend>
              <Button variant="secondary" size="sm" onClick={zurListe}>
                Zur Liste
              </Button>
            </Leer>
          )
        }
      />
      <Schnellerfassung
        open={schnellOffen}
        stammdaten={stammdaten}
        einsaetze={einsaetze}
        telefonbuch={mockTelefonbuch}
        heute={heute}
        jetztMin={jetztMin}
        onClose={() => setSchnellOffen(false)}
        onCreate={(auftrag, optionen) => {
          aktionen.createAuftrag(auftrag, optionen);
          navigate(`/auftraege/${auftrag.id}`);
        }}
      />
    </AppShell>
  );
}

/* ◆ jh · eof */
