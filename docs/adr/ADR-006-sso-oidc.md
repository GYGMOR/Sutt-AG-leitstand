# ADR-006: Anmeldung über das Geschäftskonto – OIDC mit Microsoft Entra ID und Google Workspace

**Status:** Accepted
**Date:** 2026-10-26
**Deciders:** JH, Sutt AG (Tenant und Gruppen sind zu liefern – jh?)

## Context

Der Kunde will sich mit der Geschäfts-Mail anmelden und den Leitstand an den Tenant des Betriebs koppeln. Ein eigenes
Passwortsystem wäre ein zweites Verzeichnis mit eigenen Risiken (Passwort-Resets, fehlende MFA, vergessene Konten nach Austritt).

## Decision

- **OpenID Connect** mit PKCE gegen den Anbieter des Mandanten: Microsoft Entra ID (Tenant-ID) oder Google Workspace
  (Workspace-Domain, `hd`). Keine Client-Geheimnisse im Browser; MFA und Sperren laufen beim Anbieter.
- **Claims → Konto** (`kontoAusIdentitaet`): Anbieter aktiv? E-Mail-Domain erlaubt? Konto bekannt (erst Subject, dann E-Mail)?
  Gesperrt? Sonst **Just-in-time** anlegen mit der Rolle aus den Gruppen (höchste gewinnt) oder der Standardrolle.
- **Gruppen → Rolle** je Anbieter konfigurierbar (Sicherheitsgruppen bzw. Google-Gruppen); die Administration kann je Konto
  nachjustieren (ADR-005). Ein Austritt im Verzeichnis beendet den Zugang beim nächsten Anmelden.
- **Nur SSO** schaltet die lokale Anmeldung ab, sobald mindestens ein Anbieter aktiv ist.
- Im Mockup ersetzt der Dialog «Konto wählen» die Anbieterseite; die Prüfung dahinter ist dieselbe Funktion wie später gegen
  das echte ID-Token (`jh# 020`).

## Options Considered

### Option A: Lokale Passwörter (Mock heute)
**Pros:** Keine Abhängigkeit. **Cons:** Zweites Verzeichnis, Passwort-Hygiene beim Betrieb, keine MFA ohne Zusatzaufwand.

### Option B: SAML 2.0
**Pros:** In Entra verfügbar. **Cons:** Schwer in einer SPA, XML-Signaturen, keine Google-Workspace-Gleichbehandlung.

### Option C: OIDC mit PKCE (gewählt)
**Pros:** Für SPAs gedacht, beide Anbieter identisch, Gruppen im Token, Discovery statt Handarbeit. **Cons:** Gruppenanspruch
muss im Tenant konfiguriert werden (Schritte in `ANBIETER_INFO`).

## Consequences

- Jede Anmeldung, Abweisung und automatische Abmeldung steht im Journal (Bereich Anmeldung).
- Konten tragen `sso { anbieter, externeId, email, verknuepftAm }` und `mfa`; `letzteAnmeldung` kommt aus dem Verzeichnis.
- Offen (jh?): Namen der Gruppen im Sutt-Tenant, ob Google überhaupt gebraucht wird, Notfallzugang ohne Anbieter.

## Action Items
1. [x] `core/auth/identitaet.ts` (Claims, Zuordnung, JIT), Anbieter-Konfiguration im Mandanten, Einstellungen → Anmeldung.
2. [x] Login mit Anbieter-Tasten und Mock-Dialog, Journal.
3. [ ] Echter OIDC-Ablauf mit Discovery, PKCE und JWKS-Prüfung (`jh# 020`).
