---
name: sutt-pruefung
description: Abnahme-Prüfung für den SUTT Leitstand vor Commit oder Übergabe – Typen, Tests, Signatur, Kontrast, Build und Browser-Smoke in beiden Fenstern. Verwenden nach jeder Modul- oder Store-Änderung und vor jedem Commit.
---

# Prüfung – SUTT Leitstand

Reihenfolge einhalten; jeder Schritt muss grün sein, bevor der nächste zählt. Bash startet in dieser Umgebung nicht – PowerShell verwenden.

## 1 · Statisch

```powershell
npx tsc --noEmit
npm test
npm run jh:sign; npm run jh:check
npm run jh:contrast
npm run build
```

- `jh:check` meldet Kopfzeilen > 68 Zeichen, fehlende §-Marken, `jh#` ohne TODO-Eintrag. `jh:sign` normiert Köpfe, ersetzt aber keine Texte.
- Neue Farbpaare (Text auf Fläche) in `scripts/contrast.jh.ts` eintragen, sonst prüft niemand den Dark Mode.

## 2 · Browser-Smoke (Vorschau `leitstand`, Login `jh`, beliebiges Passwort)

Textbasiert prüfen (`get_page_text`, `read_page`, `find`), Screenshots nur zum Schluss – der eingebettete Browser liefert sie im Hintergrund oft nicht.

| Seite | Erwartung |
| --- | --- |
| `/dashboard` | Kacheln mit Zahlen, keine «NaN», Links führen in die Module |
| `/dispo/plantafel` | Konflikt-Badge, Akte mit Abschnitt Servicerapport, Benutzermenü «Demo zurücksetzen» |
| `/auftraege`, `/kunden`, `/geraete`, `/bilder`, `/lager`, `/rapporte` | Kacheln = Filter, Suche, Zeile → Detail rechts, Aktionen ändern den Stand sofort |
| `/app?als=T-MB` | Tagesleiste, Statusknopf des aktiven Einsatzes, Rapport abschliessen |
| zweites Tab | Änderung im ersten Fenster erscheint ohne Reload (Stand-Spiegelung) |

Konsole: `read_console_messages` mit Muster `Uncaught` und `Warning` muss leer sein. Zum Schluss «Demo zurücksetzen» und Viewport auf `desktop`.

## 3 · Rollen

`rw` (Büro) landet auf `/dashboard`, `mb` (Aussendienst) auf `/app`; Module mit `INNENDIENST` zeigen Aussendienst die Folgt-Seite mit Rollenhinweis.

## 4 · Übergabe

Commits im Stil `bereich(thema): kleinbuchstaben ◆` mit Trailer `Co-Authored-By`, ein Commit pro fachlichem Schritt, Docs separat. Nicht pushen, sofern nicht verlangt.
