# ADR-004: Lager-Kopplung – Bestellung als Wahrheit, Ersatzteil am Auftrag als Spiegel

**Status:** Accepted
**Date:** 2026-10-25
**Deciders:** JH, Sutt AG (Lagerprozess ist zu bestätigen – jh?)

## Context

Ersatzteile tauchen an drei Stellen auf: am Auftrag (`Ersatzteil.status`, Liefertermin – Grundlage für Konflikt
«Teil nicht geliefert» und den Wartet-Tab), im Servicerapport (`RapportTeil.verwendung`: eingebaut, ab Fahrzeug,
bestellen) und neu im Lager (Bestände je Ort, Bestellungen, Journal). Ohne klare Zuständigkeit entstehen drei Wahrheiten.

## Decision

- **Bestellung** ist der Datensatz des Lagers. Sie entsteht aus dem Rapport (Verwendung «bestellen»), aus der Dispo
  (Bearbeiten-Dialog, Schnellerfassung) oder im Lager (Auffüllen).
- **`Ersatzteil.status`** am Auftrag ist der Spiegel für die Disposition: `bestellt` solange die Bestellung offen ist,
  `eingetroffen` nach dem Wareneingang, `ab-lager` wenn das Teil aus Glattbrugg oder dem Fahrzeug kommt.
- **Bestände** ändern sich nur über Bewegungen (`wendeBewegungAn`): Wareneingang, Umbuchung, Verbrauch, Korrektur,
  Retoure. Das Journal ist damit vollständig.
- **Rapport-Abschluss** bucht: «ab Fahrzeug» → Verbrauch Fahrzeuglager des Technikers, «eingebaut» → Verbrauch
  Glattbrugg, «bestellen» → neue Bestellung mit Liefertermin (+3 Arbeitstage, jh?) am Auftrag.
- **Wareneingang** setzt die Bestellung auf eingetroffen, bucht in Glattbrugg ein, spiegelt `eingetroffen` an den
  Auftrag und zieht die Folgetermin-Pendenz auf «ab heute» mit Hinweis «Teil da».

## Options Considered

### Option A: Bestellung führt, Auftrag spiegelt (gewählt)
**Pros:** Lager hat ein eigenes Journal und Zähler; Dispo-Logik bleibt unverändert (liest weiter den Spiegel).
**Cons:** Zwei Felder pro Aktion pflegen – gelöst, weil beides im selben `commit()` passiert.

### Option B: Nur `Ersatzteil` am Auftrag, Lager rechnet daraus
**Pros:** Ein Feld.
**Cons:** Kein Journal, keine Auffüll-Bestellungen ohne Auftrag, Bestände nicht herleitbar.

### Option C: Nur Lager, Dispo liest das Lager
**Pros:** Eine Wahrheit.
**Cons:** Konflikt-Wächter, Wartet-Tab, Slot-Vorschläge und Tests müssten umgebaut werden.

## Consequences

- Bestände dürfen nicht negativ werden; Verbrauch ohne Bestand wird auf 0 gekappt und im Journal vermerkt.
- Mock erzeugt Bestellungen aus allen `bestellt`/`eingetroffen`-Teilen und Verbrauch aus allen erledigten Einsätzen mit
  `ab-lager`-Teilen – Lagerzahlen passen zur Plantafel.
- Offen (jh?): Wer bucht Wareneingang (Büro oder Lager), ob Fahrzeuglager gezählt wird, Mindestbestände je Artikel.

## Action Items
1. [x] `core/domain/lager.ts` mit Orten, Artikel, Bestand, Bestellung, Bewegung, `wendeBewegungAn`.
2. [x] Reducer-Aktionen `bestellen`, `wareneingang`, `buchen`, `stornierenBestellung`; Rapport-Abschluss erweitert.
3. [ ] Mit Sutt den Lagerprozess abgleichen (Fragen in README §9).
