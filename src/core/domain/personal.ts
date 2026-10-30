/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/personal.ts                            │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Mitarbeitende: Funktion, Pensum, Vertrag, Ferien, Hierarchie          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { daysBetween } from '../datum';
import type { IsoDatum, Minuten } from '../datum';

// ── §1 · Typen ───────────────────────────────────────────────────

export type Funktion = 'techniker' | 'lehrling' | 'disposition' | 'buero' | 'leitung';

export const FUNKTIONEN: readonly Funktion[] = ['techniker', 'lehrling', 'disposition', 'buero', 'leitung'];

export const FUNKTION_LABEL: Readonly<Record<Funktion, string>> = {
  techniker: 'Service-Techniker/in',
  lehrling: 'Lernende/r',
  disposition: 'Disposition',
  buero: 'Büro / Administration',
  leitung: 'Geschäftsleitung',
};

// jh› Vier Vertragsarten decken ab, was ein Servicebetrieb hat: fest angestellt, befristet (Lehre, Projekt),
//     auf Widerruf (Aushilfe ohne festes Ende) und temporär (Verleih mit Enddatum). Planung, Soll und
//     Zeitkonto richten sich nach Beginn und Ende – nicht nach der Art.
// jh? Was «auf Widerruf» bei Sutt genau heisst – Aushilfe ohne festes Ende oder Probezeit?
export type Vertragsart = 'unbefristet' | 'befristet' | 'auf-widerruf' | 'temporaer';

export const VERTRAGSARTEN: readonly Vertragsart[] = ['unbefristet', 'befristet', 'auf-widerruf', 'temporaer'];

export const VERTRAGSART_LABEL: Readonly<Record<Vertragsart, string>> = {
  unbefristet: 'Unbefristet',
  befristet: 'Befristet',
  'auf-widerruf': 'Auf Widerruf',
  temporaer: 'Temporär',
};

export const VERTRAGSART_HINWEIS: Readonly<Record<Vertragsart, string>> = {
  unbefristet: 'Ohne Enddatum – endet erst mit einer Kündigung.',
  befristet: 'Endet am vereinbarten Datum; das Enddatum ist Pflicht.',
  'auf-widerruf': 'Läuft bis auf Weiteres – der Widerruf setzt das Enddatum.',
  temporaer: 'Zeitlich begrenzter Einsatz mit festem Ende; das Enddatum ist Pflicht.',
};

/** Offenes Vertragsende: so weit in der Zukunft, dass Planung und Zeitkonto nie anstossen. */
export const VERTRAG_OFFEN: IsoDatum = '2099-12-31';

/** Vorlauf, mit dem ein Vertragsende im Dashboard und in Benutzer & Rollen gemeldet wird. */
export const VERTRAG_VORLAUF_TAGE = 60;

// jh› Datenminimierung (DSG Art. 6 Abs. 3): keine AHV-Nummer, kein Geburtsdatum, keine Privatadresse –
//     die Zeiterfassung braucht sie nicht; sie bleiben im Lohnsystem.
export interface Mitarbeiter {
  id: string;
  kuerzel: string;
  vorname: string;
  nachname: string;
  funktion: Funktion;
  /** Verknüpfter Techniker im Plan – nur Aussendienst. */
  technikerId?: string;
  /** Beschäftigungsgrad in Prozent, 100 = Vollzeit. */
  pensum: number;
  /** Vertragsbeginn. */
  eintritt: IsoDatum;
  /** Vertragsende – leer, solange der Vertrag offen ist. */
  austritt?: IsoDatum;
  vertragsart: Vertragsart;
  /** Grund der Befristung oder des Widerrufs – kein Vertragstext (Datenminimierung). */
  vertragsnotiz?: string;
  /** Ferienanspruch in Tagen pro Jahr bei 100 % (Minimum OR 329a: 20, unter 20 Jahren 25). */
  ferienTageProJahr: number;
  /** Übertrag Ferien aus dem Vorjahr in Tagen (bereits pensumbereinigt). */
  ferienUebertragTage: number;
  /** Gleitzeit-Saldo per Stichtag in Minuten (Einführung der Zeiterfassung oder Jahreswechsel). */
  zeitUebertragMin: Minuten;
  /** Stichtag des Übertrags – ab dem Folgetag (Systembeginn) zählt jeder Tag in den Saldo. */
  zeitUebertragPer: IsoDatum;
  /** Direkte/r Vorgesetzte/r – Grundlage für Team-Sicht und Genehmigung. */
  vorgesetzterId?: string;
  email: string;
  telefon?: string;
}

/** Der Vertrag als Sicht auf die Person: Beginn = Eintritt, Ende = Austritt. */
export interface Vertrag {
  art: Vertragsart;
  beginn: IsoDatum;
  ende: IsoDatum | null;
  offen: boolean;
  notiz?: string;
}

// ── §2 · Hilfen ──────────────────────────────────────────────────

export function mitarbeiterName(mitarbeiter: Pick<Mitarbeiter, 'vorname' | 'nachname'>): string {
  return `${mitarbeiter.vorname} ${mitarbeiter.nachname}`;
}

export function istAngestellt(mitarbeiter: Pick<Mitarbeiter, 'eintritt' | 'austritt'>, datum: IsoDatum): boolean {
  if (datum < mitarbeiter.eintritt) return false;
  return mitarbeiter.austritt === undefined || datum <= mitarbeiter.austritt;
}

/** Direkt unterstellte Personen; rekursiv auch deren Teams (Leitung sieht alle Stufen). */
export function unterstellte(alle: readonly Mitarbeiter[], vorgesetzterId: string, rekursiv = true): Mitarbeiter[] {
  const ergebnis: Mitarbeiter[] = [];
  const gesehen = new Set<string>([vorgesetzterId]);
  const offen = [vorgesetzterId];
  while (offen.length > 0) {
    const chef = offen.shift();
    if (chef === undefined) break;
    for (const person of alle) {
      if (person.vorgesetzterId !== chef || gesehen.has(person.id)) continue;
      gesehen.add(person.id);
      ergebnis.push(person);
      if (rekursiv) offen.push(person.id);
    }
  }
  return ergebnis;
}

/** Vorgesetztenkette von unten nach oben, ohne die Person selbst. */
export function vorgesetzteKette(alle: ReadonlyMap<string, Mitarbeiter>, mitarbeiterId: string): Mitarbeiter[] {
  const kette: Mitarbeiter[] = [];
  const gesehen = new Set<string>([mitarbeiterId]);
  let aktuell = alle.get(mitarbeiterId)?.vorgesetzterId;
  while (aktuell && !gesehen.has(aktuell)) {
    const chef = alle.get(aktuell);
    if (!chef) break;
    kette.push(chef);
    gesehen.add(chef.id);
    aktuell = chef.vorgesetzterId;
  }
  return kette;
}

export function sortiertNachName(liste: readonly Mitarbeiter[]): Mitarbeiter[] {
  return [...liste].sort((a, b) => a.nachname.localeCompare(b.nachname, 'de-CH') || a.vorname.localeCompare(b.vorname, 'de-CH'));
}

// ── §3 · Vertrag ─────────────────────────────────────────────────

export function vertragVon(mitarbeiter: Pick<Mitarbeiter, 'vertragsart' | 'eintritt' | 'austritt' | 'vertragsnotiz'>): Vertrag {
  return {
    art: mitarbeiter.vertragsart,
    beginn: mitarbeiter.eintritt,
    ende: mitarbeiter.austritt ?? null,
    offen: mitarbeiter.austritt === undefined,
    ...(mitarbeiter.vertragsnotiz ? { notiz: mitarbeiter.vertragsnotiz } : {}),
  };
}

/** Letzter Vertragstag – bei offenem Vertrag der ferne Platzhalter VERTRAG_OFFEN. */
export function vertragsende(mitarbeiter: Pick<Mitarbeiter, 'austritt'>): IsoDatum {
  return mitarbeiter.austritt ?? VERTRAG_OFFEN;
}

export function vertragBrauchtEnde(art: Vertragsart): boolean {
  return art === 'befristet' || art === 'temporaer';
}

/** Vertrag ist abgelaufen – die Person ist ausgetreten. */
export function istBeendet(mitarbeiter: Pick<Mitarbeiter, 'austritt'>, heute: IsoDatum): boolean {
  return mitarbeiter.austritt !== undefined && mitarbeiter.austritt < heute;
}

/** Tage bis zum Vertragsende, wenn es im Vorlauf liegt (heute eingeschlossen) – sonst null. */
export function vertragEndetIn(mitarbeiter: Pick<Mitarbeiter, 'austritt'>, heute: IsoDatum, vorlaufTage = VERTRAG_VORLAUF_TAGE): number | null {
  if (mitarbeiter.austritt === undefined || mitarbeiter.austritt < heute) return null;
  const tage = daysBetween(heute, mitarbeiter.austritt);
  return tage <= vorlaufTage ? tage : null;
}

function jahrVonIso(datum: IsoDatum): number {
  return Number(datum.slice(0, 4));
}

// jh› Was eine Person sehen und planen darf: vom Eintrittsjahr bis zum Jahr des Vertragsendes; ein offener
//     Vertrag reicht bis ins Folgejahr (Ferien fürs nächste Jahr beantragen) – nicht bis 2099.
export function vertragsjahre(mitarbeiter: Pick<Mitarbeiter, 'eintritt' | 'austritt'>, heute: IsoDatum): number[] {
  const von = jahrVonIso(mitarbeiter.eintritt);
  const bis = Math.max(von, mitarbeiter.austritt === undefined ? jahrVonIso(heute) + 1 : jahrVonIso(mitarbeiter.austritt));
  return Array.from({ length: bis - von + 1 }, (_, index) => von + index);
}

/** Regeln für Beginn, Ende und Art – null, wenn alles stimmt. */
export function pruefeVertrag(art: Vertragsart, beginn: IsoDatum, ende: IsoDatum | null): string | null {
  if (ende !== null && ende < beginn) return 'Vertragsende liegt vor dem Beginn.';
  if (vertragBrauchtEnde(art) && ende === null) return `${VERTRAGSART_LABEL[art]}: Das Vertragsende ist Pflicht.`;
  return null;
}

/* ◆ jh · eof */
