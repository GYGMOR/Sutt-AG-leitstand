# CHANGELOG · ◆ JH · SUTT·LEITSTAND

Format: ein Abschnitt pro Revision, Bereiche wie im Commit-Stil (`dispo(kalender): … ◆`).

## rev 05 · 2026.10 · v0.5.0 – Personal: Zeiterfassung, Absenzen, Benutzer & Rollen, Einstellungen, Datenschutz

### Neu
- **Zeiterfassung** `/zeiterfassung/:id?` mit fünf Ansichten (`?ansicht=`): **Liste** (Zeitkonten des Monats), **Tag** (Zeitstrahl je Person mit Arbeits- und Pausenblöcken, Jetzt-Linie), **Woche** (ein farbiger Chip je Tag und Person – Soll erreicht · läuft · Abweichung/manuell · Regel verletzt · fehlt · Absenz · frei –, Erfasst/Erwartet, Saldo Woche, Überstunden/Kompensiert), **Monat** (Matrix Personen × Tage mit Tagessaldo, Absenzkürzel, Feiertagszeile, Soll/Ist/Saldo/Total/Ferienrest, Totalzeile), **Jahr** (Monatssaldi mit Abschlussmarke, Monate vor dem Übertrag leer). Kacheln als Sicht (Eingestempelt, Warnungen, Zu prüfen, Eingereicht, Ohne Abschluss), Zeitraum-Navigation je Ansicht, CSV je Ansicht, Klick auf Chip oder Zelle öffnet das Dossier am Tag.
- **Stempeluhr**: Pille in jeder Topbar (Kommen · Pause · Weiter · Gehen); **grosse Uhr** mit Kreis (grün Einstempeln, rot Ausstempeln, gelb Pause beenden), Sekundenzähler der heutigen Arbeit, Zonenzeit mit MEZ/MESZ, Hinweis am Umstellungstag, runde Tasten Notiz · Pause · **Nachtragen** · Einsatz, Einträge von heute – responsiv (Handy untereinander, ab 640 px Kreis links); eigenes Dossier zeigt sie, die Techniker-App bekommt den Tab **Zeit** (Uhr, Woche als Chips, Monat, letzte Tage, Nachtragen, Monat einreichen) und einen Stempelstreifen auf der Heute-Seite.
- **Zeitzone im Programm** (`core/zeitzone.ts`): Betrieb hat eine IANA-Zone (Standard `Europe/Zurich`, Einstellungen → Betrieb); Stempel entstehen in Zonenzeit, Dauern am Umstellungstag sind echt (23/25 Stunden), nächste Umstellung wird angezeigt – Regeln aus der ICU-Datenbank, keine eigene Tabelle.
- **Zeitkonto**: Tagessoll aus Arbeitszeitmodell × Pensum × Feiertag/Absenz, ArG-Hinweise (Pause 15, Ruhezeit 15a, Zeitfenster 10, Sonntag 18, Nacht 16), Korrekturen mit Grund und Spur (ArGV 1 Art. 73), Löschen als Markierung, Zeiten aus dem Einsatzplan übernehmen, Notiz/Einsatz am laufenden Eintrag, Monatsabschluss einreichen → genehmigen/zurückweisen (Vier-Augen), Gleitzeit-Saldo mit Übertrag per Stichtag.
- **Ferien & Absenzen** `/absenzen/:id?`: Liste oder Planer (Personen × Tage, Artfarben, beantragt gestrichelt), Antrag mit halbem Tag, Entscheid, Ferienkonto (Anspruch, Übertrag, bezogen, geplant, beantragt, Rest), Konflikt mit geplanten Einsätzen, Ganztag im Plan.
- **Benutzer & Rollen** `/benutzer/:bereich?`: Konten (Dossier mit **Rechte-Matrix** – aus der Rolle, Zusatz, entzogen –, Umfang eigene/Team/alle, Anbieter, Journal, Sperren), **Rollen & Rechte** (Matrix aller Rechte × Rollen), Mitarbeitende (Personalakte, Ferienkonto, Datenschutz, Auskunft nach DSG Art. 25), **Organigramm** (bestimmt den Umfang «Team»), Konto und Person anlegen/bearbeiten.
- **Einstellungen** `/einstellungen/:bereich?` (Administration): Betrieb (Firma, Kanton, Zeitzone mit aktueller Zeit und nächster Umstellung, Arbeitszeitmodell, Sitzungsablauf), Feiertage (gesetzlich je Kanton mit Osterformel, betriebliche freie Tage), **Anmeldung** (Microsoft Entra ID und Google Workspace: Tenant/Domain, Client-ID, E-Mail-Domain, Gruppen → Rolle, JIT, Umleitungs-URI, Verbindungstest, nur SSO), Datenschutz (verantwortliche Stelle, Datenkatalog mit Fristen, Löschlauf), Protokoll (Journal mit Filtern und CSV), Module (je Mandant ein-/ausschalten).
- **Anmeldung mit Geschäftskonto**: Tasten «Mit Microsoft-/Google-Konto anmelden», Mock-Dialog «Konto wählen» mit derselben Prüfung wie später gegen das ID-Token (Domain, Subject/E-Mail, Sperre, Gruppen → Rolle, JIT), «nur SSO» blendet die lokale Anmeldung aus, automatische Abmeldung nach Inaktivität.
- **Meine Daten** `/meine-daten` (Benutzermenü): Konto, Personalakte, wer meine Daten angesehen hat, Kategorien mit Fristen, Rechte (Auskunft, Berichtigung, Löschung), verantwortliche Stelle, Export als JSON.
- **Datenschutz by design** (ADR-007): Journal append-only mit Einsicht/Export/Anmeldung, Gesundheitsdaten nur mit Recht (sonst «Abwesend» – Plantafel, Dashboard, App, Zeiterfassung über `useStandFuerSicht`), Datenkatalog mit Zweck, Rechtsgrundlage, Frist, Löschart, Löschlauf, Auskunft; Konzept in `docs/datenschutz/konzept.md`.
- **Dashboard · Auswertung**: Donut «Im Dienst jetzt», Balken «Auslastung heute», Linie «Erledigte Einsätze, 28 Tage», gestapelte Säulen «Rapporte je Woche», Anteile «Einsätze nach Kategorie» – eigene Diagramm-Bausteine (`core/ui/Diagramm.tsx`: dünne Marken, leise Gitter, Tooltip, Tastatur, Tabellen-Zwilling je Karte, hell/dunkel geprüfte Palette `--sl-dv-*`).
- **Rechte** (ADR-005): Recht = Bereich:Aktion, Profile je Rolle, Zusatz/Entzug je Konto, Umfang über das Organigramm, Module dreistufig (Register, Mandant, Rolle); `useRechte()` für alle Module.
- **Mandant** (`core/mandant`): eigener kleiner Store `sl.mandant.v1`, in andere Fenster gespiegelt, «Demo zurücksetzen» stellt ihn mit.
- **Tests**: 196 vitest-Tests – neu Zeitzone (Offset, Umstellungstage, Dauer über die Umstellung), Zeit (Stempel, Soll, ArG, Umstellung), Feiertage, Absenzen, Rechte, Identität (Claims → Konto), Aufbewahrung, Modelle Zeiterfassung (Töne, Woche, Jahr, Tag), Absenzen, Benutzer, Einstellungen, Dashboard-Auswertung, Reducer Personal.
- **Docs**: `docs/design/step-4-personal.md`, ADR-005 (Rechte), ADR-006 (SSO/OIDC), ADR-007 (Datenschutz/Journal), `docs/datenschutz/konzept.md`.

### Geändert
- Stand-Format **v4**: Mitarbeitende, Konten, Absenzen, Zeiteinträge, Monatsabschlüsse und Journal im Schnappschuss; ältere Stände werden verworfen.
- Topbar mit Steckplatz (`registerTopbarExtra`) für die Stempeluhr; Benutzermenü mit «Meine Daten & Datenschutz».
- Module Zeiterfassung, Absenzen, Benutzer & Rollen, Einstellungen freigeschaltet; Sidebar, Palette und Routen folgen dem Register und den Mandanten-Freigaben.
- Mock: Personalakten mit Hierarchie, Konten mit Anbieter-Verknüpfung, Zeiten der letzten zwei Monate (mit ArG-konformen Pausen), Absenzen, Journal; Testzeit unter vitest 11:00.
- Login-Seite zeigt den Firmennamen des Mandanten.

### Offen
- `jh# 018` tzdata-Version Server/Client · `jh# 019` Stempel offline puffern · `jh# 020` echter OIDC-Ablauf · `jh# 021` serverseitiger Löschlauf · Fragen 25–31 in README §9.

## rev 04 · 2026.10 · v0.4.0 – Betrieb: Dashboard, Aufträge, Kunden, Geräte, Bilder, Lager

### Neu
- **Dashboard** `/dashboard` (Startseite für Büro und Administration): Kennzahlen als Sprungmarken – Einsätze heute, Eingang mit dringend, Konflikte, Rapporte zu prüfen und fehlend, zu verrechnen in CHF, Lieferungen überfällig/heute, Abwesende; «Im Feld jetzt» je Techniker mit Live-Puls und nächstem Einsatz, Kapazitätsband, Eingang (dringend zuerst), fällige Rapporte, Lieferungen, Abwesenheiten. Jede Zahl kommt aus dem Selektor des Moduls, das sie zeigt.
- **Aufträge** `/auftraege`: abgeleitete **Phase** (Im Eingang · Disponiert · In Arbeit · Wartet auf Teil · Rapport prüfen · Zu verrechnen · Rechnung offen · Bezahlt · Ohne Termin) als Kacheln, Filter nach Kategorie, Techniker, Region, Suche (`?suche=` aus anderen Modulen), sortierbare Tabelle, Dossier mit Einsätzen («Im Plan»), Pendenz («Planen»), Servicerapport (Freigeben · Zurück · Verrechnen), Parteien und Rechnung mit Betrag (Arbeit · Anfahrt · Teile), Gerät, Fotos, Ersatzteilen und Bestellungen («Teil bestellen»), Verlauf, Nachrichten; Bearbeiten, Kopieren, Löschen, «In den Eingang», Neuer Auftrag (Schnellerfassung).
- **Kunden & Liegenschaften** `/kunden` (Innendienst): Kacheln Alle · Verwaltungen · Private · Gewerbe · Rechnung offen, Suche über Liegenschaften und Hauswarte, Dossier mit Kontakt, Liegenschaftskarten (Hauswart, Zugang, Hinweise, Geräte je Wohnung, Aufträge), Aufträgen, offenen Rechnungen, Nachrichten; Kunde bearbeiten, Liegenschaft anlegen/bearbeiten, Hinweise pflegen, neuer Auftrag mit Vorbelegung.
- **Geräte** `/geraete`: Kartei mit Kacheln Alle · Garantie läuft · abgelaufen · Typenschild fehlt, Filter Marke/Art, Dossier mit Typenschild, Standort (Liegenschaft, Wohnung, Kunde), Einsätzen, Ersatzteil-Historie (Auftrag + Rapport), Fotos, Ereignissen; Typenschild-Vorschlag übernehmen, Gerät bearbeiten, neuer Auftrag für dieses Gerät.
- **Bilder** `/bilder`: alle Fotos aus Feld und Akte nach Tag, Kacheln Heute · Woche · Garantiefälle · Typenschilder, Filter Motiv/Techniker/Marke/Kategorie/Zeitraum, Lightbox mit Pfeiltasten und Verweisen auf Auftrag, Kunde, Gerät, Rapport.
- **Lager & Ersatzteile** `/lager` (Innendienst, ADR-004): Artikel aus dem Katalog mit Bestand Glattbrugg, Fahrzeugen, Mindestbestand und Stufe (am Lager · knapp · nicht am Lager), Bestellungen mit Liefertermin (offen · überfällig · heute · eingetroffen), **Wareneingang** (bucht ein, setzt das Teil am Auftrag auf «geliefert», zieht den Folgetermin auf heute), Stornieren, Umbuchen Glattbrugg ↔ Fahrzeug, Bestand korrigieren, Artikel bearbeiten, Fahrzeuglager je Techniker, Journal aller Bewegungen. Rapport-Abschluss bucht Verbrauch (ab Fahrzeug, eingebaut) und legt Bestellungen an.
- **Techniker-App**: Tab «Fahrzeug» mit Bestand an Bord, knappen Teilen und Lieferungen für die eigenen Aufträge; Rapport bietet Teile «im Fahrzeug» mit einem Tipp als «ab Fahrzeug» an.
- **Verweise**: Jede Nummer ist ein Sprung – Auftrag, Kunde, Gerät, Rapport, Artikel, Bestellung – aus Akte, Dossiers, Dashboard und Lightbox; Kommandopalette findet Aufträge, Kunden und Geräte von jeder Seite.
- **Verrechnung**: Rapportbetrag aus Arbeitszeit × Stundensatz, Anfahrtspauschale und eingebauten Teilen (5-Rappen-Rundung) – im Auftrag, bei Rechnungen und auf dem Dashboard (jh? Sätze).
- **Bausteine** in `core/ui`: `ModulSeite` (Liste + Dossier, schmal umschaltend), `Kacheln`, `Tabelle` (sortierbar, Tastatur, Container-Query), `Suchfeld`, `Leer`, `Verweis`, `FotoLightbox`; `ModulRoute` prüft die Rolle je Route.
- **Skills** für die Weiterarbeit: `.claude/skills/sutt-modul` (Modul anlegen) und `sutt-pruefung` (Abnahme).
- **Tests**: 114 vitest-Tests, neu für Lager-Domäne, Verrechnung, Reducer (Stammdaten, Lager), Modelle Aufträge, Kunden, Geräte, Bilder, Lager, Dashboard.

### Geändert
- Stand-Format **v2** (ADR-003): Kunden, Liegenschaften, Artikel, Bestände, Bestellungen, Bewegungen im Schnappschuss – Undo und Fenster-Spiegelung gelten auch für sie; ältere Stände werden verworfen.
- Mock: Lager aus dem Katalog (40 Artikel, Bestände, Bestellungen aus allen bestellten Teilen, Journal), Geräte werden an derselben Liegenschaft wiedergesehen (40 %), Ortsliste mit PLZ und Ortsmitte.
- Login-Weiche: Büro und Administration starten im Dashboard, Disposition in der Plantafel, Aussendienst in der App; `/` → `/dashboard`.
- Akte: Auftrag, Kunde und Gerät als Verweise; `KundenChips` auch ohne Liegenschaft; Schnellerfassung mit Vorbelegung aus Dossiers.
- `AkteFotos` nutzt die geteilte `FotoLightbox`.

### Offen
- `jh# 016` Geokodierung neuer Liegenschaften · `jh# 017` Fahrzeuglager in der App nur lesend · Fragen 18–24 in README §9.

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
