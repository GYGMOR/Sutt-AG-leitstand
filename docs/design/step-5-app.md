# Step 5 · Techniker-App als eigenes Projekt · ◆ JH · rev 05

## Auftrag

Die App ist das Werkzeug des Aussendienstes – nicht ein Modul des Leitstands im Telefonrahmen. Sie muss auf Handy,
Tablet und Laptop gleich gut laufen, alles können, was draussen anfällt (Fotos, Scannen, Zeit, Tour, Fahrzeug, Absenzen,
Rapport), getrennt gehostet werden und trotzdem **komplett** mit dem Leitstand zusammenspielen: ein Stand, eine
Sitzung, dieselben Regeln. Einstellungen und Verwaltung bleiben im Leitstand.

## Entscheide (ADR-008)

| Frage | Entscheid |
| --- | --- |
| Projektstruktur | npm-Workspace `app/` mit eigenem Vite, tsconfig, index.html, Manifest; `webseite/` als drittes Gerüst |
| Geteilter Code | Alias `@sl` → `../src`: `core/*`, Dispo-Store, Mock, Modelle und Dialoge der Module; nichts kopiert |
| Gemeinsamer Stand | gleiche Origin: Build mit `base /app/`, gehostet unter `/app/`; Dev-Proxy `/app` → 5174 |
| Sitzung | `authStore` aus `@sl` liest denselben `localStorage` – Login im Leitstand gilt in der App |
| Links aus dem Leitstand | Modul `extern: true` → Vollseiten-Link in neuem Tab; Aussendienst `window.location.assign('/app/')` |
| Alte In-SPA-App | entfernt; `modules/app/app.model.ts` bleibt als gemeinsames Modell |

## Rahmen – responsiv von A bis Z

- **< 900 px** (Handy, Tablet hochkant): Kopf oben (Marke, Datum, Online-Punkt, Avatar → Profil), Inhalt, **Tabs unten**
  Heute · Tour · Zeit · Kamera · Mehr. «Mehr» öffnet ein Blatt von unten mit Scannen, Woche, Fahrzeug, Absenzen, Profil,
  hell/dunkel, Leitstand, Abmelden. Safe-area unten, 16-px-Eingaben gegen den iOS-Zoom, `touch-action: manipulation`.
- **≥ 900 px** (Tablet quer, Laptop): **Rand links** mit allen Bereichen und Firma/Version im Fuss, Inhalt bis 1120 px,
  Seiten in zwei Spalten (`zweispaltig`), Kartenraster (`karten`).
- Keine Mindestbreite, keine Telefon-Attrappe: die App füllt das Gerät, das sie hat.

## Seiten

| Seite | Route | Inhalt | Store/Modell |
| --- | --- | --- | --- |
| Anmelden | `/anmelden` | SSO-Tasten (Mock-IdP), lokal, Demo-Zugänge | `authStore`, `IdentitaetDialog` |
| Heute | `/` | Stempelstreifen, Tagesleiste, nummerierte Karten, Ein-Daumen-Status, Plan geändert | `app.model`, `setStatus` |
| Woche | `/woche` | Einsätze der Woche als Karten | `tagesZeileFuer` |
| Einsatz | `/einsatz/:id` | Karte + Fotos · Hinweise, Kontakte, Teile, Statusmeldungen, SMS | `AkteErsatzteile`, `NachrichtDialog` |
| Rapport | `/rapport/:id` | geteiltes Formular, Speichern/Abschliessen | `modules/rapport` |
| Tour | `/tour` | Stopps · Strecke · Fahrt · Einsatz, Karte mit Pins/Linie, Resttour in Maps, nächster Stopp | `tour.model` |
| Scannen | `/scannen` | `BarcodeDetector`, Handeingabe, Beispiele, Ergebnis je Art, Verlauf | `scan.model`, `verbrauchMelden`, `bestellen` |
| Kamera | `/kamera` | Einsatz, Motiv, Aufnahmen, Speichern, Typenschild lesen, Fotos der Akte | `neuesFoto`, `typenschildVorschlag`, `updateGeraet` |
| Zeit | `/zeit` | grosse Stempeluhr, Woche als Chips, Monat, Nachtragen, Einreichen | `personal.model`, `ZeitDialoge` |
| Absenzen | `/absenzen` | Ferienkonto, kommende/vergangene, beantragen/ändern/zurückziehen | `ferienkonto`, `AbsenzDialog` |
| Fahrzeug | `/fahrzeug` | Bestand an Bord, −1 Verbrauch, Nachschub, Lieferungen | `verbrauchMelden`, `bestellen` |
| Profil | `/profil` | Konto, Techniker, als Techniker ansehen, Darstellung, Installieren, Meine Daten, Abmelden | `useRechte`, `useTheme` |

## Scanner und Kamera

- Scanner: `window.BarcodeDetector` (Chrome/Edge/Android, Safari 17 mit Flag) über `getUserMedia({ facingMode: 'environment' })`,
  Erkennung alle 400 ms, Ecken und Laufline als Sucher. Ohne API oder ohne Kamera: Handeingabe und Beispielcodes aus dem Stand
  (Artikelnummer, Auftragsnummer, Rapport-URL, Seriennummer).
- `interpretiereScan()` prüft in fester Reihenfolge: Rapport-URL/-Nummer → Artikel → Auftrag (Nummer oder ID) → Gerät
  (Seriennummer) → `http`-Link → unbekannt. Jede Art hat eine Handlung; der Techniker entscheidet nicht, was ein Code «ist».
- Kamera: `<input type="file" accept="image/*" capture="environment" multiple>` – auf dem Handy öffnet das die Kamera, am
  Laptop die Dateiwahl. Vorschau als Object-URL, gespeichert wird der Foto-Datensatz am Auftrag (Bildablage: To-do 012).

## Zusammenspiel mit dem Leitstand

- Leitstand → App: Seitenleiste/Flyout/Palette (neuer Tab), Akte «Techniker-App öffnen» (`/app/?als=T-MB`), Servicerapporte
  «In der App erfassen» (`/app/rapport/<einsatz>?als=…`), Login-Weiche für Aussendienst.
- App → Leitstand: «Leitstand öffnen» im Mehr-Blatt, «Zeitkonto im Leitstand», «Meine Daten», Dashboard für Innendienst.
- Beide lesen und schreiben denselben Stand (`sl.dispo.stand.v1`, `sl.mandant.v1`) und dieselbe Sitzung; Änderungen spiegeln
  sich über das `storage`-Ereignis (ADR-001).

## Prüfung

- `npm run typecheck:alle`, `npm run test:alle` (Leitstand 196 + App 4), `npm run jh:sign && npm run jh:check`, `npm run jh:contrast`,
  `npm run build:alle`.
- Browser: `http://localhost:5173/app/` (über den Leitstand) und `http://localhost:5174/app/` (standalone) in 375 px und 1280 px;
  Handy über `http://<Laptop-IP>:5174/app/`.

## Offen

- Service Worker, Offline-Warteschlange, Push (jh# 013, jh# 019) – mit der API.
- Hosting: Static-Host mit SPA-Fallback je Pfad (`/` → `dist/`, `/app/` → `app/dist/`).
- Website `webseite/`: Inhalt, Formulare (Anfrage → Auftrag im Eingang), Terminwahl.
