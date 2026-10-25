/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/geraete/GeraetePage.tsx                    │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Modul Geräte: Kartei mit Garantie-Sichten, Filter, Tabelle, Dossier   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { WashingMachine } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { meldeAenderungen } from '../../core/aenderungen';
import { useArbeitstag } from '../../core/arbeitstag';
import { minutesOfDay } from '../../core/datum';
import { GERAETEARTEN, KENNUNG_LABEL, MARKEN } from '../../core/domain/stammdaten';
import type { Geraeteart, Marke } from '../../core/domain/stammdaten';
import { formatDatum, formatDatumKurz } from '../../core/format';
import { useHotkey } from '../../core/hooks/useHotkey';
import { useNow } from '../../core/hooks/useNow';
import { useRegisterKommandos } from '../../core/kommando';
import type { Kommando } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { findModul } from '../../core/modules.config';
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
import { MOCK_HEUTE, mockBestand, mockStammdaten, mockTelefonbuch } from '../../mock';
import { Schnellerfassung } from '../dispo/Schnellerfassung';
import type { Vorbelegung } from '../dispo/Schnellerfassung';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { useDemoReset } from '../dispo/store/useDemoReset';
import { buildAuftragViews } from '../auftraege/auftraege.model';
import { useGlobaleSuchquellen } from '../suche/globaleSuche';
import { GARANTIE_LABEL, GERAETE_SICHTEN, LEERER_GERAETE_FILTER, buildGeraeteViews, filterGeraete, zaehleGeraete } from './geraete.model';
import type { GeraetView, GeraeteFilter, GeraeteSicht } from './geraete.model';
import { GeraetDossier } from './GeraetDossier';
import styles from './GeraetePage.module.css';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Spalten ─────────────────────────────────────────────────

const SPALTEN: readonly Spalte<GeraetView>[] = [
  {
    id: 'geraet',
    label: 'Gerät',
    render: (view) => (
      <span className={styles.zelleGeraet}>
        <span className={styles.geraetName}>
          {view.geraet.marke} {view.geraet.modell}
        </span>
        <span className={styles.geraetMeta}>{view.geraet.art}</span>
      </span>
    ),
    sortWert: (view) => `${view.geraet.marke} ${view.geraet.modell}`,
  },
  { id: 'sn', label: 'Kennung', render: (view) => <Typenschild label={KENNUNG_LABEL[view.geraet.marke]} wert={view.geraet.seriennummer} />, sortWert: (view) => view.geraet.seriennummer, breite: '150px' },
  {
    id: 'standort',
    label: 'Standort',
    render: (view) =>
      view.standort ? (
        <span className={styles.zelleGeraet}>
          <span className={styles.geraetName}>{view.standort.kunde.kurzname}</span>
          <span className={styles.geraetMeta}>
            {view.standort.liegenschaft.adresse.ort}
            {view.standort.wohnung && ` · ${view.standort.wohnung.nummer}`}
          </span>
        </span>
      ) : (
        <span className={styles.leerWert}>–</span>
      ),
    sortWert: (view) => view.standort?.kunde.name ?? '',
  },
  { id: 'baujahr', label: 'Baujahr', render: (view) => view.geraet.baujahr, sortWert: (view) => view.geraet.baujahr, mono: true, nebensaechlich: true },
  {
    id: 'garantie',
    label: 'Garantie',
    render: (view) => (view.garantie === 'keine' ? <span className={styles.leerWert}>–</span> : <Chip tone={view.garantie === 'laeuft' ? 'ok' : 'mute'}>{view.geraet.garantieBis ? formatDatum(view.geraet.garantieBis) : GARANTIE_LABEL[view.garantie]}</Chip>),
    sortWert: (view) => view.geraet.garantieBis ?? '',
    nebensaechlich: true,
  },
  { id: 'einsaetze', label: 'Einsätze', render: (view) => view.einsaetze.length, sortWert: (view) => view.einsaetze.length, align: 'right', mono: true },
  { id: 'termin', label: 'Termin', render: (view) => (view.einsaetze[0] ? formatDatumKurz(view.einsaetze[0].datum) : <span className={styles.leerWert}>–</span>), sortWert: (view) => view.einsaetze[0]?.datum ?? '', mono: true },
];

// ── §2 · Seite ───────────────────────────────────────────────────

export function GeraetePage() {
  const { geraetId } = useParams();
  const navigate = useNavigate();
  const { heute } = useArbeitstag();
  const jetztMin = minutesOfDay(useNow());
  const state = useDispoState();
  const aktionen = useDispoAktionen();
  const { stammdaten, einsaetze, pendenzen, rapporte } = state;

  const [filter, setFilter] = useState<GeraeteFilter>(LEERER_GERAETE_FILTER);
  const [schnell, setSchnell] = useState<{ offen: boolean; vorbelegung?: Vorbelegung }>({ offen: false });

  const auftragViews = useMemo(() => buildAuftragViews(stammdaten, einsaetze, pendenzen, rapporte, heute), [stammdaten, einsaetze, pendenzen, rapporte, heute]);
  const views = useMemo(() => buildGeraeteViews(stammdaten, auftragViews, rapporte, heute), [stammdaten, auftragViews, rapporte, heute]);
  const zaehler = useMemo(() => zaehleGeraete(views), [views]);
  const sichtbar = useMemo(() => filterGeraete(views, filter), [views, filter]);
  const gewaehlt = geraetId ? (views.find((view) => view.geraet.id === geraetId) ?? null) : null;

  useGlobaleSuchquellen();
  useEffect(() => {
    meldeAenderungen('dispo', state.protokoll.length);
  }, [state.protokoll.length]);

  const zurListe = useCallback(() => navigate('/geraete'), [navigate]);
  useHotkey({ key: 'Escape', inInputs: true }, () => {
    if (schnell.offen) {
      setSchnell({ offen: false });
      return;
    }
    if (geraetId) zurListe();
  });

  const kacheln = useMemo<Kachel[]>(
    () => GERAETE_SICHTEN.map((eintrag) => ({ id: eintrag.id, label: eintrag.label, zahl: zaehler[eintrag.id], ...(eintrag.id === 'unvollstaendig' && zaehler.unvollstaendig > 0 ? { ton: 'signal' as const } : {}), ...(eintrag.id === 'garantie' ? { ton: 'ok' as const } : {}) })),
    [zaehler],
  );
  const demoReset = useDemoReset();
  const kommandos = useMemo<Kommando[]>(
    () => [demoReset.kommando, ...GERAETE_SICHTEN.map<Kommando>((eintrag) => ({ id: `geraete:${eintrag.id}`, label: `Geräte: ${eintrag.label}`, gruppe: 'ansicht', icon: WashingMachine, run: () => setFilter((aktuell) => ({ ...aktuell, sicht: eintrag.id })) }))],
    [demoReset.kommando],
  );
  useRegisterKommandos('geraete', kommandos);

  const setzeFilter = (teil: Partial<GeraeteFilter>) => setFilter((aktuell) => ({ ...aktuell, ...teil }));

  return (
    <AppShell modul={findModul('geraete')} menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <ModulSeite
        label="Geräte"
        detailOffen={geraetId !== undefined}
        onZurueck={zurListe}
        liste={
          <>
            <Kacheln kacheln={kacheln} aktiv={filter.sicht} onWahl={(id) => setzeFilter({ sicht: id as GeraeteSicht })} label="Sicht" />
            <ModulWerkzeuge anzahl={`${sichtbar.length} von ${views.length}`}>
              <Suchfeld wert={filter.suche} onChange={(suche) => setzeFilter({ suche })} placeholder="Marke, Modell, Seriennummer, Kunde, Adresse …" label="Geräte durchsuchen" />
              <Auswahl value={filter.marke} aria-label="Marke" onChange={(event) => setzeFilter({ marke: event.target.value as Marke | 'alle' })}>
                <option value="alle">Alle Marken</option>
                {MARKEN.map((marke) => (
                  <option key={marke} value={marke}>
                    {marke}
                  </option>
                ))}
              </Auswahl>
              <Auswahl value={filter.art} aria-label="Geräteart" onChange={(event) => setzeFilter({ art: event.target.value as Geraeteart | 'alle' })}>
                <option value="alle">Alle Gerätearten</option>
                {GERAETEARTEN.map((art) => (
                  <option key={art} value={art}>
                    {art}
                  </option>
                ))}
              </Auswahl>
            </ModulWerkzeuge>
            <Tabelle spalten={SPALTEN} zeilen={sichtbar} zeilenId={(view) => view.geraet.id} label="Geräte" aktivId={geraetId ?? null} onZeile={(view) => navigate(`/geraete/${view.geraet.id}`)} standardSortierung={{ id: 'termin', richtung: 'ab' }} leer="Keine Geräte in dieser Sicht." />
          </>
        }
        detail={
          gewaehlt ? (
            <GeraetDossier view={gewaehlt} techniker={stammdaten.techniker} aktionen={aktionen} onNeuerAuftrag={(vorbelegung) => setSchnell({ offen: true, vorbelegung })} />
          ) : (
            <Leer icon={WashingMachine} titel="Gerät nicht gefunden" text="Das Gerät existiert nicht mehr oder gehört zu einem anderen Stand." fuellend>
              <Button variant="secondary" size="sm" onClick={zurListe}>
                Zur Liste
              </Button>
            </Leer>
          )
        }
      />
      <Schnellerfassung
        open={schnell.offen}
        stammdaten={stammdaten}
        einsaetze={einsaetze}
        telefonbuch={mockTelefonbuch}
        heute={heute}
        jetztMin={jetztMin}
        {...(schnell.vorbelegung ? { vorbelegung: schnell.vorbelegung } : {})}
        onClose={() => setSchnell({ offen: false })}
        onCreate={(auftrag, optionen) => {
          aktionen.createAuftrag(auftrag, optionen);
          navigate(`/auftraege/${auftrag.id}`);
        }}
      />
    </AppShell>
  );
}

/* ◆ jh · eof */
