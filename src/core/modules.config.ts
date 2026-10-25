/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/modules.config.ts                             │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Modul-Register: einzige Quelle für Leiste, Palette und Routing        │
   └────────────────────────────────────────────────────────────────────────┘ */

import {
  Banknote,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  ClipboardList,
  Clock,
  FileText,
  Images,
  KeyRound,
  LayoutDashboard,
  List,
  Map,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Smartphone,
  TreePalm,
  Users,
  Warehouse,
  WashingMachine,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Rolle } from './auth/auth.types';

// ── §1 · Typen ───────────────────────────────────────────────────

export type ModulGruppe = 'uebersicht' | 'disposition' | 'auftraege-kunden' | 'material' | 'personal' | 'administration';

export type ModulId =
  | 'dashboard'
  | 'plantafel'
  | 'kalender'
  | 'liste'
  | 'karte'
  | 'app'
  | 'auftraege'
  | 'kunden'
  | 'geraete'
  | 'bilder'
  | 'lager'
  | 'mietgeraete'
  | 'zeiterfassung'
  | 'absenzen'
  | 'rapporte'
  | 'buchhaltung'
  | 'sms-website'
  | 'auswertungen'
  | 'benutzer'
  | 'einstellungen';

export interface Modul {
  id: ModulId;
  label: string;
  icon: LucideIcon;
  gruppe: ModulGruppe;
  pfad: string;
  freigeschaltet: boolean;
  /** Geplante Version, in der das Modul kommt. */
  version?: string;
  beschreibung: string;
  rollen: readonly Rolle[];
}

export type Freigabe = { ok: true } | { ok: false; grund: 'nicht-freigeschaltet' | 'keine-berechtigung' };

// ── §2 · Gruppen ─────────────────────────────────────────────────

export const MODUL_GRUPPEN: readonly { id: ModulGruppe; label: string }[] = [
  { id: 'uebersicht', label: 'Übersicht' },
  { id: 'disposition', label: 'Disposition' },
  { id: 'auftraege-kunden', label: 'Aufträge & Kunden' },
  { id: 'material', label: 'Material' },
  { id: 'personal', label: 'Personal' },
  { id: 'administration', label: 'Administration' },
];

const ALLE: readonly Rolle[] = ['buero', 'disposition', 'aussendienst', 'administration'];
const INNENDIENST: readonly Rolle[] = ['buero', 'disposition', 'administration'];

// ── §3 · Register ────────────────────────────────────────────────

// jh› Reihenfolge = Reihenfolge in der Seitenleiste = Ausbauplan.
export const MODULE: readonly Modul[] = [
  {
    id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, gruppe: 'uebersicht', pfad: '/dashboard',
    freigeschaltet: false, version: 'v0.3', rollen: ALLE,
    beschreibung: 'Tagesüberblick: offene Aufträge, Auslastung, Konflikte, fällige Rapporte und Rechnungen auf einen Blick.',
  },
  {
    id: 'plantafel', label: 'Plantafel', icon: CalendarRange, gruppe: 'disposition', pfad: '/dispo/plantafel',
    freigeschaltet: true, rollen: ALLE,
    beschreibung: 'Techniker × Zeitachse mit Drag & Drop, Smart-Slots und Fahrzeit-Puffern.',
  },
  {
    id: 'kalender', label: 'Kalender', icon: CalendarDays, gruppe: 'disposition', pfad: '/dispo/kalender',
    freigeschaltet: true, rollen: ALLE,
    beschreibung: 'Tag, Arbeitswoche, Woche und Monat im Kalenderraster – auch nebeneinander pro Techniker.',
  },
  {
    id: 'liste', label: 'Liste', icon: List, gruppe: 'disposition', pfad: '/dispo/liste',
    freigeschaltet: true, rollen: ALLE,
    beschreibung: 'Alle Einsätze als sortier- und gruppierbare Tabelle mit Sammelaktionen.',
  },
  {
    id: 'karte', label: 'Karte', icon: Map, gruppe: 'disposition', pfad: '/dispo/karte',
    freigeschaltet: true, rollen: ALLE,
    beschreibung: 'Einsätze des Tages als nummerierte Pins, Touren pro Techniker in dessen Farbe.',
  },
  {
    id: 'app', label: 'Techniker-App', icon: Smartphone, gruppe: 'disposition', pfad: '/app',
    freigeschaltet: true, rollen: ALLE,
    beschreibung: 'Tagesplan, Statusknöpfe und Servicerapport fürs Handy – dieselben Daten wie die Plantafel.',
  },
  {
    id: 'auftraege', label: 'Aufträge', icon: ClipboardList, gruppe: 'auftraege-kunden', pfad: '/auftraege',
    freigeschaltet: false, version: 'v0.3', rollen: ALLE,
    beschreibung: 'Auftragsverwaltung von der Anfrage bis zur Verrechnung: Reparatur, Service, Montage, Garantie, Offerten.',
  },
  {
    id: 'kunden', label: 'Kunden & Liegenschaften', icon: Users, gruppe: 'auftraege-kunden', pfad: '/kunden',
    freigeschaltet: false, version: 'v0.3', rollen: INNENDIENST,
    beschreibung: 'Verwaltungen, Eigentümer, Mieter und Liegenschaften mit Wohnungen, Zugängen und Hauswarten.',
  },
  {
    id: 'geraete', label: 'Geräte', icon: WashingMachine, gruppe: 'auftraege-kunden', pfad: '/geraete',
    freigeschaltet: false, version: 'v0.4', rollen: ALLE,
    beschreibung: 'Gerätekartei mit Typenschild-Scan, Garantie, Ersatzteil-Historie und allen Einsätzen pro Gerät.',
  },
  {
    id: 'bilder', label: 'Bilder', icon: Images, gruppe: 'auftraege-kunden', pfad: '/bilder',
    freigeschaltet: false, version: 'v0.4', rollen: ALLE,
    beschreibung: 'Fotos aus dem Aussendienst, dem Auftrag und Gerät zugeordnet, für Rapport und Garantiefall.',
  },
  {
    id: 'lager', label: 'Lager & Ersatzteile', icon: Warehouse, gruppe: 'material', pfad: '/lager',
    freigeschaltet: false, version: 'v0.4', rollen: INNENDIENST,
    beschreibung: 'Lagerbestand Glattbrugg, Fahrzeuglager, Bestellungen beim Hersteller mit Lieferterminen.',
  },
  {
    id: 'mietgeraete', label: 'Mietgeräte', icon: KeyRound, gruppe: 'material', pfad: '/mietgeraete',
    freigeschaltet: false, version: 'v0.5', rollen: INNENDIENST,
    beschreibung: 'Ersatz- und Mietgeräte: Verfügbarkeit, Ausgabe, Rücknahme und Verrechnung.',
  },
  {
    id: 'zeiterfassung', label: 'Zeiterfassung', icon: Clock, gruppe: 'personal', pfad: '/zeiterfassung',
    freigeschaltet: false, version: 'v0.5', rollen: ['buero', 'aussendienst', 'administration'],
    beschreibung: 'Arbeits-, Fahr- und Pausenzeiten aus dem Einsatzplan, Monatsabschluss pro Mitarbeitenden.',
  },
  {
    id: 'absenzen', label: 'Ferien & Absenzen', icon: TreePalm, gruppe: 'personal', pfad: '/absenzen',
    freigeschaltet: false, version: 'v0.5', rollen: ALLE,
    beschreibung: 'Ferien, Krankheit, Schulung und Militär – erscheinen direkt als Ganztag im Plan.',
  },
  {
    id: 'rapporte', label: 'Servicerapporte', icon: FileText, gruppe: 'administration', pfad: '/rapporte',
    freigeschaltet: true, rollen: ALLE,
    beschreibung: 'Digitale Servicerapporte aus der Techniker-App: prüfen, freigeben, verrechnen, zurückgeben.',
  },
  {
    id: 'buchhaltung', label: 'Buchhaltung', icon: Banknote, gruppe: 'administration', pfad: '/buchhaltung',
    freigeschaltet: false, version: 'v0.7', rollen: ['buero', 'administration'],
    beschreibung: 'Rechnungen, Mahnwesen und Export in die Finanzbuchhaltung.',
  },
  {
    id: 'sms-website', label: 'SMS & Website', icon: MessageSquareText, gruppe: 'administration', pfad: '/sms-website',
    freigeschaltet: false, version: 'v0.6', rollen: INNENDIENST,
    beschreibung: 'Terminbestätigung per SMS, «Techniker unterwegs»-Meldung und Anfragen über die Website.',
  },
  {
    id: 'auswertungen', label: 'Auswertungen', icon: ChartColumn, gruppe: 'administration', pfad: '/auswertungen',
    freigeschaltet: false, version: 'v0.7', rollen: ['disposition', 'administration'],
    beschreibung: 'Auslastung, Fahrzeiten, Erstlösungsquote, Umsatz nach Marke und Region.',
  },
  {
    id: 'benutzer', label: 'Benutzer & Rollen', icon: ShieldCheck, gruppe: 'administration', pfad: '/benutzer',
    freigeschaltet: false, version: 'v0.8', rollen: ['administration'],
    beschreibung: 'Benutzerkonten, Rollen Büro / Disposition / Aussendienst / Administration, Freischaltung der Module.',
  },
  {
    id: 'einstellungen', label: 'Einstellungen', icon: Settings, gruppe: 'administration', pfad: '/einstellungen',
    freigeschaltet: false, version: 'v0.8', rollen: ['administration'],
    beschreibung: 'Arbeitszeiten, Regionen, Kategorien, Nummernkreise, Vorlagen.',
  },
];

// ── §4 · Zugriff ─────────────────────────────────────────────────

export function findModul(id: ModulId): Modul {
  const modul = MODULE.find((kandidat) => kandidat.id === id);
  if (!modul) throw new Error(`Modul ${id} nicht registriert`);
  return modul;
}

export function modulByPfad(pathname: string): Modul | undefined {
  return MODULE.find((modul) => pathname === modul.pfad || pathname.startsWith(`${modul.pfad}/`));
}

export function pruefeFreigabe(modul: Modul, rolle: Rolle | null): Freigabe {
  if (!modul.freigeschaltet) return { ok: false, grund: 'nicht-freigeschaltet' };
  if (rolle && !modul.rollen.includes(rolle)) return { ok: false, grund: 'keine-berechtigung' };
  return { ok: true };
}

export function moduleInGruppe(gruppe: ModulGruppe): readonly Modul[] {
  return MODULE.filter((modul) => modul.gruppe === gruppe);
}

/* ◆ jh · eof */
