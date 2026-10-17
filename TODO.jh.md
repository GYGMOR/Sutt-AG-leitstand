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

## Erledigt

- [x] **jh# 002** · Routing eingeführt (react-router 7), Seitenleiste als Links · rev 02
- [x] **jh# 003** · Einsatz per Tastatur verschieben (dnd-kit KeyboardSensor, ←/→ Raster, ↑/↓ Zeile) · rev 02
- [x] **jh# 004** · Fahrzeit in Vorschlag, Puffer und Konfliktprüfung (`core/geo.ts`, `scoring.ts`) · rev 02
- [x] **jh# 005** · `tokens.dark.css` angelegt, Umschaltung im Benutzermenü · rev 02
- [x] **jh# 006** · Globaler Suchdienst über Kommandopalette und Suchquellen-Registry (`core/kommando.ts`) · rev 02
