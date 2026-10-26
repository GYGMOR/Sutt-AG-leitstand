# ADR-007: Datenschutz als Mechanik – Journal im Stand, Maskierung in der Sicht, Fristen im Katalog

**Status:** Accepted
**Date:** 2026-10-26
**Deciders:** JH, Sutt AG (Fristen mit Treuhand bestätigen – jh?)

## Context

Mit Personendaten von Mitarbeitenden (Zeiten, Absenzen, Gesundheit, Konten) gelten DSG/DSV (CH) und – für EU-Bezug – die
DSGVO. Die Anforderungen lauten: Protokollierung (DSV Art. 4), Datenminimierung und Zweckbindung (DSG Art. 6), besondere
Vorsicht bei Gesundheitsdaten (DSG Art. 5 lit. c), Auskunft (DSG Art. 25 / DSGVO Art. 15), Löschung nach Fristen (DSG Art. 6
Abs. 4), keine Verhaltensüberwachung (ArGV 3 Art. 26). Das darf nicht als Policy-Dokument neben der Software liegen, sondern
muss in den Mechanismen stecken.

## Decision

- **Journal im Stand, append-only**: Jede Aktion über `commit()` schreibt einen `JournalEintrag` (wer, wann, Bereich, Art,
  Text, betroffener Datensatz, betroffene Person). «Rückgängig» löscht nichts, sondern schreibt einen Eintrag «Rückgängig: …».
  Einsicht in fremde Personendaten, Exporte, Anmeldungen und Löschläufe kommen ohne Undo hinein (`protokolliere`).
- **Maskierung in der Sicht, nicht in den Daten**: Krankheit und Unfall liegen vollständig im Stand; wer `personal:gesundheit`
  nicht hat, bekommt sie über `useStandFuerSicht` / `absenzenFuerSicht` als «Abwesend» ohne Notiz – an jeder Stelle gleich
  (Plantafel, Dashboard, App, Zeiterfassung). Eigene Daten bleiben sichtbar.
- **Datenkatalog** (`core/datenschutz/aufbewahrung.ts`) mit Zweck, Rechtsgrundlage, Betroffenen, Frist, Fristbeginn, Löschart je
  Kategorie; der Mandant darf Fristen überschreiben. Der **Löschlauf** wendet genau diese Fristen an und protokolliert das Ergebnis.
- **Auskunft** als JSON: Personalakte, Konto mit Rechten, Zeiten, Absenzen, Abschlüsse, Journal – aus einer Funktion
  (`auskunftFuer`), für die Personaladministration und unter «Meine Daten» für die Person selbst.
- **Sitzung** läuft nach Inaktivität ab (Mandant), Passwörter gibt es im Produkt nicht (ADR-006).

## Options Considered

### Option A: Kein Journal, Protokoll nur für Undo
**Cons:** DSV Art. 4 verlangt Protokollierung auch von Einsichten; Undo-Protokoll ist flüchtig.

### Option B: Separates Audit-System (später serverseitig)
**Pros:** Unveränderlich, lange Aufbewahrung. **Cons:** Im Mockup nicht vorführbar; die Regeln (was wird protokolliert) müssen
trotzdem im Client stehen.

### Option C: Journal im Stand, serverseitig archiviert (gewählt)
**Pros:** Sichtbar in Einstellungen → Protokoll und unter «Meine Daten»; dieselben Einträge wandern später in das Audit-System.
**Cons:** Browser-Stand hält nur `JOURNAL_MAX` Einträge – Archivierung ist Aufgabe der API.

## Consequences

- Das Journal gehört zum Schnappschuss (Persistenz, Fenster-Spiegelung), wächst aber bei Undo weiter – Tests vergleichen den
  Stand ohne Journal (`standOhneJournal`).
- Löschläufe im Browser betreffen Journal, Zeiten, Absenzen, Nachrichten und Einsatzverläufe; Aufträge, Rapporte und Kunden werden
  serverseitig anonymisiert (`jh# 021`).
- Offen (jh?): Fristen mit Treuhand/Rechtsberatung bestätigen, Datenschutzberater benennen, EU-Mitarbeitende (DSGVO Art. 30).

## Action Items
1. [x] Journal, Maskierung, Katalog, Löschlauf, Auskunft, Meine Daten, Protokoll-Ansicht.
2. [x] `docs/datenschutz/konzept.md` als Verzeichnis und Erläuterung.
3. [ ] Serverseitige Archivierung und Anonymisierung (API).
