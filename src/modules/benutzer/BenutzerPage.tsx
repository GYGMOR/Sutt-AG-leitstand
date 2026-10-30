/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/benutzer/BenutzerPage.tsx                  │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Modul Benutzer & Rollen: Konten, Rollen-Matrix, Mitarbeitende, Orga   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Lock, LockOpen, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { meldeAenderungen } from '../../core/aenderungen';
import { useHeute } from '../../core/arbeitstag';
import { ROLLEN, ROLLE_LABEL } from '../../core/auth/auth.types';
import type { Benutzer } from '../../core/auth/auth.types';
import { ANBIETER_INFO } from '../../core/auth/identitaet';
import { BEREICH_LABEL, PERSONEN_BEREICHE, PROFILE, RECHTE_KATALOG, UMFANG_LABEL } from '../../core/berechtigung/rechte';
import type { Bereich as RechteBereich, RechtInfo } from '../../core/berechtigung/rechte';
import { FUNKTION_LABEL, mitarbeiterName } from '../../core/domain/personal';
import type { Mitarbeiter } from '../../core/domain/personal';
import { formatDatum, formatZeitpunktKurz } from '../../core/format';
import { useHotkey } from '../../core/hooks/useHotkey';
import { useRegisterKommandos } from '../../core/kommando';
import type { Kommando } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { useMandant } from '../../core/mandant/mandantStore';
import { findModul } from '../../core/modules.config';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { Kacheln } from '../../core/ui/Kacheln';
import type { Kachel } from '../../core/ui/Kacheln';
import { Leer } from '../../core/ui/Leer';
import { ModulSeite, ModulWerkzeuge } from '../../core/ui/ModulSeite';
import { SegmentedControl } from '../../core/ui/SegmentedControl';
import { Suchfeld } from '../../core/ui/Suchfeld';
import { Tabelle } from '../../core/ui/Tabelle';
import type { Spalte } from '../../core/ui/Tabelle';
import { cx } from '../../core/ui/cx';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '../../mock';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { useDemoReset } from '../dispo/store/useDemoReset';
import { PersonAvatar, PersonZelle } from '../personal/PersonAvatar';
import { buildPersonViews } from '../personal/personal.model';
import { useRechte } from '../personal/rechte';
import personal from '../personal/Personal.module.css';
import { useGlobaleSuchquellen } from '../suche/globaleSuche';
import { KONTO_SICHTEN, MITARBEITER_SICHTEN, buildHierarchie, buildKontoViews, buildMitarbeiterZeilen, filterKonten, filterMitarbeiter, zaehleKonten, zaehleMitarbeiter } from './benutzer.model';
import type { HierarchieKnoten, KontoSicht, KontoView, MitarbeiterSicht, MitarbeiterZeile } from './benutzer.model';
import { KontoDialog } from './KontoDialog';
import { KontoDossier } from './KontoDossier';
import { MitarbeiterDialog } from './MitarbeiterDialog';
import { MitarbeiterDossier } from './MitarbeiterDossier';
import styles from './BenutzerPage.module.css';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Bereiche & Spalten ──────────────────────────────────────

type Bereich = 'konten' | 'rollen' | 'mitarbeitende' | 'organigramm';

const BEREICHE: readonly { value: Bereich; label: string; title: string }[] = [
  { value: 'konten', label: 'Konten', title: 'Benutzerkonten mit Rolle, Rechten und Anbieter' },
  { value: 'rollen', label: 'Rollen & Rechte', title: 'Was jede Rolle darf – die ganze Matrix' },
  { value: 'mitarbeitende', label: 'Mitarbeitende', title: 'Personalakten: Funktion, Pensum, Vorgesetzte, Ferien' },
  { value: 'organigramm', label: 'Organigramm', title: 'Wer ist wem unterstellt – bestimmt den Umfang «Team»' },
];

function isBereich(wert: string | undefined): wert is Bereich {
  return BEREICHE.some((bereich) => bereich.value === wert);
}

const KONTO_SPALTEN: readonly Spalte<KontoView>[] = [
  {
    id: 'name',
    label: 'Name',
    render: (view) =>
      view.person ? (
        <PersonZelle mitarbeiter={view.person} techniker={view.techniker} />
      ) : (
        <span className={personal.personZelle}>
          <span className={cx(personal.avatar, personal.sm)}>{view.benutzer.kuerzel}</span>
          <span className={personal.personText}>
            <span className={personal.personName}>
              {view.benutzer.vorname} {view.benutzer.nachname}
            </span>
            <span className={personal.personMeta}>ohne Personalakte</span>
          </span>
        </span>
      ),
    sortWert: (view) => `${view.benutzer.nachname} ${view.benutzer.vorname}`,
  },
  { id: 'benutzername', label: 'Benutzername', render: (view) => `@${view.benutzer.benutzername}`, sortWert: (view) => view.benutzer.benutzername, mono: true },
  { id: 'rolle', label: 'Rolle', render: (view) => ROLLE_LABEL[view.benutzer.rolle], sortWert: (view) => ROLLE_LABEL[view.benutzer.rolle] },
  {
    id: 'anmeldung',
    label: 'Anmeldung',
    render: (view) =>
      view.benutzer.sso ? (
        <span className={styles.anbieterZelle}>
          <Chip tone="neutral">{ANBIETER_INFO[view.benutzer.sso.anbieter].kurz}</Chip>
          {view.benutzer.mfa && <Chip tone="ok">MFA</Chip>}
        </span>
      ) : (
        <span className={personal.leerWert}>lokal</span>
      ),
    sortWert: (view) => view.benutzer.sso?.anbieter ?? 'zzz',
    nebensaechlich: true,
  },
  {
    id: 'rechte',
    label: 'Rechte',
    render: (view) => (
      <span className={personal.mono}>
        {view.rechte.size}
        {view.zusatz > 0 && <span className={personal.plus}> +{view.zusatz}</span>}
        {view.entzogen > 0 && <span className={personal.minus}> −{view.entzogen}</span>}
      </span>
    ),
    sortWert: (view) => view.rechte.size,
    align: 'right',
    nebensaechlich: true,
  },
  {
    id: 'status',
    label: 'Status',
    render: (view) => (
      <Chip tone={view.benutzer.aktiv ? 'ok' : 'danger'} icon={view.benutzer.aktiv ? LockOpen : Lock}>
        {view.benutzer.aktiv ? 'Aktiv' : 'Gesperrt'}
      </Chip>
    ),
    sortWert: (view) => (view.benutzer.aktiv ? 0 : 1),
  },
  { id: 'letzte', label: 'Letzte Anmeldung', render: (view) => (view.benutzer.letzteAnmeldung ? formatZeitpunktKurz(view.benutzer.letzteAnmeldung) : <span className={personal.leerWert}>noch nie</span>), sortWert: (view) => view.benutzer.letzteAnmeldung ?? '', mono: true, nebensaechlich: true },
];

function statusChip(zeile: MitarbeiterZeile) {
  if (zeile.endetInTagen !== null) return <Chip tone="signal">{zeile.endetInTagen === 0 ? 'Endet heute' : `Endet in ${zeile.endetInTagen} Tagen`}</Chip>;
  return <Chip tone={zeile.person.aktiv ? 'ok' : 'mute'}>{zeile.person.aktiv ? 'Angestellt' : 'Ausgetreten'}</Chip>;
}

function statusRang(zeile: MitarbeiterZeile): number {
  if (zeile.endetInTagen !== null) return 0;
  return zeile.person.aktiv ? 1 : 2;
}

const MITARBEITER_SPALTEN: readonly Spalte<MitarbeiterZeile>[] = [
  { id: 'person', label: 'Mitarbeiter/in', render: (zeile) => <PersonZelle mitarbeiter={zeile.person.mitarbeiter} techniker={zeile.person.techniker} />, sortWert: (zeile) => `${zeile.person.mitarbeiter.nachname} ${zeile.person.mitarbeiter.vorname}` },
  { id: 'funktion', label: 'Funktion', render: (zeile) => FUNKTION_LABEL[zeile.person.mitarbeiter.funktion], sortWert: (zeile) => FUNKTION_LABEL[zeile.person.mitarbeiter.funktion] },
  { id: 'pensum', label: 'Pensum', render: (zeile) => `${zeile.person.mitarbeiter.pensum} %`, sortWert: (zeile) => zeile.person.mitarbeiter.pensum, align: 'right', mono: true },
  { id: 'eintritt', label: 'Eintritt', render: (zeile) => formatDatum(zeile.person.mitarbeiter.eintritt), sortWert: (zeile) => zeile.person.mitarbeiter.eintritt, mono: true, nebensaechlich: true },
  { id: 'vorgesetzte', label: 'Vorgesetzte/r', render: (zeile) => (zeile.person.vorgesetzte ? mitarbeiterName(zeile.person.vorgesetzte) : <span className={personal.leerWert}>Geschäftsleitung</span>), sortWert: (zeile) => zeile.person.vorgesetzte?.nachname ?? '', nebensaechlich: true },
  { id: 'konto', label: 'Konto', render: (zeile) => (zeile.person.konto ? <Chip tone={zeile.person.konto.aktiv ? 'neutral' : 'danger'}>@{zeile.person.konto.benutzername}</Chip> : <Chip tone="signal">kein Konto</Chip>), sortWert: (zeile) => zeile.person.konto?.benutzername ?? 'zzz' },
  { id: 'ferien', label: 'Ferien Rest', render: (zeile) => <span className={zeile.ferien.restTage < 0 ? personal.minus : undefined}>{zeile.ferien.restTage} Tage</span>, sortWert: (zeile) => zeile.ferien.restTage, align: 'right', mono: true, nebensaechlich: true },
  { id: 'status', label: 'Status', render: statusChip, sortWert: statusRang },
];

// ── §2 · Rollen-Matrix & Organigramm ─────────────────────────────

function RollenUebersicht({ konten }: { konten: readonly KontoView[] }) {
  const bereiche = useMemo(() => {
    const map = new Map<RechteBereich, RechtInfo[]>();
    for (const info of RECHTE_KATALOG) map.set(info.bereich, [...(map.get(info.bereich) ?? []), info]);
    return [...map.entries()];
  }, []);
  return (
    <>
      <div className={styles.rollen}>
        {ROLLEN.map((rolle) => {
          const profil = PROFILE[rolle];
          const anzahl = konten.filter((konto) => konto.benutzer.rolle === rolle).length;
          return (
            <article key={rolle} className={styles.rolleKarte} aria-label={ROLLE_LABEL[rolle]}>
              <span className={styles.rolleTitel}>{ROLLE_LABEL[rolle]}</span>
              <p className={styles.rolleText}>{profil.beschreibung}</p>
              <div className={styles.rolleZahlen}>
                <Chip tone="neutral">{anzahl} Konten</Chip>
                <Chip tone="mute">{profil.rechte.length} Rechte</Chip>
                {PERSONEN_BEREICHE.map((bereich) => (
                  <span key={bereich}>
                    {BEREICH_LABEL[bereich]}: {UMFANG_LABEL[profil.umfang[bereich] ?? 'eigene']}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      <p className={styles.hierarchieHinweis}>
        Rollen sind Startpunkte, keine Grenzen: Jedes Konto kann Zusatzrechte erhalten oder Rechte entzogen bekommen, der Umfang (eigene, Team, alle) folgt dem Organigramm. Die Rollen bauen aufeinander auf – Aussendienst ⊂ Disposition ⊂ Büro; Administration hat alles ausser Gesundheitsdaten.
      </p>
      <table className={styles.matrixTabelle}>
        <thead>
          <tr>
            <th scope="col">Recht</th>
            {ROLLEN.map((rolle) => (
              <th key={rolle} scope="col">
                {ROLLE_LABEL[rolle]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bereiche.map(([bereich, rechte]) => (
            <Fragment key={bereich}>
              <tr className={styles.bereichZeile}>
                <td colSpan={ROLLEN.length + 1}>{BEREICH_LABEL[bereich]}</td>
              </tr>
              {rechte.map((info) => (
                <tr key={info.recht}>
                  <td title={info.beschreibung}>{info.label}</td>
                  {ROLLEN.map((rolle) => (
                    <td key={rolle}>{PROFILE[rolle].rechte.includes(info.recht) ? <Check className={styles.haken} size={14} strokeWidth={2} aria-label="ja" /> : <span className={personal.leerWert}>–</span>}</td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Organigramm({ knoten, onPerson }: { knoten: readonly HierarchieKnoten[]; onPerson: (mitarbeiterId: string) => void }) {
  const zeichne = (liste: readonly HierarchieKnoten[]) => (
    <ul>
      {liste.map((eintrag) => {
        const { mitarbeiter } = eintrag.person;
        return (
          <li key={mitarbeiter.id}>
            <button type="button" className={styles.knoten} onClick={() => onPerson(mitarbeiter.id)}>
              <PersonAvatar mitarbeiter={mitarbeiter} techniker={eintrag.person.techniker} size="sm" />
              <span>{mitarbeiterName(mitarbeiter)}</span>
              <span className={styles.knotenMeta}>
                {FUNKTION_LABEL[mitarbeiter.funktion]} · {mitarbeiter.pensum} %{eintrag.kinder.length > 0 && ` · ${eintrag.kinder.length} unterstellt`}
              </span>
            </button>
            {eintrag.kinder.length > 0 && zeichne(eintrag.kinder)}
          </li>
        );
      })}
    </ul>
  );
  return (
    <div className={styles.organigramm}>
      <p className={styles.hierarchieHinweis}>Das Organigramm bestimmt den Umfang «Team»: Vorgesetzte sehen und genehmigen Zeiten und Absenzen aller direkt und indirekt Unterstellten. Geändert wird es in der Personalakte (Feld «Vorgesetzte/r»).</p>
      {zeichne(knoten)}
    </div>
  );
}

// ── §3 · Seite ───────────────────────────────────────────────────

const einsichtProtokolliert = new Set<string>();

export function BenutzerPage() {
  const { bereich: bereichParam } = useParams();
  const bereich: Bereich = isBereich(bereichParam) ? bereichParam : 'konten';
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const heute = useHeute();
  const state = useDispoState();
  const mandant = useMandant();
  const rechte = useRechte();
  const aktionen = useDispoAktionen();
  const darfKonten = rechte.hat('benutzer:lesen');
  const darfVerwalten = rechte.hat('benutzer:verwalten');
  const darfPersonal = rechte.hat('personal:bearbeiten');

  const [kontoSicht, setKontoSicht] = useState<KontoSicht>('alle');
  const [mitarbeiterSicht, setMitarbeiterSicht] = useState<MitarbeiterSicht>('alle');
  const [suche, setSuche] = useState('');
  const [kontoDialog, setKontoDialog] = useState<{ konto: Benutzer | null; vorgabe: Mitarbeiter | null } | null>(null);
  const [mitarbeiterDialog, setMitarbeiterDialog] = useState<{ mitarbeiter: Mitarbeiter | null } | null>(null);

  const konten = useMemo(() => buildKontoViews(state.stammdaten), [state.stammdaten]);
  const kontenZaehler = useMemo(() => zaehleKonten(konten), [konten]);
  const kontenSichtbar = useMemo(() => filterKonten(konten, kontoSicht, suche), [konten, kontoSicht, suche]);
  const sichtbarePersonen = useMemo(() => rechte.sichtbare('personal'), [rechte]);
  const personen = useMemo(() => buildPersonViews(state.stammdaten, heute, sichtbarePersonen), [state.stammdaten, heute, sichtbarePersonen]);
  const zeilen = useMemo(() => buildMitarbeiterZeilen(personen, state.stammdaten.absenzen, Number(heute.slice(0, 4)), heute, mandant.kanton, mandant.betrieblicheFeiertage), [personen, state.stammdaten.absenzen, heute, mandant]);
  const mitarbeiterZaehler = useMemo(() => zaehleMitarbeiter(zeilen), [zeilen]);
  const mitarbeiterSichtbar = useMemo(() => filterMitarbeiter(zeilen, mitarbeiterSicht, suche), [zeilen, mitarbeiterSicht, suche]);
  const hierarchie = useMemo(() => buildHierarchie(personen), [personen]);

  const kontoId = params.get('konto');
  const mitarbeiterId = params.get('mitarbeiter');
  const konto = useMemo(() => (kontoId ? (konten.find((view) => view.benutzer.id === kontoId) ?? null) : null), [konten, kontoId]);
  const zeile = useMemo(() => (mitarbeiterId ? (zeilen.find((kandidat) => kandidat.person.mitarbeiter.id === mitarbeiterId) ?? null) : null), [zeilen, mitarbeiterId]);
  const detailOffen = (bereich === 'konten' && kontoId !== null) || (bereich === 'mitarbeitende' && mitarbeiterId !== null);

  useGlobaleSuchquellen();
  useEffect(() => {
    meldeAenderungen('dispo', state.protokoll.length);
  }, [state.protokoll.length]);

  // jh› Ohne «benutzer:lesen» gibt es keine Kontenliste – die Seite springt zu den Mitarbeitenden.
  useEffect(() => {
    if (!darfKonten && bereich === 'konten') navigate('/benutzer/mitarbeitende', { replace: true });
  }, [darfKonten, bereich, navigate]);

  // jh› Einsicht in eine fremde Personalakte wird protokolliert (DSV Art. 4) – einmal je Person und Sitzung.
  useEffect(() => {
    if (!zeile || zeile.person.mitarbeiter.id === rechte.mitarbeiter?.id) return;
    const schluessel = `${rechte.benutzer?.id ?? '?'}:${zeile.person.mitarbeiter.id}`;
    if (einsichtProtokolliert.has(schluessel)) return;
    einsichtProtokolliert.add(schluessel);
    aktionen.einsichtProtokollieren('personal', zeile.person.mitarbeiter.id, `Personalakte ${mitarbeiterName(zeile.person.mitarbeiter)} angesehen`);
  }, [zeile, rechte.mitarbeiter?.id, rechte.benutzer?.id, aktionen]);

  const wechseln = useCallback((neu: Bereich) => navigate(`/benutzer/${neu}`), [navigate]);
  const oeffneKonto = useCallback((id: string) => navigate(`/benutzer/konten?konto=${encodeURIComponent(id)}`), [navigate]);
  const oeffnePerson = useCallback((id: string) => navigate(`/benutzer/mitarbeitende?mitarbeiter=${encodeURIComponent(id)}`), [navigate]);
  const zurListe = useCallback(() => navigate(`/benutzer/${bereich}`), [navigate, bereich]);
  useHotkey({ key: 'Escape', inInputs: true }, () => {
    if (detailOffen) zurListe();
  });

  const demoReset = useDemoReset();
  const kommandos = useMemo<Kommando[]>(
    () => [
      ...BEREICHE.map<Kommando>((eintrag) => ({ id: `benutzer:${eintrag.value}`, label: `Benutzer: ${eintrag.label}`, gruppe: 'ansicht', icon: eintrag.value === 'konten' || eintrag.value === 'rollen' ? ShieldCheck : Users, run: () => wechseln(eintrag.value) })),
      ...(darfVerwalten ? [{ id: 'benutzer:konto-neu', label: 'Konto anlegen', gruppe: 'aktion' as const, icon: UserPlus, run: () => setKontoDialog({ konto: null, vorgabe: null }) }] : []),
      ...(darfPersonal ? [{ id: 'benutzer:person-neu', label: 'Mitarbeiter/in anlegen', gruppe: 'aktion' as const, icon: UserPlus, run: () => setMitarbeiterDialog({ mitarbeiter: null }) }] : []),
      demoReset.kommando,
    ],
    [demoReset.kommando, wechseln, darfVerwalten, darfPersonal],
  );
  useRegisterKommandos('benutzer', kommandos);

  const kontoKacheln = useMemo<Kachel[]>(() => KONTO_SICHTEN.map((eintrag) => ({ id: eintrag.id, label: eintrag.label, zahl: kontenZaehler[eintrag.id], ton: eintrag.id === 'gesperrt' && kontenZaehler.gesperrt > 0 ? 'danger' : eintrag.id === 'ohne-akte' && kontenZaehler['ohne-akte'] > 0 ? 'signal' : 'neutral' })), [kontenZaehler]);
  const mitarbeiterKacheln = useMemo<Kachel[]>(() => MITARBEITER_SICHTEN.map((eintrag) => ({ id: eintrag.id, label: eintrag.label, zahl: mitarbeiterZaehler[eintrag.id], ton: eintrag.id === 'ohne-konto' && mitarbeiterZaehler['ohne-konto'] > 0 ? 'signal' : 'neutral' })), [mitarbeiterZaehler]);

  const liste = (
    <>
      {bereich === 'konten' && <Kacheln kacheln={kontoKacheln} aktiv={kontoSicht} onWahl={(id) => setKontoSicht(id as KontoSicht)} label="Sicht" />}
      {bereich === 'mitarbeitende' && <Kacheln kacheln={mitarbeiterKacheln} aktiv={mitarbeiterSicht} onWahl={(id) => setMitarbeiterSicht(id as MitarbeiterSicht)} label="Sicht" />}
      <ModulWerkzeuge anzahl={bereich === 'konten' ? `${kontenSichtbar.length} von ${konten.length}` : bereich === 'mitarbeitende' ? `${mitarbeiterSichtbar.length} von ${zeilen.length}` : undefined}>
        <SegmentedControl label="Bereich" options={darfKonten ? BEREICHE : BEREICHE.filter((eintrag) => eintrag.value !== 'konten')} value={bereich} onChange={wechseln} />
        {(bereich === 'konten' || bereich === 'mitarbeitende') && <Suchfeld wert={suche} onChange={setSuche} placeholder={bereich === 'konten' ? 'Name, Benutzername, E-Mail, Rolle …' : 'Name, Kürzel, Funktion, E-Mail …'} label="Durchsuchen" />}
        {bereich === 'konten' && darfVerwalten && (
          <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setKontoDialog({ konto: null, vorgabe: null })}>
            Konto anlegen
          </Button>
        )}
        {bereich === 'mitarbeitende' && darfPersonal && (
          <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setMitarbeiterDialog({ mitarbeiter: null })}>
            Mitarbeiter/in anlegen
          </Button>
        )}
      </ModulWerkzeuge>
      {bereich === 'konten' && <Tabelle spalten={KONTO_SPALTEN} zeilen={kontenSichtbar} zeilenId={(view) => view.benutzer.id} label="Konten" aktivId={kontoId} onZeile={(view) => oeffneKonto(view.benutzer.id)} standardSortierung={{ id: 'name', richtung: 'auf' }} leer="Keine Konten in dieser Sicht." />}
      {bereich === 'rollen' && <RollenUebersicht konten={konten} />}
      {bereich === 'mitarbeitende' && <Tabelle spalten={MITARBEITER_SPALTEN} zeilen={mitarbeiterSichtbar} zeilenId={(eintrag) => eintrag.person.mitarbeiter.id} label="Mitarbeitende" aktivId={mitarbeiterId} onZeile={(eintrag) => oeffnePerson(eintrag.person.mitarbeiter.id)} standardSortierung={{ id: 'person', richtung: 'auf' }} leer="Keine Mitarbeitenden in dieser Sicht." />}
      {bereich === 'organigramm' && <Organigramm knoten={hierarchie} onPerson={oeffnePerson} />}
    </>
  );

  const detail = (() => {
    if (bereich === 'konten' && kontoId) {
      return konto ? (
        <KontoDossier view={konto} rechte={rechte} aktionen={aktionen} journal={state.journal} onBearbeiten={() => setKontoDialog({ konto: konto.benutzer, vorgabe: null })} />
      ) : (
        <Leer icon={ShieldCheck} titel="Konto nicht gefunden" text="Das Konto existiert nicht oder wurde entfernt." fuellend>
          <Button variant="secondary" size="sm" onClick={zurListe}>
            Zur Liste
          </Button>
        </Leer>
      );
    }
    if (bereich === 'mitarbeitende' && mitarbeiterId) {
      return zeile ? (
        <MitarbeiterDossier zeile={zeile} state={state} rechte={rechte} aktionen={aktionen} mandant={mandant} heute={heute} onBearbeiten={() => setMitarbeiterDialog({ mitarbeiter: zeile.person.mitarbeiter })} onKontoAnlegen={() => setKontoDialog({ konto: null, vorgabe: zeile.person.mitarbeiter })} />
      ) : (
        <Leer icon={Users} titel="Personalakte nicht sichtbar" text="Die Person existiert nicht oder liegt ausserhalb Ihres Umfangs (eigene, Team, alle)." fuellend>
          <Button variant="secondary" size="sm" onClick={zurListe}>
            Zur Liste
          </Button>
        </Leer>
      );
    }
    return null;
  })();

  return (
    <AppShell modul={findModul('benutzer')} menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <ModulSeite label="Benutzer & Rollen" detailOffen={detailOffen} onZurueck={zurListe} liste={liste} detail={detail} />
      <KontoDialog
        open={kontoDialog !== null}
        konto={kontoDialog?.konto ?? null}
        konten={state.stammdaten.benutzer}
        mitarbeiter={[...state.stammdaten.mitarbeiter.values()]}
        vorgabe={kontoDialog?.vorgabe ?? null}
        onClose={() => setKontoDialog(null)}
        onSpeichern={(benutzer) => {
          aktionen.benutzerSpeichern(benutzer);
          oeffneKonto(benutzer.id);
        }}
      />
      <MitarbeiterDialog
        open={mitarbeiterDialog !== null}
        mitarbeiter={mitarbeiterDialog?.mitarbeiter ?? null}
        alle={[...state.stammdaten.mitarbeiter.values()]}
        techniker={state.stammdaten.techniker}
        mandant={mandant}
        onClose={() => setMitarbeiterDialog(null)}
        onSpeichern={(mitarbeiter) => {
          aktionen.mitarbeiterSpeichern(mitarbeiter);
          oeffnePerson(mitarbeiter.id);
        }}
      />
    </AppShell>
  );
}

/* ◆ jh · eof */
