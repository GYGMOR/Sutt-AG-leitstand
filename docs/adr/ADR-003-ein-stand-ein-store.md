# ADR-003: Ein Stand, ein Store – Module als Sichten auf den gemeinsamen Zustand

**Status:** Accepted
**Date:** 2026-10-25
**Deciders:** JH (Mockup-Architektur), Sutt AG (fachliche Abnahme)

## Context

Mit v0.3 teilen sich Plantafel, Techniker-App und Rapporte bereits einen Store (`modules/dispo/store`), gespiegelt über
`localStorage` (ADR-001, ADR-002). Für v0.4 kommen sechs Module dazu, die dieselben Entitäten lesen **und** bearbeiten:
Aufträge, Kunden & Liegenschaften, Geräte, Bilder, Lager, Dashboard. Kunden und Liegenschaften waren bisher feste
Stammdaten ausserhalb des Schnappschusses; Lagerdaten gab es nicht.

## Decision

Es bleibt bei **einem** Store und **einem** Reducer. Alle bearbeitbaren Entitäten – Aufträge, Geräte, Kunden,
Liegenschaften, Artikel, Einsätze, Pendenzen, Rapporte, Nachrichten, Bestände, Bestellungen, Bewegungen – liegen im
`Schnappschuss`. Damit gelten Undo/Redo, Protokoll und Fenster-Spiegelung für jede Änderung aus jedem Modul.
Techniker und Absenzen bleiben feste Stammdaten, bis v0.5 (Personal) sie bearbeitbar macht.

Der Store bleibt physisch in `modules/dispo/store/`; ein Umzug nach `modules/betrieb/` ist reine Dateiverschiebung und
lohnt sich erst, wenn die API-Anbindung (ADR-001) ohnehin jede Importzeile anfasst.

## Options Considered

### Option A: Ein Store (gewählt)
| Dimension | Assessment |
| --- | --- |
| Complexity | Low – bestehende Muster (`commit()`, Selektoren, Aktionen) |
| Cost | Schnappschuss und Stand wachsen (Stand v2) |
| Scalability | Ausreichend für Mock und erste API-Phase; später Teil-Stände je Modul |
| Team familiarity | High – alles wie bisher |

**Pros:** Querverweise und Rückkopplungen (Rapport → Lager → Dispo) sind einfache Reducer-Fälle; ein Undo für alles.
**Cons:** Der Reducer wird gross; jede Modulwurzel initialisiert denselben Store.

### Option B: Store pro Modul mit Ereignisbus
| Dimension | Assessment |
| --- | --- |
| Complexity | High – Konsistenz zwischen Stores, Reihenfolgen, doppelte Wahrheit |
| Cost | Viel Klebstoff für ein Mockup |
| Scalability | Besser isolierbar, aber erst mit echter API sinnvoll |
| Team familiarity | Low |

## Consequences

- Stand-Format steigt auf **Version 2**; alte Stände werden verworfen (Mock lädt neu – kein Datenverlust, nur Demo-Stand).
- Neue Aktionen folgen dem Muster `useDispoAktionen` (IDs, Zeit, Protokolltext) → Reducer (rein) → `commit()`.
- Selektoren je Modul liegen in `modules/<id>/<id>.model.ts`, nicht im Dispo-Selektor-Sammelmodul.

## Action Items
1. [x] Schnappschuss und Stand v2 um Kunden, Liegenschaften, Artikel, Bestände, Bestellungen, Bewegungen erweitern.
2. [x] Mock liefert Lagerdaten deterministisch (`mock/lager.ts`).
3. [ ] Beim API-Schnitt (ADR-001) Store nach `modules/betrieb/` verschieben.
