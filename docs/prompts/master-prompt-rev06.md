# SUTT Leitstand – Master-Prompt rev 06 (All-in-One: Vertrag & Mein Jahr · Website · Mietgeräte · Benachrichtigungen · Stempel-Assistenz · API-Vorbereitung)

> Du arbeitest im **bestehenden** Projekt `D:\Joel\SuttiAG-Webapplikation` (GitHub: `GYGMOR/Sutt-AG-leitstand`, Branch `main`,
> Demo auf GitHub Pages: Leitstand `https://gygmor.github.io/Sutt-AG-leitstand/`, App `…/app/`). Nicht neu anfangen.
> Lies zuerst: `README.jh.md` (Bauplan, Konventionen, §7 Funktionsumfang, §9 offene Fragen), `CHANGELOG.jh.md`, `TODO.jh.md`,
> `docs/adr/ADR-001…008`, `docs/design/step-5-app.md`, `docs/start.md`, `src/core/modules.config.ts`, die Skills in
> `.claude/skills/` (`sutt-modul`, `sutt-pruefung`) und deine Memory-Notizen. Drei Workspaces: `.` Leitstand (Portal),
> `app/` Techniker-App (teilt `src/` über `@sl`), `webseite/` Website-Gerüst. Weiterhin **Mockup ohne Backend** – aber so
> gebaut, dass die API (ADR-001) nur noch den Persistenz-Adapter tauscht.
> Ziel von rev 06: Das All-in-One-Werkzeug der Sutt AG wird **vollständig** – jede Lücke, die der Kunde oder ich
> genannt haben, schliesst sich; Qualität vor Tempo; «High-End, technisch eine Stufe höher».

## §0 · Regeln (gelten für jede Datei, jeden Commit)

- Signatur ◆ JH: Kopf-Box (Pfad ≤ 49 Zeichen, Beschreibung ≤ 68 Zeichen), §-Marken lückenlos, `/* ◆ jh · eof */`, Präfixe
  `jh›` (warum) · `jh!` (Achtung) · `jh?` (Frage an Sutt) · `jh# NNN` (To-do). **Jede neue und jede geänderte Datei bekommt
  `rev 06`.** Neue `jh#` ab **022**, in `TODO.jh.md` eintragen; erledigte Marken aus dem Code nehmen und nach «Erledigt».
- `package.json` (alle drei) auf **0.6.0**; Footer zeigt `v0.6.0 · ◆ JH`; `CHANGELOG.jh.md` bekommt den Abschnitt
  `rev 06 · 2026.11 · v0.6.0 – …` mit Neu / Geändert / Offen.
- Konventionen bleiben: Domänentypen deutsch, Code englisch, kein `any`, frühe Returns, keine verschachtelten Ternaries, nur
  benannte Exporte, CSS Modules mit `--sl-`-Tokens, dynamische Klassen über `modulKlasse()`, keine Inline-Styles ausser
  Positionen, Icons lucide 1.5 / 16·20, Schweizer Schreibweise (ss), kein KI-Ton, keine Platzhaltertexte, keine Emojis im Code.
- `core/` importiert nie aus `modules/` oder `mock/`; `app/` importiert nur `@sl/core`, den Dispo-Store, Mock und
  Modelle/Dialoge der Module – nie Views der Disposition; der Leitstand importiert nichts aus `app/`.
- Links zwischen Leitstand und App nur über `core/urls.ts` (`APP_URL`, `LEITSTAND_URL`, `appPfad`, `leitstandPfad`) –
  nichts hart codiert, die Demo liegt unter `/<repo>/`.
- Neue Abhängigkeiten nur mit Begründung im ADR; Kandidaten: keine. Service Worker, Geolocation, Wake Lock, Notification
  werden mit Browser-APIs gebaut.
- Commit-Stil `bereich(thema): kleinbuchstaben ◆`, Trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
  **Nach jeder grünen Phase committen und auf `main` pushen** – GitHub Pages veröffentlicht automatisch; «→ zeigen» heisst:
  lokal im Browser geprüft (Handy 375 px und Laptop 1280 px, hell und dunkel) **und** der Pages-Link ist aktuell.
- Prüfkette vor jedem Push: `npm run typecheck:alle && npm run test:alle && npm run jh:sign && npm run jh:check &&
  npm run jh:contrast && npm run build:alle`, dazu `$env:SL_BASE='/Sutt-AG-leitstand/'; npm run pages:build; npm run pages:serve`
  für die Pages-Probe (Login `mb` → App, Tiefen-Link, Seitenleiste).
- Skills nutzen: `sutt-modul` für jedes neue Modul, `sutt-pruefung` vor jedem Commit; aus `.claude/skills/` zusätzlich
  `frontend-ui-engineering` (UI), `test-driven-development` (Fachlogik zuerst testen), `api-and-interface-design` (ADR-010),
  `security-and-hardening` (Abschluss), `documentation-and-adrs`, `code-review-and-quality`. Eingebaut: `/code-review`,
  `/simplify`, `/security-review`.
- Bei Unklarheiten zu Sutt-Abläufen: `jh?` setzen, sinnvoll annehmen, weiterarbeiten – nie blockieren, nie nachfragen.

## §1 · Warum dieser Schritt

Disposition, Aussendienst, Betrieb und Personal stehen (16 von 20 Modulen frei), die Techniker-App ist ein eigenes Projekt,
die Demo läuft öffentlich. Was fehlt, hat der Kunde konkret benannt: Mitarbeitende sollen ihren **ganzen Vertragszeitraum**
sehen (Planung, Stempel, Saldo – vom Eintritt bis zum Vertragsende oder «offen»), die **Website** soll neu entstehen und
Anfragen direkt in den Eingang bringen, **Mietgeräte** sind im Register noch gesperrt, **Benachrichtigungen** sollen Büro und
Feld verbinden, und Stempeln soll **ohne Suchen** gehen. Dazu muss die API-Schicht so vorbereitet sein, dass Live-Daten auf
Infomaniak oder Hetzner nur noch ein Adapter-Tausch sind. Reihenfolge der Phasen = Reihenfolge der Dringlichkeit.

## §2 · Phase A – Vertrag & «Mein Jahr» (Personal)

- **Domäne** `core/domain/personal.ts`: `Vertrag { art: 'unbefristet' | 'befristet' | 'auf-widerruf' | 'temporaer';
  beginn: IsoDatum; ende?: IsoDatum; notiz?: string }` am `Mitarbeiter`; `eintritt`/`austritt` bleiben als abgeleitete
  Sicht (`eintritt = vertrag.beginn`, `austritt = vertrag.ende`) – alle Aufrufer von `istAngestellt`/`angestelltImMonat`
  laufen unverändert. «Ohne Ende» heisst offen (intern `VERTRAG_OFFEN = '2099-12-31'`), «auf Widerruf» läuft offen, bis die
  Administration den Widerruf mit Datum setzt (`jh?` Bedeutung bei Sutt: Aushilfe ohne festes Ende oder Probezeit?).
- **Regeln** (mit Tests): Soll = 0 ausserhalb des Vertrags; Planung nach Vertragsende → Konflikt «nach Vertragsende» in
  Plantafel/Kalender (Drop erlaubt, Wächter meldet), Absenz nach Ende → Fehler im Dialog; Hinweis **60 Tage vor Ende** als
  Dashboard-Zeile (Personal) und Chip im Modul Benutzer & Rollen; Ferienanspruch pro rata bei Ein-/Austritt im Jahr.
- **Dialoge**: `MitarbeiterDialog` mit Vertragsart, Beginn, Ende (Pflicht bei befristet/temporär), Widerruf setzen;
  `MitarbeiterDossier` zeigt den Vertrag als Typenschild-Zeile.
- **«Mein Jahr»** – für jede Person selbst (Leitstand `ZeitkontoDossier`/`/zeiterfassung/<id>` und App-Tab Zeit, neue Ansicht
  «Jahr»): Jahreswahl vom Eintrittsjahr bis Vertragsende (offen: laufendes Jahr + 1 planbar), zwölf Monate mit Soll · Ist ·
  Saldo · Abschlussstatus, **Gleitzeitsaldo kumuliert ab Eintritt** (`zeitUebertragPer` bleibt nur der Startwert für die Zeit
  vor dem Systembeginn; solche Monate heissen «vor Systembeginn», nicht leer), Ferienkonto je Jahr inkl. Folgejahr,
  Überstunden/Kompensiert, Kopfzeile «Stand heute: +12:30 h · 12 Ferientage · Vertrag unbefristet seit 01.03.2019»,
  Stempelhistorie durchsuchbar bis zum Eintritt, CSV der eigenen Daten (DSG Art. 25 ergänzt um Zeiten je Jahr).
- **Planung über das Jahr hinaus**: Absenzen fürs Folgejahr beantragen (Ferienkonto des Zieljahres), Absenzplaner mit
  Jahreswahl, Dispo plant bis Vertragsende.
- **Mock**: ein befristeter Vertrag, der in drei Monaten endet (Hinweis sichtbar), einer «auf Widerruf», der bestehende
  Austritt (`te`) als beendeter Vertrag; Zeiten der Saat reichen weiterhin zwei Monate zurück (Systembeginn = Stichtag).
- Rechte: eigene Jahressicht mit `zeit:lesen` (eigene), fremde wie bisher über Umfang; Journal-Eintrag bei Einsicht fremder Jahre.

## §3 · Phase B – Website (`webseite/`) und Modul «SMS & Website»

- Aufbau in `webseite/` (Vite, TypeScript, kein Framework, dieselben Tokens): Start («Schweizer Industrie», kein Hero-Kitsch),
  Leistungen (Reparatur, Installation/Montage, Lieferung, **Mietgeräte**, Garantie, Notfall), Marken, So arbeiten wir,
  **Anfrage** (Gerät, Marke, Fehlerbild, Adresse/Wohnung, Terminwunsch, Kontakt, optional Foto), Kontakt mit Öffnungszeiten
  und Karte (Schema/OSM wie im Leitstand), Über uns, Karriere (Stellen → Bewerbung), Impressum und Datenschutz (DSG).
  Mehrseitig oder Einseiter mit Sektionen – entscheiden und im ADR begründen. Lighthouse ≥ 95 in allen vier Kategorien,
  WCAG AA, Handy zuerst.
- **Anfrage → Eingang**: Die Website schreibt die Anfrage als `Pendenz` mit Quelle «website» in den Dispo-Stand (gleiche
  Origin: `localStorage`-Adapter wie App und Leitstand; später API). Der Leitstand zeigt sie im Eingang mit Chip «Website»,
  Kunde wird per Telefon/E-Mail erkannt oder als neuer Kunde vorgeschlagen (Schnellerfassung vorbelegt).
- **Modul `sms-website` freischalten** (v0.6): Anfragen aus der Website (Liste, Status angenommen/abgelehnt/in Auftrag),
  Antwortvorlagen (Mail/SMS, Mock-Versand mit Protokoll), SMS-Vorlagen des Betriebs (Terminbestätigung, unterwegs, nicht
  angetroffen) hier zentral pflegen – die App und die Akte lesen sie von dort.
- **Pages**: `scripts/pages-site.mjs` nimmt `webseite/dist` unter `<Basis>webseite/` auf; Links Website → Leitstand/App über
  die Basis (`SL_BASE`), `webseite/vite.config.ts` bekommt `base` wie die App. Der Website-Kopf verlinkt «Kundenportal»
  (Leitstand) und «Techniker-App».

## §4 · Phase C – Mietgeräte (Modul `mietgeraete`, im Register v0.5)

- Domäne `core/domain/mietgeraet.ts`: Pool von Ersatz-/Mietgeräten (Art, Marke, Modell, Inventarnummer als Typenschild,
  Zustand, Standort: Lager Glattbrugg · Fahrzeug · beim Kunden), Status verfügbar · reserviert · ausgegeben · Rücknahme ·
  Service; `Miete { geraetId, auftragId, von, bis?, tagespreis, zustandAusgabe, zustandRuecknahme, fotos }`.
- Ablauf: Ausgabe aus einem Auftrag der Kategorie Mietgerät (bestehende Verknüpfung `bezugAuftragId` zur Reparatur nutzen),
  Rücknahme mit Zustand und Foto, Verrechnung (Tage × Tagespreis, `jh?` Sätze) in den Rapport/Auftragsbetrag, Konflikt
  «Mietgerät überfällig», Dashboard-Kennzahl «Mietgeräte draussen», Kacheln Verfügbar · Draussen · Überfällig · Service.
- App: beim Einsatz «Mietgerät ausgeben» (Scanner liest die Inventarnummer) und «Mietgerät zurücknehmen» mit Foto.
- Mock: 8 Geräte, 3 laufende Mieten (eine überfällig), Journal.

## §5 · Phase D – Benachrichtigungen (Push vorbereitet)

- Domäne `core/domain/benachrichtigung.ts`: `Benachrichtigung { id, zeitpunkt, empfaengerId, art, titel, text, ziel (Pfad in
  Leitstand oder App), gelesen }`; Arten für die App: Plan geändert, Notfall zugeteilt, Teil eingetroffen, Rapport zurück,
  Absenz entschieden, Monat entschieden, Erinnerung «noch eingestempelt» (abends), «Rapport fehlt» (morgens), Lieferung heute;
  für den Leitstand: Notfall im Eingang, Rapport zu prüfen, Techniker überzieht, Lieferung überfällig, Absenzantrag,
  Monatsabschluss eingereicht, Website-Anfrage, Vertrag endet in 60 Tagen.
- Erzeugung im Dispo-Store (`commit()`-Hook, deterministisch), persistiert im Stand, gespiegelt zwischen Fenstern. Glocke in der
  Topbar des Leitstands und im Kopf der App: Liste, ungelesen-Zähler, Klick springt ans Ziel, «alle gelesen».
- Einstellungen je Person (Profil/App und Meine Daten): Kategorien ein/aus, Ruhezeit (keine Pushes ausserhalb der Arbeitszeit
  ausser Notfall/Pikett). Jede Zustellung im Journal (Datenschutz).
- Web-Push-Vorbereitung in der App: Service Worker `app/public/sw.js` (nur Push-Handler und Klick → Ziel, kein Offline-Cache),
  Registrierung in `main.tsx`, «Benachrichtigungen erlauben» im Profil (Permission API), «Test-Benachrichtigung» lokal über
  `Notification`; `PushSubscription` wird im Stand abgelegt (später an die API). ADR-009 «Benachrichtigungen und Web-Push»
  (Browser-Stand, iOS ≥ 16.4 nur installiert, VAPID mit der API).

## §6 · Phase E – Stempel-Assistenz (Phase 1 ohne Backend)

- Orte im Mandanten: Werkhof (Koordinaten, Radius 150 m), Einsatzadressen aus dem Plan; Einstellungen → Betrieb pflegt Werkhof
  und Radius.
- App: solange sie offen ist (`watchPosition`, nur mit Opt-in der Person), schlägt sie vor: «Du bist am Werkhof – einstempeln?»,
  «Angekommen bei Weber – Status setzen?», «Werkhof verlassen – ausstempeln?»; Vorschlag ist eine Karte oben auf Heute/Zeit,
  ein Tipp bestätigt, nichts geschieht automatisch. Wake-Lock-Schalter «Bildschirm an (Fahrt)» für den Fahrzeughalter.
- **Stempel-QR** an der Werkhof-Tür: Scanner liest `SUTT-STEMPEL` → Kommen/Gehen je nach Zustand; Druckansicht des QR unter
  Einstellungen → Betrieb (A5, Sutt-Kopf).
- Datenschutz: nur Ereignisse (Ort, Zeit, Entscheid), nie eine Spur; Journal-Eintrag; Erklärtext unter Meine Daten; ArGV 3 Art.
  26 im Datenschutzkonzept ergänzen. ADR-010 «Automatisches Stempeln» mit den drei Phasen (Web-App · Fahrzeug-Telematik ·
  Capacitor) und `docs/anleitungen/ios-kurzbefehl-stempeln.md` (Kurzbefehl «Beim Ankommen» → API später).

## §7 · Phase F – API-Vorbereitung (Infomaniak oder Hetzner, ohne Server zu bauen)

- ADR-011 «Backend-Architektur»: PostgreSQL 16 + S3-Objektspeicher (Infomaniak Public Cloud / Hetzner Object Storage) + Node-API
  (Fastify, Drizzle) + Caddy; Hosting-Skizze `docs/hosting/infomaniak-hetzner.md` (Docker Compose, Domänen `suttag.ch`,
  `portal.suttag.ch`, `app.suttag.ch`, `api.suttag.ch`, Cookie auf `.suttag.ch`, Backups, Datenresidenz CH).
- `docs/api/schema.sql`: DDL für alle Entitäten des Stands (Kunden, Liegenschaften, Kontakte, Geräte, Aufträge, Einsätze +
  Verlauf, Pendenzen, Rapporte, Nachrichten, Fotos, Artikel, Bestände, Bestellungen, Bewegungen, Mitarbeitende + Verträge,
  Konten, Rechte, Zeiteinträge, Absenzen, Monatsabschlüsse, Journal, Mandant, Mietgeräte, Benachrichtigungen,
  Push-Abonnemente) mit Indizes und Löschfristen als Kommentar.
- `docs/api/openapi.yaml`: Vertrag für jede Aktion aus `useDispoAktionen`, `personal` und `mandant` (Lesen, Schreiben,
  Ereignisstrom für die Spiegelung); Fehler-Semantik; Auth OIDC/PKCE.
- Code: Persistenz als Schnittstelle `StandSpeicher { laden, speichern, abonnieren }` in `core/store.ts`/`persistenz.ts`
  formalisieren, `localStorageSpeicher` (heute) und `apiSpeicher` (fetch gegen `VITE_API_URL`, noch nicht angeschaltet) mit
  Tests gegen denselben Vertrag; `Foto.schluessel` (Objektspeicher-Schlüssel) ins Modell; Identität: `kontoAusIdentitaet()`
  bleibt, ein `oidcAblauf.ts` mit PKCE-Schritten als Stub (jh# 020 bleibt offen bis zur API).

## §8 · Phase G – Abschluss der Revision

- Screenshots rev 03–06 in `docs/screenshots/` (hell/dunkel, Handy/Laptop; App mit `hell-app-*`), zweite Demo-Tour
  («Technikertag + Personal», `scripts/demo.jh.mjs`), Security-Review dokumentiert (`docs/reviews/security-rev06.md`:
  Rollen/Routen, Website-Formular, Service Worker, localStorage, Links), `/code-review` und `/simplify` auf den Diff.
- README §1/§3/§7/§8 (Innovationen 35 ff. mit «Warum»), §9 Fragen, §10 «Bewusst nicht»; CHANGELOG rev 06; TODO; ADR 009–011;
  Memory-Notiz «Projektstand rev 06»; Pages aktuell; `docs/start.md` ergänzt (Website-Link, Benachrichtigungen erlauben).

## §9 · Abnahme (muss alles stimmen)

- Prüfkette aus §0 grün; Tests ≥ 260 (neu: Vertrag, Mein Jahr, Mietgeräte, Benachrichtigungen, Stempel-Orte, Speicher-Vertrag).
- Als `mb` (App): Jahr 2019–2026 navigierbar, Saldo ab Eintritt stimmt mit dem Leitstand überein; Vorschlag «am Werkhof –
  einstempeln?» erscheint mit simulierter Position (Entwicklermodus: Koordinaten setzen); Glocke zeigt «Plan geändert» nach
  einem Drop im zweiten Fenster.
- Als `admin`: Vertrag «befristet bis …» setzen → Soll endet, Hinweis 60 Tage, Planung danach meldet den Konflikt; Mietgerät
  ausgeben und zurücknehmen → Betrag und Kennzahl stimmen.
- Website: Anfrage senden → Eingang des Leitstands zeigt sie mit Chip «Website»; Lighthouse ≥ 95; Handy ohne horizontales Scrollen.
- Pages: alle drei unter `/<repo>/`, `/<repo>/app/`, `/<repo>/webseite/` erreichbar, Tiefen-Links laufen.

## §10 · Offene Fragen an die Sutt AG (`jh?`, in README §9 fortführen ab 32)

Bedeutung «auf Widerruf» · Tagespreise und Kaution Mietgeräte · Website-Texte, Bilder, Bildrechte, Notfallnummer · welche
Benachrichtigungen Pflicht (Pikett)? · Werkhof-Radius und ob Ortung im Vordergrund für die Mitarbeitenden akzeptabel ist
(Information/Einwilligung) · Hosting-Entscheid Infomaniak vs. Hetzner (Datenresidenz) · Nummernkreis Mietverträge.

## §11 · Bewusst nicht in rev 06

Kein Backend und kein echter Push-Versand (Vorbereitung ja, Server nein), kein echter SMS/Mail-Versand, keine native Hülle
(Capacitor), keine Fahrzeug-Telematik, keine Buchhaltung/Auswertungen (v0.7), keine Bildablage (jh# 012 bleibt), kein
Offline-Cache im Service Worker (jh# 013 bleibt – nur Push-Handler).

## §12 · Vorgehen

0. Bestand lesen, Plan mit den Phasen A–G in 8–10 Schritten nennen, dann **ohne Rückfrage** starten.
1. Phase A (Domäne + Tests → Dialoge → Mein Jahr Leitstand → App-Tab Zeit «Jahr» → Planung) → prüfen, committen, pushen → zeigen.
2. Phase B (Website → Anfrage → Modul sms-website → Pages mit Website) → zeigen.
3. Phase C Mietgeräte → zeigen. 4. Phase D Benachrichtigungen → zeigen. 5. Phase E Stempel-Assistenz → zeigen.
6. Phase F API-Vorbereitung (Docs + Adapter + Tests). 7. Phase G Abschluss, Reviews, Memory.
Jede Phase endet mit der Prüfkette, einem Commit je Bereich und einem Push – die Kollegen sehen den Fortschritt auf Pages.

/* ◆ jh · eof */
