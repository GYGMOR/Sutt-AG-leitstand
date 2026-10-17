# SUTT·LEITSTAND · ◆ JH

Branchensoftware der **Sutt AG** (Haushalt-Apparate, Industriestrasse 24, 8152 Glattbrugg/Opfikon) –
Service, Reparatur und Verkauf von Haushalts-Grossgeräten.

**Stand:** rev 02 · v0.2.0 · Disposition v2 · klickbares Mockup mit Testdaten, ohne Backend.
Diese Datei ist der Bauplan: **jedes folgende Modul** (Kunden, Geräte, Lager, Mietgeräte, Zeit …)
wird exakt nach diesen Regeln aufgebaut. Änderungen je Revision stehen in `CHANGELOG.jh.md`.

---

## 1 · Start

```bash
npm install
npm run dev          # http://localhost:5173 → /login (Demo-Zugänge stehen unter dem Formular)
npm run build        # Typecheck (tsc strict) + Produktions-Build
npm run jh:check     # Signatur: Kopf, §-Marken, eof, jh#-Abgleich, Exporte, kein any
npm run jh:sign      # Köpfe und §-Marken automatisch normieren
npm run jh:contrast  # WCAG-Kontrast aller Textpaare, hell und dunkel
```

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
│  ├─ domain/                   Stammdaten, Auftrag, Einsatz/Pendenz, Kategorie
│  ├─ hooks/                    useNow · useHotkey · useDismiss · useElementSize · useHoverIntent · useMediaQuery
│  ├─ layout/                   AppShell · Topbar · Sidebar · MiniKalender · DateNav · BenutzerMenu ·
│  │                            KommandoPalette · ShortcutHilfe · FolgtPage
│  └─ ui/                       Button · Chip · Avatar · Typenschild · DetailZeile · Popover · Dialog ·
│                               Hovercard · Form · SegmentedControl · CapsLabel · Kbd · farben · cx
├─ modules/dispo/               ← ein Ordner pro Modul
│  ├─ DispoPage.tsx             Modulwurzel: hängt Mock ein, Befehle, Hotkeys, Komposition
│  ├─ DispoToolbar.tsx          Ansicht, Zeitraum, Zoom, Farbe nach, Filter, Undo/Redo, Neu
│  ├─ dispo.types.ts            Ansicht, FarbeNach, Zoom, Filter, Auswahl, Bestand
│  ├─ zeitraster.ts             Achse 06–20, Arbeitszeit 07–18, Skala, Spuren, freie Slots
│  ├─ scoring.ts · konflikte.ts Smart-Slot-Bewertung, Konflikt-Wächter
│  ├─ store/                    reducer (Undo/Redo), dispoStore, selectors, useDispoAktionen
│  ├─ drag/                     DispoDnd (dnd-kit, Vorschau, Smart-Slots)
│  ├─ views/                    Plantafel · PlantafelKompakt · Kalender · Liste · Karte · EinsatzBlock
│  ├─ panel/                    SeitenPanel · EingangTab · WartetTab · ErledigtTab · PendenzCard
│  ├─ akte/                     Akte · Fotos · Verlauf · Ersatzteile · Bearbeiten · Verschieben · SlotVorschläge
│  ├─ karte/                    MapCanvas (Wahl) · GoogleKarte · LibreKarte · SchemaKarte
│  ├─ hover/                    Hovercard-Kontext und Einsatz-Kurzansicht
│  ├─ druck/                    TechnikerDruck (A4, QR)
│  └─ Schnellerfassung · KapazitaetsBand · LivePuls · KundenChips · ProtokollPopover
└─ mock/                        Testdaten – nur von Modulwurzeln und App.tsx importiert
scripts/jh-sign.mjs · scripts/contrast.jh.ts
TODO.jh.md · CHANGELOG.jh.md
```

**Abhängigkeitsrichtung:** `modules/*` → `core/*`. `core` kennt keine Module und keine Mockdaten
(Mock-Auth bekommt sein Benutzerverzeichnis in `main.tsx` injiziert).

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

**Kategorien** (Kante · Fläche · Schrift) – Farbe kommt wie bei Outlook-Kategorien in die Fläche:
Reparatur `#2F6FB2` · Installation/Montage `#2E8B57` · Lieferung `#C98A00` · Garantie `#7B4FA6` ·
Mietgerät `#0F8A8A` · Malerarbeiten `#A0522D` · Offerte/Besichtigung `#5C6B7A` · Notfall `#F86C04`.
Jede Kategorie hat `--sl-kat-<id>-edge/-bg/-ink`; die Fläche ist hell getönt, die Kante kräftig, die Schrift dunkel.

**Status** wird nicht über Farbe gezeigt, sondern über Icon und Muster: unterwegs `Truck` · vor Ort `MapPin` +
pulsierender Punkt · wartet auf Teil Schraffur + `PackageSearch` · erledigt entsättigt + `Check` ·
überzogen / Fahrzeit knapp rote Ecke · dringend Signal-Ecke. Die Status-Töne (`--sl-st-*`) bleiben für
Swatches und Legenden.

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
   │  Outlook-Kalender: Tag / AW / Woche / Monat, Split pro Techniker       │
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
- CSS-Klassen **kebab-case**, Token-Präfix **`--sl-`**, Kategorie-Tokens `--sl-kat-<id>-edge/-bg/-ink`.
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
  Fahrzeit-Puffer (schraffiert, rot wenn zu knapp), Absenzen als Ganztagsblock, Jetzt-Pille, Live-Puls am Avatar,
  Klick auf den Namen → Druckansicht. Mehrtägig: Tagesspalten mit kompakten Blöcken, Klick auf den Tag zoomt hinein.
- **Kalender**: Tag (Nebeneinander pro Techniker), Arbeitswoche, Woche, Monat (Pillen, «+n weitere»), Ganztag-Leiste für Absenzen, Drop in Spalten.
- **Liste**: sortierbar, gruppierbar (Techniker/Status/Kategorie/Region), Spalten ein-/ausblendbar, Mehrfachauswahl → Techniker zuweisen, auf Datum verschieben.
- **Karte**: Pins in Tagesreihenfolge, Linien pro Techniker ab Werkhof, synchrone Tourenliste, Karte/Schema umschaltbar.
- **Rechtes Panel**: Eingang (nach Dringlichkeit, dann Alter) · Wartet auf Teil (Liefertermin, «Folgetermin vorschlagen») ·
  Erledigt (Rapport offen/erstellt/unterschrieben, Rechnung offen/gestellt/bezahlt); Suche, Ziehgriff, Schiene.
- **Akte**: siehe CHANGELOG rev 02; Bearbeiten-Dialog, Verschieben-Popover, Kopieren legt eine Pendenz an, Löschen entfernt Einsätze und Pendenzen (undo-fähig).
- **Tastatur**: `T` heute · `←/→` blättern · `1–4` Ansicht · `[` `]` Leisten · `N` neuer Auftrag · `Strg+K` Palette ·
  `Esc` schliessen · `Strg+Z/Y` · `?` Hilfe · Drag: Leertaste, Pfeile, ↵.

### Mockdaten
Alles hängt am echten Datum (`MOCK_HEUTE`). Heute (6 Techniker) und der Eingang sind handverlesen, die
übrigen Tage und Techniker füllt ein deterministischer Generator (Saat = Datum + Techniker); Absenzen liegen
relativ zu heute. Koordinaten sind Näherungen auf Strassenniveau, Fahrzeit = Luftlinie × 1.35 bei 28 km/h + 4 min.
Alle Firmen, Personen, Nummern und E-Mails (`.example`) sind **erfunden**.

---

## 8 · Innovationen – und warum

1. **Smart-Slot beim Ziehen** – Freie Fenster färben sich grün/gelb/rot (Region, Markenkompetenz, Fahrzeit, Auslastung),
   die Vorschau nennt den Grund. *Warum:* Der Disponent entscheidet in Sekunden; die Bewertung macht sein Bauchgefühl sichtbar
   und ist mit vier Kriterien nachvollziehbar – kein schwarzer Kasten.
2. **Fahrzeit-Puffer sichtbar** – Zwischen Einsätzen ein schraffierter Streifen in Fahrzeitlänge, rot bei zu knapper Lücke.
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
9. Status aus der Techniker-App statt vom Disponenten? – `akte/Akte.tsx`
10. Benutzer & Anmeldung (heute Demo-Zugänge) – `core/auth/`
11. «Malerarbeiten» selbst oder vermittelt? – `core/domain/kategorie.ts`

---

## 10 · Bewusst nicht in v0.2

Kein Backend, keine Auth-Prüfung, keine echten Daten, keine Persistenz der Planänderungen (Reload = Ausgangslage),
kein Routing-Dienst (Fahrzeit ist Luftlinie × Faktor), OSM-Kacheln nur fürs Mockup (`jh# 007`).

---

## 11 · Screenshots

`docs/screenshots/` – aufgenommen am 17.10.2026 bei 1440 × 860, hell (`hell-*`) und dunkel (`dunkel-*`):
Login, Plantafel, Kalender (Arbeitswoche), Liste, Karte, Akte, Tagesplan-Druck; dunkel zusätzlich Seitenleiste
eingeklappt, Kommandopalette, Schnellerfassung, Panel «Wartet auf Teil», Panel «Erledigt», Panel-Schiene, Hovercard.

Die grosse Karte zeigt auf den Bildern die Schemakarte: der eingebettete Prüf-Browser drosselt `requestAnimationFrame`,
MapLibre meldet kein `load`, nach 10 s greift der Fallback. Im normalen Browser erscheinen die OSM-Kacheln – wie im
Kartenkopf der Akte zu sehen.

/* ◆ jh · eof */
