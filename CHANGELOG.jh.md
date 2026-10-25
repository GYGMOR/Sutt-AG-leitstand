# CHANGELOG · ◆ JH · SUTT·LEITSTAND

Format: ein Abschnitt pro Revision, Bereiche wie im Commit-Stil (`dispo(kalender): … ◆`).

## rev 03 · 2026.10 · v0.3.0 – Aussendienst: Techniker-App und Servicerapport

### Neu
- **Techniker-App** `/app` (ADR-002: Route in derselben SPA, kein zweites Projekt): Login-Weiche nach Rolle, Heute-Liste mit Tagesleiste (erledigt · Einsatz · Fahrt · jetzt), Einsatzkarte mit Anruf, Route und Details, Ein-Daumen-Status «Abfahrt → Angekommen → Fertig» (56 px, ein Knopf pro Moment), «Mieter informieren» (SMS «unterwegs» mit Ankunftszeit), Einsatz-Detail (Hinweise, Kontakte, Teile, Fotos, Statusmeldungen), Woche, Banner «Plan geändert … Gesehen», Offline-Hinweis, Telefonrahmen am Desktop (`?rahmen=0` blendet aus), Innendienst sieht jeden Techniker per `?als=T-MB`.
- **Servicerapport** «in 90 Sekunden»: Zeiten aus den Statusknöpfen (Anfahrt = unterwegs → vor Ort, Arbeit = vor Ort → Fertig; 5-min-Steller), Checkliste je Geräteart, Bemerkung, Teile (eingebaut · ab Fahrzeug · bestellen), Fotos (Kamera oder Platzhalter, Motiv), Typenschild-Vorschlag (Mock-OCR) für Geräte aus der Schnellerfassung, Abschluss (erledigt · Folgetermin · Teil bestellt · nicht angetroffen) mit Folgen im Plan (Einsatzstatus, Pendenz im Eingang, Ersatzteil mit Liefertermin), Unterschrift mit dem Finger (SVG-Pfad), Speichern/Abschliessen, Mail-Vorlage, Druckansicht A4 `/rapporte/:id/druck` mit QR-Code.
- **Büro**: Modul **Servicerapporte** `/rapporte` – Kacheln Alle · Fehlend · Zu prüfen · Zu verrechnen · Verrechnet sind zugleich Filter, Suche, Rapport lesend mit Freigeben · Zurück an Techniker (mit Bemerkung) · Verrechnen · Drucken · Per Mail · Im Plan; Akte-Abschnitt «Servicerapport» (Kennzahlen, Unterschrift, Rückmeldung, dieselben Knöpfe; ohne Rapport «In der App erfassen» im zweiten Fenster); Abschnitt «Nachrichten»; SMS-Terminbestätigung statt Schloss; Konflikt-Wächter mit «Rapport fehlt» (> 1 Tag) und «Unterschrift fehlt» (> 2 Tage); Panel Erledigt mit fünf Rapportstufen.
- **Statusverlauf**: `Einsatz.verlauf[]` mit Quelle (app · buero · mock); Live-Puls, Akte-Verlauf und Rapportzeiten rechnen mit echten Zeitpunkten statt Planzeiten.
- **Persistenz** (ADR-001): Stand in `localStorage` (`sl.dispo.stand.v1`, versioniert, nur für denselben Tag gültig), 300 ms entprellt; das `storage`-Ereignis spiegelt in andere Fenster – Techniker-App und Plantafel laufen nebeneinander synchron. «Demo zurücksetzen» im Benutzermenü und in der Palette.
- **Mock-Versand**: SMS (Terminbestätigung, unterwegs, nicht angetroffen) und Mail (Rapport) mit Vorlage, editierbar vor dem Senden, Protokoll in der Akte.
- **Tests**: vitest (`npm test`), 73 Tests für Reducer, Selektoren, Konflikte, Zeitraster, Scoring, Rapport-Logik, Persistenz und App-Modell; Strategie in `docs/tests/strategie.md`, Entwurf in `docs/design/step-2-aussendienst.md`.
- **Mock**: Rapporte und Statusverläufe für erledigte Einsätze (Saat), drei Unterschriften, handverlesene Rapporte A02/A11/A30; fehlende Rapporte nur aus den letzten drei Tagen.

### Geändert
- `RapportStatus` um `freigegeben` und `verrechnet`; `Auftrag.rapportId`; der Rapport ist eine eigene Entität und spiegelt Status, Fotos und Rechnung auf den Auftrag.
- Rapport-Icon und -Ton an einer Stelle (`modules/rapport/rapportStatus.ts`) für Panel, Akte und Modul.
- `deleteAuftrag` räumt Rapporte und Nachrichten mit ab.
- IDs neuer Objekte tragen eine Fenster-Kennung (`R-Nk3f1001`): mit gespeichertem Stand und zweitem Fenster begann der alte Zähler wieder bei 1 und überschrieb Bestehendes per ID.
- Fenster-Spiegelung schreibt nur, wenn sich der Stand selbst geändert hat – kein Echo, das die jüngere Änderung des anderen Fensters überschreibt; freigegebene Rapporte nehmen kein verspätetes «Speichern» aus der App mehr an; ein erneutes Abschliessen legt keine zweite Pendenz an.
- Mindestbreite 1024 px gilt nur noch für den Leitstand (`html[data-flaeche='app']` hebt sie auf).
- `FotoKachel` und `useQrSvg` nach `core/` gezogen – Akte, Rapport und Druck teilen sie.

### Offen
- `jh# 012` Fotos nur im Fenster · `jh# 013` Offline-Warteschlange · `jh# 014` echte Typenschild-Erkennung · `jh# 015` Versionsnummer statt «letzter Schreiber gewinnt».

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
- **Mock**: 9 Techniker mit Farbe und Markenkompetenz, Koordinaten für alle Liegenschaften, Ferien/Absenzen, 11 Eingangs-Aufträge, Fotos, Rapport-/Rechnungsstatus, Gerätehistorie, Telefonbuch.
- **Qualität**: `npm run jh:contrast` prüft 44 Textpaare in beiden Modi (alle AA), `jh-sign` erweitert, `CHANGELOG.jh.md`, Footer `v0.2.0 · ◆ JH` mit Build-Datum und Commit, Screenshots aller Ansichten hell/dunkel in `docs/screenshots/`.

### Geändert
- `Einsatz`/`Pendenz` nach `core/domain/einsatz.ts` verschoben; Status-Farbklassen in `core/ui/farben`.
- Dispo-State als Store (`useSyncExternalStore`) statt `useReducer`; Reducer um Redo, Bearbeiten, Kopieren, Löschen, Sammelaktionen erweitert.
- Topbar 48 → 56 px, Seitenleiste 76 → 248/64 px, Panel 344 → 360 px.

### Nachtrag 17.10. abends – Outlook-Look
- **Farbe**: Blockflächen aus Kante × `--sl-tint-mix` (hell 30 %, dunkel 36 %) statt blasser `-bg`-Töne; Erledigt bleibt farbig (Häkchen, 90 % Deckkraft); Chips, Pillen und Avatare ziehen mit. `jh:contrast` rechnet die Mischflächen nach (61 Paare × 2 Modi, alle AA).
- **Behoben**: Farb- und Statusklassen griffen nie – Vite exportiert mit `camelCaseOnly` nur `styles.katReparatur`, der Code las `styles['kat-reparatur']`. Alle dynamischen Zugriffe laufen jetzt über `modulKlasse()` in `core/ui/cx.ts`.
- **Kalender**: Kalenderleiste mit farbigen Techniker-Chips (ein-/ausblenden, Doppelklick = nur dieser, «Alle»), Tag standardmässig nebeneinander, Arbeitswoche/Woche überlagert mit Kürzel und Technikerbalken (nebeneinander bis 3 Kalender), farbige Spaltenköpfe, Tageszeile im Split. Umschalter aus der Toolbar in die Leiste gezogen.
- **Verknüpfungen**: `Auftrag.bezugAuftragId`; Erst-/Folgetermin und Bezugsaufträge als Winkel-Linien (Plantafel, Kalender) mit Beschriftung, Pfeil-Stummel mit Datum zu anderen Tagen, Kettenglied im Block, gestrichelter Ring am Partner, Chips in der Akte, «Folgetermin … zeigen» im Wartet-Tab.
- **Ruhe**: Fahrzeit-Puffer, Mittag und «Wartet auf Teil» ohne Schraffur; Blockstufen messen die Inhaltsbreite; Toolbar-Gruppen brechen um statt abzuschneiden.
- **Mock**: Folgetermine `E-A01-F` (Do, MB) und `E-A25-F` (Di, NA); Mietgerät 26-04819 heute 14:00 bei LF mit Bezug auf 26-04788 (Eingang 11 statt 12); Bezüge 26-04782 → 26-04790 und 26-04820 → 26-04814.
- **Demo-Video** (22.10.): `npm run demo:video` – Playwright-Tour mit Mauszeiger und Untertiteln, 2½ min, VP9 ≈ 8 MB; Rohaufnahmen und Kontrollbilder sind ignoriert (`docs/demo/`).
- **Behoben** (22.10., beim Aufzeichnen gefunden): Drop-Zeit lag Stunden daneben, sobald die Plantafel beim Ziehen am Rand mitscrollte – dnd-kits Delta enthält den Scroll der Zielspur. Die Zeigerposition wird jetzt direkt mitgelesen (`DispoDnd.tsx`).

### Offen
- `jh# 001` Mitternachtswechsel · `jh# 007` OSM-Kacheln nur fürs Mockup · `jh# 008` Routing-API statt Luftlinie · `jh# 009` virtuelle Zeilen · `jh# 010` Gerätedaten nach Schnellerfassung · `jh# 011` Verknüpfungslinien auch in Monat und Mehrtages-Plantafel.

## rev 01 · 2026.10 · v0.1.0 – Disposition Mockup

- Shell, Tokens, Einsatzplan Tag/Woche, Auftragseingang mit nativem Drag & Drop, Auftrags-Drawer, Legende & Filter, Undo, Signatur-Prüfung `jh-sign`.
