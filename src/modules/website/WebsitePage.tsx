/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/website/WebsitePage.tsx                    │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Modul SMS & Website: Anfragen (Liste, Dossier, Auftrag), Vorlagen     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useMemo, useState } from 'react';
import { ExternalLink, Globe, MessageSquareText } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useArbeitstag } from '../../core/arbeitstag';
import { useBenutzer } from '../../core/auth/authStore';
import { nowZeitpunkt } from '../../core/datum';
import { ANFRAGE_STATUS_LABEL, ANLIEGEN_KATEGORIE, ANLIEGEN_LABEL } from '../../core/domain/anfrage';
import { KATEGORIE_LABEL } from '../../core/domain/kategorie';
import { NACHRICHT_LABEL } from '../../core/domain/nachricht';
import type { NachrichtArt } from '../../core/domain/nachricht';
import { formatZeitpunktKurz } from '../../core/format';
import { useNow } from '../../core/hooks/useNow';
import { useRegisterKommandos } from '../../core/kommando';
import type { Kommando } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { setMandant, useMandant } from '../../core/mandant/mandantStore';
import { findModul } from '../../core/modules.config';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { Kacheln } from '../../core/ui/Kacheln';
import type { Kachel } from '../../core/ui/Kacheln';
import { Leer } from '../../core/ui/Leer';
import { ModulSeite, ModulWerkzeuge } from '../../core/ui/ModulSeite';
import { SegmentedControl } from '../../core/ui/SegmentedControl';
import type { SegmentOption } from '../../core/ui/SegmentedControl';
import { Suchfeld } from '../../core/ui/Suchfeld';
import { Tabelle } from '../../core/ui/Tabelle';
import type { Spalte } from '../../core/ui/Tabelle';
import { Typenschild } from '../../core/ui/Typenschild';
import { kategorieKlasse } from '../../core/ui/farben';
import { WEBSITE_URL } from '../../core/urls';
import { jetztInZone } from '../../core/zeitzone';
import { MOCK_HEUTE, mockBestand, mockStammdaten, mockTelefonbuch } from '../../mock';
import { Schnellerfassung } from '../dispo/Schnellerfassung';
import type { Vorbelegung } from '../dispo/Schnellerfassung';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { useDemoReset } from '../dispo/store/useDemoReset';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { useGlobaleSuchquellen } from '../suche/globaleSuche';
import { AnfrageDossier } from './AnfrageDossier';
import { anfrageAblehnen, anfrageAnnehmen, anfrageBeantworten, useAnfragen } from './anfrageStore';
import { AntwortDialog } from './AntwortDialog';
import { VorlagenBereich } from './VorlagenBereich';
import { ANFRAGE_SICHTEN, buildAnfrageViews, filterAnfragen, vorbelegungAus, zaehleAnfragen } from './website.model';
import type { AnfrageSicht, AnfrageView } from './website.model';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Spalten und Bereiche ────────────────────────────────────

type Bereich = 'anfragen' | 'vorlagen';

const BEREICHE: readonly SegmentOption<Bereich>[] = [
  { value: 'anfragen', label: 'Anfragen' },
  { value: 'vorlagen', label: 'Vorlagen' },
];

const STATUS_TON = { neu: 'signal', angenommen: 'ok', abgelehnt: 'mute' } as const;

const SPALTEN: readonly Spalte<AnfrageView>[] = [
  { id: 'eingang', label: 'Eingang', render: (view) => formatZeitpunktKurz(view.anfrage.eingegangenAm), sortWert: (view) => view.anfrage.eingegangenAm, mono: true },
  { id: 'nummer', label: 'Anfrage', render: (view) => <Typenschild label="Nr." wert={view.anfrage.nummer} />, sortWert: (view) => view.anfrage.nummer },
  {
    id: 'anliegen',
    label: 'Anliegen',
    render: (view) => (
      <Chip tone="tint" className={kategorieKlasse(ANLIEGEN_KATEGORIE[view.anfrage.anliegen])}>
        {KATEGORIE_LABEL[ANLIEGEN_KATEGORIE[view.anfrage.anliegen]]}
      </Chip>
    ),
    sortWert: (view) => ANLIEGEN_LABEL[view.anfrage.anliegen],
  },
  { id: 'geraet', label: 'Gerät', render: (view) => `${view.anfrage.geraeteart}${view.anfrage.marke ? ` · ${view.anfrage.marke}` : ''}`, sortWert: (view) => view.anfrage.geraeteart },
  { id: 'kontakt', label: 'Kontakt', render: (view) => `${view.anfrage.kontakt.name} · ${view.anfrage.kontakt.rolle}`, sortWert: (view) => view.anfrage.kontakt.name },
  { id: 'ort', label: 'Ort', render: (view) => `${view.anfrage.adresse.plz} ${view.anfrage.adresse.ort}`, sortWert: (view) => view.anfrage.adresse.ort, nebensaechlich: true },
  { id: 'kunde', label: 'Kunde', render: (view) => (view.treffer ? view.treffer.kunde.kurzname : <Chip tone="neutral">neu</Chip>), sortWert: (view) => view.treffer?.kunde.kurzname ?? 'zzz', nebensaechlich: true },
  {
    id: 'status',
    label: 'Status',
    render: (view) => (
      <span>
        <Chip tone={STATUS_TON[view.anfrage.status]}>{ANFRAGE_STATUS_LABEL[view.anfrage.status]}</Chip>
        {view.anfrage.dringend && view.anfrage.status === 'neu' && <Chip tone="danger">dringend</Chip>}
      </span>
    ),
    sortWert: (view) => (view.anfrage.status === 'neu' ? 0 : view.anfrage.status === 'angenommen' ? 1 : 2),
  },
];

function istBereich(wert: string | undefined): wert is Bereich {
  return wert === 'anfragen' || wert === 'vorlagen';
}

// ── §2 · Seite ───────────────────────────────────────────────────

export function WebsitePage() {
  const { bereich: bereichParam } = useParams();
  const bereich: Bereich = istBereich(bereichParam) ? bereichParam : 'anfragen';
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { heute } = useArbeitstag();
  const state = useDispoState();
  const mandant = useMandant();
  const benutzer = useBenutzer();
  const aktionen = useDispoAktionen();
  const anfragen = useAnfragen();
  const jetztMin = jetztInZone(mandant.zeitzone, useNow()).minuten;
  const kuerzel = benutzer?.kuerzel ?? '?';

  const [sicht, setSicht] = useState<AnfrageSicht>('neu');
  const [suche, setSuche] = useState('');
  const [antwort, setAntwort] = useState<{ view: AnfrageView; ablehnung: boolean } | null>(null);
  const [schnell, setSchnell] = useState<{ offen: boolean; vorbelegung?: Vorbelegung; anfrageId?: string }>({ offen: false });

  const views = useMemo(() => buildAnfrageViews(anfragen, state.stammdaten), [anfragen, state.stammdaten]);
  const zaehler = useMemo(() => zaehleAnfragen(views), [views]);
  const sichtbar = useMemo(() => filterAnfragen(views, sicht, suche), [views, sicht, suche]);
  const anfrageId = params.get('anfrage');
  const gewaehlt = useMemo(() => views.find((view) => view.anfrage.id === anfrageId) ?? null, [views, anfrageId]);

  useGlobaleSuchquellen();

  const oeffnen = useCallback(
    (id: string | null) => {
      const naechste = new URLSearchParams(params);
      if (id) naechste.set('anfrage', id);
      else naechste.delete('anfrage');
      setParams(naechste, { replace: true });
    },
    [params, setParams],
  );
  const bereichWechseln = useCallback((ziel: Bereich) => navigate(`/sms-website/${ziel}`), [navigate]);

  const auftragErfassen = (view: AnfrageView) => setSchnell({ offen: true, vorbelegung: vorbelegungAus(view), anfrageId: view.anfrage.id });

  const antwortSenden = (text: string, kanal: 'mail' | 'sms') => {
    if (!antwort) return;
    const eintrag = { am: nowZeitpunkt(), kanal, text, von: kuerzel };
    if (antwort.ablehnung) {
      anfrageAblehnen(antwort.view.anfrage.id, eintrag);
      aktionen.protokolliere({ bereich: 'auftrag', art: 'aenderung', text: `Website-Anfrage ${antwort.view.anfrage.nummer} abgelehnt (${kanal === 'mail' ? 'E-Mail' : 'SMS'} an ${antwort.view.anfrage.kontakt.name})` });
      return;
    }
    anfrageBeantworten(antwort.view.anfrage.id, eintrag);
    aktionen.protokolliere({ bereich: 'auftrag', art: 'aenderung', text: `Website-Anfrage ${antwort.view.anfrage.nummer} beantwortet (${kanal === 'mail' ? 'E-Mail' : 'SMS'} an ${antwort.view.anfrage.kontakt.name})` });
  };

  const vorlageSpeichern = (art: NachrichtArt, text: string | null) => {
    const vorlagen: Partial<Record<NachrichtArt, string>> = { ...mandant.nachrichtVorlagen };
    if (text === null) delete vorlagen[art];
    else vorlagen[art] = text;
    setMandant({ nachrichtVorlagen: vorlagen });
    aktionen.protokolliere({ bereich: 'einstellungen', art: 'aenderung', text: `Vorlage «${NACHRICHT_LABEL[art]}» ${text === null ? 'auf Standard zurückgesetzt' : 'geändert'}` });
  };

  const kacheln = useMemo<Kachel[]>(
    () => ANFRAGE_SICHTEN.map((eintrag) => ({ id: eintrag.id, label: eintrag.label, zahl: zaehler[eintrag.id], ton: eintrag.id === 'neu' && zaehler.neu > 0 ? 'signal' : 'neutral' })),
    [zaehler],
  );

  const demoReset = useDemoReset();
  const kommandos = useMemo<Kommando[]>(
    () => [
      { id: 'website:anfragen', label: 'SMS & Website: Anfragen', gruppe: 'ansicht', icon: MessageSquareText, run: () => bereichWechseln('anfragen') },
      { id: 'website:vorlagen', label: 'SMS & Website: Vorlagen', gruppe: 'ansicht', icon: MessageSquareText, run: () => bereichWechseln('vorlagen') },
      { id: 'website:oeffnen', label: 'Website öffnen', gruppe: 'navigation', icon: Globe, stichworte: 'homepage sutt.ch anfrageformular', run: () => window.open(WEBSITE_URL, '_blank', 'noopener') },
      demoReset.kommando,
    ],
    [bereichWechseln, demoReset.kommando],
  );
  useRegisterKommandos('sms-website', kommandos);

  return (
    <AppShell modul={findModul('sms-website')} menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <ModulSeite
        label="SMS & Website"
        detailOffen={bereich === 'anfragen' && gewaehlt !== null}
        onZurueck={gewaehlt ? () => oeffnen(null) : undefined}
        liste={
          <>
            {bereich === 'anfragen' && <Kacheln kacheln={kacheln} aktiv={sicht} onWahl={(id) => setSicht(id as AnfrageSicht)} label="Sicht" />}
            <ModulWerkzeuge anzahl={bereich === 'anfragen' ? `${sichtbar.length} von ${views.length}` : `${Object.keys(mandant.nachrichtVorlagen).length} angepasst`}>
              <SegmentedControl label="Bereich" options={BEREICHE} value={bereich} onChange={bereichWechseln} />
              {bereich === 'anfragen' && <Suchfeld wert={suche} onChange={setSuche} placeholder="Nummer, Name, Ort, Gerät …" label="Anfragen durchsuchen" />}
              <Button variant="ghost" size="sm" icon={ExternalLink} onClick={() => window.open(WEBSITE_URL, '_blank', 'noopener')}>
                Website
              </Button>
            </ModulWerkzeuge>
            {bereich === 'anfragen' && (
              <Tabelle
                spalten={SPALTEN}
                zeilen={sichtbar}
                zeilenId={(view) => view.anfrage.id}
                label="Website-Anfragen"
                aktivId={anfrageId}
                onZeile={(view) => oeffnen(view.anfrage.id)}
                standardSortierung={{ id: 'eingang', richtung: 'ab' }}
                leer="Keine Anfragen in dieser Sicht – neue Anfragen von der Website erscheinen hier sofort."
              />
            )}
            {bereich === 'vorlagen' && <VorlagenBereich vorlagen={mandant.nachrichtVorlagen} onSpeichern={vorlageSpeichern} />}
          </>
        }
        detail={
          bereich === 'anfragen' && gewaehlt ? (
            <AnfrageDossier view={gewaehlt} stammdaten={state.stammdaten} onAuftragErfassen={auftragErfassen} onAntworten={(view, ablehnung) => setAntwort({ view, ablehnung })} />
          ) : (
            <Leer icon={Globe} titel="Anfrage wählen" text="Eine Anfrage aus der Liste öffnen – Kunde prüfen, Auftrag erfassen oder antworten." fuellend />
          )
        }
      />
      <AntwortDialog open={antwort !== null} anfrage={antwort?.view.anfrage ?? null} ablehnung={antwort?.ablehnung ?? false} vorlagen={mandant.nachrichtVorlagen} heute={heute} onClose={() => setAntwort(null)} onSenden={antwortSenden} />
      <Schnellerfassung
        open={schnell.offen}
        stammdaten={state.stammdaten}
        einsaetze={state.einsaetze}
        telefonbuch={mockTelefonbuch}
        heute={heute}
        jetztMin={jetztMin}
        {...(schnell.vorbelegung ? { vorbelegung: schnell.vorbelegung } : {})}
        onClose={() => setSchnell({ offen: false })}
        onCreate={(auftrag, optionen) => {
          aktionen.createAuftrag(auftrag, optionen);
          if (schnell.anfrageId) {
            const anfrage = anfragen.find((kandidat) => kandidat.id === schnell.anfrageId);
            anfrageAnnehmen(schnell.anfrageId, auftrag.id);
            aktionen.protokolliere({ bereich: 'auftrag', art: 'aenderung', text: `Website-Anfrage ${anfrage?.nummer ?? ''} angenommen → ${auftrag.nummer}` });
          }
        }}
      />
    </AppShell>
  );
}

/* ◆ jh · eof */
