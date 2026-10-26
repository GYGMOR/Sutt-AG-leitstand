/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/einstellungen/einstellungen.model.ts       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Einstellungen: Bereiche, Löschgrenzen, Journalfilter, Prüfungen       │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { AnbieterKonfiguration } from '../../core/auth/identitaet';
import type { IsoDatum } from '../../core/datum';
import { DATENKATEGORIEN, aufbewahrungJahre, loeschfaelligVor } from '../../core/datenschutz/aufbewahrung';
import type { DatenKategorie, DatenKategorieId } from '../../core/datenschutz/aufbewahrung';
import type { BetrieblicherFeiertag } from '../../core/domain/feiertage';
import { JOURNAL_ART_LABEL, JOURNAL_BEREICH_LABEL } from '../../core/domain/journal';
import type { JournalArt, JournalBereich, JournalEintrag } from '../../core/domain/journal';
import { formatZeitpunkt } from '../../core/format';
import type { Mandant } from '../../core/mandant/mandant.types';
import { MODULE, pruefeFreigabe } from '../../core/modules.config';
import type { Modul } from '../../core/modules.config';
import { normalizeSuchtext } from '../../core/suche';
import type { Loeschgrenzen } from '../dispo/store/dispo.reducer';
import type { DispoState } from '../dispo/store/dispo.reducer';
import { csvZeilen } from '../personal/personal.model';

// ── §1 · Bereiche ────────────────────────────────────────────────

export type EinstellungBereich = 'betrieb' | 'feiertage' | 'anmeldung' | 'datenschutz' | 'protokoll' | 'module';

export const EINSTELLUNG_BEREICHE: readonly { value: EinstellungBereich; label: string; title: string }[] = [
  { value: 'betrieb', label: 'Betrieb', title: 'Firma, Kanton, Zeitzone, Arbeitszeitmodell, Sitzung' },
  { value: 'feiertage', label: 'Feiertage', title: 'Gesetzliche Feiertage des Kantons und betriebliche freie Tage' },
  { value: 'anmeldung', label: 'Anmeldung', title: 'Microsoft Entra ID und Google Workspace (SSO, OIDC)' },
  { value: 'datenschutz', label: 'Datenschutz', title: 'Verantwortliche Stelle, Aufbewahrung, Löschlauf' },
  { value: 'protokoll', label: 'Protokoll', title: 'Journal aller Änderungen, Einsichten und Anmeldungen' },
  { value: 'module', label: 'Module', title: 'Module für diesen Mandanten ein- oder ausschalten' },
];

export function isEinstellungBereich(wert: string | undefined): wert is EinstellungBereich {
  return EINSTELLUNG_BEREICHE.some((bereich) => bereich.value === wert);
}

// ── §2 · Betrieb & Feiertage ─────────────────────────────────────

/** «12-24» – Monat und Tag, jedes Jahr gleich. */
export function betrieblicherTagGueltig(tag: string): boolean {
  const treffer = /^(\d{2})-(\d{2})$/.exec(tag.trim());
  if (!treffer) return false;
  const monat = Number(treffer[1]);
  const tagImMonat = Number(treffer[2]);
  return monat >= 1 && monat <= 12 && tagImMonat >= 1 && tagImMonat <= 31;
}

export function betrieblicheFeiertageSortiert(liste: readonly BetrieblicherFeiertag[]): BetrieblicherFeiertag[] {
  return [...liste].sort((a, b) => a.tag.localeCompare(b.tag));
}

// ── §3 · Anmeldung ───────────────────────────────────────────────

/** Was vor einem Verbindungstest stimmen muss – die Meldung erscheint am Formular. */
export function anbieterPruefen(konfig: AnbieterKonfiguration): string | null {
  if (konfig.mandantId.trim() === '') return 'Mandanten-ID bzw. Workspace-Domain fehlt.';
  if (konfig.clientId.trim() === '') return 'Client-ID fehlt.';
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(konfig.domaene.trim())) return 'Die E-Mail-Domain ist ungültig (z. B. sutt.example).';
  if (konfig.gruppenZuordnung.some((eintrag) => eintrag.gruppe.trim() === '')) return 'Jede Gruppenzuordnung braucht einen Gruppennamen.';
  return null;
}

// ── §4 · Datenschutz & Löschlauf ─────────────────────────────────

export interface Loeschposten {
  kategorie: DatenKategorie;
  jahre: number;
  /** Datensätze mit Fristbeginn vor diesem Datum sind löschfällig. */
  stichtag: IsoDatum;
  anzahl: number;
}

const LOESCHBARE: readonly { kategorie: DatenKategorieId; grenze: keyof Loeschgrenzen }[] = [
  { kategorie: 'journal', grenze: 'journal' },
  { kategorie: 'zeiterfassung', grenze: 'zeiteintraege' },
  { kategorie: 'absenzen', grenze: 'absenzen' },
  { kategorie: 'nachrichten', grenze: 'nachrichten' },
  { kategorie: 'einsatzverlauf', grenze: 'einsatzverlauf' },
];

// jh› Der Löschlauf kennt nur Kategorien, die der Browser-Stand auch hält. Aufträge, Rapporte und Kunden
//     folgen serverseitig (Anonymisierung nach Abschluss) – hier wären sie Demo-Daten ohne Abschlussdatum.
export function loeschgrenzenFuer(mandant: Mandant, heute: IsoDatum): Loeschgrenzen {
  const grenzen: Loeschgrenzen = {};
  for (const { kategorie: id, grenze } of LOESCHBARE) {
    const kategorie = DATENKATEGORIEN.find((eintrag) => eintrag.id === id);
    if (!kategorie) continue;
    grenzen[grenze] = loeschfaelligVor(kategorie, aufbewahrungJahre(kategorie, mandant.aufbewahrung), heute);
  }
  return grenzen;
}

export function loeschposten(state: DispoState, mandant: Mandant, heute: IsoDatum): Loeschposten[] {
  const grenzen = loeschgrenzenFuer(mandant, heute);
  return LOESCHBARE.flatMap(({ kategorie: id, grenze }) => {
    const kategorie = DATENKATEGORIEN.find((eintrag) => eintrag.id === id);
    const stichtag = grenzen[grenze];
    if (!kategorie || !stichtag) return [];
    let anzahl = 0;
    switch (grenze) {
      case 'journal':
        anzahl = state.journal.filter((eintrag) => eintrag.zeitpunkt.slice(0, 10) < stichtag).length;
        break;
      case 'zeiteintraege':
        anzahl = state.zeiteintraege.filter((eintrag) => eintrag.datum < stichtag).length;
        break;
      case 'absenzen':
        anzahl = state.stammdaten.absenzen.filter((absenz) => absenz.bis < stichtag).length;
        break;
      case 'nachrichten':
        anzahl = state.nachrichten.filter((nachricht) => nachricht.zeitpunkt.slice(0, 10) < stichtag).length;
        break;
      case 'einsatzverlauf':
        anzahl = state.einsaetze.filter((einsatz) => einsatz.datum < stichtag && einsatz.verlauf !== undefined).length;
        break;
    }
    return [{ kategorie, jahre: aufbewahrungJahre(kategorie, mandant.aufbewahrung), stichtag, anzahl }];
  });
}

export function jahreLabel(jahre: number): string {
  return jahre === 1 ? '1 Jahr' : `${jahre} Jahre`;
}

// ── §5 · Protokoll ───────────────────────────────────────────────

export interface JournalFilter {
  bereich: JournalBereich | 'alle';
  art: JournalArt | 'alle';
  suche: string;
}

export const LEERER_JOURNAL_FILTER: JournalFilter = { bereich: 'alle', art: 'alle', suche: '' };

export function filterJournal(journal: readonly JournalEintrag[], filter: JournalFilter): JournalEintrag[] {
  const begriff = normalizeSuchtext(filter.suche);
  return journal.filter(
    (eintrag) =>
      (filter.bereich === 'alle' || eintrag.bereich === filter.bereich) &&
      (filter.art === 'alle' || eintrag.art === filter.art) &&
      (begriff === '' || normalizeSuchtext(`${eintrag.benutzer} ${eintrag.text} ${eintrag.betrifft ?? ''} ${eintrag.mitarbeiterId ?? ''}`).includes(begriff)),
  );
}

export function zaehleJournal(journal: readonly JournalEintrag[]): { bereiche: Partial<Record<JournalBereich, number>>; arten: Partial<Record<JournalArt, number>> } {
  const bereiche: Partial<Record<JournalBereich, number>> = {};
  const arten: Partial<Record<JournalArt, number>> = {};
  for (const eintrag of journal) {
    bereiche[eintrag.bereich] = (bereiche[eintrag.bereich] ?? 0) + 1;
    arten[eintrag.art] = (arten[eintrag.art] ?? 0) + 1;
  }
  return { bereiche, arten };
}

export function journalCsv(eintraege: readonly JournalEintrag[]): string {
  const kopf = ['Zeitpunkt', 'Benutzer', 'Bereich', 'Art', 'Text', 'Betrifft', 'Mitarbeiter/in', 'Rückgängig'];
  return csvZeilen([kopf, ...eintraege.map((eintrag) => [formatZeitpunkt(eintrag.zeitpunkt), eintrag.benutzer, JOURNAL_BEREICH_LABEL[eintrag.bereich], JOURNAL_ART_LABEL[eintrag.art], eintrag.text, eintrag.betrifft ?? '', eintrag.mitarbeiterId ?? '', eintrag.rueckgaengig ? 'ja' : ''])]);
}

// ── §6 · Module ──────────────────────────────────────────────────

export interface ModulZustand {
  modul: Modul;
  /** Freigabe für den Mandanten: explizit gesetzt oder aus dem Register. */
  aktiv: boolean;
  ueberschrieben: boolean;
}

export function modulZustaende(mandant: Mandant): ModulZustand[] {
  return MODULE.map((modul) => ({ modul, aktiv: pruefeFreigabe(modul, null, mandant.modulFreigaben).ok, ueberschrieben: mandant.modulFreigaben[modul.id] !== undefined }));
}

/** Freigabe setzen oder auf den Registerstand zurück (undefined). */
export function modulFreigabeSetzen(freigaben: Mandant['modulFreigaben'], modul: Modul, aktiv: boolean | undefined): Mandant['modulFreigaben'] {
  const { [modul.id]: _alt, ...rest } = freigaben;
  if (aktiv === undefined || aktiv === modul.freigeschaltet) return rest;
  return { ...rest, [modul.id]: aktiv };
}

/* ◆ jh · eof */
