# Design · Step 2 Aussendienst – Statusfluss Einsatz ↔ Servicerapport

◆ JH · 2026.10 · rev 03 · Stand vor dem Bau. Grundlage: `README.jh.md`, `docs/prompts/step-2-aussendienst.md`.

## 1 · Anforderungen

**Funktional**
- Techniker sieht seinen Tag auf dem Handy, meldet Abfahrt / Angekommen / Fertig mit einem Knopf.
- Aus «Fertig» entsteht der Servicerapport: Zeiten, Arbeiten, Ersatzteile, Fotos, Abschlussart, Unterschrift.
- Das Büro sieht denselben Rapport, gibt frei, verrechnet oder gibt ihn mit Bemerkung zurück.
- Statuswechsel erscheinen sofort im Leitstand (Live-Puls, Plantafel, Akte); fehlende Rapporte werden gemahnt.
- Mock-SMS an den Kontakt vor Ort: unterwegs, nicht angetroffen, Rapport per Mail.
- Stand überlebt den Reload; zwei Fenster (Leitstand + App) bleiben synchron.

**Nicht-funktional**
- Reines Frontend-Mockup, keine Server-Komponente, keine neuen Laufzeit-Abhängigkeiten.
- Bedienbar mit einer Hand (Touch-Ziele ≥ 44 px), Rapport in unter zwei Minuten.
- Jede Fachregel testbar ohne DOM (vitest).
- Kein Verlust an Konventionen: Store pro Modul, `core/` ohne Modul-Imports, Signatur ◆ JH rev 03.

**Constraints**
- Ein Entwicklungstag, Mockdaten hängen am echten Datum (`MOCK_HEUTE`), Reducer bleibt rein (StrictMode).
- Sitzung kennt den Techniker nur über `Benutzer.technikerId` (mb, sk); Innendienst darf die App zur Demo ansehen.

## 2 · Komponenten und Datenfluss

```
 Fenster A · Leitstand (/dispo/*, /rapporte)        Fenster B · Techniker-App (/app)
 ┌──────────────────────────────────────┐          ┌──────────────────────────────────┐
 │ Plantafel · Akte · Modul Rapporte    │          │ Heute · Einsatz · Rapport        │
 │        ▲ useDispoState()             │          │        ▲ useDispoState()         │
 └────────┼─────────────────────────────┘          └────────┼─────────────────────────┘
          │ dispatch(DispoAction)                            │ dispatch(DispoAction)
 ┌────────┴──────────────────────────────────────────────────┴─────────────────────────┐
 │ DispoStore (createStore · dispoReducer)  – ein Store pro Fenster, gleicher Reducer  │
 │   state: stammdaten · einsaetze · pendenzen · rapporte · nachrichten · protokoll    │
 └────────┬──────────────────────────────────────────────────┬─────────────────────────┘
          │ subscribe → writeStand()  (300 ms entprellt)      │
          ▼                                                   ▼
 ┌─────────────────────────── localStorage «sl.dispo.stand.v1» ────────────────────────┐
 │ { version, heute, einsaetze, pendenzen, rapporte, nachrichten, auftraege[], geraete[] }
 └─────────────────────────────────────────────────────────────────────────────────────┘
          ▲ storage-Ereignis (nur fremde Fenster) → dispatch({ kind: 'replaceStand' })
```

Beide Fenster laden denselben Mock und denselben Stand; es gibt keine Server-Wahrheit. Später ersetzt ein
API-Adapter die zwei Pfeile am unteren Rand (ADR-001), die Aktionen und die Oberflächen bleiben.

## 3 · Datenmodell

```ts
// core/domain/einsatz.ts – ergänzt
interface StatusWechsel { status: EinsatzStatus; zeitpunkt: IsoZeitpunkt; quelle: 'app' | 'buero' | 'mock' }
interface Einsatz { …; verlauf?: readonly StatusWechsel[] }     // statusSeit bleibt = letzter Wechsel

// core/domain/rapport.ts – neu
type RapportStatus = 'offen' | 'erstellt' | 'unterschrieben' | 'freigegeben' | 'verrechnet'
type Abschlussart  = 'erledigt' | 'folgetermin' | 'teil-bestellt' | 'nicht-angetroffen'
interface Zeiten { anfahrtMin; arbeitMin; pauseMin }                  // Minuten, 5er-Raster
interface Arbeitsschritt { id; text; erledigt }                     // Checkliste je Geräteart + Freitext
type TeilVerwendung = 'eingebaut' | 'fahrzeuglager' | 'bestellen'
interface RapportTeil { artikelNummer; bezeichnung; menge; verwendung }
interface Unterschrift { name; zeitpunkt; pfad }                    // pfad = SVG-Pfaddaten
interface Rapport {
  id; nummer /* R-26-00417 */; auftragId; einsatzId; technikerId;
  status: RapportStatus; zeiten; arbeiten; diagnoseCode?; bemerkung;
  teile; fotos: Foto[]; abschluss; abschlussGrund?; unterschrift?;
  erstelltAm; geaendertAm; freigegebenAm?; verrechnetAm?;
  rueckmeldung?: { bemerkung; zeitpunkt; von }                       // «zurück an Techniker»
}

// core/domain/nachricht.ts – neu (Mock-SMS/Mail)
type NachrichtArt = 'terminbestaetigung' | 'unterwegs' | 'nicht-angetroffen' | 'rapport-mail'
interface Nachricht { id; art; auftragId; einsatzId?; an; text; zeitpunkt; von }
```

**Invarianten**
- Höchstens ein Rapport pro Einsatz (`rapporte.find(r => r.einsatzId)`); `Auftrag.rapport` spiegelt den Status des
  jüngsten Rapports des Auftrags, `Auftrag.fotos` die Fotos des jüngsten Rapports (Akte liest beides wie bisher).
- `Einsatz.statusSeit` = Zeitpunkt des letzten Verlaufseintrags; Live-Puls liest nur noch `verlauf`.
- `Auftrag.rechnungStatus` wechselt nur über `verrechnenRapport` (offen → gestellt) und später Buchhaltung.

## 4 · Statusfluss

```
 Einsatz:   geplant ──Abfahrt(app)──▶ unterwegs ──Angekommen(app)──▶ vor-ort ──Fertig(app)──▶ Rapport
            ▲                                                           │
            └── moveEinsatz/assignTechniker (buero) setzt zurück        ├─ abschluss erledigt        → erledigt
                                                                        ├─ abschluss teil-bestellt   → wartet-teil + Pendenz(folgetermin, fruehestens = Liefertermin)
                                                                        ├─ abschluss folgetermin     → erledigt + Pendenz(folgetermin, Grund)
                                                                        └─ abschluss nicht-angetroffen → erledigt(0 min Arbeit) + Pendenz(neu, «erneut terminieren») + SMS-Vorlage

 Rapport:   offen ──save──▶ erstellt ──sign──▶ unterschrieben ──freigeben(buero)──▶ freigegeben ──verrechnen──▶ verrechnet
                              ▲                      │
                              └── zurueckAnTechniker(buero, Bemerkung) ◀─┘   (unterschrieben/erstellt → erstellt)
```

Regeln: Freigeben nur ab «erstellt» (Unterschrift keine Pflicht, `jh?`), Verrechnen nur ab «freigegeben»; nach
«verrechnet» ist der Rapport schreibgeschützt. Jeder Statusknopf in der App trägt Zeitpunkt und Quelle `app`.

## 5 · Aktionen im Dispo-Store (alle über `commit`, also undo-fähig und im Protokoll)

| Aktion | Auslöser | Wirkung |
| --- | --- | --- |
| `setStatus` (erweitert um `quelle`) | App-Knopf, Akte | Status + Verlaufseintrag + `statusSeit` |
| `saveRapport` | Rapport «Speichern» | Rapport anlegen/ersetzen (Status erstellt), `Auftrag.rapport/fotos` nachziehen |
| `abschliessenRapport` | Rapport «Abschliessen» | wie save + Einsatzstatus gemäss Abschlussart + Pendenz, optional Unterschrift (→ unterschrieben) |
| `freigebenRapport` · `verrechnenRapport` · `zurueckAnTechniker` | Modul Rapporte | Statuswechsel mit Zeitstempel/Bemerkung; verrechnen setzt `rechnungStatus` |
| `sendeNachricht` | App, Akte | Nachricht ins Protokoll der Akte |
| `updateGeraet` | Mock-OCR «Übernehmen» | Modell/Typ/SN des Geräts nachtragen (erledigt `jh# 010`) |
| `replaceStand` (nicht undo-fähig) | storage-Ereignis / Start | Bestand aus Schnappschuss übernehmen |
| `resetDemo` | Benutzermenü | Ausgangsbestand (Mock) wiederherstellen |

IDs, Nummern (`R-26-00xxx`, fortlaufend ab höchster vorhandener) und Zeitstempel entstehen in
`useDispoAktionen`, nie im Reducer.

## 6 · Persistenz und Zwei-Fenster-Sync

Siehe ADR-001. Kurz: Schnappschuss ohne Protokoll/Auswahl, nur gültig für `heute`; `storage`-Ereignis spiegelt
in andere Fenster; eigene Schreibvorgänge werden über den zuletzt geschriebenen String erkannt und nicht
zurückgespielt. Letzter Schreiber gewinnt – für die Demo richtig, für das Produkt übernimmt die API.

## 7 · Fehlerbilder und Grenzen

- `localStorage` fehlt/voll → Stand bleibt im Speicher, Hinweis im Benutzermenü («nicht gespeichert»).
- Zwei Fenster ändern denselben Einsatz gleichzeitig → letzter Schreiber gewinnt, kein Merge (bewusst).
- Fotos aus der Kamera werden nicht persistiert (Object-URLs) – Hinweis im Formular; Mock-Fotos bleiben SVG.
- Undo im Leitstand macht auch App-Aktionen rückgängig (gleiches Protokoll) – im Produkt getrennt zu regeln.

## 8 · Abwägungen

- **Ein Store für beide Oberflächen** statt zwei: null Duplikation der Fachlogik, Sync gratis; Preis: die App
  lädt den ganzen Dispo-Bestand (im Mock belanglos, später API-Filter nach Techniker).
- **Rapport als eigene Entität** statt Felder am Einsatz: Büro-Workflow (freigeben, verrechnen, zurück) braucht
  eigenen Status und Historie; Preis: Spiegelung nach `Auftrag.rapport/fotos` für bestehende Ansichten.
- **Unterschrift als SVG-Pfad** statt Bild: klein, skalierbar, druckbar, keine Bibliothek.

## 9 · Später (API-Skizze, nicht Teil von Step 2)

`PATCH /einsaetze/{id}/status` · `PUT /rapporte/{id}` · `POST /rapporte/{id}/unterschrift` ·
`POST /rapporte/{id}/freigabe` · `POST /nachrichten` · Push an Fenster per SSE statt `storage`.
Zu überdenken ab 20 Technikern: Bestand nach Techniker/Tag laden statt alles.
