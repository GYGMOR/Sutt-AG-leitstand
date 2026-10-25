# ADR-001: Persistenz des Mock-Stands – localStorage jetzt, API später

**Status:** Accepted · **Datum:** 2026-10-25 · **Entscheid:** ◆ JH (Projektleitung), Kunde informiert

## Kontext

Der Leitstand ist ein Frontend-Mockup ohne Backend. Jede Planänderung ging bisher mit dem Reload verloren –
für Kundendemos ein Risiko (geplanter Notfall ist nach F5 weg). Step 2 bringt eine zweite Oberfläche (Techniker-App)
im zweiten Browserfenster, die denselben Stand sehen muss. Das Produkt bekommt später eine API; der Mock-Weg darf
diese nicht vorwegnehmen, aber auch nicht im Weg stehen. Randbedingungen: keine neuen Laufzeit-Abhängigkeiten, Store
bleibt `core/store.ts` (useSyncExternalStore), Mockdaten hängen am echten Datum.

## Entscheid

Der Dispo-Stand (Einsätze, Pendenzen, Rapporte, Nachrichten, geänderte Aufträge/Geräte) wird als versionierter
Schnappschuss in `localStorage` («sl.dispo.stand.v1») gehalten, beim Start geladen, wenn das gespeicherte `heute` dem
aktuellen Datum entspricht, und per `storage`-Ereignis in andere Fenster gespiegelt. Protokoll (Undo) und Auswahl
werden nicht gespeichert. Ein «Demo zurücksetzen» stellt den Mock her. Die Anbindung ist ein Adapter neben dem Store
(`persistenz.ts`), kein Teil des Reducers.

## Optionen

### A · localStorage-Schnappschuss + storage-Ereignis (gewählt)
| Dimension | Einschätzung |
| --- | --- |
| Komplexität | niedrig – ~120 Zeilen, keine Abhängigkeit |
| Kosten | keine |
| Skalierung | bis ~5 MB; Mock liegt bei ~300 kB |
| Vertrautheit | hoch, Muster existiert (`readPersisted`) |

**Pro:** Reload-fest, Zwei-Fenster-Demo gratis, trivial zu löschen. **Contra:** letzter Schreiber gewinnt, kein Merge;
Maps müssen serialisiert werden; Fotos (Object-URLs) nicht persistierbar.

### B · IndexedDB
| Dimension | Einschätzung |
| --- | --- |
| Komplexität | mittel – asynchrone API, Schema/Versionen |
| Kosten | keine |
| Skalierung | hunderte MB, Binärdaten (Fotos) möglich |
| Vertrautheit | mittel |

**Pro:** Fotos speicherbar, grosse Bestände. **Contra:** asynchroner Start kollidiert mit synchronem Store-Init;
kein `storage`-Ereignis (BroadcastChannel nötig); für ein Mockup überdimensioniert.

### C · Nur im Speicher (Status quo)
**Pro:** nichts zu tun. **Contra:** Demo-Risiko bleibt, kein Zwei-Fenster-Sync, Techniker-App unbrauchbar.

### D · Mock-Server (json-server / MSW)
**Pro:** API-Form schon sichtbar. **Contra:** neue Abhängigkeit, zweiter Prozess, verdeckt dass es keine Wahrheit
gibt; der spätere Adapter wird ohnehin anders aussehen (Auth, Filter nach Techniker).

## Abwägung

A liefert 90 % des Nutzens von B/D für 10 % des Aufwands und hält die Architektur offen: Der Reducer kennt keine
Persistenz, Aktionen bleiben die Schnittstelle. Der spätere API-Adapter ersetzt genau zwei Funktionen
(`ladeStand`, `schreibeStand`) durch Aufrufe und Server-Push; die Oberflächen ändern sich nicht.

## Konsequenzen

- Leichter: Kundendemos, Zwei-Fenster-Vorführung, manuelles Testen über Reloads hinweg.
- Schwerer: Mock-Änderungen (neue Felder) brauchen eine `version`-Prüfung – alte Stände werden verworfen.
- Zu revidieren: sobald eine API existiert, wird `persistenz.ts` zum API-Adapter; Konfliktlösung dann serverseitig.

## Massnahmen

1. [x] `modules/dispo/store/persistenz.ts` mit `ladeStand`, `schreibeStand`, `beobachteFremdeFenster`.
2. [x] Reducer-Aktionen `replaceStand`, `resetDemo` (nicht undo-fähig).
3. [x] «Demo zurücksetzen» im Benutzermenü mit Rückfrage.
4. [ ] Beim API-Schritt: Adapter tauschen, `storage` durch Server-Push ersetzen.
