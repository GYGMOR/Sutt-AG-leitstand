# CHANGELOG · ◆ JH · SUTT·LEITSTAND

Format: ein Abschnitt pro Revision, Bereiche wie im Commit-Stil (`dispo(kalender): … ◆`).

## rev 02 · 2026.10 · v0.2.0 – Disposition v2

### Behoben (§0 der Vorgabe)
- Einsatzkarten werden nicht mehr abgeschnitten: Container Queries wählen 3 Zeilen (≥ 140 px), 2 Zeilen (80–139 px) oder nur Kurznummer + Statusicon (< 80 px); Hovercard nach 250 ms zeigt alles.
- Jetzt-Marke überdeckt die Zeitachse nicht mehr: Uhrzeit-Pille über der Achse, Stundenlabels im Umkreis von 30 px blenden aus.
- Keine leere Fläche unter dem Plan: Zeilen verteilen sich auf 72–120 px; darunter erscheint bei Platz das Kapazitätsband.
- Mehr Farbe: Kategorien-System (8 Kategorien, getönte Fläche + kräftige Kante), Status über Icon und Muster.

### Neu
- **Shell**: Seitenleiste 248/64 px, Gruppen, Schlösser mit Popover, Minikalender, Flyout im eingeklappten Zustand, `[`; Topbar 56 px mit Kommandopalette, Konflikt-Badge, Benutzermenü.
- **Anmelden/Abmelden**: Login-Seite (geteiltes Layout), Mock-Auth ohne Passwörter, Rollen Büro / Disposition / Aussendienst / Administration, geschützte Routen mit Rücksprung, Rückfrage bei ungespeicherten Änderungen, «Sie wurden abgemeldet».
- **Routing**: `react-router` 7, Datum und Zeitraum in der URL (`/dispo/plantafel?d=2026-10-17&v=woche`), Folgt-Seiten für gesperrte Module.
- **Ansichten**: Plantafel (Tag · 3 Tage · Arbeitswoche · Woche), Kalender (Tag · Arbeitswoche · Woche · Monat, Nebeneinander pro Techniker, Ganztag-Leiste, «+n weitere»), Liste (sortieren, gruppieren, Spalten, Mehrfachauswahl mit Sammelaktionen), Karte (nummerierte Pins, Touren pro Techniker).
- **Zoom** 15 / 30 / 60 min, auch per Strg + Mausrad; Arbeitszeit hervorgehoben, Randzeiten gedimmt und scrollbar.
- **Rechtes Panel**: Tabs Eingang / Wartet auf Teil / Erledigt (mit Rapport- und Rechnungsstatus), Ziehgriff 300–520 px, `]`, 40-px-Schiene mit Zählern, Suche im Panel.
- **Akte** mit Kartenkopf (Google → MapLibre/OSM → Schemakarte), Route-Link, Vergrössern, Fahrzeit vom Vorgänger, Detailzeilen (Icon · Wert · Label), Kontakte mit `tel:`, Typenschild mit Hersteller-Kennung, frühere Einsätze am Gerät, Fotos mit Lightbox, Ersatzteile, Verlauf, Aktionen (Bearbeiten · Kopieren · Verschieben · Folgetermin · 🔒 Servicerapport · 🔒 SMS · Löschen mit Dialog).
- **Innovationen**: Smart-Slot beim Ziehen, Fahrzeit-Puffer mit Konfliktmarke, Konflikt-Wächter, Ersatzteil-Kopplung (3 Slots ab Liefertermin), Kommandopalette `Strg+K`, Kapazitätsband (Woche als Heatmap), Telefon-Schnellerfassung `N`, Live-Puls, Undo/Redo mit Protokoll, Tagesplan drucken mit QR-Code, Kunden-Info-Chips.
- **Drag & Drop** auf `@dnd-kit/core`: Zeiger und Tastatur (Leertaste aufnehmen, Pfeile bewegen, ↵ ablegen), Vorschau mit Begründung.
- **Dark Mode** (`tokens.dark.css`), Umschaltung im Benutzermenü; Header bleibt Anthrazit.
- **Mock**: 9 Techniker mit Farbe und Markenkompetenz, Koordinaten für alle Liegenschaften, Ferien/Absenzen, 12 Eingangs-Aufträge, Fotos, Rapport-/Rechnungsstatus, Gerätehistorie, Telefonbuch.
- **Qualität**: `npm run jh:contrast` prüft 44 Textpaare in beiden Modi (alle AA), `jh-sign` erweitert, `CHANGELOG.jh.md`, Footer `v0.2.0 · ◆ JH` mit Build-Datum und Commit, Screenshots aller Ansichten hell/dunkel in `docs/screenshots/`.

### Geändert
- `Einsatz`/`Pendenz` nach `core/domain/einsatz.ts` verschoben; Status-Farbklassen in `core/ui/farben`.
- Dispo-State als Store (`useSyncExternalStore`) statt `useReducer`; Reducer um Redo, Bearbeiten, Kopieren, Löschen, Sammelaktionen erweitert.
- Topbar 48 → 56 px, Seitenleiste 76 → 248/64 px, Panel 344 → 360 px.

### Offen
- `jh# 001` Mitternachtswechsel · `jh# 007` OSM-Kacheln nur fürs Mockup · `jh# 008` Routing-API statt Luftlinie · `jh# 009` virtuelle Zeilen · `jh# 010` Gerätedaten nach Schnellerfassung.

## rev 01 · 2026.10 · v0.1.0 – Disposition Mockup

- Shell, Tokens, Einsatzplan Tag/Woche, Auftragseingang mit nativem Drag & Drop, Auftrags-Drawer, Legende & Filter, Undo, Signatur-Prüfung `jh-sign`.
