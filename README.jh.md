# SUTT·LEITSTAND · ◆ JH

Branchensoftware der **Sutt AG** (Haushalt-Apparate, Industriestrasse 24, 8152 Glattbrugg/Opfikon) –
Service, Reparatur und Verkauf von Haushalts-Grossgeräten.

**Stand:** rev 04 · v0.4.0 · Betrieb (Dashboard, Aufträge, Kunden, Geräte, Bilder, Lager) auf Aussendienst v0.3 und Disposition v2 · klickbares Mockup mit Testdaten, ohne Backend.
Diese Datei ist der Bauplan: **jedes folgende Modul** (Kunden, Geräte, Lager, Mietgeräte, Zeit …)
wird exakt nach diesen Regeln aufgebaut. Änderungen je Revision stehen in `CHANGELOG.jh.md`.

---

## 1 · Start

```bash
npm install
npm run dev          # http://localhost:5173 → /login (Demo-Zugänge stehen unter dem Formular)
npm run build        # Typecheck (tsc strict) + Produktions-Build
npm test             # vitest: Reducer, Selektoren, Konflikte, Zeitraster, Scoring, Rapport, Persistenz, App-Modell
npm run jh:check     # Signatur: Kopf, §-Marken, eof, jh#-Abgleich, Exporte, kein any
npm run jh:sign      # Köpfe und §-Marken automatisch normieren
npm run jh:contrast  # WCAG-Kontrast aller Textpaare, hell und dunkel
npm run demo:video   # Demo-Tour aufzeichnen → docs/demo/sutt-leitstand-demo.webm (Dev-Server muss laufen)
```

`demo:video` fährt per Playwright eine geführte Tour (Login, Plantafel, Drag & Drop, Akte, Kalender, Liste, Karte,
Palette, Schnellerfassung, Druck, Dark Mode) mit Mauszeiger und Untertiteln ab, ca. 2½ Minuten, ohne Ton, und
komprimiert auf rund 8 MB (VP9). Browser und ffmpeg kommen aus einer vorhandenen Playwright-Installation
(`PLAYWRIGHT_CORE`, `PLAYWRIGHT_FFMPEG`) – nichts davon landet in `package.json`.

**Zwei Fenster, ein Stand (rev 03):** `/dispo/plantafel` im ersten Fenster, `/app?als=T-MB` im zweiten – am Desktop im
Telefonrahmen. Statusknöpfe, Rapporte und Freigaben erscheinen sofort drüben: der Stand liegt in `localStorage` und
spiegelt sich über das `storage`-Ereignis (ADR-001). «Demo zurücksetzen» im Benutzermenü stellt den Ausgangsbestand her.
Aussendienst-Konten (`mb`, `sk`) landen nach dem Login direkt in der App; Büro-Konten können dort jeden Techniker ansehen.

**Start je Rolle (rev 04):** `rw` (Büro) und `admin` starten im Dashboard, `jh` (Disposition) in der Plantafel, `mb`/`sk` in der
App. Kunden und Lager sind Innendienst-Module: Aussendienst sieht dort die Folgt-Seite mit Rollenhinweis.
Eigene Skills für die Weiterarbeit liegen in `.claude/skills/` (`sutt-modul`, `sutt-pruefung`).

Node ≥ 20.19 (Vite 7); `jh:contrast` braucht Node ≥ 23 (nativer TypeScript-Lauf).
Optional `.env` nach `.env.example`: mit `VITE_GOOGLE_MAPS_API_KEY` erscheint Google Maps, ohne Schlüssel
MapLibre + OpenStreetMap, ohne Netz die Schemakarte. Die Akte sieht nie leer aus.

---

## 2 · Stack

| Bereich  | Wahl                                                                       |
| -------- | -------------------------------------------------------------------------- |
| Build    | Vite 7 · React 18.3 · TypeScript 5.9 `strict` + `noUncheckedIndexedAccess`  |
| Routing  | `react-router` 7 – Datum und Zeitraum in der URL (`?d=2026-10-17&v=woche`)  |
| State    | eigener Store auf `useSyncExternalStore` (`core/store.ts`), kein Redux       |
| DnD      | `@dnd-kit/core` – Zeiger und Tastatur                                        |
| Karten   | `@vis.gl/react-google-maps` · `maplibre-gl` (Fallback) · eigene Schemakarte  |
| Druck    | `qrcode` (lazy) für die Route im Tagesplan                                   |
| Styling  | CSS Modules + Design-Tokens (`--sl-*`) in `src/styles/tokens.css` + `.dark`  |
| UI-Lib   | keine – eigene Bausteine in `src/core/ui/`                                   |
| Icons    | `lucide-react`, Strich **1.5**, Grösse **16 / 20**                           |
| Schrift  | IBM Plex Sans (UI), IBM Plex Mono (Nummern, SN, Zeiten) – lokal via Fontsource |
| Tests    | vitest 5 – reine Fachlogik, `*.test.ts` neben dem Code, Helfer in `src/test/testdaten.ts` |
| Persistenz | `localStorage`-Stand (`sl.dispo.stand.v1`, tagesgebunden), Spiegelung über `storage` (ADR-001) |

---

## 3 · Struktur

```
src/
├─ main.tsx · App.tsx           Einstieg (Fonts, Tokens, Mock-Auth), Routen
├─ styles/
│  ├─ tokens.css                Rollen-Tokens hell: Palette, Status, Kategorien, Techniker, Masse
│  ├─ tokens.dark.css           dieselben Namen unter [data-theme='dark']
│  └─ global.css                Reset, Fokusring, Farbschema, Druckbasis
├─ core/                        modulübergreifend – kennt weder Module noch Mock
│  ├─ store.ts · theme.ts       Store-Fabrik, Persistenz, Hell/Dunkel
│  ├─ arbeitstag.tsx            Datum/Zeitraum aus der URL, sichtbare Tage
│  ├─ datum.ts · format.ts      ISO-Datum, Minuten, CH-Formate (17.10.2026 · 08:30 · CHF 1’240.50)
│  ├─ geo.ts                    Koordinaten, Distanz, Fahrzeit (Mock), Mercator, Google-Links
│  ├─ suche.ts · kommando.ts    Suchindex, Registry für Palette (Befehle + Suchquellen)
│  ├─ modules.config.ts         einzige Quelle für Leiste, Palette, Routing, Rollen, Freischaltung
│  ├─ aenderungen.ts            Zähler ungespeicherter Änderungen (Abmelden-Rückfrage)
│  ├─ auth/                     Typen, authStore (Mock), RequireAuth, LoginPage, AbgemeldetPage
│  ├─ domain/                   Stammdaten (Orte, Hinweise), Auftrag, Einsatz/Pendenz, Rapport, Nachricht, Kategorie,
│  │                            Lager (Orte, Artikel, Bestand, Bestellung, Bewegung), Verrechnung (Betrag)
│  ├─ hooks/                    useNow · useHotkey · useDismiss · useElementSize · useHoverIntent · useMediaQuery · useQrSvg
│  ├─ layout/                   AppShell · Topbar · Sidebar · MiniKalender · DateNav · BenutzerMenu ·
│  │                            KommandoPalette · ShortcutHilfe · FolgtPage · ModulRoute (Rolle je Route)
│  └─ ui/                       Button · Chip · Avatar · Typenschild · DetailZeile · Popover · Dialog · Hovercard · Form ·
│                               SegmentedControl · CapsLabel · Kbd · FotoKachel · FotoLightbox · ModulSeite (Liste + Dossier) ·
│                               Kacheln · Tabelle · Suchfeld · Leer · Verweis · farben · cx
├─ modules/dispo/               ← ein Ordner pro Modul
│  ├─ DispoPage.tsx             Modulwurzel: hängt Mock ein, Befehle, Hotkeys, Komposition
│  ├─ DispoToolbar.tsx          Ansicht, Zeitraum, Zoom, Farbe nach, Filter, Undo/Redo, Neu
│  ├─ dispo.types.ts            Ansicht, FarbeNach, Zoom, Filter, Auswahl, Bestand
│  ├─ zeitraster.ts             Achse 06–20, Arbeitszeit 07–18, Skala, Spuren, freie Slots
│  ├─ scoring.ts · konflikte.ts Smart-Slot-Bewertung, Konflikt-Wächter
│  ├─ store/                    reducer (Undo/Redo), dispoStore (+ Persistenz, Fenster-Spiegelung), selectors, useDispoAktionen, persistenz
│  ├─ drag/                     DispoDnd (dnd-kit, Vorschau, Smart-Slots)
│  ├─ views/                    Plantafel · PlantafelKompakt · Kalender · Liste · Karte · EinsatzBlock
│  ├─ panel/                    SeitenPanel · EingangTab · WartetTab · ErledigtTab · PendenzCard
│  ├─ akte/                     Akte · Rapport · Nachrichten · Fotos · Verlauf · Ersatzteile · Bearbeiten · Verschieben · SlotVorschläge
│  ├─ karte/                    MapCanvas (Wahl) · GoogleKarte · LibreKarte · SchemaKarte
│  ├─ hover/                    Hovercard-Kontext und Einsatz-Kurzansicht
│  ├─ druck/                    TechnikerDruck (A4, QR)
│  └─ Schnellerfassung · KapazitaetsBand · LivePuls · KundenChips · ProtokollPopover
├─ modules/app/                 Techniker-App (rev 03): AppPage (Routen, Kontext) · AppLayout (Telefonrahmen, Tabs, Menü) ·
│                               HeuteSeite · EinsatzSeite · WocheSeite · RapportSeite · EinsatzKarte · app.model
├─ modules/rapport/             Servicerapport, geteilt von App und Büro: RapportFormular · UnterschriftFeld · NachrichtDialog ·
│                               ZurueckDialog · RapportDruck (A4, QR) · rapport.model · rapportStatus
├─ modules/rapporte/            Büro-Modul «Servicerapporte»: RapportePage (Kacheln als Filter, Liste, Prüfung, Freigabe)
├─ modules/dashboard/           Tagesüberblick (rev 04): DashboardPage · dashboard.model (Tagesbild aus den Modul-Selektoren)
├─ modules/auftraege/           Aufträge: AuftraegePage · AuftragDossier · auftraege.model (Phase, Sichten, Suche)
├─ modules/kunden/              Kunden & Liegenschaften: KundenPage · KundeDossier · KundeDialog · LiegenschaftDialog ·
│                               HinweisFelder · kunden.model
├─ modules/geraete/             Gerätekartei: GeraetePage · GeraetDossier · GeraetDialog · geraete.model
├─ modules/bilder/              Bilder: BilderPage · bilder.model (Fotos mit Kontext, Filter, Tage)
├─ modules/lager/               Lager & Ersatzteile: LagerPage · ArtikelDossier · BestellungDossier · BestellDialog ·
│                               LagerDialoge (Umbuchen, Korrektur, Artikel) · lager.model
├─ modules/suche/               globaleSuche – Suchquellen Aufträge/Kunden/Geräte für die Palette auf jeder Seite
├─ mock/                        Testdaten – nur von Modulwurzeln und App.tsx importiert (rapporte.ts, lager.ts: Verläufe, Rapporte, Lager)
└─ test/testdaten.ts            Testhelfer auf dem echten Mock (deterministisch, relativ zu heute)
scripts/jh-sign.mjs · scripts/contrast.jh.ts · scripts/demo.jh.mjs
docs/adr (001–004) · docs/design · docs/tests · docs/prompts · .claude/skills (sutt-modul, sutt-pruefung)
TODO.jh.md · CHANGELOG.jh.md
```

**Abhängigkeitsrichtung:** `modules/*` → `core/*`. `core` kennt keine Module und keine Mockdaten
(Mock-Auth bekommt sein Benutzerverzeichnis in `main.tsx` injiziert). Alle Module sind Sichten auf **einen** Stand
(ADR-003): Dashboard, Aufträge, Kunden, Geräte, Bilder, Lager, App und Rapporte lesen und schreiben denselben Store;
`modules/rapport` ist der geteilte Rapport-Baustein ohne eigenen Store.

**Muster pro Modul:** `*.types.ts` → `store/*.reducer.ts` (rein) → `store/*.selectors.ts` (rein) →
`store/use*Aktionen.ts` (Protokolltext, IDs, Zeitstempel) → Komponenten (dumm, explizite Props).

---

## 4 · Designsprache – «Schweizer Industrie, nicht KI»

Referenz: Hilti, Siemens, SBB-Leitsysteme. **Ruhig, dicht, präzise.**

### Verboten
Lila/Blau-Verläufe · Glassmorphism · Glow · Emojis · Radien > 3 px · schwebende Karten mit weichem Schatten ·
Hero-Sektionen · «Welcome back» · Inter · zentrierte Leerlayouts · knallige Vollflächen-Balken · Material-Look.

### Farbe

| Token              | Hell      | Rolle                                            |
| ------------------ | --------- | ------------------------------------------------ |
| `--sl-ink`         | `#1A1A1A` | Vordergrund                                      |
| `--sl-ink-2`       | `#3A3A3A` | Sekundärtext, aktive Linien                      |
| `--sl-mute`        | `#6B6B6B` | Labels, Metadaten                                |
| `--sl-line`        | `#DAD7D2` | Haarlinien                                       |
| `--sl-paper`       | `#F4F2EE` | Arbeitsfläche                                    |
| `--sl-surface`     | `#FFFFFF` | Panels, Blöcke, Karten                           |
| `--sl-signal`      | `#F86C04` | **nur Signal**: Primäraktion, aktiv, dringend    |
| `--sl-signal-ink`  | `#B84D00` | Signal als Schrift                               |
| `--sl-chrome`      | `#1A1A1A` | Topbar und Login links – in beiden Modi Anthrazit |

**Kategorien** (Kante · Schrift) – Farbe kommt wie bei Outlook-Kategorien in die Fläche:
Reparatur `#2F6FB2` · Installation/Montage `#2E8B57` · Lieferung `#C98A00` · Garantie `#7B4FA6` ·
Mietgerät `#0F8A8A` · Malerarbeiten `#A0522D` · Offerte/Besichtigung `#5C6B7A` · Notfall `#F86C04`.
Jede Kategorie hat `--sl-kat-<id>-edge/-ink`; die Fläche entsteht aus `color-mix(Kante, --sl-tint-mix, Oberfläche)`
(hell 30 %, dunkel 36 %) – ein Token für alle Flächen, `jh:contrast` rechnet die Mischung nach. Erledigte Einsätze
bleiben farbig (Häkchen, 90 % Deckkraft): ein Plan voller Grau sagt nichts. Im überlagerten Kalender trägt der Balken
links zusätzlich die Technikerfarbe (`--sl-balken`), die Fläche bleibt bei «Farbe nach».

**Status** wird nicht über Farbe gezeigt, sondern über Icon und Kante: unterwegs `Truck` · vor Ort `MapPin` +
pulsierender Punkt · wartet auf Teil gestrichelte Kante + `PackageSearch` · erledigt `Check` ·
überzogen / Fahrzeit knapp rote Ecke · dringend Signal-Ecke · verknüpft `Link2`. Die Status-Töne (`--sl-st-*`)
bleiben für Swatches und Legenden.

**«Farbe nach»** (Toolbar): Kategorie (Standard) · Techniker (`--sl-tech-1…9`, Avatar + Zeilenmarke) ·
Region · Status. Umgesetzt als Klassentausch in `core/ui/farben.module.css`: jede Klasse setzt
`--sl-edge`, `--sl-tint`, `--sl-tint-ink`; Blöcke, Pillen und Chips lesen nur diese drei.

**Kontrast:** `npm run jh:contrast` prüft 44 Textpaare in beiden Modi gegen WCAG AA.
Primärknopf: Anthrazit auf Orange (`--sl-on-signal`, 5.9:1) – Weiss käme nur auf 2.9:1.

### Mass, Linie, Schatten, Fokus
- Raster **4 / 8 px**, Radius **max. 3 px**, **1-px-Haarlinien** statt Schatten.
- **Ein Schatten** (`--sl-shadow-float`) – Panel-Akte, Popover, Hovercard, Dialog, Schnellerfassung.
- Typo-Skala **12 / 13 / 14 / 16 / 20 / 28**. Labels: Versalien **11 px**, Laufweite **+0.06em**.
- **Fokusring** überall gleich: 2 px Signal, 2 px Abstand (`:focus-visible`).

### Wiedererkennung
- **Typenschild** (`<Typenschild>`, `<TypenschildPlatte>`): Nummern in Mono, feiner Rahmen, Label darüber;
  Hersteller-Kennung je Marke (`Fabrik-Nr.`, `E-Nr./FD`, `PNC/SN`, `Service-Nr.`).
- **Messmarke**: aktive Elemente bekommen eine **2-px-Orange-Kante links** – Seitenleiste, Umschalter,
  Filter-Chips, Panel-Zielzeile beim Drop, Suchtreffer, Minikalender-Heute.
- **Detailzeile** (Akte): Icon · Wert · kleines Label darunter – Muster onDispatch, in unserer Typo.

### Dark Mode
`tokens.dark.css` überschreibt nur Werte unter `:root[data-theme='dark']`; Komponenten kennen keine Rohfarben.
Umschaltung im Benutzermenü (persistiert), kein Automatismus über `prefers-color-scheme`.

---

## 5 · Code-Handschrift ◆ JH (Pflicht in jeder Datei)

### Datei-Kopf (jede `.ts` / `.tsx` / `.css` / `.mjs`, in `index.html` als HTML-Kommentar)

```
/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/Kalender.tsx                   │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Outlook-Kalender: Techniker-Kalender, Tag/AW/Woche/Monat, Split       │
   └────────────────────────────────────────────────────────────────────────┘ */
```

Pfad relativ zu `src/`. Innenbreite 72 Zeichen – `npm run jh:sign` richtet die Box aus.
**Jede neue und jede inhaltlich geänderte Datei bekommt die aktuelle `rev`**; unveränderte behalten ihre.

### Abschnitts-Marken (nummeriert, lückenlos ab §1)
```ts
// ── §1 · Typen ─────────────────────────────────────────────────
// ── §2 · State ─────────────────────────────────────────────────
// ── §3 · Logik ─────────────────────────────────────────────────
// ── §4 · Render ────────────────────────────────────────────────
```
In CSS: `/* ── §1 · Rahmen ──── */`.

### Kommentar-Präfixe (sparsam – nie Offensichtliches erklären)

| Präfix        | Bedeutung                                                  |
| ------------- | ---------------------------------------------------------- |
| `// jh› `     | Begründung einer Entscheidung – das **Warum**, nie das Was  |
| `// jh! `     | Achtung / Stolperfalle                                     |
| `// jh? `     | offene Frage an die Sutt AG                                |
| `// jh# 012 ` | To-do mit fortlaufender Nummer, zusätzlich in `TODO.jh.md`  |

### Datei-Ende
```
/* ◆ jh · eof */
```

### Namen & Form
- **Domänenbegriffe deutsch** als Typen: `Einsatz`, `Auftrag`, `Pendenz`, `Kategorie`, `Techniker`, `Liegenschaft`, `Ersatzteil`, `Absenz`.
- **Code englisch**: `scoreSlot`, `findKonflikte`, `useDispoAktionen`, `openDay`, `DispoPage`.
- Keine generischen Namen (`data`, `item`, `handleClick`) – sprechend: `offeneTeile`, `onSpurDrop`.
- Kleine Funktionen, **frühe Returns**, **keine verschachtelten Ternaries**, **kein `any`**.
- **Props-Typ direkt über der Komponente.** **Nur benannte Exporte** (Ausnahme: `vite.config.ts`).
- CSS-Klassen **kebab-case**, Token-Präfix **`--sl-`**, Kategorie-Tokens `--sl-kat-<id>-edge/-ink`, Flächen über `--sl-tint-mix`.
- **Dynamische Klassen nur über `modulKlasse(styles, 'status-vor-ort')`** (`core/ui/cx.ts`): Vite exportiert mit
  `camelCaseOnly` nur `styles.statusVorOrt` – `styles['status-vor-ort']` ist still `undefined` und färbt nichts.
- **Keine Inline-Styles** – ausser dynamischen Positionen/Massen (Zeitraster, Kalenderraster, Balken, Pins).
- Kein KI-Ton: keine Füllkommentare, keine Platzhaltertexte, keine Emojis im Code.

### Commit-Stil
`bereich(thema): was in kleinbuchstaben ◆` – Bereich in Klammern, Raute am Ende, z. B.
`dispo(kalender): monatsansicht mit kategorie-pillen ◆`. Jede Runde bekommt einen Abschnitt in `CHANGELOG.jh.md`.

### Signatur im UI
`core/signature.ts` exportiert `SIG` und grüsst im Dev-Modus einmal in der Konsole. Der Footer der
Seitenleiste zeigt `v0.2.0 · ◆ JH`; der Tooltip trägt Build-Datum und Commit-Kürzel (`vite.config.ts`).
`index.html`: `<meta name="author" content="◆ JH">`.

`npm run jh:check` erzwingt Kopf, §-Reihenfolge, eof, jh#-Abgleich, benannte Exporte und kein `any`.

---

## 6 · Neues Modul anlegen (Checkliste)

1. Eintrag in `core/modules.config.ts`: `freigeschaltet: true`, Rollen, Pfad, Beschreibung – Leiste, Palette und Folgt-Seite folgen automatisch.
2. Route in `App.tsx` unter `RequireAuth`; Modulwurzel `src/modules/<modul>/<Modul>Page.tsx` rendert `<AppShell modul={findModul('…')}>`.
3. Domäne in `<modul>.types.ts`; gemeinsame Stammdaten-Typen gehören nach `core/domain/`.
4. Store mit `createStore` (`core/store.ts`): Reducer rein, IDs/Zeitstempel kommen fertig in die Aktion (StrictMode ruft Reducer doppelt).
5. Befehle und Suchquelle registrieren: `useRegisterKommandos('<modul>', …)`, `useRegisterSuchQuelle(…)` – so landet das Modul in `Strg+K`.
6. Ungespeicherte Änderungen melden: `meldeAenderungen('<modul>', anzahl)` (Abmelden-Rückfrage).
7. Nummern als `Typenschild`, Farbe über `core/ui/farben`, Icons 16/20, Fokusring nicht anfassen.
8. Mockdaten in `src/mock/`, relativ zu `MOCK_HEUTE`, Referenzen beim Start prüfen (`assertConsistent`).
9. Jede Datei: Kopf mit aktueller rev, §-Marken, eof → `npm run jh:sign && npm run jh:check && npm run jh:contrast`.

---

## 7 · Disposition v2 – Funktionsumfang

- **Anmelden**: `/login`, Demo-Zugänge `jh` (Disposition), `rw` (Büro), `mb`/`sk` (Aussendienst), `admin`; beliebiges Passwort.
  Rolle steuert Schlösser (zusätzlich zur Freischaltung). Rollenwechsel zur Demo im Benutzermenü.
- **Ansichten** (Toolbar, Tasten `1–4`): Plantafel · Kalender · Liste · Karte; Zeitraum je Ansicht; Zoom 15/30/60;
  Farbe nach Kategorie/Techniker/Region/Status; Filter (Region, Techniker, Status, Kategorie) blendet ab statt aus.
- **Plantafel Tag**: 9 Techniker × 06–20 Uhr (Arbeitszeit 07–18 hell), Zeilen 72–120 px, Spuren bei Überschneidung,
  Fahrzeit-Puffer (graue Fläche, rot wenn zu knapp), Absenzen als Ganztagsblock, Jetzt-Pille, Live-Puls am Avatar,
  Klick auf den Namen → Druckansicht. Mehrtägig: Tagesspalten mit kompakten Blöcken, Klick auf den Tag zoomt hinein.
- **Kalender**: Kalenderleiste mit einem farbigen Chip pro Techniker (Klick blendet ein/aus, Doppelklick zeigt nur ihn, «Alle»);
  Tag nebeneinander pro Techniker (Standard), Arbeitswoche/Woche überlagert mit Kürzel und Technikerbalken (nebeneinander bis
  3 Kalender), Monat (Pillen, «+n weitere»), Ganztag-Leiste für Absenzen, Drop in Spalten.
- **Verknüpfungen**: Erst-/Folgetermin desselben Auftrags und Bezugsaufträge (`bezugAuftragId`: Mietgerät ↔ Reparatur,
  Ersatzlieferung, Malerarbeiten nach Schaden). Kettenglied im Block; beim Auswählen Winkel-Linien zu sichtbaren Partnern,
  Pfeil-Stummel mit Datum zu anderen Tagen, gestrichelter Ring am Partner; Chips in der Akte; «Folgetermin … zeigen» im Wartet-Tab.
- **Liste**: sortierbar, gruppierbar (Techniker/Status/Kategorie/Region), Spalten ein-/ausblendbar, Mehrfachauswahl → Techniker zuweisen, auf Datum verschieben.
- **Karte**: Pins in Tagesreihenfolge, Linien pro Techniker ab Werkhof, synchrone Tourenliste, Karte/Schema umschaltbar.
- **Rechtes Panel**: Eingang (nach Dringlichkeit, dann Alter) · Wartet auf Teil (Liefertermin, «Folgetermin vorschlagen») ·
  Erledigt (Rapport offen/erstellt/unterschrieben/freigegeben/verrechnet, Rechnung offen/gestellt/bezahlt); Suche, Ziehgriff, Schiene.
- **Akte**: siehe CHANGELOG rev 02; Bearbeiten-Dialog, Verschieben-Popover, Kopieren legt eine Pendenz an, Löschen entfernt Einsätze, Pendenzen, Rapporte und Nachrichten (undo-fähig);
  seit rev 03 Abschnitte «Servicerapport» (Kennzahlen, Unterschrift, Freigeben · Zurück · Verrechnen · Drucken) und «Nachrichten», SMS-Terminbestätigung statt Schloss.
- **Tastatur**: `T` heute · `←/→` blättern · `1–4` Ansicht · `[` `]` Leisten · `N` neuer Auftrag · `Strg+K` Palette ·
  `Esc` schliessen · `Strg+Z/Y` · `?` Hilfe · Drag: Leertaste, Pfeile, ↵.

### Aussendienst v0.3 – Techniker-App und Servicerapport
- **Techniker-App** `/app`: Aussendienst-Konten landen hier nach dem Login; der Innendienst öffnet sie aus der Akte
  («Techniker-App öffnen» / «In der App erfassen», zweites Fenster) oder per `?als=T-MB`. Heute-Liste mit Tagesleiste
  (erledigt · Einsatz · Fahrt · jetzt), Einsatzkarten in Reihenfolge, **ein** grosser Statusknopf für den Einsatz des Moments
  («Abfahrt» → «Angekommen» → «Fertig – Rapport»), Anruf, Route, Details, «Mieter informieren» (SMS mit Ankunftszeit),
  Woche, Banner «Plan geändert» mit «Gesehen», Offline-Hinweis. Am Desktop im Telefonrahmen 390 × 844 (`?rahmen=0` ohne).
- **Servicerapport**: vorausgefüllt aus Auftrag, Gerät und Statusverlauf – Zeiten (Anfahrt/Arbeit/Pause im 5-min-Raster,
  verrechenbar), Checkliste je Geräteart plus eigene Schritte, Bemerkung, Teile (eingebaut · ab Fahrzeug · bestellen),
  Fotos mit Motiv (Kamera oder Platzhalter), Typenschild-Vorschlag für «noch nicht erfasste» Geräte, Abschluss
  (erledigt · Folgetermin · Teil bestellt · nicht angetroffen), Unterschrift mit dem Finger. Speichern = «erstellt», mit
  Unterschrift «unterschrieben»; Abschliessen setzt den Einsatzstatus, legt bei Bedarf die Pendenz in den Eingang und
  schreibt bestellte Teile mit Liefertermin an den Auftrag. Druck A4 mit QR-Code (`/rapporte/:id/druck`).
- **Büro**: Modul Servicerapporte `/rapporte` (Kacheln Alle · Fehlend · Zu prüfen · Zu verrechnen · Verrechnet als Filter,
  Suche, Rapport lesend mit Freigeben · Zurück an Techniker · Verrechnen · Drucken · Per Mail · Im Plan), Akte-Abschnitt
  «Servicerapport», Konflikte «Rapport fehlt» / «Unterschrift fehlt», Panel Erledigt mit fünf Stufen.
  Rapportstatus: offen → erstellt → unterschrieben → freigegeben → verrechnet (Rechnung «gestellt»); «Zurück an Techniker»
  öffnet ihn wieder, löscht die Unterschrift und zeigt dem Techniker die Bemerkung des Büros.
- **Persistenz & Demo**: Stand in `localStorage`, zwischen Fenstern gespiegelt; «Demo zurücksetzen» (Benutzermenü, Palette)
  lädt den Ausgangsbestand – in allen Fenstern.

### Betrieb v0.4 – Dashboard, Aufträge, Kunden, Geräte, Bilder, Lager
- **Dashboard** `/dashboard`: Kennzahlen als Sprungmarken (Einsätze heute, Eingang/dringend, Konflikte, Rapporte zu prüfen und
  fehlend, zu verrechnen in CHF, Lieferungen, Abwesende), «Im Feld jetzt» je Techniker mit Live-Puls, Kapazitätsband, Eingang
  dringend zuerst, fällige Rapporte, Lieferungen, Abwesenheiten. Jede Zahl stammt aus dem Selektor des Moduls, das sie zeigt.
- **Aufträge** `/auftraege/:id?`: Phase abgeleitet aus Rechnung › Rapport › Einsätzen › Pendenz (Im Eingang · Disponiert ·
  In Arbeit · Wartet auf Teil · Rapport prüfen · Zu verrechnen · Rechnung offen · Bezahlt · Ohne Termin); Kacheln, Filter,
  sortierbare Tabelle, Dossier mit Einsätzen («Im Plan»), Pendenz («Planen»), Servicerapport, Parteien und Rechnung mit Betrag,
  Gerät, Fotos, Teilen und Bestellungen, Verlauf, Nachrichten; Bearbeiten, Kopieren, Löschen, «In den Eingang», Neuer Auftrag.
- **Kunden & Liegenschaften** `/kunden/:id?` (Innendienst): Verwaltungen, Private, Gewerbe, Rechnung offen; Liegenschaftskarten
  mit Hauswart, Zugang, Hinweisen, Geräten je Wohnung und Aufträgen; Kunde und Liegenschaft bearbeiten, Liegenschaft anlegen,
  Hinweise pflegen (gelten sofort in Akte und App), neuer Auftrag mit Vorbelegung.
- **Geräte** `/geraete/:id?`: Kartei mit Garantie-Sichten und «Typenschild fehlt», Standort aus dem jüngsten Auftrag,
  Einsätze, Ersatzteil-Historie aus Auftrag und Rapport, Fotos, Ereignisse; Vorschlag übernehmen, Gerät bearbeiten,
  neuer Auftrag für dieses Gerät.
- **Bilder** `/bilder`: alle Fotos nach Tag, Kacheln Heute · Woche · Garantiefälle · Typenschilder, Filter nach Motiv,
  Techniker, Marke, Kategorie, Zeitraum; Lightbox (Pfeiltasten) mit Verweisen auf Auftrag, Kunde, Gerät, Rapport.
- **Lager & Ersatzteile** `/lager/:bereich?` (Innendienst, ADR-004): Artikel (Bestand Glattbrugg, Fahrzeuge, Mindestbestand,
  Stufe), Bestellungen (offen, überfällig, heute, eingetroffen) mit **Wareneingang** – bucht ein, setzt das Teil am Auftrag auf
  «geliefert», zieht den Folgetermin auf heute –, Stornieren, Umbuchen Glattbrugg ↔ Fahrzeug, Bestand korrigieren, Artikel
  bearbeiten, Fahrzeuglager je Techniker, Journal. Der Rapport-Abschluss bucht Verbrauch und legt Bestellungen an.
- **Querverweise**: Jede Nummer (Auftrag, Kunde, Gerät, Rapport, Artikel, Bestellung) ist ein Sprung ins Modul; `Strg+K`
  findet Aufträge, Kunden und Geräte auf jeder Seite. Techniker-App: Tab «Fahrzeug» und Teile «im Fahrzeug» im Rapport.

### Mockdaten
Alles hängt am echten Datum (`MOCK_HEUTE`). Heute (6 Techniker) und der Eingang sind handverlesen, die
übrigen Tage und Techniker füllt ein deterministischer Generator (Saat = Datum + Techniker); Absenzen liegen
relativ zu heute. Koordinaten sind Näherungen auf Strassenniveau, Fahrzeit = Luftlinie × 1.35 bei 28 km/h + 4 min.
Erledigte Einsätze tragen Statusverläufe (Abfahrt, Ankunft, Fertig) und Rapporte aus der Saat; fehlende Rapporte gibt es
nur aus den letzten drei Tagen. Geräte werden an derselben Liegenschaft zu 40 % wiedergesehen (Kartei mit Geschichte); das
Lager entsteht aus dem Gerätekatalog (40 Artikel) mit Beständen, Bestellungen aus allen bestellten Teilen und einem Journal
aus den erledigten Einsätzen. Alle Firmen, Personen, Nummern und E-Mails (`.example`) sind **erfunden**.

---

## 8 · Innovationen – und warum

1. **Smart-Slot beim Ziehen** – Freie Fenster färben sich grün/gelb/rot (Region, Markenkompetenz, Fahrzeit, Auslastung),
   die Vorschau nennt den Grund. *Warum:* Der Disponent entscheidet in Sekunden; die Bewertung macht sein Bauchgefühl sichtbar
   und ist mit vier Kriterien nachvollziehbar – kein schwarzer Kasten.
2. **Fahrzeit-Puffer sichtbar** – Zwischen Einsätzen ein grauer Streifen in Fahrzeitlänge, rot bei zu knapper Lücke.
   *Warum:* Papier- und Excel-Pläne kennen keine Fahrzeit; genau dort entstehen Verspätungen.
3. **Konflikt-Wächter** – Badge in der Topbar zählt Überschneidungen, Arbeitszeit, fehlende Teile, knappe Fahrten, Absenzen;
   Klick springt der Reihe nach hin. *Warum:* Fehler fallen auf, bevor der Techniker losfährt.
4. **Ersatzteil-Kopplung** – «Folgetermin ab Liefertermin vorschlagen» zeigt die drei besten Slots nach dem Liefertag.
   *Warum:* Der häufigste Nachfasser im Service («Teil ist da, wann kommt ihr?») wird zum Ein-Klick-Vorgang.
5. **Kommandopalette** – `Strg+K` sucht Auftrag, Kunde, Adresse, Seriennummer und führt Befehle aus; gesperrte Module zeigen das Schloss.
   *Warum:* Am Telefon zählt jede Sekunde; die Hände bleiben auf der Tastatur.
6. **Kapazitätsband** – verplant · Fahrzeit · frei pro Techniker, in der Woche als Heatmap. *Warum:* «Wer hat heute noch Platz
   für einen Notfall?» beantwortet sich ohne Rechnen.
7. **Telefon-Schnellerfassung** – `N`, Nummer eingeben, Anrufer wird erkannt, Liegenschaft und Gerät sind vorgeschlagen,
   Smart-Slot bietet den Termin; Stoppuhr zeigt das 30-Sekunden-Ziel. *Warum:* Der Auftrag entsteht während des Gesprächs, nicht danach.
8. **Live-Puls** – Punkt am Avatar: vor Ort seit 25 min, unterwegs, überzieht 10 min; tickt mit der Echtzeit.
   *Warum:* Der Disponent sieht die Lage, ohne anzurufen.
9. **Undo/Redo mit Protokoll** – jede Planänderung mit Zeit, Text und Kürzel; `Strg+Z/Y`. *Warum:* Mut zum Probieren –
   ein Drop ist nie endgültig, und das Protokoll beantwortet «wer hat das verschoben?».
10. **Tagesplan drucken/teilen** – A4 pro Techniker mit Reihenfolge, Adressen, Kontakten, Hinweisen und QR-Code zur Google-Maps-Route.
    *Warum:* Der Zettel im Fahrzeug bleibt Realität; der QR-Code bringt die Route aufs Telefon.
11. **Kunden-Info-Chips** – Rechnung offen seit 34 Tagen, Stammkunde, Schlüssel bei Verwaltung, Hund im Haus, Parkieren.
    *Warum:* Kleine Hinweise ersparen den Rückruf vor der Haustür.
12. **Verknüpfungslinien** – Wählt man einen Einsatz, führen Gantt-artige Winkel zu Folgetermin, Ersttermin und Bezugsaufträgen
    (Mietgerät zur Reparatur, Ersatzlieferung); liegt der Partner an einem anderen Tag, zeigt ein Pfeil-Stummel mit Datum dorthin.
    *Warum:* «Gehört das zusammen?» ist die häufigste Rückfrage im Büro. Outlook kennt keine Abhängigkeiten – ein Serviceplan braucht sie.
13. **Techniker-Kalender wie in Outlook** – Jeder Techniker ist ein Kalender mit eigener Farbe, per Chip ein- und ausblendbar;
    im Tag nebeneinander, in der Woche überlagert mit Kürzel und Farbbalken. *Warum:* Das Modell kennt jeder aus Outlook –
    niemand muss lernen, wie man drei Kollegen vergleicht.
14. **Ein-Daumen-Status** (rev 03) – In der App gibt es pro Moment genau einen grossen Knopf: Abfahrt, Angekommen, Fertig.
    Jeder Druck ist ein Zeitstempel; der Leitstand sieht ihn sofort (Live-Puls, Verlauf, Block). *Warum:* Der Techniker steht
    mit der Werkzeugkiste vor der Tür – zwei Sekunden, ein Daumen, kein Formular.
15. **Rapport in 90 Sekunden** – Zeiten kommen aus den Statusknöpfen, die Checkliste aus der Geräteart, Teile aus dem Auftrag,
    der Fehlercode aus dem Fehlerbild. Der Techniker bestätigt, korrigiert, lässt unterschreiben. *Warum:* Der Papierrapport
    wird abends im Auto geschrieben – oder gar nicht. Hier entsteht er vor Ort, mit Unterschrift des Mieters.
16. **Abschluss mit Folgen** – «Teil bestellt» setzt den Einsatz auf «Wartet auf Teil», legt das Ersatzteil mit Liefertermin an
    und den Folgetermin in den Eingang; «Nicht angetroffen» hält die SMS-Vorlage bereit. *Warum:* Der Rapport ist kein
    Dokument, sondern der nächste Planungsschritt – nichts davon muss das Büro abtippen.
17. **Zwei Fenster, ein Stand** – Plantafel und Techniker-App teilen den Stand über `localStorage`; eine Verschiebung im Büro
    meldet die App als «Plan geändert», ein Statusknopf im Feld färbt den Block im Leitstand. *Warum:* Die Demo zeigt die
    Rückkopplung Büro ↔ Feld live – ohne Server, mit denselben Regeln, die später die API einhält (ADR-001).
18. **Typenschild-Vorschlag** – Fotografiert der Techniker das Typenschild eines «noch nicht erfassten» Geräts, schlägt der
    Rapport Modell, Typ und Seriennummer vor; «Übernehmen» schreibt sie an das Gerät. *Warum:* Gerätedaten aus der
    Telefon-Schnellerfassung würden sonst nie nachgetragen (`jh# 010`, `jh# 014`).
19. **Phase statt Status** (rev 04) – Ein Auftrag hat kein Statusfeld, das jemand pflegen müsste: Die Phase ergibt sich aus
    Rechnung, Rapport, Einsätzen und Pendenz. *Warum:* Ein gepflegter Status lügt nach zwei Wochen; ein abgeleiteter nie.
20. **Zahl = Filter = Sprung** – Kacheln in jedem Modul sind Zähler und Filter zugleich, auf dem Dashboard Sprungmarken ins
    Modul mit passender Sicht. *Warum:* Wer «13 fehlend» liest, will die 13 sehen – nicht erst ein Dropdown suchen.
21. **Lager-Kopplung** – «Teil bestellen» im Rapport wird zur Bestellung, der Wareneingang setzt das Teil am Auftrag auf
    «geliefert» und legt den Folgetermin in den Eingang; Teile ab Fahrzeug buchen vom Fahrzeuglager ab. *Warum:* Der häufigste
    Bruch im Service («Ist das Teil da?») verschwindet – Lager, Dispo und Techniker lesen denselben Datensatz.
22. **Ein Datensatz, viele Türen** – Auftrag, Kunde, Gerät, Rapport, Artikel, Bestellung: Jede Nummer ist ein Verweis, aus Akte,
    Dossier, Dashboard, Lightbox und Palette. *Warum:* Der Disponent denkt in Zusammenhängen, nicht in Modulen.
23. **Gerätekartei aus Aufträgen** – Standort, Wohnung, Einsätze, Teile und Fotos eines Geräts entstehen aus seinen Aufträgen;
    Umzüge und Ersatz ergeben sich von selbst. *Warum:* Eine separat gepflegte Gerätedatei veraltet – die Auftragsgeschichte nicht.
24. **Betrag auf Knopfdruck** – Arbeitszeit × Stundensatz, Anfahrtspauschale, eingebaute Teile – im Auftrag, bei offenen
    Rechnungen und als Summe «zu verrechnen» auf dem Dashboard. *Warum:* Das Büro sieht das Geld, bevor die Buchhaltung kommt.

---

## 9 · Offene Fragen an die Sutt AG (`jh?`)

1. Bedeutung der heutigen Dispo-Farben (Papier/Excel)? – `core/domain/einsatz.ts`
2. Samstag regulärer Einsatztag oder Pikett? – `core/arbeitstag.tsx`
3. Mittagspause fix 12:00–13:00 oder individuell? – `modules/dispo/zeitraster.ts`
4. Regionen nach Gemeinde oder Tourenplan? – `core/domain/stammdaten.ts`
5. Soll-Einsatzzeit 8:30 h/Tag, Fahrzeitpauschale? – `mock/techniker.ts`
6. Nummernkreis der Aufträge (`26-04817`)? – `mock/auftraege.ts`
7. Verlaufsphasen vollständig («offeriert», «verrechnet»)? – `akte/AkteVerlauf.tsx`
8. Planen vor dem Liefertermin nur Hinweis oder sperren? – `drag/DispoDnd.tsx`
9. Status kommt seit rev 03 aus der Techniker-App – darf das Büro ihn überschreiben, und wer gewinnt bei Widerspruch? – `akte/Akte.tsx`
10. Benutzer & Anmeldung (heute Demo-Zugänge) – `core/auth/`
11. «Malerarbeiten» selbst oder vermittelt? – `core/domain/kategorie.ts`
12. Nummernkreis der Servicerapporte (`R-26-00417`)? – `core/domain/rapport.ts`
13. Checklisten je Geräteart – heute im Kopf des Technikers oder auf dem Papierrapport? – `core/domain/rapport.ts`
14. Lieferfrist beim Hersteller (angenommen 3 Arbeitstage) – je Marke verschieden? – `store/useDispoAktionen.ts`
15. Büronummer und Absendername für SMS und Mail? – `core/domain/nachricht.ts`
16. Fristen für «Rapport fehlt» (1 Tag) und «Unterschrift fehlt» (2 Tage) im Konflikt-Wächter? – `modules/dispo/konflikte.ts`
17. Genügt die Unterschrift auf dem Telefon (Name, Zeit, Pfad) der Buchhaltung, oder braucht es den Mail-Beleg? – `modules/rapport/UnterschriftFeld.tsx`
18. Stundensatz, Anfahrtspauschale und Rundung (heute CHF 128 / CHF 48, 5 Rappen)? – `core/domain/verrechnung.ts`
19. Mindestbestände je Artikel und wer sie pflegt? – `core/domain/lager.ts`
20. Nummernkreis der Bestellungen (`B-26-00123`), Lieferanten je Marke? – `core/domain/lager.ts`
21. Wird das Fahrzeuglager gezählt oder geschätzt; bucht der Techniker Verbrauch selbst? – `modules/app/LagerSeite.tsx`
22. Wer bucht den Wareneingang – Büro oder Lager, mit Lieferschein-Scan? – `modules/lager/BestellungDossier.tsx`
23. Kundenarten vollständig (Verwaltung, Privat, Gewerbe) oder auch Eigentümergemeinschaften? – `core/domain/stammdaten.ts`
24. Regionen-Zuordnung neuer Liegenschaften nach Ort oder Tourenplan (Ortsliste mit PLZ)? – `core/domain/stammdaten.ts`

---

## 10 · Bewusst nicht in v0.4

Kein Backend, keine Auth-Prüfung, keine echten Daten. Persistenz nur als `localStorage`-Stand desselben Tages (Reload hält
ihn, «Demo zurücksetzen» verwirft ihn, ein neuer Tag beginnt frisch). Kein echter SMS/Mail-Versand (Vorschau + Protokoll),
kein echtes OCR (`jh# 014`), Kamerafotos nur im Fenster (`jh# 012`), keine Offline-Warteschlange (`jh# 013`),
kein Routing-Dienst (Fahrzeit ist Luftlinie × Faktor), OSM-Kacheln nur fürs Mockup (`jh# 007`), keine Geokodierung neuer
Liegenschaften (`jh# 016`), Fahrzeuglager in der App nur lesend (`jh# 017`), keine Rechnungsstellung/Mahnwesen (Buchhaltung
v0.7), Techniker und Absenzen noch feste Stammdaten (Personal v0.5), keine Lieferanten-Anbindung (Bestellung ist ein Datensatz,
kein Versand).

---

## 11 · Screenshots

`docs/screenshots/` – aufgenommen am 17.10.2026 bei 1440 × 860, hell (`hell-*`) und dunkel (`dunkel-*`):
Login, Plantafel (mit Verknüpfungslinien), Kalender (Tag nebeneinander, Arbeitswoche überlagert), Liste, Karte, Akte,
Tagesplan-Druck; dunkel zusätzlich Seitenleiste eingeklappt, Kommandopalette, Schnellerfassung, Panel «Wartet auf Teil»,
Panel «Erledigt», Panel-Schiene, Hovercard.

Die grosse Karte zeigt auf den Bildern die Schemakarte: der eingebettete Prüf-Browser drosselt `requestAnimationFrame`,
MapLibre meldet kein `load`, nach 10 s greift der Fallback. Im normalen Browser erscheinen die OSM-Kacheln – wie im
Kartenkopf der Akte zu sehen.

rev 03 (Techniker-App im Telefonrahmen, Rapport-Erfassung, Modul Servicerapporte, Akte mit Rapport-Abschnitt) und rev 04
(Dashboard, Aufträge, Kunden, Geräte, Bilder, Lager) sind noch nicht abgelichtet – die Bilder entstehen mit der zweiten
Demo-Tour (`npm run demo:video`).

/* ◆ jh · eof */
