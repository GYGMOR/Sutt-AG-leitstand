# Design · Step 3 Betrieb – Dashboard, Aufträge, Kunden, Geräte, Bilder, Lager

◆ JH · 2026.10 · rev 04 · Stand vor dem Bau. Grundlage: `README.jh.md`, ADR-001 bis ADR-004.

## 1 · Anforderungen

**Funktional**
- Dashboard: Tagesüberblick für Büro und Disposition – was läuft im Feld, was liegt im Eingang, was ist fällig (Rapporte, Rechnungen, Lieferungen), wo klemmt es (Konflikte, Lager).
- Aufträge: alle Aufträge von der Anfrage bis zur Bezahlung, Phase ablesbar, Dossier mit allem, was Akte und Rapport wissen, Aktionen (Bearbeiten, Kopieren, in den Eingang, Löschen, Neuer Auftrag).
- Kunden & Liegenschaften: Verwaltungen, Private, Gewerbe mit Liegenschaften, Hauswart, Zugang, Hinweisen; Geräte und Aufträge je Liegenschaft; Kontakt und Hinweise bearbeitbar; neue Liegenschaft.
- Geräte: Kartei mit Typenschild, Garantie, Standort, allen Einsätzen, Ersatzteil-Historie, Fotos; Typenschild-Vorschlag übernehmen; Gerät bearbeiten; neuer Auftrag für dieses Gerät.
- Bilder: alle Fotos aus Feld und Akte, filterbar nach Motiv, Techniker, Kunde, Marke, Zeitraum; Lightbox mit Sprung zu Auftrag, Gerät, Rapport.
- Lager & Ersatzteile: Artikel mit Bestand Glattbrugg und Fahrzeuglagern, Mindestbestand, Bestellungen mit Liefertermin, Wareneingang, Umbuchung, Journal. Rapport-Teile buchen automatisch (Fahrzeug, Lager, Bestellung); Wareneingang meldet der Dispo «Teil da».
- Alles verzahnt: jeder Datensatz ist aus jedem Modul erreichbar (Verweis), Kommandopalette findet Aufträge, Kunden, Geräte überall.

**Nicht-funktional**
- Ein Stand, ein Store, ein Reducer (ADR-003); Mock hängt am echten Datum; beide Fenster synchron (ADR-001).
- Jede Fachregel (Phase, Bestand, Betrag, Zähler) testbar ohne DOM.
- Dieselbe Formensprache wie Rapporte: Kacheln als Filter, Liste links, Dossier rechts, Verweise als Typenschilder.
- Rollen: Kunden und Lager nur Innendienst – Route und Seitenleiste zeigen die Folgt-Seite.

## 2 · Datenfluss

```
 Module (Sichten)          Dashboard · Aufträge · Kunden · Geräte · Bilder · Lager · Dispo · App · Rapporte
                                   ▲ useDispoState()  ·  dispatch(useDispoAktionen)
 Store                     DispoState = Stammdaten (techniker, auftraege, kunden, liegenschaften, geraete, artikel,
                                       absenzen) + Bestand (einsaetze, pendenzen, rapporte, nachrichten,
                                       bestaende, bestellungen, bewegungen) + protokoll (Undo) + auswahl
 Stand (ADR-001)           localStorage «sl.dispo.stand.v1» · version 2 · Spiegelung über storage-Ereignis
```

Stammdaten, die ein Modul bearbeitet (Kunden, Liegenschaften, Geräte, Artikel), wandern in den Schnappschuss – Undo/Redo
und Fenster-Spiegelung gelten damit auch für sie. Techniker und Absenzen bleiben fix (kommen in v0.5).

## 3 · Datenmodell (neu)

```ts
// core/domain/lager.ts
type LagerOrt = 'glattbrugg' | `fahrzeug:${technikerId}`
interface Artikel { artikelNummer; bezeichnung; gruppe: 'ersatzteil' | 'verbrauch' | 'zubehoer'; marke?; passtZu?; lieferant; preisChf; einheit; mindestbestand }
interface Lagerbestand { artikelNummer; ort: LagerOrt; menge }
interface Bestellung { id; nummer «B-26-00123»; artikelNummer; bezeichnung; menge; lieferant; bestelltAm; liefertermin; status: 'offen' | 'eingetroffen' | 'storniert'; auftragId?; eingetroffenAm?; von }
interface Lagerbewegung { id; zeitpunkt; art: 'wareneingang' | 'umbuchung' | 'verbrauch' | 'korrektur' | 'retoure'; artikelNummer; menge; von?; nach?; auftragId?; bestellungId?; text?; benutzer }

// core/domain/verrechnung.ts
rapportBetrag(rapport, preisVon) → { arbeitChf, anfahrtChf, teileChf, totalChf }   // Stundensatz und Pauschale: jh?

// modules/auftraege/auftraege.model.ts
type AuftragPhase = 'eingang' | 'disponiert' | 'in-arbeit' | 'wartet-teil' | 'rapport' | 'verrechnen' | 'verrechnet' | 'bezahlt' | 'ohne-termin'
```

**Wahrheit und Spiegel (ADR-004):** Die Bestellung gehört dem Lager, `Ersatzteil.status` am Auftrag ist ihr Spiegel für die
Dispo (Konflikt «Teil nicht geliefert», Wartet-Tab). Jede Aktion pflegt beide Seiten im selben `commit()`.

## 4 · Aktionen (Store)

| Aktion | Wirkung |
| --- | --- |
| `updateKunde`, `updateLiegenschaft`, `createLiegenschaft`, `updateArtikel` | Stammdaten im Schnappschuss |
| `createPendenz` | Auftrag ohne Termin zurück in den Eingang |
| `bestellen` | Bestellung offen; am Auftrag Ersatzteil «bestellt» mit Liefertermin |
| `wareneingang` | Bestellung eingetroffen, Bestand Glattbrugg +, Ersatzteil «geliefert», Pendenz «Teil da – Folgetermin planen» ab heute |
| `buchen` (Umbuchung, Korrektur, Retoure) | Bestände nach `wendeBewegungAn`, Journal |
| `stornierenBestellung` | Bestellung storniert, Ersatzteil vom Auftrag entfernt |
| `abschliessenRapport` (erweitert) | Teile «ab Fahrzeug» → Verbrauch Fahrzeuglager, «eingebaut» → Verbrauch Glattbrugg, «bestellen» → Bestellung |

## 5 · Ansichten

Alle Module teilen `ModulSeite` (Liste 360–440 px links, Dossier rechts, unter 900 px umschaltend), `Kacheln`
(Zahl = Filter), `Tabelle` (sortierbar, Zeile = Auswahl), `Suchfeld`, `Verweis`. Das Dashboard ist eine Kachelwand mit
Listen; jede Zahl ist ein Sprung in das Modul mit passender Sicht.

- **Aufträge**: Phasen-Kacheln · Tabelle (Nummer, Kunde, Ort, Gerät, Fehlerbild, Kategorie, Phase, Techniker, Termin) · Dossier mit Parteien, Gerät, Einsätzen, Rapport, Fotos, Teilen, Verlauf, Nachrichten, Rechnung.
- **Kunden**: Art-Kacheln · Tabelle (Nummer, Name, Art, Ort, Liegenschaften, Geräte, offene Aufträge, Hinweise) · Dossier mit Kontakt, Liegenschaften (Hauswart, Zugang, Hinweise, Geräte, Aufträge), Rechnungen, Nachrichten.
- **Geräte**: Kacheln (Alle, Garantie läuft, abgelaufen, Typenschild fehlt) · Tabelle (Gerät, SN, Standort, Kunde, Baujahr, Garantie, Einsätze) · Dossier mit Typenschild, Standort, Einsätzen, Teilen, Fotos, Vorschlag übernehmen.
- **Bilder**: Filterleiste · Raster nach Tag gruppiert · Lightbox mit Kontext und Verweisen.
- **Lager**: Kacheln (Artikel, knapp/leer, Bestellungen offen, überfällig, Fahrzeuge) · Bereiche Artikel / Bestellungen / Fahrzeuge / Journal · Artikel-Dossier mit Beständen je Ort, Bestellen, Umbuchen, Korrigieren, Verwendung.
- **Techniker-App**: dritter Tab «Lager» mit dem eigenen Fahrzeugbestand; Rapport bietet Teile «ab Fahrzeug» mit einem Tipp an.

## 6 · Tests

`core/domain/lager.test.ts` (Bestände, Bewegungen, Liefertermin, Überfällig), `verrechnung.test.ts`,
`auftraege.model.test.ts` (Phasen), `kunden.model.test.ts`, `geraete.model.test.ts`, `lager.model.test.ts`,
`dashboard.model.test.ts`, Reducer-Tests für Bestellen, Wareneingang, Buchen, Pendenz, Stammdaten, Persistenz v2.

## 7 · Offen / Annahmen (jh?)

Stundensatz und Anfahrtspauschale, Mindestbestände je Artikel, Lieferanten je Marke, ob das Fahrzeuglager gezählt oder
geschätzt wird, ob «Wareneingang» im Büro oder im Lager gebucht wird, Nummernkreis Bestellungen.
