/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/personal.ts                            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Mitarbeitende: Funktion, Pensum, Eintritt, Ferien, Hierarchie         │
   └────────────────────────────────────────────────────────────────────────┘ */

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
  eintritt: IsoDatum;
  austritt?: IsoDatum;
  /** Ferienanspruch in Tagen pro Jahr bei 100 % (Minimum OR 329a: 20, unter 20 Jahren 25). */
  ferienTageProJahr: number;
  /** Übertrag Ferien aus dem Vorjahr in Tagen (bereits pensumbereinigt). */
  ferienUebertragTage: number;
  /** Gleitzeit-Saldo per Stichtag in Minuten (Einführung der Zeiterfassung oder Jahreswechsel). */
  zeitUebertragMin: Minuten;
  /** Stichtag des Übertrags – ab dem Folgetag zählt jeder Tag in den Saldo. */
  zeitUebertragPer: IsoDatum;
  /** Direkte/r Vorgesetzte/r – Grundlage für Team-Sicht und Genehmigung. */
  vorgesetzterId?: string;
  email: string;
  telefon?: string;
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

/* ◆ jh · eof */
