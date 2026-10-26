/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/berechtigung/rechte.ts                        │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Rechte: Rolle → Profil → Zusatz/Entzug → Umfang (eigene, Team, alle)  │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Rolle } from '../auth/auth.types';

// ── §1 · Typen ───────────────────────────────────────────────────

export type Bereich =
  | 'dashboard'
  | 'dispo'
  | 'app'
  | 'auftraege'
  | 'kunden'
  | 'geraete'
  | 'bilder'
  | 'lager'
  | 'rapporte'
  | 'zeit'
  | 'absenzen'
  | 'personal'
  | 'benutzer'
  | 'einstellungen'
  | 'protokoll'
  | 'datenschutz';

export type Aktion = 'lesen' | 'bearbeiten' | 'erfassen' | 'korrigieren' | 'genehmigen' | 'freigeben' | 'loeschen' | 'exportieren' | 'verwalten' | 'gesundheit';

export type Recht = `${Bereich}:${Aktion}`;

/** Auf wessen Daten ein Recht wirkt – gilt für die Personenbereiche Zeit, Absenzen, Personal. */
export type Umfang = 'eigene' | 'team' | 'alle';

export const UMFAENGE: readonly Umfang[] = ['eigene', 'team', 'alle'];

export const UMFANG_LABEL: Readonly<Record<Umfang, string>> = {
  eigene: 'Nur eigene',
  team: 'Eigenes Team',
  alle: 'Alle Mitarbeitenden',
};

const UMFANG_RANG: Readonly<Record<Umfang, number>> = { eigene: 0, team: 1, alle: 2 };

export const PERSONEN_BEREICHE: readonly Bereich[] = ['zeit', 'absenzen', 'personal'];

export const BEREICH_LABEL: Readonly<Record<Bereich, string>> = {
  dashboard: 'Dashboard',
  dispo: 'Disposition',
  app: 'Techniker-App',
  auftraege: 'Aufträge',
  kunden: 'Kunden & Liegenschaften',
  geraete: 'Geräte',
  bilder: 'Bilder',
  lager: 'Lager & Ersatzteile',
  rapporte: 'Servicerapporte',
  zeit: 'Zeiterfassung',
  absenzen: 'Ferien & Absenzen',
  personal: 'Personaldaten',
  benutzer: 'Benutzer & Rollen',
  einstellungen: 'Einstellungen',
  protokoll: 'Protokoll',
  datenschutz: 'Datenschutz',
};

// ── §2 · Katalog ─────────────────────────────────────────────────

export interface RechtInfo {
  recht: Recht;
  bereich: Bereich;
  label: string;
  beschreibung: string;
}

function eintrag(recht: Recht, label: string, beschreibung: string): RechtInfo {
  return { recht, bereich: recht.split(':')[0] as Bereich, label, beschreibung };
}

// jh› Ein Recht ist eine Tür, kein Menü: Jede schreibende Aktion im System prüft genau einen Eintrag dieser Liste.
export const RECHTE_KATALOG: readonly RechtInfo[] = [
  eintrag('dashboard:lesen', 'Dashboard sehen', 'Tagesüberblick und Kennzahlen'),
  eintrag('dispo:lesen', 'Plan sehen', 'Plantafel, Kalender, Liste, Karte'),
  eintrag('dispo:bearbeiten', 'Disponieren', 'Einsätze planen, verschieben, Status setzen'),
  eintrag('app:lesen', 'Techniker-App', 'Eigenen Tagesplan auf dem Handy sehen'),
  eintrag('app:erfassen', 'Status & Rapport melden', 'Abfahrt, Ankunft, Fertig und Servicerapport aus der App'),
  eintrag('auftraege:lesen', 'Aufträge sehen', 'Auftragsdossiers lesen'),
  eintrag('auftraege:bearbeiten', 'Aufträge bearbeiten', 'Erfassen, ändern, kopieren, Teile bestellen'),
  eintrag('auftraege:loeschen', 'Aufträge löschen', 'Aufträge aus dem Plan nehmen'),
  eintrag('kunden:lesen', 'Kunden sehen', 'Kunden und Liegenschaften lesen'),
  eintrag('kunden:bearbeiten', 'Kunden bearbeiten', 'Kontakt, Liegenschaften, Hinweise pflegen'),
  eintrag('geraete:lesen', 'Geräte sehen', 'Gerätekartei lesen'),
  eintrag('geraete:bearbeiten', 'Geräte bearbeiten', 'Typenschild, Garantie, Gerätedaten pflegen'),
  eintrag('bilder:lesen', 'Bilder sehen', 'Fotos aus dem Aussendienst'),
  eintrag('lager:lesen', 'Lager sehen', 'Bestände, Bestellungen, Journal'),
  eintrag('lager:bearbeiten', 'Lager buchen', 'Bestellen, Wareneingang, Umbuchen, Korrigieren'),
  eintrag('rapporte:lesen', 'Rapporte sehen', 'Servicerapporte lesen'),
  eintrag('rapporte:erfassen', 'Rapporte erfassen', 'Rapporte schreiben und abschliessen'),
  eintrag('rapporte:freigeben', 'Rapporte freigeben', 'Prüfen, freigeben, verrechnen, zurückgeben'),
  eintrag('zeit:lesen', 'Zeitkonto sehen', 'Stempel, Tage, Saldo'),
  eintrag('zeit:erfassen', 'Stempeln & erfassen', 'Kommen, Gehen, Pause; eigene Einträge nachtragen'),
  eintrag('zeit:korrigieren', 'Zeiten korrigieren', 'Einträge ändern oder löschen – mit Grund und Spur'),
  eintrag('zeit:genehmigen', 'Monate genehmigen', 'Monatsabschlüsse genehmigen oder zurückweisen'),
  eintrag('zeit:exportieren', 'Zeiten exportieren', 'Zeitkonten als CSV für Lohn und Behörden'),
  eintrag('absenzen:lesen', 'Absenzen sehen', 'Ferienkalender und Konten'),
  eintrag('absenzen:erfassen', 'Absenzen beantragen', 'Ferien, Kompensation und Schulung beantragen; Krankheit melden'),
  eintrag('absenzen:bearbeiten', 'Absenzen für andere erfassen', 'Absenzen anderer Personen anlegen und ändern'),
  eintrag('absenzen:genehmigen', 'Absenzen genehmigen', 'Anträge genehmigen oder ablehnen'),
  eintrag('personal:lesen', 'Personaldaten sehen', 'Pensum, Eintritt, Ferienanspruch, Vorgesetzte'),
  eintrag('personal:bearbeiten', 'Personaldaten bearbeiten', 'Mitarbeitende anlegen und ändern'),
  eintrag('personal:gesundheit', 'Gesundheitsdaten sehen', 'Krankheit und Unfall als solche sehen – sonst nur «Abwesend»'),
  eintrag('personal:exportieren', 'Auskunft erstellen', 'Datenauskunft nach DSG Art. 25 für eine Person zusammenstellen'),
  eintrag('benutzer:lesen', 'Konten sehen', 'Benutzerkonten und Rollen lesen'),
  eintrag('benutzer:verwalten', 'Konten verwalten', 'Rollen, Rechte, Sperren, Anbieter-Verknüpfung'),
  eintrag('einstellungen:lesen', 'Einstellungen sehen', 'Betrieb, Anmeldung, Datenschutz lesen'),
  eintrag('einstellungen:verwalten', 'Einstellungen ändern', 'Arbeitszeitmodell, Feiertage, Anbieter, Module'),
  eintrag('protokoll:lesen', 'Protokoll sehen', 'Journal aller Änderungen und Einsichten'),
  eintrag('protokoll:exportieren', 'Protokoll exportieren', 'Journal als CSV'),
  eintrag('datenschutz:lesen', 'Meine Daten', 'Eigene gespeicherte Daten einsehen'),
  eintrag('datenschutz:exportieren', 'Meine Daten exportieren', 'Eigene Daten als Datei (Auskunftsrecht)'),
  eintrag('datenschutz:verwalten', 'Löschläufe', 'Aufbewahrungsfristen anwenden, Löschläufe ausführen'),
];

export const ALLE_RECHTE: readonly Recht[] = RECHTE_KATALOG.map((info) => info.recht);

export function rechtInfo(recht: Recht): RechtInfo | undefined {
  return RECHTE_KATALOG.find((info) => info.recht === recht);
}

// ── §3 · Rollenprofile ───────────────────────────────────────────

export interface Rechteprofil {
  rolle: Rolle;
  beschreibung: string;
  rechte: readonly Recht[];
  /** Standard-Umfang je Personenbereich; fehlt er, gilt «eigene». */
  umfang: Readonly<Partial<Record<Bereich, Umfang>>>;
}

const AUSSENDIENST: readonly Recht[] = [
  'dashboard:lesen', 'dispo:lesen', 'app:lesen', 'app:erfassen',
  'auftraege:lesen', 'geraete:lesen', 'geraete:bearbeiten', 'bilder:lesen',
  'rapporte:lesen', 'rapporte:erfassen',
  'zeit:lesen', 'zeit:erfassen', 'zeit:korrigieren',
  'absenzen:lesen', 'absenzen:erfassen',
  'personal:lesen', 'datenschutz:lesen', 'datenschutz:exportieren',
];

const DISPOSITION: readonly Recht[] = [
  ...AUSSENDIENST,
  'dispo:bearbeiten', 'auftraege:bearbeiten', 'auftraege:loeschen',
  'kunden:lesen', 'kunden:bearbeiten', 'lager:lesen', 'lager:bearbeiten',
  'zeit:genehmigen', 'absenzen:genehmigen', 'absenzen:bearbeiten',
];

const BUERO: readonly Recht[] = [
  ...DISPOSITION,
  'rapporte:freigeben', 'zeit:exportieren',
  'personal:bearbeiten', 'personal:gesundheit', 'personal:exportieren',
  'benutzer:lesen', 'protokoll:lesen',
];

// jh› Administration bekommt alles ausser Gesundheitsdaten (Need-to-know): Wer sie braucht, bekommt sie als Zusatzrecht.
const ADMINISTRATION: readonly Recht[] = ALLE_RECHTE.filter((recht) => recht !== 'personal:gesundheit');

export const PROFILE: Readonly<Record<Rolle, Rechteprofil>> = {
  aussendienst: {
    rolle: 'aussendienst',
    beschreibung: 'Sieht den eigenen Plan, meldet Status und Rapport, stempelt und beantragt Ferien – nur für sich selbst.',
    rechte: AUSSENDIENST,
    umfang: { zeit: 'eigene', absenzen: 'eigene', personal: 'eigene' },
  },
  disposition: {
    rolle: 'disposition',
    beschreibung: 'Plant Einsätze, pflegt Aufträge, Kunden und Lager; genehmigt Zeiten und Absenzen des eigenen Teams.',
    rechte: DISPOSITION,
    umfang: { zeit: 'team', absenzen: 'team', personal: 'team' },
  },
  buero: {
    rolle: 'buero',
    beschreibung: 'Büro und Personaladministration: Rapporte freigeben, Zeiten und Absenzen aller Mitarbeitenden, Gesundheitsdaten.',
    rechte: BUERO,
    umfang: { zeit: 'alle', absenzen: 'alle', personal: 'alle' },
  },
  administration: {
    rolle: 'administration',
    beschreibung: 'Konten, Rechte, Anbieter, Einstellungen und Protokoll – Gesundheitsdaten nur als Zusatzrecht.',
    rechte: ADMINISTRATION,
    umfang: { zeit: 'alle', absenzen: 'alle', personal: 'alle' },
  },
};

// ── §4 · Träger & Auswertung ─────────────────────────────────────

/** Rolle plus individuelle Anpassung – ein Benutzerkonto erfüllt diese Schnittstelle. */
export interface RechteTraeger {
  rolle: Rolle;
  zusatzRechte?: readonly Recht[];
  entzogeneRechte?: readonly Recht[];
  umfang?: Readonly<Partial<Record<Bereich, Umfang>>>;
}

export type RechtHerkunft = 'rolle' | 'zusatz' | 'entzogen' | 'keine';

export function rechteVon(traeger: RechteTraeger): ReadonlySet<Recht> {
  const menge = new Set<Recht>(PROFILE[traeger.rolle].rechte);
  for (const recht of traeger.zusatzRechte ?? []) menge.add(recht);
  for (const recht of traeger.entzogeneRechte ?? []) menge.delete(recht);
  return menge;
}

export function hatRecht(traeger: RechteTraeger, recht: Recht): boolean {
  return rechteVon(traeger).has(recht);
}

export function herkunftVon(traeger: RechteTraeger, recht: Recht): RechtHerkunft {
  if (traeger.entzogeneRechte?.includes(recht)) return 'entzogen';
  if (PROFILE[traeger.rolle].rechte.includes(recht)) return 'rolle';
  if (traeger.zusatzRechte?.includes(recht)) return 'zusatz';
  return 'keine';
}

export function umfangVon(traeger: RechteTraeger, bereich: Bereich): Umfang {
  return traeger.umfang?.[bereich] ?? PROFILE[traeger.rolle].umfang[bereich] ?? 'eigene';
}

export function umfangMindestens(ist: Umfang, soll: Umfang): boolean {
  return UMFANG_RANG[ist] >= UMFANG_RANG[soll];
}

export interface Sichtkontext {
  /** Mitarbeiter-ID der angemeldeten Person, null ohne Verknüpfung. */
  eigeneId: string | null;
  /** Direkt und indirekt unterstellte Personen. */
  teamIds: ReadonlySet<string>;
}

/** Darf die Person die Daten von `mitarbeiterId` im Bereich sehen bzw. bearbeiten? */
export function darfPerson(traeger: RechteTraeger, bereich: Bereich, mitarbeiterId: string, kontext: Sichtkontext): boolean {
  const umfang = umfangVon(traeger, bereich);
  if (umfang === 'alle') return true;
  if (mitarbeiterId === kontext.eigeneId) return true;
  return umfang === 'team' && kontext.teamIds.has(mitarbeiterId);
}

/* ◆ jh · eof */
