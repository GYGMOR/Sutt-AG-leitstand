# TODO · ◆ JH · SUTT·LEITSTAND

Sammlung aller `jh#`-Marken im Code. Nummern sind fortlaufend und werden **nie** neu vergeben.
Erledigt → `- [x]` setzen und die Marke im Code entfernen. `npm run jh:check` gleicht beide Seiten ab.

## Offen

- [ ] **jh# 001** · `core/arbeitstag.tsx` – Mitternachtswechsel: «heute» wird beim Start fixiert. Bei offenem Leitstand über Mitternacht neu bestimmen (Timer auf 00:00).
- [ ] **jh# 007** · `modules/dispo/karte/LibreKarte.tsx` – OSM-Kacheln sind für Produktivbetrieb nicht vorgesehen (Tile Usage Policy); eigener Kachelserver oder Google-Key vor dem Rollout.
- [ ] **jh# 008** · `core/geo.ts` – Fahrzeit ist Luftlinie × 1.35: durch Routing-API (Google Distance Matrix oder OSRM) ersetzen, Signatur `(von, nach) → Minuten` bleibt.
- [ ] **jh# 009** · `modules/dispo/views/Plantafel.tsx` – Virtuelle Zeilen ab 20 Technikern (heute 9, alle gerendert).
- [ ] **jh# 010** · `modules/dispo/Schnellerfassung.tsx` – Neues Gerät legt Modell/Typ als «noch nicht erfasst» an; Typenschild-Scan (Modul Geräte) soll das nachtragen.
- [ ] **jh# 011** · `modules/dispo/views/Kalender.tsx` – Verknüpfungslinien auch im Monat und in der Mehrtages-Plantafel (heute nur Plantafel Tag und Kalender-Zeitraster; Pillen melden sich nicht bei der Block-Registry).
- [ ] **jh# 012** · `modules/rapport/RapportFormular.tsx` – Kamerafotos leben nur als Object-URL im Fenster; Bildablage (IndexedDB oder Upload) fehlt – Platzhalter werden gespeichert, echte Bilder nicht.
- [ ] **jh# 013** · `app/rahmen/AppRahmen.tsx` – Offline ist nur ein Hinweis; echte Warteschlange (Service Worker, Wiederholung) für Statusmeldungen und Rapporte.
- [ ] **jh# 014** · `modules/rapport/rapport.model.ts` – Typenschild-Vorschlag ist Mock-OCR (deterministisch pro Gerät); echte Erkennung über Kamera-API oder Modul Geräte.
- [ ] **jh# 015** · `modules/dispo/store/persistenz.ts` – «Letzter Schreiber gewinnt» zwischen Fenstern; mit echter API Versionsnummer/ETag gegen verlorene Änderungen (ADR-001).
- [ ] **jh# 016** · `modules/kunden/LiegenschaftDialog.tsx` – Neue Liegenschaften bekommen die Ortsmitte als Koordinaten; Geokodierung der Adresse folgt mit der API (Karte, Fahrzeit, Smart-Slot).
- [ ] **jh# 018** · `core/zeitzone.ts` – Server und Client müssen dieselbe IANA-Version (tzdata) nutzen, sonst rechnen App und API an einem Umstellungstag verschieden; Version der API im Mandanten anzeigen.
- [ ] **jh# 019** · `modules/personal/useStempeluhr.ts` – Stempel offline puffern: Warteschlange mit Gerätezeit, beim Senden in Zonenzeit umgerechnet (gehört zu jh# 013).
- [ ] **jh# 020** · `core/auth/IdentitaetDialog.tsx` – Echter OIDC-Ablauf (Discovery, PKCE, ID-Token gegen JWKS prüfen) statt Mock-Dialog «Konto wählen»; Zuordnung Claims → Konto bleibt `kontoAusIdentitaet()`.
- [ ] **jh# 021** · `modules/einstellungen/DatenschutzBereich.tsx` – Löschlauf serverseitig auch für Aufträge, Rapporte und Kunden (Anonymisierung nach Abschluss); der Browser-Stand kennt nur Journal, Zeiten, Absenzen, Nachrichten, Einsatzverläufe.

## Erledigt

- [x] **jh# 002** · Routing eingeführt (react-router 7), Seitenleiste als Links · rev 02
- [x] **jh# 003** · Einsatz per Tastatur verschieben (dnd-kit KeyboardSensor, ←/→ Raster, ↑/↓ Zeile) · rev 02
- [x] **jh# 004** · Fahrzeit in Vorschlag, Puffer und Konfliktprüfung (`core/geo.ts`, `scoring.ts`) · rev 02
- [x] **jh# 005** · `tokens.dark.css` angelegt, Umschaltung im Benutzermenü · rev 02
- [x] **jh# 006** · Globaler Suchdienst über Kommandopalette und Suchquellen-Registry (`core/kommando.ts`) · rev 02
- [x] **jh# 017** · Fahrzeuglager in der Techniker-App: «Verbrauch melden» (−1 ab Bord) und «Nachschub anfordern» (Bestellung) – `app/seiten/FahrzeugSeite.tsx`, `verbrauchMelden()` im Dispo-Store · rev 05
