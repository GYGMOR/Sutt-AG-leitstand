/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/kunden/KundenPage.tsx                      │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Modul Kunden & Liegenschaften: Sichten, Tabelle, Dossier              │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { meldeAenderungen } from '../../core/aenderungen';
import { useArbeitstag } from '../../core/arbeitstag';
import { minutesOfDay } from '../../core/datum';
import { KUNDENART_LABEL } from '../../core/domain/stammdaten';
import { useHotkey } from '../../core/hooks/useHotkey';
import { useNow } from '../../core/hooks/useNow';
import { useRegisterKommandos } from '../../core/kommando';
import type { Kommando } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { findModul } from '../../core/modules.config';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
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
import { KundeDossier } from './KundeDossier';
import { KUNDEN_SICHTEN, buildKundenViews, filterKunden, hatRechnungOffen, zaehleKunden } from './kunden.model';
import type { KundeView, KundenSicht } from './kunden.model';
import styles from './KundenPage.module.css';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Spalten ─────────────────────────────────────────────────

const SPALTEN: readonly Spalte<KundeView>[] = [
  { id: 'nummer', label: 'Kunde', render: (view) => <Typenschild label="Kunde" wert={view.kunde.nummer} />, sortWert: (view) => view.kunde.nummer, breite: '120px' },
  {
    id: 'name',
    label: 'Name',
    render: (view) => (
      <span className={styles.zelleName}>
        <span className={styles.name}>{view.kunde.name}</span>
        <span className={styles.nameMeta}>{KUNDENART_LABEL[view.kunde.art]}</span>
      </span>
    ),
    sortWert: (view) => view.kunde.name,
  },
  { id: 'ort', label: 'Ort', render: (view) => view.kunde.adresse.ort, sortWert: (view) => view.kunde.adresse.ort, nebensaechlich: true },
  { id: 'liegenschaften', label: 'Liegenschaften', render: (view) => view.liegenschaften.length, sortWert: (view) => view.liegenschaften.length, align: 'right', mono: true },
  { id: 'geraete', label: 'Geräte', render: (view) => view.geraete, sortWert: (view) => view.geraete, align: 'right', mono: true, nebensaechlich: true },
  { id: 'auftraege', label: 'Aufträge', render: (view) => `${view.auftraege.length}${view.offene > 0 ? ` · ${view.offene} offen` : ''}`, sortWert: (view) => view.auftraege.length, mono: true },
  {
    id: 'rechnung',
    label: 'Rechnung',
    render: (view) => (hatRechnungOffen(view) ? <Chip tone="danger">offen</Chip> : <span className={styles.leerWert}>–</span>),
    sortWert: (view) => (hatRechnungOffen(view) ? 0 : 1),
    nebensaechlich: true,
  },
  { id: 'kontakt', label: 'Kontakt', render: (view) => view.kunde.kontakt.telefon, sortWert: (view) => view.kunde.kontakt.name, mono: true, nebensaechlich: true },
];

// ── §2 · Seite ───────────────────────────────────────────────────

export function KundenPage() {
  const { kundeId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { heute } = useArbeitstag();
  const jetztMin = minutesOfDay(useNow());
  const state = useDispoState();
  const aktionen = useDispoAktionen();
  const { stammdaten, einsaetze, pendenzen, rapporte, nachrichten } = state;

  const [sicht, setSicht] = useState<KundenSicht>('alle');
  const [suche, setSuche] = useState('');
  const [schnell, setSchnell] = useState<{ offen: boolean; vorbelegung?: Vorbelegung }>({ offen: false });

  const auftragViews = useMemo(() => buildAuftragViews(stammdaten, einsaetze, pendenzen, rapporte, heute), [stammdaten, einsaetze, pendenzen, rapporte, heute]);
  const views = useMemo(() => buildKundenViews(stammdaten, auftragViews, nachrichten), [stammdaten, auftragViews, nachrichten]);
  const zaehler = useMemo(() => zaehleKunden(views), [views]);
  const sichtbar = useMemo(() => filterKunden(views, sicht, suche), [views, sicht, suche]);
  const gewaehlt = kundeId ? (views.find((view) => view.kunde.id === kundeId) ?? null) : null;

  useGlobaleSuchquellen();
  useEffect(() => {
    meldeAenderungen('dispo', state.protokoll.length);
  }, [state.protokoll.length]);

  const zurListe = useCallback(() => navigate('/kunden'), [navigate]);
  useHotkey({ key: 'Escape', inInputs: true }, () => {
    if (schnell.offen) {
      setSchnell({ offen: false });
      return;
    }
    if (kundeId) zurListe();
  });

  const kacheln = useMemo<Kachel[]>(
    () => KUNDEN_SICHTEN.map((eintrag) => ({ id: eintrag.id, label: eintrag.label, zahl: zaehler[eintrag.id], ...(eintrag.id === 'rechnung-offen' && zaehler[eintrag.id] > 0 ? { ton: 'danger' as const } : {}) })),
    [zaehler],
  );

  const demoReset = useDemoReset();
  const kommandos = useMemo<Kommando[]>(
    () => [demoReset.kommando, ...KUNDEN_SICHTEN.map<Kommando>((eintrag) => ({ id: `kunden:${eintrag.id}`, label: `Kunden: ${eintrag.label}`, gruppe: 'ansicht', icon: Users, run: () => setSicht(eintrag.id) }))],
    [demoReset.kommando],
  );
  useRegisterKommandos('kunden', kommandos);

  const neuerAuftrag = useCallback((vorbelegung: Vorbelegung) => setSchnell({ offen: true, vorbelegung }), []);

  return (
    <AppShell modul={findModul('kunden')} menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <ModulSeite
        label="Kunden & Liegenschaften"
        detailOffen={kundeId !== undefined}
        onZurueck={zurListe}
        liste={
          <>
            <Kacheln kacheln={kacheln} aktiv={sicht} onWahl={(id) => setSicht(id as KundenSicht)} label="Kundenart" />
            <ModulWerkzeuge anzahl={`${sichtbar.length} von ${views.length}`}>
              <Suchfeld wert={suche} onChange={setSuche} placeholder="Name, Nummer, Adresse, Liegenschaft, Hauswart …" label="Kunden durchsuchen" />
            </ModulWerkzeuge>
            <Tabelle spalten={SPALTEN} zeilen={sichtbar} zeilenId={(view) => view.kunde.id} label="Kunden" aktivId={kundeId ?? null} onZeile={(view) => navigate(`/kunden/${view.kunde.id}`)} standardSortierung={{ id: 'name', richtung: 'auf' }} leer="Keine Kunden in dieser Sicht." />
          </>
        }
        detail={
          gewaehlt ? (
            <KundeDossier
              view={gewaehlt}
              nachrichten={nachrichten.filter((nachricht) => gewaehlt.auftraege.some((auftrag) => auftrag.auftrag.id === nachricht.auftragId))}
              hervorgehobeneLiegenschaft={params.get('liegenschaft')}
              aktionen={aktionen}
              onNeuerAuftrag={neuerAuftrag}
            />
          ) : (
            <Leer icon={Users} titel="Kunde nicht gefunden" text="Der Kunde existiert nicht mehr oder gehört zu einem anderen Stand." fuellend>
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
