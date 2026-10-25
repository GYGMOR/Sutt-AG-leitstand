/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/rapporte/RapportePage.tsx                  │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Modul Servicerapporte: Sichten, Liste, Freigabe, Verrechnung          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, CalendarRange, FileWarning, Mail, Printer, Receipt, Search, Smartphone, Undo2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { meldeAenderungen } from '../../core/aenderungen';
import { useArbeitstag } from '../../core/arbeitstag';
import { useBenutzer } from '../../core/auth/authStore';
import type { IsoDatum } from '../../core/datum';
import { RAPPORT_LABEL } from '../../core/domain/auftrag';
import type { NachrichtArt } from '../../core/domain/nachricht';
import { ABSCHLUSS_LABEL, kannFreigeben, kannVerrechnen } from '../../core/domain/rapport';
import { fullName } from '../../core/domain/stammdaten';
import { formatDatumKurz, formatSeit, formatWochentag, formatZeitpunktKurz } from '../../core/format';
import { useHotkey } from '../../core/hooks/useHotkey';
import { useRegisterKommandos } from '../../core/kommando';
import type { Kommando } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { findModul } from '../../core/modules.config';
import { normalizeSuchtext } from '../../core/suche';
import { Avatar } from '../../core/ui/Avatar';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { Eingabe } from '../../core/ui/Form';
import { Typenschild } from '../../core/ui/Typenschild';
import { cx } from '../../core/ui/cx';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '../../mock';
import { buildFehlendeRapporte, buildRapportViews, zaehleRapporte } from '../dispo/store/dispo.selectors';
import type { ErledigtView, RapportView } from '../dispo/store/dispo.selectors';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { useDemoReset } from '../dispo/store/useDemoReset';
import { NachrichtDialog } from '../rapport/NachrichtDialog';
import { entwurfAus } from '../rapport/rapport.model';
import { RapportFormular } from '../rapport/RapportFormular';
import { ABSCHLUSS_TON, RAPPORT_ICON, RAPPORT_TON } from '../rapport/rapportStatus';
import { ZurueckDialog } from '../rapport/ZurueckDialog';
import styles from './RapportePage.module.css';

// jh› Derselbe Store wie Plantafel und Techniker-App – Freigabe hier, Chip dort, sofort.
initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Sichten ─────────────────────────────────────────────────

type Sicht = 'alle' | 'fehlend' | 'pruefen' | 'verrechnen' | 'verrechnet';

const SICHTEN: readonly { id: Sicht; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'fehlend', label: 'Fehlend' },
  { id: 'pruefen', label: 'Zu prüfen' },
  { id: 'verrechnen', label: 'Zu verrechnen' },
  { id: 'verrechnet', label: 'Verrechnet' },
];

function passtZurSicht(view: RapportView, sicht: Sicht): boolean {
  switch (sicht) {
    case 'alle':
      return true;
    case 'fehlend':
      return false;
    case 'pruefen':
      return view.rapport.status === 'erstellt' || view.rapport.status === 'unterschrieben';
    case 'verrechnen':
      return view.rapport.status === 'freigegeben';
    case 'verrechnet':
      return view.rapport.status === 'verrechnet';
  }
}

function oeffneApp(pfad: string): void {
  window.open(pfad, '_blank', 'noopener');
}

// ── §2 · Zeilen ──────────────────────────────────────────────────

function RapportZeile({ view, aktiv, onClick }: { view: RapportView; aktiv: boolean; onClick: () => void }) {
  const { rapport, einsatz, techniker, kunde, auftrag } = view;
  return (
    <li>
      <button type="button" className={cx(styles.eintrag, styles.eintragFlaeche, aktiv && styles.eintragAktiv)} onClick={onClick} aria-current={aktiv ? 'true' : undefined}>
        <span className={styles.eintragKopf}>
          <Typenschild label="Rapport" wert={rapport.nummer} />
          <Chip icon={RAPPORT_ICON[rapport.status]} tone={RAPPORT_TON[rapport.status]}>
            {RAPPORT_LABEL[rapport.status]}
          </Chip>
          {rapport.rueckmeldung && rapport.status === 'erstellt' && (
            <Chip icon={Undo2} tone="signal">
              zurückgegeben
            </Chip>
          )}
        </span>
        <span className={styles.eintragKunde}>{kunde.name}</span>
        <span className={styles.eintragText}>
          {auftrag.nummer} · {auftrag.fehlerbild}
        </span>
        <span className={styles.eintragMeta}>
          <Avatar techniker={techniker} size="sm" />
          {einsatz ? `${formatWochentag(einsatz.datum, 'kurz')} ${formatDatumKurz(einsatz.datum)}` : 'Einsatz nicht mehr im Plan'} · {ABSCHLUSS_LABEL[rapport.abschluss]}
          {!rapport.unterschrift && rapport.status !== 'verrechnet' && ' · ohne Unterschrift'}
        </span>
      </button>
    </li>
  );
}

function FehlendZeile({ view, heute, onPlan, onApp }: { view: ErledigtView; heute: IsoDatum; onPlan: () => void; onApp: () => void }) {
  return (
    <li className={cx(styles.eintrag, styles.eintragFehlend)}>
      <button type="button" className={styles.eintragFlaeche} onClick={onPlan} title="Einsatz in der Plantafel zeigen">
        <span className={styles.eintragKopf}>
          <Typenschild label="Auftrag" wert={view.auftrag.nummer} />
          <Chip icon={FileWarning} tone="signal">
            Rapport fehlt
          </Chip>
        </span>
        <span className={styles.eintragKunde}>{view.kunde.name}</span>
        <span className={styles.eintragText}>{view.auftrag.fehlerbild}</span>
        <span className={styles.eintragMeta}>
          <Avatar techniker={view.techniker} size="sm" />
          {formatWochentag(view.einsatz.datum, 'kurz')} {formatDatumKurz(view.einsatz.datum)} · erledigt {formatSeit(view.einsatz.datum, heute)}
        </span>
      </button>
      <Button variant="secondary" size="sm" icon={Smartphone} className={styles.eintragKnopf} onClick={onApp}>
        In der App erfassen
      </Button>
    </li>
  );
}

// ── §3 · Detail ──────────────────────────────────────────────────

interface RapportDetailProps {
  view: RapportView;
  kuerzel: string;
  onZurueckZurListe: () => void;
  onZurueck: () => void;
  onMail: () => void;
  onFreigeben: () => void;
  onVerrechnen: () => void;
  onDrucken: () => void;
  onPlan?: () => void;
}

function RapportDetail({ view, kuerzel, onZurueckZurListe, onZurueck, onMail, onFreigeben, onVerrechnen, onDrucken, onPlan }: RapportDetailProps) {
  const { rapport, einsatz, techniker, auftrag, kunde, liegenschaft, geraet } = view;
  const entwurf = useMemo(() => entwurfAus(rapport), [rapport]);

  return (
    <>
      <header className={styles.detailKopf}>
        <Button variant="ghost" size="sm" icon={ArrowLeft} className={styles.zurueck} onClick={onZurueckZurListe}>
          Liste
        </Button>
        <div className={styles.detailTitel}>
          <Typenschild label="Rapport" wert={rapport.nummer} size="md" />
          <Chip icon={RAPPORT_ICON[rapport.status]} tone={RAPPORT_TON[rapport.status]} size="md">
            {RAPPORT_LABEL[rapport.status]}
          </Chip>
          <Chip tone={ABSCHLUSS_TON[rapport.abschluss]} size="md">
            {ABSCHLUSS_LABEL[rapport.abschluss]}
          </Chip>
        </div>
        <div className={styles.detailAktionen}>
          <Button variant="ghost" size="sm" icon={Printer} onClick={onDrucken}>
            Drucken
          </Button>
          <Button variant="ghost" size="sm" icon={Mail} onClick={onMail}>
            Per Mail
          </Button>
          {onPlan && (
            <Button variant="ghost" size="sm" icon={CalendarRange} onClick={onPlan}>
              Im Plan
            </Button>
          )}
          {kannFreigeben(rapport) && (
            <>
              <Button variant="secondary" size="sm" icon={Undo2} onClick={onZurueck}>
                Zurück an {techniker.kuerzel}
              </Button>
              <Button variant="primary" size="sm" icon={BadgeCheck} onClick={onFreigeben}>
                Freigeben
              </Button>
            </>
          )}
          {kannVerrechnen(rapport) && (
            <Button variant="primary" size="sm" icon={Receipt} onClick={onVerrechnen}>
              Verrechnen
            </Button>
          )}
        </div>
        <p className={styles.detailMeta}>
          {fullName(techniker)} · erstellt {formatZeitpunktKurz(rapport.erstelltAm)} · geändert {formatZeitpunktKurz(rapport.geaendertAm)}
          {rapport.freigegebenAm && ` · freigegeben ${formatZeitpunktKurz(rapport.freigegebenAm)}`}
          {rapport.verrechnetAm && ` · verrechnet ${formatZeitpunktKurz(rapport.verrechnetAm)}`}
        </p>
      </header>
      {einsatz ? (
        <div className={styles.formular}>
          <RapportFormular
            entwurf={entwurf}
            onChange={() => undefined}
            status={rapport.status}
            auftrag={auftrag}
            kunde={kunde}
            liegenschaft={liegenschaft}
            geraet={geraet}
            einsatz={einsatz}
            techniker={techniker}
            kuerzel={kuerzel}
            lesend
            {...(rapport.rueckmeldung ? { rueckmeldung: rapport.rueckmeldung } : {})}
          />
        </div>
      ) : (
        <p className={styles.leer}>Der Einsatz zu diesem Rapport ist nicht mehr im Plan.</p>
      )}
    </>
  );
}

// ── §4 · Seite ───────────────────────────────────────────────────

export function RapportePage() {
  const { rapportId } = useParams();
  const navigate = useNavigate();
  const { heute, setDatum } = useArbeitstag();
  const benutzer = useBenutzer();
  const state = useDispoState();
  const aktionen = useDispoAktionen();
  const { stammdaten, einsaetze, rapporte } = state;

  const [sicht, setSicht] = useState<Sicht>('alle');
  const [suche, setSuche] = useState('');
  const [nachricht, setNachricht] = useState<NachrichtArt | null>(null);
  const [zurueck, setZurueck] = useState(false);

  const zaehler = useMemo(() => zaehleRapporte(einsaetze, rapporte), [einsaetze, rapporte]);
  const views = useMemo(() => buildRapportViews(stammdaten, einsaetze, rapporte), [stammdaten, einsaetze, rapporte]);
  const fehlende = useMemo(() => buildFehlendeRapporte(stammdaten, einsaetze, rapporte), [stammdaten, einsaetze, rapporte]);

  const begriffe = useMemo(() => normalizeSuchtext(suche).split(/\s+/).filter(Boolean), [suche]);
  const passt = useCallback((texte: readonly string[]) => begriffe.length === 0 || begriffe.every((begriff) => normalizeSuchtext(texte.join(' ')).includes(begriff)), [begriffe]);

  const sichtbar = useMemo(
    () => views.filter((view) => passtZurSicht(view, sicht) && passt([view.rapport.nummer, view.auftrag.nummer, view.kunde.name, view.auftrag.fehlerbild, view.techniker.nachname, view.liegenschaft.adresse.ort])),
    [views, sicht, passt],
  );
  // jh› «Alle» zeigt Rapporte; fehlende sind keine Rapporte und haben ihre eigene Sicht.
  const sichtbarFehlend = useMemo(
    () => (sicht === 'fehlend' ? fehlende.filter((view) => passt([view.auftrag.nummer, view.kunde.name, view.auftrag.fehlerbild, view.techniker.nachname])) : []),
    [fehlende, sicht, passt],
  );

  const gewaehlt = rapportId ? (views.find((view) => view.rapport.id === rapportId) ?? null) : null;
  const einsatz = gewaehlt?.einsatz;
  const zaehlerFuer: Readonly<Record<Sicht, number>> = {
    alle: views.length,
    fehlend: zaehler.fehlend,
    pruefen: zaehler.erstellt + zaehler.unterschrieben,
    verrechnen: zaehler.faelligeRechnungen,
    verrechnet: zaehler.verrechnet,
  };

  useEffect(() => {
    meldeAenderungen('dispo', state.protokoll.length);
  }, [state.protokoll.length]);

  const zurListe = useCallback(() => navigate('/rapporte'), [navigate]);
  useHotkey({ key: 'Escape', inInputs: true }, () => {
    if (nachricht || zurueck || !rapportId) return;
    zurListe();
  });

  const oeffnen = useCallback((id: string) => navigate(`/rapporte/${id}`), [navigate]);
  const imPlanZeigen = useCallback(
    (einsatzId: string, datum: IsoDatum) => {
      setDatum(datum);
      aktionen.select({ art: 'einsatz', einsatzId });
      navigate('/dispo/plantafel');
    },
    [setDatum, aktionen, navigate],
  );

  const demoReset = useDemoReset();
  const kommandos = useMemo<Kommando[]>(
    () => [
      demoReset.kommando,
      ...SICHTEN.map<Kommando>((eintrag) => ({
        id: `rapporte:${eintrag.id}`,
        label: `Rapporte: ${eintrag.label}`,
        gruppe: 'ansicht',
        run: () => {
          setSicht(eintrag.id);
          navigate('/rapporte');
        },
      })),
      ...(gewaehlt && kannFreigeben(gewaehlt.rapport)
        ? [{ id: 'rapporte:freigeben', label: `${gewaehlt.rapport.nummer} freigeben`, gruppe: 'aktion' as const, icon: BadgeCheck, run: () => aktionen.freigebenRapport(gewaehlt.rapport.id) }]
        : []),
      ...(gewaehlt && kannVerrechnen(gewaehlt.rapport)
        ? [{ id: 'rapporte:verrechnen', label: `${gewaehlt.rapport.nummer} verrechnen`, gruppe: 'aktion' as const, icon: Receipt, run: () => aktionen.verrechnenRapport(gewaehlt.rapport.id) }]
        : []),
    ],
    [gewaehlt, aktionen, navigate, demoReset.kommando],
  );
  useRegisterKommandos('rapporte', kommandos);

  return (
    <AppShell modul={findModul('rapporte')} menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <div className={cx(styles.seite, gewaehlt && styles.seiteDetail)}>
        <section className={styles.listeSpalte} aria-label="Rapporte">
          <div className={styles.kacheln} role="tablist" aria-label="Sicht">
            {SICHTEN.map((eintrag) => (
              <button
                key={eintrag.id}
                type="button"
                role="tab"
                aria-selected={sicht === eintrag.id}
                className={cx(styles.kachel, sicht === eintrag.id && styles.kachelAktiv, eintrag.id === 'fehlend' && zaehlerFuer.fehlend > 0 && styles.kachelSignal)}
                onClick={() => setSicht(eintrag.id)}
              >
                <span className={styles.kachelZahl}>{zaehlerFuer[eintrag.id]}</span>
                <span className={styles.kachelLabel}>{eintrag.label}</span>
              </button>
            ))}
          </div>
          <div className={styles.suche}>
            <Search size={16} strokeWidth={1.5} aria-hidden className={styles.sucheIcon} />
            <Eingabe value={suche} placeholder="Nummer, Kunde, Techniker, Fehlerbild …" aria-label="Rapporte durchsuchen" onChange={(event) => setSuche(event.target.value)} />
          </div>
          <ul className={styles.liste}>
            {sichtbarFehlend.map((view) => (
              <FehlendZeile key={view.einsatz.id} view={view} heute={heute} onPlan={() => imPlanZeigen(view.einsatz.id, view.einsatz.datum)} onApp={() => oeffneApp(`/app/rapport/${view.einsatz.id}?als=${view.einsatz.technikerId}`)} />
            ))}
            {sichtbar.map((view) => (
              <RapportZeile key={view.rapport.id} view={view} aktiv={view.rapport.id === rapportId} onClick={() => oeffnen(view.rapport.id)} />
            ))}
          </ul>
          {sichtbar.length === 0 && sichtbarFehlend.length === 0 && <p className={styles.leer}>Keine Rapporte in dieser Sicht.</p>}
        </section>

        <section className={styles.detail} aria-label="Rapport">
          {!gewaehlt && (
            <div className={styles.detailLeer}>
              {rapportId ? (
                <>
                  <FileWarning size={24} strokeWidth={1.5} aria-hidden />
                  <p>Rapport nicht gefunden.</p>
                  <Button variant="secondary" size="sm" onClick={zurListe}>
                    Zur Liste
                  </Button>
                </>
              ) : (
                <>
                  <p className={styles.detailLeerTitel}>Rapport wählen</p>
                  <p>Links die Liste, oben die Sichten. Prüfen, freigeben, zurückgeben und verrechnen passiert hier.</p>
                </>
              )}
            </div>
          )}
          {gewaehlt && (
            <RapportDetail
              view={gewaehlt}
              kuerzel={benutzer?.kuerzel ?? '??'}
              onZurueckZurListe={zurListe}
              onZurueck={() => setZurueck(true)}
              onMail={() => setNachricht('rapport-mail')}
              onFreigeben={() => aktionen.freigebenRapport(gewaehlt.rapport.id)}
              onVerrechnen={() => aktionen.verrechnenRapport(gewaehlt.rapport.id)}
              onDrucken={() => navigate(`/rapporte/${gewaehlt.rapport.id}/druck`)}
              {...(einsatz ? { onPlan: () => imPlanZeigen(einsatz.id, einsatz.datum) } : {})}
            />
          )}
        </section>
      </div>

      {gewaehlt && nachricht && (
        <NachrichtDialog open art={nachricht} auftrag={gewaehlt.auftrag} einsatz={gewaehlt.einsatz ?? null} techniker={gewaehlt.techniker} rapportNummer={gewaehlt.rapport.nummer} onSenden={aktionen.sendeNachricht} onClose={() => setNachricht(null)} />
      )}
      {gewaehlt && (
        <ZurueckDialog
          open={zurueck}
          rapport={gewaehlt.rapport}
          technikerName={fullName(gewaehlt.techniker)}
          onConfirm={(bemerkung) => {
            setZurueck(false);
            aktionen.zurueckAnTechniker(gewaehlt.rapport.id, bemerkung);
          }}
          onClose={() => setZurueck(false)}
        />
      )}
    </AppShell>
  );
}

/* ◆ jh · eof */
