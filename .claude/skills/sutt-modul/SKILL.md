---
name: sutt-modul
description: Neues Modul im SUTT Leitstand anlegen oder erweitern – Dateischnitt, Store-Anbindung, Route, Freischaltung, Palette, Suche, Tests, Docs. Immer verwenden, wenn ein Modul aus modules.config.ts gebaut, freigeschaltet oder um Ansichten ergänzt wird.
---

# Modul anlegen – SUTT Leitstand

Ein Modul ist eine weitere Sicht auf den gemeinsamen Stand (ADR-002/003). Kein eigener Store, keine Kopie der Daten.

## 1 · Dateischnitt (`src/modules/<id>/`)

| Datei | Inhalt |
| --- | --- |
| `<Id>Page.tsx` | Modulwurzel: `initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE)` auf Modulebene, `AppShell modul={findModul('<id>')}`, Kommandos, Suchquellen, Hotkeys |
| `<id>.model.ts` | reine Fachlogik: Sichten, Zähler, Ableitungen (`buildXViews`, `xPhase`) – **ohne React, ohne DOM** |
| `<id>.model.test.ts` | vitest daneben, deutsche `describe/it`, läuft auf `testState()` aus `src/test/testdaten.ts` |
| `<Id>Dossier.tsx` | Detailansicht rechts (Kopf, Abschnitte, Aktionen) |
| `*Dialog.tsx` | Bearbeiten/Anlegen über `core/ui/Dialog` + `core/ui/Form` |
| `*.module.css` | CSS Module, Klassen kebab-case, Zugriff camelCase (`styles.listeSpalte`); dynamische Namen nur über `modulKlasse()` |

Geteilte Bausteine zuerst suchen: `core/ui/ModulSeite` (Liste + Detail), `Kacheln` (Zähler = Filter), `Tabelle`, `Suchfeld`, `Leer`, `Verweis` (Sprung zu Auftrag/Kunde/Gerät), `Chip`, `Typenschild`, `DetailZeile`, `KundenChips`, `AkteFotos`, `AkteErsatzteile`, `AkteVerlauf`, `AkteRapport`.

## 2 · Verdrahtung

1. `core/modules.config.ts`: `freigeschaltet: true`, `version` entfernen, Rollen prüfen (`INNENDIENST` vs `ALLE`).
2. `App.tsx`: Route lazy, bei Rollen-Einschränkung über `<ModulRoute id="…">`.
3. Store: neue Aktionen in `dispo.reducer.ts` (rein, `commit()` → Undo/Redo) **und** `useDispoAktionen.ts` (IDs über `nextId()`, Zeit, Protokolltext). Neue Entitäten in `Schnappschuss` + `persistenz.ts` (`STAND_VERSION` erhöhen, wenn sich das Format ändert).
4. Querverweise: aus Akte, Rapporte, App und anderen Modulen mit `Verweis` verlinken – ein Datensatz, viele Türen.
5. Palette: `useRegisterKommandos('<id>', …)` für Sichtwechsel und Aktionen; `useGlobaleSuchquellen()` für Aufträge/Kunden/Geräte.
6. Mock: Daten deterministisch (`mulberry32(seedFrom(...))`), relativ zu `MOCK_HEUTE`, in `assertConsistent` prüfen.

## 3 · Jede Datei

- Kopfkasten mit `◆ JH · 2026.10 · rev NN` (aktuelle Revision für neue **und** geänderte Dateien), Kopfzeile ≤ 68 Zeichen.
- §-Marken lückenlos ab §1, `/* ◆ jh · eof */` am Ende.
- Kommentare nur `jh›` (Entscheid), `jh!` (Warnung), `jh?` (Frage an Sutt, zusätzlich in README §9), `jh#` (To-do, zusätzlich in TODO.jh.md).
- Deutsch in der Domäne, Englisch im Code-Rahmen, kein `any`, frühe Rückgaben, keine verschachtelten Ternaries, keine Inline-Styles ausser Positionen.

## 4 · Abschluss

`README.jh.md` (§3 Struktur, §7 Funktionsumfang, §8 Innovationen, §9 Fragen, §10 Grenzen), `CHANGELOG.jh.md` (Abschnitt der Revision), `TODO.jh.md` (neue `jh#`-Nummern fortlaufend). Danach `/sutt-pruefung`.
