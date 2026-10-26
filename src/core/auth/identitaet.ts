/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/identitaet.ts                            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  SSO über OIDC: Anbieter, Gruppen → Rolle, Konto aus Claims (JIT)      │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IsoZeitpunkt } from '../datum';
import { ROLLE_RANG } from './auth.types';
import type { Benutzer, Rolle, SsoVerknuepfung } from './auth.types';

// ── §1 · Anbieter ────────────────────────────────────────────────

export type IdentitaetsAnbieter = 'microsoft' | 'google';

export const ANBIETER: readonly IdentitaetsAnbieter[] = ['microsoft', 'google'];

export interface AnbieterInfo {
  label: string;
  kurz: string;
  /** Wo der Mandant die App registriert. */
  portal: string;
  mandantFeld: string;
  gruppenHinweis: string;
  schritte: readonly string[];
}

export const ANBIETER_INFO: Readonly<Record<IdentitaetsAnbieter, AnbieterInfo>> = {
  microsoft: {
    label: 'Microsoft Entra ID',
    kurz: 'Microsoft',
    portal: 'entra.microsoft.com → App-Registrierungen',
    mandantFeld: 'Mandanten-ID (Tenant ID)',
    gruppenHinweis: 'Sicherheitsgruppen als Gruppenanspruch (groups claim) im ID-Token mitgeben.',
    schritte: [
      'Neue App-Registrierung «SUTT Leitstand», Kontotyp «Nur dieses Organisationsverzeichnis».',
      'Plattform «Single-Page-Anwendung» mit der Umleitungs-URI unten; keine Client-Geheimnisse im Browser (PKCE).',
      'Token-Konfiguration: Gruppenanspruch «Sicherheitsgruppen» hinzufügen; optionale Ansprüche email, given_name, family_name.',
      'Conditional Access: MFA für die App erzwingen – der Leitstand selbst führt keine Passwörter.',
    ],
  },
  google: {
    label: 'Google Workspace',
    kurz: 'Google',
    portal: 'console.cloud.google.com → APIs & Dienste → Anmeldedaten',
    mandantFeld: 'Workspace-Domain (hd)',
    gruppenHinweis: 'Rollen aus Google-Gruppen über die Admin SDK Directory API (Gruppenmitgliedschaft) oder per Domain-Standardrolle.',
    schritte: [
      'OAuth-Zustimmungsbildschirm «Intern» für die Workspace-Organisation anlegen.',
      'OAuth-Client-ID vom Typ «Webanwendung» mit autorisierter JavaScript-Quelle und Umleitungs-URI unten.',
      'Hosted-Domain-Prüfung (hd) aktiv lassen: Nur Konten der eigenen Domain können sich anmelden.',
      '2-Schritt-Verifizierung in der Workspace-Verwaltung für alle Nutzer erzwingen.',
    ],
  },
};

export interface GruppenZuordnung {
  gruppe: string;
  rolle: Rolle;
}

export interface AnbieterKonfiguration {
  anbieter: IdentitaetsAnbieter;
  aktiv: boolean;
  /** Tenant ID (Microsoft) bzw. Workspace-Domain (Google). */
  mandantId: string;
  clientId: string;
  /** Zugelassene E-Mail-Domain, z. B. sutt.example. */
  domaene: string;
  gruppenZuordnung: readonly GruppenZuordnung[];
  /** Konto beim ersten Anmelden anlegen (Just-in-time). */
  jitAnlegen: boolean;
  standardRolle: Rolle;
  verifiziertAm?: IsoZeitpunkt;
}

export function redirectUri(anbieter: IdentitaetsAnbieter, origin: string): string {
  return `${origin}/auth/callback/${anbieter}`;
}

// ── §2 · Claims → Konto ──────────────────────────────────────────

/** Was ein ID-Token nach der Prüfung liefert (sub, email, name, groups). */
export interface IdentitaetsClaims {
  anbieter: IdentitaetsAnbieter;
  sub: string;
  email: string;
  name: string;
  vorname?: string;
  nachname?: string;
  gruppen: readonly string[];
}

export type IdentitaetsErgebnis = { ok: true; benutzer: Benutzer; neu: boolean } | { ok: false; fehler: string };

/** Höchste Rolle aller zugeordneten Gruppen; null, wenn keine Gruppe passt. */
export function rolleAusGruppen(gruppen: readonly string[], zuordnung: readonly GruppenZuordnung[]): Rolle | null {
  const treffer = zuordnung.filter((eintrag) => gruppen.some((gruppe) => gruppe.toLowerCase() === eintrag.gruppe.toLowerCase()));
  if (treffer.length === 0) return null;
  return treffer.reduce((beste, eintrag) => (ROLLE_RANG[eintrag.rolle] > ROLLE_RANG[beste] ? eintrag.rolle : beste), treffer[0]?.rolle ?? 'aussendienst');
}

export function kuerzelAus(vorname: string, nachname: string, vergeben: ReadonlySet<string>): string {
  const basis = `${vorname.charAt(0)}${nachname.charAt(0)}`.toUpperCase() || 'XX';
  if (!vergeben.has(basis)) return basis;
  for (let index = 2; index < 100; index += 1) {
    const kandidat = `${basis}${index}`;
    if (!vergeben.has(kandidat)) return kandidat;
  }
  return basis;
}

function namensteile(claims: IdentitaetsClaims): { vorname: string; nachname: string } {
  if (claims.vorname && claims.nachname) return { vorname: claims.vorname, nachname: claims.nachname };
  const teile = claims.name.trim().split(/\s+/);
  const nachname = teile.length > 1 ? (teile.pop() ?? '') : '';
  return { vorname: teile.join(' '), nachname };
}

function gehoertZurDomaene(email: string, domaene: string): boolean {
  return domaene.trim() !== '' && email.toLowerCase().endsWith(`@${domaene.trim().toLowerCase()}`);
}

// jh› Reihenfolge wie im Produkt: Anbieter aktiv? Domain erlaubt? Konto bekannt (Subject, dann E-Mail)?
//     Gesperrt? Sonst JIT – mit der Rolle aus den Gruppen oder der Standardrolle des Anbieters.
export function kontoAusIdentitaet(claims: IdentitaetsClaims, konfig: AnbieterKonfiguration, bestehende: readonly Benutzer[], jetzt: IsoZeitpunkt): IdentitaetsErgebnis {
  if (!konfig.aktiv) return { ok: false, fehler: `${ANBIETER_INFO[claims.anbieter].label} ist für diesen Mandanten nicht aktiviert.` };
  if (!gehoertZurDomaene(claims.email, konfig.domaene)) return { ok: false, fehler: `Das Konto ${claims.email} gehört nicht zur Organisation (${konfig.domaene}).` };

  const verknuepfung: SsoVerknuepfung = { anbieter: claims.anbieter, externeId: claims.sub, email: claims.email, verknuepftAm: jetzt };
  const bekannt =
    bestehende.find((benutzer) => benutzer.sso?.anbieter === claims.anbieter && benutzer.sso.externeId === claims.sub) ??
    bestehende.find((benutzer) => benutzer.email?.toLowerCase() === claims.email.toLowerCase());
  const gruppenRolle = rolleAusGruppen(claims.gruppen, konfig.gruppenZuordnung);

  if (bekannt) {
    if (!bekannt.aktiv) return { ok: false, fehler: 'Dieses Konto ist gesperrt. Bitte an die Administration wenden.' };
    return {
      ok: true,
      neu: false,
      benutzer: {
        ...bekannt,
        rolle: gruppenRolle ?? bekannt.rolle,
        sso: bekannt.sso?.externeId === claims.sub ? bekannt.sso : verknuepfung,
        email: bekannt.email ?? claims.email,
        letzteAnmeldung: jetzt,
        mfa: true,
      },
    };
  }

  if (!konfig.jitAnlegen) return { ok: false, fehler: 'Für dieses Konto besteht noch kein Zugang. Die Administration legt es an.' };
  const { vorname, nachname } = namensteile(claims);
  const benutzername = claims.email.split('@')[0]?.toLowerCase() ?? claims.sub;
  return {
    ok: true,
    neu: true,
    benutzer: {
      id: `U-${claims.anbieter.slice(0, 2).toUpperCase()}-${claims.sub.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase()}`,
      benutzername,
      vorname,
      nachname,
      kuerzel: kuerzelAus(vorname, nachname, new Set(bestehende.map((benutzer) => benutzer.kuerzel))),
      rolle: gruppenRolle ?? konfig.standardRolle,
      email: claims.email,
      aktiv: true,
      sso: verknuepfung,
      mfa: true,
      letzteAnmeldung: jetzt,
      erstelltAm: jetzt,
    },
  };
}

/* ◆ jh · eof */
