# Teststrategie · SUTT Leitstand

◆ JH · 2026.10 · rev 03 · gilt ab v0.3.0

## Warum jetzt

19 000 Zeilen Fachlogik ohne Test; der Autoscroll-Fehler beim Drop (rev 02) wäre mit einem Reducer-Test aufgefallen.
Step 2 fügt Statusfluss, Rapport-Regeln und Persistenz hinzu – genau die Art Logik, die ohne Test leise kaputtgeht.

## Pyramide (bewusst nur die Basis)

```
      /  E2E  \      keine – Demo-Video + manuelle Abnahme (§11 des Prompts)
     / Integr. \     keine – Komponenten sind dünn, Logik liegt in Selektoren/Reducern
    / Unit (viel)\   vitest, reine Funktionen, ohne DOM
```

## Werkzeug

`vitest` (dev), Node-Umgebung, Konfiguration aus `vite.config.ts` (Vitest liest sie mit). `npm test` läuft einmal durch,
`npm run test:watch` beim Entwickeln. Tests liegen neben dem Modul als `*.test.ts`, tragen die ◆-Signatur und
`describe`-Namen auf Deutsch (Fachsprache), `it` beginnt mit einem Verb («setzt», «lehnt ab», «behält»).

## Was getestet wird

| Bereich | Datei | Beispiele |
| --- | --- | --- |
| Reducer | `dispo.reducer.test.ts` | planPendenz entfernt Pendenz und legt Einsatz an · moveEinsatz setzt geplant · undo/redo stellen Schnappschuss her · setStatus schreibt Verlauf · abschliessenRapport «teil-bestellt» → wartet-teil + Pendenz · freigeben nur ab erstellt · replaceStand ist nicht undo-fähig |
| Selektoren | `dispo.selectors.test.ts` | Verknüpfungen (Ersttermin/Folgetermin/Bezug) · WartetView.folgeGeplant · pulsFor aus Verlauf (vor Ort seit, überzieht) · Rapport-Zähler |
| Scoring | `scoring.test.ts` | Region +30, Zertifikat +25, Fahrzeit-Stufen, Auslastung; Stufen gut/ok/schlecht |
| Konflikte | `konflikte.test.ts` | Überschneidung einmal pro Paar · ausserhalb Arbeitszeit · Teil nicht geliefert · Rapport fehlt (> 24 h) · Unterschrift fehlt |
| Zeitraster | `zeitraster.test.ts` | assignLanes ohne/mit Überlappung · findFreeSlot im Raster · overlaps Grenzfälle (Ende = Start) |
| Rapport | `rapport.test.ts` | Zeiten aus Verlauf (Anfahrt/Arbeit) · 5-Minuten-Rundung · Nummernkreis R-26 · Vorlagen je Geräteart · Statusübergänge |
| Persistenz | `persistenz.test.ts` | Schnappschuss nur für gleiches «heute» · Maps rund-trip · eigener Schreibvorgang wird nicht zurückgespielt |
| Hilfen | `cx.test.ts`, `datum.test.ts` | modulKlasse kebab → camel · toZeitpunkt/splitZeitpunkt |

Nicht getestet: Komponenten, CSS, Routing, Drag & Drop (dnd-kit), Karten – zu teuer für ein Mockup, Abnahme per Demo.

## Abdeckungsziel

Fachlogik-Dateien (Reducer, Selektoren, Scoring, Konflikte, Zeitraster, Rapport, Persistenz) ≥ 80 % Zeilen; keine
Quote für UI. `npm test` ist Teil der Abnahme (§11), nicht Teil von `npm run build` (bewusst: Build bleibt schnell).

## Beispiel

```ts
describe('abschliessenRapport', () => {
  it('setzt den Einsatz auf «wartet auf Teil» und legt den Folgetermin ab Liefertermin an', () => {
    const state = dispoReducer(basis, aktion('abschliessenRapport', { abschluss: 'teil-bestellt', teile: [bestellt('Laugenpumpe', '2026-10-29')] }));
    expect(einsatz(state).status).toBe('wartet-teil');
    expect(state.pendenzen.at(-1)).toMatchObject({ anlass: 'folgetermin', fruehestensAm: '2026-10-29' });
  });
});
```

## Lücken, bewusst

Keine Browser-Tests für Touch-Gesten (Unterschrift, Statusknöpfe) – das prüft das Demo-Video auf dem Telefonrahmen.
Kein Vertragstest zur API – es gibt noch keine.
