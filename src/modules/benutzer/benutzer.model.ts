/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/benutzer/benutzer.model.ts                 │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Konten, Rechte-Matrix, Mitarbeitende, Hierarchie, Auskunft (DSG 25)   │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Benutzer, Rolle } from '../../core/auth/auth.types';
import { BEREICH_LABEL, PROFILE, RECHTE_KATALOG, herkunftVon, rechteVon } from '../../core/berechtigung/rechte';
import type { Bereich, Recht, RechtHerkunft, RechtInfo, RechteTraeger } from '../../core/berechtigung/rechte';
import type { IsoDatum } from '../../core/datum';
import { ferienkonto } from '../../core/domain/absenz';
import type { Absenz, Ferienkonto } from '../../core/domain/absenz';
import type { BetrieblicherFeiertag, Kanton } from '../../core/domain/feiertage';
import type { JournalEintrag } from '../../core/domain/journal';
import { FUNKTION_LABEL, istAngestellt, mitarbeiterName } from '../../core/domain/personal';
import type { Mitarbeiter } from '../../core/domain/personal';
import type { Techniker } from '../../core/domain/stammdaten';
import type { Monatsabschluss, ZeitEintrag } from '../../core/domain/zeit';
import { normalizeSuchtext } from '../../core/suche';
import type { DispoStammdaten } from '../dispo/dispo.types';
import type { PersonView } from '../personal/personal.model';

// ── §1 · Konten ──────────────────────────────────────────────────

export type KontoSicht = 'alle' | 'aktiv' | 'gesperrt' | 'anbieter' | 'ohne-akte' | 'angepasst';

export const KONTO_SICHTEN: readonly { id: KontoSicht; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'aktiv', label: 'Aktiv' },
  { id: 'gesperrt', label: 'Gesperrt' },
  { id: 'anbieter', label: 'Mit Anbieter' },
  { id: 'ohne-akte', label: 'Ohne Personalakte' },
  { id: 'angepasst', label: 'Angepasste Rechte' },
];

export interface KontoView {
  benutzer: Benutzer;
  person: Mitarbeiter | undefined;
  techniker: Techniker | undefined;
  rechte: ReadonlySet<Recht>;
  zusatz: number;
  entzogen: number;
  suchtext: string;
}

export function buildKontoViews(stammdaten: DispoStammdaten): KontoView[] {
  return [...stammdaten.benutzer.values()]
    .map((benutzer) => {
      const person = benutzer.mitarbeiterId ? stammdaten.mitarbeiter.get(benutzer.mitarbeiterId) : undefined;
      return {
        benutzer,
        person,
        techniker: benutzer.technikerId ? stammdaten.techniker.find((techniker) => techniker.id === benutzer.technikerId) : undefined,
        rechte: rechteVon(benutzer),
        zusatz: benutzer.zusatzRechte?.length ?? 0,
        entzogen: benutzer.entzogeneRechte?.length ?? 0,
        suchtext: normalizeSuchtext(`${benutzer.vorname} ${benutzer.nachname} ${benutzer.benutzername} ${benutzer.kuerzel} ${benutzer.email ?? ''} ${benutzer.rolle}`),
      };
    })
    .sort((a, b) => a.benutzer.nachname.localeCompare(b.benutzer.nachname, 'de-CH') || a.benutzer.vorname.localeCompare(b.benutzer.vorname, 'de-CH'));
}

function kontoPasst(view: KontoView, sicht: KontoSicht): boolean {
  switch (sicht) {
    case 'alle':
      return true;
    case 'aktiv':
      return view.benutzer.aktiv;
    case 'gesperrt':
      return !view.benutzer.aktiv;
    case 'anbieter':
      return view.benutzer.sso !== undefined;
    case 'ohne-akte':
      return view.person === undefined;
    case 'angepasst':
      return view.zusatz + view.entzogen > 0 || Object.keys(view.benutzer.umfang ?? {}).length > 0;
  }
}

export function zaehleKonten(views: readonly KontoView[]): Readonly<Record<KontoSicht, number>> {
  const zaehler: Record<KontoSicht, number> = { alle: views.length, aktiv: 0, gesperrt: 0, anbieter: 0, 'ohne-akte': 0, angepasst: 0 };
  for (const view of views) {
    for (const sicht of KONTO_SICHTEN) {
      if (sicht.id !== 'alle' && kontoPasst(view, sicht.id)) zaehler[sicht.id] += 1;
    }
  }
  return zaehler;
}

export function filterKonten(views: readonly KontoView[], sicht: KontoSicht, suche: string): KontoView[] {
  const begriff = normalizeSuchtext(suche);
  return views.filter((view) => kontoPasst(view, sicht) && (begriff === '' || view.suchtext.includes(begriff)));
}

export function benutzernameFrei(konten: ReadonlyMap<string, Benutzer>, benutzername: string, ausserId?: string): boolean {
  const gesucht = benutzername.trim().toLowerCase();
  return gesucht !== '' && ![...konten.values()].some((konto) => konto.id !== ausserId && konto.benutzername === gesucht);
}

// ── §2 · Rechte-Matrix ───────────────────────────────────────────

export interface MatrixEintrag {
  info: RechtInfo;
  herkunft: RechtHerkunft;
  aktiv: boolean;
}

export interface MatrixBereich {
  bereich: Bereich;
  label: string;
  rechte: MatrixEintrag[];
}

export function rechteMatrix(traeger: RechteTraeger): MatrixBereich[] {
  const aktiv = rechteVon(traeger);
  const bereiche = new Map<Bereich, MatrixEintrag[]>();
  for (const info of RECHTE_KATALOG) {
    const liste = bereiche.get(info.bereich) ?? [];
    liste.push({ info, herkunft: herkunftVon(traeger, info.recht), aktiv: aktiv.has(info.recht) });
    bereiche.set(info.bereich, liste);
  }
  return [...bereiche.entries()].map(([bereich, rechte]) => ({ bereich, label: BEREICH_LABEL[bereich], rechte }));
}

/** Nächster Zustand beim Klick auf eine Zelle: Rolle → entzogen → Rolle; keine → Zusatz → keine. */
export function rechtUmschalten(traeger: RechteTraeger, recht: Recht): Pick<Benutzer, 'zusatzRechte' | 'entzogeneRechte'> {
  const zusatz = new Set(traeger.zusatzRechte ?? []);
  const entzogen = new Set(traeger.entzogeneRechte ?? []);
  const herkunft = herkunftVon(traeger, recht);
  if (herkunft === 'entzogen') entzogen.delete(recht);
  else if (herkunft === 'rolle') entzogen.add(recht);
  else if (herkunft === 'zusatz') zusatz.delete(recht);
  else zusatz.add(recht);
  return { zusatzRechte: [...zusatz], entzogeneRechte: [...entzogen] };
}

/** Beim Rollenwechsel verfallen Anpassungen, die zur neuen Rolle nichts ändern würden. */
export function anpassungenBereinigen(rolle: Rolle, zusatzRechte: readonly Recht[] = [], entzogeneRechte: readonly Recht[] = []): Pick<Benutzer, 'zusatzRechte' | 'entzogeneRechte'> {
  const profil = new Set(PROFILE[rolle].rechte);
  return {
    zusatzRechte: zusatzRechte.filter((recht) => !profil.has(recht)),
    entzogeneRechte: entzogeneRechte.filter((recht) => profil.has(recht)),
  };
}

// ── §3 · Mitarbeitende & Hierarchie ──────────────────────────────

export type MitarbeiterSicht = 'alle' | 'aktiv' | 'ausgetreten' | 'ohne-konto' | 'aussendienst' | 'innendienst';

export const MITARBEITER_SICHTEN: readonly { id: MitarbeiterSicht; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'aktiv', label: 'Angestellt' },
  { id: 'ausgetreten', label: 'Ausgetreten' },
  { id: 'ohne-konto', label: 'Ohne Konto' },
  { id: 'aussendienst', label: 'Aussendienst' },
  { id: 'innendienst', label: 'Innendienst' },
];

export interface MitarbeiterZeile {
  person: PersonView;
  ferien: Ferienkonto;
  suchtext: string;
}

export function buildMitarbeiterZeilen(personen: readonly PersonView[], absenzen: readonly Absenz[], jahr: number, heute: IsoDatum, kanton: Kanton, betrieblich: readonly BetrieblicherFeiertag[]): MitarbeiterZeile[] {
  return personen.map((person) => ({
    person,
    ferien: ferienkonto(person.mitarbeiter, absenzen, jahr, heute, kanton, betrieblich),
    suchtext: normalizeSuchtext(`${mitarbeiterName(person.mitarbeiter)} ${person.mitarbeiter.kuerzel} ${FUNKTION_LABEL[person.mitarbeiter.funktion]} ${person.mitarbeiter.email}`),
  }));
}

function mitarbeiterPasst(zeile: MitarbeiterZeile, sicht: MitarbeiterSicht): boolean {
  const { mitarbeiter } = zeile.person;
  switch (sicht) {
    case 'alle':
      return true;
    case 'aktiv':
      return zeile.person.aktiv;
    case 'ausgetreten':
      return !zeile.person.aktiv;
    case 'ohne-konto':
      return zeile.person.konto === undefined;
    case 'aussendienst':
      return mitarbeiter.technikerId !== undefined;
    case 'innendienst':
      return mitarbeiter.technikerId === undefined;
  }
}

export function zaehleMitarbeiter(zeilen: readonly MitarbeiterZeile[]): Readonly<Record<MitarbeiterSicht, number>> {
  const zaehler: Record<MitarbeiterSicht, number> = { alle: zeilen.length, aktiv: 0, ausgetreten: 0, 'ohne-konto': 0, aussendienst: 0, innendienst: 0 };
  for (const zeile of zeilen) {
    for (const sicht of MITARBEITER_SICHTEN) {
      if (sicht.id !== 'alle' && mitarbeiterPasst(zeile, sicht.id)) zaehler[sicht.id] += 1;
    }
  }
  return zaehler;
}

export function filterMitarbeiter(zeilen: readonly MitarbeiterZeile[], sicht: MitarbeiterSicht, suche: string): MitarbeiterZeile[] {
  const begriff = normalizeSuchtext(suche);
  return zeilen.filter((zeile) => mitarbeiterPasst(zeile, sicht) && (begriff === '' || zeile.suchtext.includes(begriff)));
}

export interface HierarchieKnoten {
  person: PersonView;
  kinder: HierarchieKnoten[];
}

/** Organigramm: Wurzeln sind Personen ohne (sichtbare) Vorgesetzte; Kinder alphabetisch. */
export function buildHierarchie(personen: readonly PersonView[]): HierarchieKnoten[] {
  const ids = new Set(personen.map((person) => person.mitarbeiter.id));
  const knoten = (person: PersonView): HierarchieKnoten => ({
    person,
    kinder: personen
      .filter((kandidat) => kandidat.mitarbeiter.vorgesetzterId === person.mitarbeiter.id)
      .sort((a, b) => a.mitarbeiter.nachname.localeCompare(b.mitarbeiter.nachname, 'de-CH'))
      .map(knoten),
  });
  return personen
    .filter((person) => !person.mitarbeiter.vorgesetzterId || !ids.has(person.mitarbeiter.vorgesetzterId))
    .sort((a, b) => a.mitarbeiter.nachname.localeCompare(b.mitarbeiter.nachname, 'de-CH'))
    .map(knoten);
}

// ── §4 · Auskunft (DSG Art. 25) ──────────────────────────────────

export interface AuskunftQuelle {
  stammdaten: DispoStammdaten;
  zeiteintraege: readonly ZeitEintrag[];
  monatsabschluesse: readonly Monatsabschluss[];
  journal: readonly JournalEintrag[];
}

// jh› Auskunft = alles, was das System zu einer Person hält, maschinenlesbar und vollständig – inklusive
//     Journal: wer ihre Daten angesehen oder geändert hat. Fremde Personendaten bleiben draussen.
export function auskunftFuer(person: Mitarbeiter, quelle: AuskunftQuelle, heute: IsoDatum): Record<string, unknown> {
  const konto = [...quelle.stammdaten.benutzer.values()].find((benutzer) => benutzer.mitarbeiterId === person.id);
  return {
    erstelltAm: heute,
    rechtsgrundlage: 'Auskunft nach Art. 25 DSG / Art. 15 DSGVO',
    personalakte: { ...person, angestellt: istAngestellt(person, heute) },
    konto: konto ? { ...konto, rechte: [...rechteVon(konto)] } : null,
    absenzen: quelle.stammdaten.absenzen.filter((absenz) => absenz.mitarbeiterId === person.id),
    zeiteintraege: quelle.zeiteintraege.filter((eintrag) => eintrag.mitarbeiterId === person.id),
    monatsabschluesse: quelle.monatsabschluesse.filter((abschluss) => abschluss.mitarbeiterId === person.id),
    journal: quelle.journal.filter((eintrag) => eintrag.mitarbeiterId === person.id || (konto !== undefined && eintrag.benutzer === konto.kuerzel)),
  };
}

/* ◆ jh · eof */
