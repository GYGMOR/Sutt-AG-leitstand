/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/personal/anmeldung.ts                      │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Anmeldung gegen den Stand: Konten, Anbieter-Prüfung, Journal          │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Benutzer, Sitzung } from '../../core/auth/auth.types';
import type { AbmeldeGrund, AuthVerzeichnis } from '../../core/auth/authStore';
import { ANBIETER_INFO, kontoAusIdentitaet } from '../../core/auth/identitaet';
import type { IdentitaetsClaims } from '../../core/auth/identitaet';
import { nowZeitpunkt } from '../../core/datum';
import type { IsoZeitpunkt } from '../../core/datum';
import type { JournalEintrag } from '../../core/domain/journal';
import { getMandant } from '../../core/mandant/mandantStore';
import { getDispoStore } from '../dispo/store/dispoStore';

// ── §1 · Hilfen ──────────────────────────────────────────────────

let lauf = 0;
const KENNUNG = Math.random().toString(36).slice(2, 6);

function journalEintrag(teil: Omit<JournalEintrag, 'id' | 'zeitpunkt'>, zeitpunkt: IsoZeitpunkt = nowZeitpunkt()): JournalEintrag {
  lauf += 1;
  return { ...teil, id: `J-A${KENNUNG}${lauf}`, zeitpunkt };
}

function konten(): readonly Benutzer[] {
  return [...getDispoStore().getState().stammdaten.benutzer.values()];
}

// ── §2 · Verzeichnis ─────────────────────────────────────────────

/** Konto nach Benutzername – aus dem Stand, damit Sperren und Rechte der Administration sofort gelten. */
export function kontoFinden(benutzername: string): Benutzer | undefined {
  return konten().find((benutzer) => benutzer.benutzername === benutzername);
}

export function kontenListe(): readonly Benutzer[] {
  return konten();
}

// jh› Was ein ID-Token im Produkt liefert, liefert hier der Dialog «Konto wählen»; die Prüfung dahinter
//     (Domain, Gruppen, Sperre, JIT) ist dieselbe Funktion wie später gegen den echten Anbieter (ADR-006).
export const anmeldenMitClaims: NonNullable<AuthVerzeichnis['mitIdentitaet']> = (claims: IdentitaetsClaims, jetzt) => {
  const konfig = getMandant().anbieter[claims.anbieter];
  const ergebnis = kontoAusIdentitaet(claims, konfig, konten(), jetzt as IsoZeitpunkt);
  const label = ANBIETER_INFO[claims.anbieter].label;
  if (!ergebnis.ok) {
    getDispoStore().dispatch({
      kind: 'protokolliere',
      eintrag: journalEintrag({ benutzer: claims.email, bereich: 'anmeldung', art: 'anmeldung', text: `Anmeldung über ${label} abgewiesen: ${ergebnis.fehler}` }),
    });
    return ergebnis;
  }
  return ergebnis;
};

export function anmeldungVerbuchen(sitzung: Sitzung, neu: boolean): void {
  const { benutzer } = sitzung;
  const jetzt = nowZeitpunkt();
  const weg = sitzung.anbieter && sitzung.anbieter !== 'lokal' ? `über ${ANBIETER_INFO[sitzung.anbieter].label} (OIDC, MFA)` : 'lokal (Benutzername)';
  const text = neu ? `Konto ${benutzer.benutzername} beim ersten Anmelden ${weg} angelegt (JIT)` : `Anmeldung ${weg}`;
  getDispoStore().dispatch({
    kind: 'benutzerAnmeldung',
    benutzer: { ...benutzer, letzteAnmeldung: jetzt },
    eintrag: journalEintrag({ benutzer: benutzer.kuerzel, bereich: 'anmeldung', art: 'anmeldung', text, betrifft: benutzer.id, ...(benutzer.mitarbeiterId ? { mitarbeiterId: benutzer.mitarbeiterId } : {}) }, jetzt),
  });
}

export function abmeldungVerbuchen(benutzer: Benutzer, grund: AbmeldeGrund): void {
  getDispoStore().dispatch({
    kind: 'protokolliere',
    eintrag: journalEintrag({ benutzer: benutzer.kuerzel, bereich: 'anmeldung', art: 'anmeldung', text: grund === 'inaktiv' ? 'Automatisch abgemeldet (Inaktivität)' : 'Abmeldung', betrifft: benutzer.id, ...(benutzer.mitarbeiterId ? { mitarbeiterId: benutzer.mitarbeiterId } : {}) }),
  });
}

/* ◆ jh · eof */
