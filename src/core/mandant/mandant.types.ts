/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/mandant/mandant.types.ts                      │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Mandant: Betrieb, Kanton, Zeitzone, Arbeitszeit, Anbieter, Module     │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { AnbieterKonfiguration, IdentitaetsAnbieter } from '../auth/identitaet';
import type { DatenKategorieId } from '../datenschutz/aufbewahrung';
import { BETRIEBLICHE_FEIERTAGE_STANDARD } from '../domain/feiertage';
import type { BetrieblicherFeiertag, Kanton } from '../domain/feiertage';
import type { NachrichtArt } from '../domain/nachricht';
import { ARBEITSZEIT_STANDARD } from '../domain/zeit';
import type { Arbeitszeitmodell } from '../domain/zeit';
import type { ModulId } from '../modules.config';
import { ZEITZONE_STANDARD } from '../zeitzone';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface DatenschutzStelle {
  /** Verantwortliche Stelle nach DSG Art. 5 lit. j. */
  verantwortlich: string;
  email: string;
  telefon: string;
  /** Datenschutzberater/in, falls bestimmt (DSG Art. 10). */
  beraterName?: string;
}

export interface Mandant {
  version: 1;
  firma: string;
  adresse: string;
  kanton: Kanton;
  /** IANA-Zeitzone des Betriebs – Stempel und Tagesgrenzen gelten in dieser Zone (Umstellung inklusive). */
  zeitzone: string;
  betrieblicheFeiertage: readonly BetrieblicherFeiertag[];
  arbeitszeit: Arbeitszeitmodell;
  /** Ferienanspruch neuer Mitarbeitender in Tagen bei 100 %. */
  ferienTageStandard: number;
  /** Automatische Abmeldung nach Inaktivität in Minuten. */
  sitzungMinuten: number;
  /** Lokale Anmeldung (Benutzername) abschalten, sobald ein Anbieter läuft. */
  nurSso: boolean;
  anbieter: Readonly<Record<IdentitaetsAnbieter, AnbieterKonfiguration>>;
  /** Aufbewahrung in Jahren, überschreibt den Katalogwert. */
  aufbewahrung: Readonly<Partial<Record<DatenKategorieId, number>>>;
  /** Pro Mandant abgeschaltete oder freigegebene Module (fehlt = Register entscheidet). */
  modulFreigaben: Readonly<Partial<Record<ModulId, boolean>>>;
  datenschutz: DatenschutzStelle;
  /** Eigene Texte für SMS und Mail (Modul SMS & Website); fehlt eine, gilt die Standardvorlage. */
  nachrichtVorlagen: Readonly<Partial<Record<NachrichtArt, string>>>;
}

// ── §2 · Standard ────────────────────────────────────────────────

function anbieterStandard(anbieter: IdentitaetsAnbieter): AnbieterKonfiguration {
  return {
    anbieter,
    aktiv: false,
    mandantId: '',
    clientId: '',
    domaene: 'sutt.example',
    gruppenZuordnung: [
      { gruppe: anbieter === 'microsoft' ? 'SG-Aussendienst' : 'aussendienst@sutt.example', rolle: 'aussendienst' },
      { gruppe: anbieter === 'microsoft' ? 'SG-Disposition' : 'disposition@sutt.example', rolle: 'disposition' },
      { gruppe: anbieter === 'microsoft' ? 'SG-Buero' : 'buero@sutt.example', rolle: 'buero' },
      { gruppe: anbieter === 'microsoft' ? 'SG-Admin' : 'admin@sutt.example', rolle: 'administration' },
    ],
    jitAnlegen: true,
    standardRolle: 'aussendienst',
  };
}

// jh› Sutt-Vorgaben als Start: Kanton Zürich, 42-Stunden-Woche mit Gleitzeit, 25 Ferientage,
//     Heiligabend und Silvester halb. Alles im Modul «Einstellungen» änderbar.
export const MANDANT_STANDARD: Mandant = {
  version: 1,
  firma: 'Sutt AG',
  adresse: 'Industriestrasse 24, 8152 Glattbrugg',
  kanton: 'ZH',
  zeitzone: ZEITZONE_STANDARD,
  betrieblicheFeiertage: BETRIEBLICHE_FEIERTAGE_STANDARD,
  arbeitszeit: ARBEITSZEIT_STANDARD,
  ferienTageStandard: 25,
  sitzungMinuten: 480,
  nurSso: false,
  anbieter: {
    microsoft: { ...anbieterStandard('microsoft'), aktiv: true, mandantId: '7e1c3b2a-demo-4f2e-9d1a-sutt00000001', clientId: 'a4b2c6d8-demo-11ee-8c90-leitstand001', verifiziertAm: '2026-10-19T09:40' },
    google: anbieterStandard('google'),
  },
  aufbewahrung: {},
  modulFreigaben: {},
  datenschutz: { verantwortlich: 'Sutt AG, Geschäftsleitung', email: 'datenschutz@sutt.example', telefon: '044 809 12 00' },
  nachrichtVorlagen: {},
};

/* ◆ jh · eof */
