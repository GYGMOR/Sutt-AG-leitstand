# SUTT·LEITSTAND · ◆ JH

Branchensoftware der **Sutt AG** (Haushalt-Apparate, Industriestrasse 24, 8152 Glattbrugg/Opfikon) –
Service, Reparatur und Verkauf von Haushalts-Grossgeräten.

**Stand:** Step 1 · Disposition und Einsatzplanung · klickbares Mockup mit Testdaten, ohne Backend.
Diese Datei ist der Bauplan: **jedes folgende Modul** (Kunden, Geräte-Scan, Lager, Mietgeräte, Zeit …)
wird exakt nach diesen Regeln aufgebaut.

---

## 1 · Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Typecheck (tsc strict) + Produktions-Build
npm run jh:check   # Signatur-Prüfung: Kopf, §-Marken, eof, jh#-To-dos, Exporte, any
npm run jh:sign    # Köpfe und §-Marken automatisch normieren
```

Node ≥ 20.19 (Vite 7). Empfohlen: Desktop ≥ 1280 px.

---

## 2 · Stack

| Bereich  | Wahl                                                                 |
| -------- | -------------------------------------------------------------------- |
| Build    | Vite 7 · React 18.3 · TypeScript 5.9 `strict` + `noUncheckedIndexedAccess` |
| Styling  | CSS Modules + Design-Tokens (`--sl-*`) in `src/styles/tokens.css`     |
| UI-Lib   | keine – eigene Bausteine in `src/core/ui/`                            |
| Icons    | `lucide-react`, Strich **1.5**, Grösse **16 / 20**                    |
| Schrift  | IBM Plex Sans (UI), IBM Plex Mono (Nummern, SN, Zeiten) – lokal via Fontsource |
| Zahlen   | `font-variant-numeric: tabular-nums` global                           |

Fonts kommen bewusst **nicht** vom Google-CDN: offline-fähig und DSG-freundlich.

---

## 3 · Struktur

```
src/
├─ main.tsx · App.tsx           Einstieg, Kompositionswurzel
├─ styles/
│  ├─ tokens.css                einzige Quelle für Farbe, Mass, Typo (Light)
│  └─ global.css                Reset + Grundtypografie (nur Elemente)
├─ core/                        modulübergreifend
│  ├─ signature.ts              SIG-Konstante + Dev-Konsolengruss
│  ├─ arbeitstag.tsx            Kontext: Datum + Zeitraum (Tag/Woche)
│  ├─ datum.ts · format.ts      ISO-Datum, Minuten, CH-Formate (17.10.2026 · 08:30 · CHF 1’240.50)
│  ├─ suche.ts                  Suchindex-Format, Umlaut-tolerante Treffer
│  ├─ domain/                   Stammdaten- und Auftragstypen (Kunde, Liegenschaft, Geraet …)
│  ├─ hooks/                    useNow · useHotkey · useDismiss
│  ├─ layout/                   AppShell · Topbar · ModuleRail · DateNav · GlobalSearch · modules.ts
│  └─ ui/                       Button · Typenschild · SegmentedControl · CapsLabel · Kbd · cx
├─ modules/
│  └─ dispo/                    ← ein Ordner pro Modul
│     ├─ DispoView.tsx          Modulwurzel (rendert die AppShell)
│     ├─ dispo.types.ts         Domäne des Moduls (Einsatz, Pendenz …)
│     ├─ dispo.reducer.ts       reiner Reducer inkl. Undo-Protokoll
│     ├─ dispo.selectors.ts     reine Ansichtsmodelle
│     ├─ useDispoBoard.ts       Hook: State + Filter + Aktionen
│     ├─ useDispoDrag.ts        Drag & Drop
│     ├─ zeitraster.ts · status.ts
│     ├─ *.tsx + *.module.css   Komponenten
│     └─ drawer/                Auftrags-Drawer und seine Abschnitte
└─ mock/                        Testdaten – nie von core/ importiert
scripts/jh-sign.mjs             Signatur-Prüfung
TODO.jh.md                      alle jh#-To-dos
```

**Abhängigkeitsrichtung:** `modules/*` → `core/*`. `core` kennt keine Module und keine Mockdaten.
`mock/` wird nur von Modulwurzeln und `App.tsx` importiert.

**Muster pro Modul:** `*.types.ts` → `*.reducer.ts` (rein) → `*.selectors.ts` (rein) → `use*.ts` (Klebstoff) → Komponenten (dumm, explizite Props).

---

## 4 · Designsprache – «Schweizer Industrie, nicht KI»

Referenz: Hilti, Siemens, SBB-Leitsysteme. **Ruhig, dicht, präzise.**

### Verboten

Lila/Blau-Verläufe · Glassmorphism · Glow · Emojis · Radien > 3 px · schwebende Karten mit weichem Schatten ·
Hero-Sektionen · «Welcome back» · Inter · zentrierte Leerlayouts.

### Farbe

| Token              | Wert      | Rolle                                     |
| ------------------ | --------- | ----------------------------------------- |
| `--sl-ink`         | `#1A1A1A` | Vordergrund, Topbar                       |
| `--sl-ink-2`       | `#3A3A3A` | Sekundärtext, aktive Linien               |
| `--sl-mute`        | `#6B6B6B` | Labels, Metadaten                         |
| `--sl-line`        | `#DAD7D2` | Haarlinien                                |
| `--sl-paper`       | `#F4F2EE` | Arbeitsfläche                             |
| `--sl-surface`     | `#FFFFFF` | Panels, Blöcke, Karten                    |
| `--sl-signal`      | `#F86C04` | **nur Signal**: Primäraktion, aktiv, dringend |
| `--sl-signal-ink`  | `#B84D00` | Signal als Schrift (Kontrast)             |

Status (gedämpft, immer als **Kante**, nie als Fläche):
geplant `#3D5A80` · unterwegs `#C08A00` · vor Ort `#2E7D5B` · wartet auf Teil `#8C4A9E` · erledigt `#7A7A7A` · dringend = Signal-Orange.

> Sutt-Orange ist **nie flächig**. Primär-Buttons: Orange mit Anthrazit-Schrift (5.9 : 1 statt 2.9 : 1 mit Weiss).

### Mass, Linie, Schatten

- Raster **4 / 8 px** (`--sl-space-1 … -10`), Radius **max. 3 px**.
- **1-px-Haarlinien** statt Schatten. **Ein einziger Schatten** (`--sl-shadow-float`) – nur Drawer und Popover.
- Typo-Skala **12 / 13 / 14 / 16 / 20 / 28**. Labels: Versalien **11 px**, Laufweite **+0.06em** (`<CapsLabel>`).

### Wiedererkennung

- **Typenschild** (`<Typenschild>`, `<TypenschildPlatte>`): Geräte- und Auftragsnummern in Mono, feiner Rahmen,
  kleines Label darüber – z. B. `V-ZUG` / `ASV2T-41123 · SN 4421-8810`. Auch Techniker-Kürzel stehen in einem Schild.
- **Messmarke**: aktive Elemente bekommen eine **2-px-Orange-Kante links** – Seitenleiste, Umschalter, Filter-Chips,
  markierter Suchtreffer, gezogene Karte, Zielzeile beim Drop. Keine farbigen Hintergründe.

### Dark Mode

Tokens benennen **Rollen**, nicht Töne (`--sl-ink` = Vordergrund). Ein Dark Mode ist nur eine weitere Datei
`tokens.dark.css`, die dieselben Namen überschreibt (→ jh# 005). Komponenten verwenden **keine Rohfarben**.

---

## 5 · Code-Handschrift ◆ JH (Pflicht in jeder Datei)

### Datei-Kopf (jede `.ts` / `.tsx` / `.css` / `.mjs`, in `index.html` als HTML-Kommentar)

```
/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/DispoBoard.tsx                       │
   │  ◆ JH · 2026.10 · rev 01                                               │
   │  Einsatzplan: Techniker × Zeitachse, Drag & Drop                       │
   └────────────────────────────────────────────────────────────────────────┘ */
```

Pfad relativ zu `src/` (sonst zum Projekt). Innenbreite 72 Zeichen – `npm run jh:sign` richtet die Box aus.
Bei inhaltlichen Änderungen `rev` hochzählen.

### Abschnitts-Marken (nummeriert, lückenlos ab §1)

```ts
// ── §1 · Typen ─────────────────────────────────────────────────
// ── §2 · State ─────────────────────────────────────────────────
```

In CSS: `/* ── §1 · Rahmen ──────────── */`.

### Kommentar-Präfixe (sparsam – nie Offensichtliches erklären)

| Präfix         | Bedeutung                                                      |
| -------------- | -------------------------------------------------------------- |
| `// jh› `      | Begründung einer Entscheidung – das **Warum**, nie das Was      |
| `// jh! `      | Achtung / Stolperfalle                                         |
| `// jh? `      | offene Frage an die Sutt AG                                    |
| `// jh# 012 `  | To-do mit fortlaufender Nummer, zusätzlich in `TODO.jh.md`      |

### Datei-Ende

```
/* ◆ jh · eof */
```

### Namen & Form

- **Domänenbegriffe deutsch** als Typen: `Einsatz`, `Auftrag`, `Pendenz`, `Liegenschaft`, `Techniker`, `Geraet`.
- **Code englisch**: Funktionen/Hooks/Strukturwörter – `planPendenz`, `moveEinsatz`, `useDispoBoard`, `DispoBoard`.
- Keine generischen Namen (`data`, `item`, `handleClick`) – sprechend: `offeneAuftraege`, `onSpurDrop`.
- Kleine Funktionen, **frühe Returns**, **keine verschachtelten Ternaries**, **kein `any`**.
- **Props-Typ direkt über der Komponente.** **Nur benannte Exporte** (Ausnahme: `vite.config.ts`).
- CSS-Klassen **kebab-case** (`.plan-bereich` → `styles.planBereich`), Token-Präfix **`--sl-`**.
- **Keine Inline-Styles** – ausser dynamischen Positionen/Massen im Zeitraster (Blöcke, Jetzt-Linie, Auslastung).
- Klassen kombinieren mit `cx()` (fängt `undefined` aus CSS Modules ab).
- `SIG` aus `core/signature.ts`; im Dev-Modus einmal ein gestylter Konsolengruss mit Build-Datum.

`npm run jh:check` erzwingt Kopf, §-Reihenfolge, eof, jh#-Abgleich, benannte Exporte und kein `any`.

---

## 6 · Neues Modul anlegen (Checkliste)

1. Ordner `src/modules/<modul>/` mit `<Modul>View.tsx` als Wurzel; sie rendert `<AppShell activeModule="…">`.
2. In `core/layout/modules.ts` `verfuegbar: true` setzen.
3. Domäne in `<modul>.types.ts`; gemeinsame Stammdaten-Typen gehören nach `core/domain/`.
4. Reducer + Selektoren rein halten; IDs/Zeitstempel kommen fertig in die Aktion (StrictMode ruft Reducer doppelt).
5. Nummern immer als `Typenschild`, Status immer als Kante über `--sl-status`-Klassen.
6. Mockdaten in `src/mock/`, relativ zu `MOCK_HEUTE`; Referenzen beim Start prüfen (`assertConsistent`).
7. Jede Datei: Kopf, §-Marken, eof → `npm run jh:sign && npm run jh:check`.

---

## 7 · Step 1 – Disposition (Funktionsumfang)

- **Shell:** Seitenleiste (Disposition aktiv, übrige Module «folgt»), Topbar mit Wortmarke, Datumsnavigation
  (Tag/Woche, KW), globale Suche, Mockup-Hinweis, Benutzerkürzel.
- **Einsatzplan Tag:** 6 Techniker × 07:00–18:00 im 30-min-Raster, Statuskante, Kunde (Kurzname), Ort, Gerät,
  Signal-Ecke für dringend, Mittag schraffiert, Vergangenheit abgeblendet, **Jetzt-Linie** in Orange.
  Überschneidungen werden nicht verhindert, sondern als zweite Spur + gestrichelter Rahmen sichtbar.
- **Einsatzplan Woche:** Mo–Sa, Einsätze je Zelle, Auslastung; Klick auf Tageskopf öffnet den Tag.
- **Auftragseingang:** Pendenzen (neu + Folgetermine) nach Dringlichkeit, dann ältester Eingang.
- **Drag & Drop:** Karte → Plan (Zeit am Zeiger, gerastert) · Einsatz verschieben (Griffpunkt bleibt) ·
  Einsatz → Eingang (zurückstellen) · Woche: Drop setzt auf den ersten freien Slot.
  Vorschau mit Hinweisen: Überschneidung · Vergangenheit · vor Liefertermin · über Mittag.
- **Auftrags-Drawer** (nicht-modal): Einsatz/Status setzen · Kunde & Objekt (Liegenschaft, Wohnung, Zugang, Hauswart) ·
  **Parteien: Mieter vs. Verwaltung vs. Rechnungsempfänger** · Typenschild-Platte + Fehlerbild ·
  **Status-Verlauf** angefragt → bestellt → disponiert → erledigt · **Ersatzteile** mit Liefertermin ·
  **«Folgetermin planen»** (legt eine Pendenz «ab Liefertermin» in den Eingang).
- **Slot-Vorschlag** für Pendenzen (Wartezeit + Zuschlag Region/Marke) – auch ohne Maus planbar.
- **Legende & Filter:** Techniker-Filter blendet Zeilen aus; Status- und Regionsfilter blenden Einsätze nur
  **ab** (freie Slots bleiben ehrlich sichtbar); die Region filtert zusätzlich den Eingang.
- **Undo-Protokoll** (30 Schritte).

Tastatur: **Strg/⌘ K** Suche · **Strg/⌘ Z** Rückgängig · **Esc** Drawer/Suche schliessen · **↑ ↓ ↵** in der Trefferliste.

### Mockdaten

Alles hängt am echten Datum (`MOCK_HEUTE`) – die Jetzt-Linie passt immer zum Plan.
Heute und der Eingang sind handverlesen (Glattbrugg, Opfikon, Kloten, Wallisellen, Dübendorf, Zürich-Seebach;
Miele, V-ZUG, Electrolux, Siemens, Liebherr, Asko). Die übrigen Tage füllt ein **deterministischer Generator**
(Saat = Datum + Techniker). Alle Firmen, Personen, Nummern und E-Mails (`.example`) sind **erfunden**.

---

## 8 · Offene Fragen an die Sutt AG (`jh?`)

1. Bedeutung/Belegung der Dispo-Farben heute (Papier/Excel)? – `modules/dispo/status.ts`
2. Samstag: regulärer Einsatztag oder nur Pikett? – `core/arbeitstag.tsx`
3. Mittagspause fix 12:00–13:00 oder individuell? – `modules/dispo/zeitraster.ts`
4. Regionen nach Gemeinde oder nach Tourenplan? – `core/domain/stammdaten.ts`
5. Soll-Einsatzzeit 8:30 h/Tag, Fahrzeitpauschale? – `mock/techniker.ts`
6. Nummernkreis der Aufträge (`26-04817`, jährlich fortlaufend)? – `mock/auftraege.ts`
7. Status-Phasen vollständig? Fehlt «offeriert» oder «verrechnet»? – `drawer/StatusTimeline.tsx`
8. Planen vor Liefertermin nur Hinweis oder sperren? – `modules/dispo/useDispoBoard.ts`
9. Status später aus der Techniker-App statt vom Disponenten? – `drawer/EinsatzPanel.tsx`
10. Benutzer & Anmeldung (heute fix «JH») – `core/layout/Topbar.tsx`

---

## 9 · Bewusst nicht in Step 1

Kein Backend, keine Auth, keine echten Daten, keine Persistenz (Reload = Ausgangslage), kein Routing (→ jh# 002).

/* ◆ jh · eof */
