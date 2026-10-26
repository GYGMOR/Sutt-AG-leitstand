# ADR-008: Techniker-App als eigenes Projekt `app/` – geteilter Code, getrennte Auslieferung

**Status:** Accepted · **Datum:** 2026-10-26 · **Entscheid:** ◆ JH (Projektleitung) · **Ersetzt:** ADR-002

## Kontext

Die Sutt AG will Leitstand und Techniker-App getrennt hosten. Die App muss auf Handy, Tablet und Laptop gleich gut
laufen und alles können, was der Aussendienst draussen braucht: Tagesplan und Tour, Stempeluhr, Fotos, Scannen,
Fahrzeuglager, Absenzen, Servicerapport. Verwaltung (Einstellungen, Benutzer, Lager Glattbrugg, Freigaben) bleibt im
Leitstand. ADR-002 hatte die App als Route `/app` in derselben SPA mit Telefonrahmen gewählt – fürs erste Mockup
richtig, aber nicht tragfähig: kein eigener Build, keine Installation aufs Handy, Handy-Bundle mit Plantafel-Code,
Mobile-Layout im Desktop-Projekt gepflegt. Randbedingung bleibt: kein Backend – Stand und Sitzung leben im Browser.

## Entscheid

- `app/` ist ein **eigenes Vite-Projekt** (npm-Workspace `sutt-app`) mit eigenem `index.html`, Web-App-Manifest, Icon,
  Router (`basename: '/app'`), eigenem Rahmen (Tabs unten unter 900 px, Rand links darüber) und eigenen Seiten.
- **Geteilt über den Alias `@sl` → `../src`**: Domäne, Dispo-Store, Mock, Rechte, Zeitzone, Datenschutz-Sicht,
  UI-Bausteine, Tokens, die Modelle und Dialoge der Module (Rapportformular, Stempeluhr, Absenzdialog, Zeitdialoge).
  Nichts wird kopiert; `src/modules/app/app.model.ts` bleibt das gemeinsame App-Modell (Tageszeile, nächster Schritt,
  Technikerwahl) mit Tests.
- Build mit `base: '/app/'`. Gehostet liegt die App unter `https://<domain>/app/`, der Leitstand unter `/`.
  **Dieselbe Origin ⇒ derselbe `localStorage`-Stand und dieselbe Sitzung** (ADR-001, ADR-003) – bis die API kommt.
- Im Dev-Modus proxyt der Leitstand (5173) `/app` an den App-Server (5174); daneben läuft die App standalone
  unter `http://localhost:5174/app/` (auch vom Handy über die Laptop-IP).
- Der Leitstand verlinkt die App als **Vollseiten-Link in neuem Tab** (`extern: true` im Modulregister, Palette,
  Akte «Techniker-App öffnen», Rapporte «In der App erfassen»); Aussendienst springt nach dem Login per
  `window.location.assign('/app/')`. Die In-SPA-Version (`src/modules/app/*` ausser `app.model`) ist entfernt.
- `webseite/` ist der dritte Workspace (eigener Port 5175, dieselben Tokens) – Gerüst für den Neuaufbau der Website.

## Optionen

### A · Route in derselben SPA (ADR-002, bisher)
| Dimension | Einschätzung |
| --- | --- |
| Komplexität | niedrig |
| Kosten | eine Auslieferung |
| Skalierung | Handy lädt Desktop-Code (lazy abgefedert), keine Installation, kein eigener Rhythmus |
| Vertrautheit | hoch |

**Pro:** ein Build, Zwei-Fenster-Sync trivial. **Contra:** getrenntes Hosting unmöglich, Mobile-Layout im Desktop-Projekt.

### B · Eigenes Projekt im Workspace, Code per Alias geteilt (gewählt)
| Dimension | Einschätzung |
| --- | --- |
| Komplexität | mittel – zweiter Vite/tsconfig, Alias, Proxy, zwei Dev-Server |
| Kosten | zweite Auslieferung, Signatur- und Kontrastlauf scannen `app/src` mit |
| Skalierung | kleines Handy-Bundle, PWA-Installation, eigener Build/Preview |
| Vertrautheit | hoch – dieselben Werkzeuge, derselbe Code |

**Pro:** getrennt hostbar, nichts kopiert, Store/Modelle/Tests gemeinsam, Grenze klar (App importiert `@sl/core`
und Modelle/Dialoge der Module, nie Views der Disposition). **Contra:** zwei Server im Dev, Alias statt Paket.

### C · Geteiltes Paket `@sutt/core` + zwei Anwendungen
| Dimension | Einschätzung |
| --- | --- |
| Komplexität | hoch – Paket bauen, versionieren, Typen exportieren |
| Kosten | laufend: jede Änderung am Kern ist ein Paket-Release |
| Skalierung | sauberste Trennung, mehrere Konsumenten (Website, Portal) |
| Vertrautheit | mittel |

**Pro:** echte Modulgrenze. **Contra:** Zeremonie ohne Nutzen, solange nur zwei Konsumenten im selben Repo leben.

## Abwägung

B gibt der Sutt AG, was sie braucht (zwei Hosts, eine Codebasis) und hält das Tempo des Mockups. Der Alias ist die
Vorstufe von C: wenn die Website oder ein Kundenportal denselben Kern braucht, wird `@sl` zum Paket – die Importpfade
bleiben. Die Origin-Bedingung (gemeinsamer Stand nur unter derselben Domain) ist eine Folge des fehlenden Backends,
nicht der Projektstruktur; mit der API (ADR-001) fällt sie.

## Konsequenzen

- Leichter: getrenntes Hosting, «Zum Startbildschirm hinzufügen», Handy-Bundle ohne Plantafel, eigener Build,
  klare Importgrenze, Tests der App im eigenen Lauf.
- Schwerer: zwei Dev-Server (`npm run dev` + `npm run dev:app`), zwei Builds, Typprüfung über zwei tsconfigs.
- Zu revidieren: beim API-Schritt verschwindet die Origin-Bedingung – dann kann die App auf `app.<domain>`
  und der gemeinsame Code wird ein Paket (Option C). Service Worker und Offline-Warteschlange (jh# 013, jh# 019)
  gehören in die App, nicht in den Leitstand.

## Massnahmen

1. [x] Workspaces `app`, `webseite`; Skripte `dev:app`, `dev:web`, `build:app`, `build:alle`, `typecheck:alle`, `test:alle`.
2. [x] Dev-Proxy `/app` → 5174; Modul `app` extern; Login-Weiche per Vollseiten-Sprung; In-SPA-Version entfernt.
3. [x] App-Seiten: Anmelden, Heute, Woche, Einsatz, Rapport, Tour, Scannen, Kamera, Zeit, Absenzen, Fahrzeug, Profil.
4. [ ] Hosting: Static-Host liefert `dist/` unter `/` und `app/dist/` unter `/app/` – SPA-Fallback je Pfad.
5. [ ] Service Worker, Offline-Warteschlange, Push (mit der API).
