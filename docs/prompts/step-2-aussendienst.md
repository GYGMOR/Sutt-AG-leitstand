# SUTT Leitstand – Prompt Step 2 (Aussendienst: Techniker-App & Servicerapport)

> Ziel v0.3.0 · rev 03. Arbeite im bestehenden Projekt `D:\Joel\SuttiAG-Webapplikation`. Lies zuerst
> `README.jh.md` (Bauplan, Konventionen), `CHANGELOG.jh.md`, `TODO.jh.md`, `src/core/modules.config.ts`
> und `src/modules/dispo/` – erweitern, nicht ersetzen. Weiterhin reines Mockup: kein Backend, keine echten
> Daten, Mock-Auth ohne Passwörter. Qualitätslatte bleibt «besser als onDispatch/Outlook»; Massstab für
> die Techniker-App: so einfach wie WhatsApp, so verbindlich wie ein unterschriebener Zettel.

## §0 · Regeln (gelten für jede Datei)

- Signatur ◆ JH: Kopf-Box, §-Marken lückenlos, `/* ◆ jh · eof */`, Präfixe jh›/jh!/jh?/jh#. **Jede neue und jede
  geänderte Datei bekommt `rev 03`.** Neue `jh#`-Nummern ab 012, in `TODO.jh.md` eintragen.
- Dynamische CSS-Klassen nur über `modulKlasse(styles, 'kebab-name')` (`core/ui/cx.ts`) – `camelCaseOnly`.
- `core/` importiert nie aus `modules/` oder `mock/`; Mock wird in `main.tsx` bzw. an der Modulwurzel eingehängt.
- Domänentypen deutsch (`Rapport`, `Arbeitsschritt`, `Unterschrift`), Code englisch; keine `any`, frühe Returns,
  keine verschachtelten Ternaries, keine Inline-Styles ausser Positionen.
- Neue Abhängigkeiten nur: `vitest` (dev). Unterschrift, Fotos, Kamera, Offline-Hinweis werden ohne Bibliothek gebaut.
- Commit-Stil `bereich(thema): kleinbuchstaben ◆`, Trailer `Co-Authored-By` wie bisher; CHANGELOG-Abschnitt
  `rev 03 · 2026.10 · v0.3.0 – Aussendienst`; `package.json` auf 0.3.0; Footer zeigt `v0.3.0 · ◆ JH`.
- Bei Unklarheiten zu Sutt-Abläufen: `// jh?` setzen, sinnvoll annehmen, weiterarbeiten – nie blockieren.
- Kein KI-Ton, keine Platzhaltertexte, keine Emojis im Code. Schweizer Schreibweise (ss).

## §1 · Warum dieser Schritt

Die Disposition ist gebaut; was fehlt, ist die andere Hälfte des Prozesses: **der Techniker vor Ort**.
Heute sind Live-Puls, Fotos, Rapport- und Rechnungsstatus im Mock nur gewürfelt. Step 2 schliesst den Kreis:
Disponent plant → Techniker fährt, meldet Status, schreibt den Rapport mit Fotos und Unterschrift → Büro sieht
Rapport und Rechnungsstatus, Konflikt-Wächter mahnt fehlende Rapporte. Damit bekommt der Kunde (Sutt AG) beide
Perspektiven in einer Demo – Büro und Fahrzeug – und die offenen Fragen zu Rapportpflicht, Unterschrift,
Fotos und Zeiterfassung werden anhand eines klickbaren Vorschlags entschieden statt abstrakt diskutiert.

## §2 · Techniker-App (Handy, Rolle Aussendienst)

- Route `/app` (Login mit `mb` oder `sk` landet dort; Innendienst-Rollen bleiben im Leitstand, sehen die App
  aber über das Benutzermenü «Als Techniker ansehen»). Layout für 375–430 px, Touch-Ziele ≥ 44 px, eine Hand.
  Auf dem Desktop erscheint `/app` in einem Telefonrahmen (`?rahmen=1`), damit sie in Demo und Video neben der
  Plantafel steht. Modul-Register um `app` (Gruppe `disposition`, freigeschaltet, Rollen alle) ergänzen.
- **Heute**: Einsätze des Technikers in Reihenfolge, jede Karte mit Zeit, Kunde, Adresse, Gerät, Fehlerbild,
  Fahrzeit zum nächsten, Kontakt (tel:), Route (Google-Maps-Link wie im Druck), Kunden-Info-Chips (Schlüssel,
  Hund, Parkieren). Kopf: Datum, Techniker, Fahrzeug, «3 von 5 erledigt», Summe Fahrzeit.
- **Ein-Daumen-Status**: ein grosser Knopf pro Phase – Abfahrt (→ unterwegs), Angekommen (→ vor Ort),
  Fertig (→ Rapport). Jeder Wechsel setzt einen Zeitstempel (`Einsatz.verlauf[]`, neu) und speist den Live-Puls
  im Leitstand **echt** (gleicher Store; über zwei Browserfenster per `storage`-Ereignis synchron, §5).
- **Unterwegs**: «Mieter informieren» erzeugt eine Mock-SMS «Techniker Marco Brunner ist unterwegs, Ankunft
  ca. 13:40» (Vorschau, Protokoll im Auftrag; kein Versand) – der 🔒 SMS-Knopf in der Akte wird damit frei.
- Morgen/Woche nur als Liste (keine zweite Plantafel). Absenzen des Technikers als Hinweis. Offline-Hinweis als
  Banner, wenn `navigator.onLine` false; Änderungen bleiben lokal (Mock) – `jh?` wie Sutt das heute löst.
- Benachrichtigung (Mock): verschiebt die Dispo einen heutigen Einsatz, zeigt die App beim nächsten Laden
  «Plan geändert: 14:30 → 15:00» mit Bestätigen.

## §3 · Servicerapport (vor Ort, in 90 Sekunden)

- Aus «Fertig» öffnet sich der Rapport, **vorbefüllt** aus Auftrag und Gerät: Nummer `R-26-00417` (Nummernkreis
  `jh?`), Kunde, Objekt, Gerät mit SN, Fehlerbild, geplante Zeit, Ersatzteile des Auftrags, Techniker.
- Abschnitte in dieser Reihenfolge, jeder in einer Karte, alle auf einer scrollenden Seite:
  1. **Zeiten**: Anfahrt (aus Abfahrt/Angekommen), Arbeit (Angekommen/Fertig), Pause; korrigierbar in 5-Minuten-
     Schritten; Summe als Verrechnungsbasis.
  2. **Arbeiten**: Checkliste nach Gerätetyp (z. B. Waschmaschine: Laugenpumpe, Türverriegelung, Heizstab,
     Probelauf) + Freitext; Diagnose-Code (Fehlercode des Geräts) als Chip.
  3. **Ersatzteile**: aus dem Auftrag übernommen, Status pro Teil: eingebaut / ab Fahrzeuglager / **bestellen** →
     setzt den Einsatz auf «wartet auf Teil» und legt den Folgetermin als Pendenz an (bestehende
     Ersatzteil-Kopplung nutzen, `onRequestFolgetermin`). Manuelle Zeile «Teil ohne Nummer».
  4. **Fotos**: 4er-Raster, Kamera/Upload (`<input type="file" accept="image/*" capture>`), Motiv wählen
     (Typenschild, Schaden, Einbau, Übersicht), Vorschau per Object-URL, im Mock werden hochgeladene Bilder nicht
     persistiert (Hinweis). Innovation: Motiv «Typenschild» schlägt per Mock-OCR Modell/SN vor, wenn das Gerät
     noch «nicht erfasst» ist (`jh# 010` damit erledigen).
  5. **Abschluss**: Erledigt · Folgetermin nötig (Grund) · Teil bestellt · Nicht angetroffen (→ Pendenz «erneut
     terminieren», SMS-Vorlage «Wir haben Sie nicht angetroffen»).
  6. **Unterschrift**: Canvas mit Finger/Maus, Name der unterzeichnenden Person (vorbefüllt mit Kontakt vor Ort),
     Datum/Ort automatisch; «Rapport per Mail an Mieter» als Mock-Versand; ohne Unterschrift ist «Abschliessen»
     erlaubt, aber der Rapport bleibt «erstellt» statt «unterschrieben» (`jh?` Pflicht?).
- **Druckansicht** `/rapporte/:id/druck` analog `TechnikerDruck`: A4, Sutt-Kopf, alle Abschnitte, Fotos als
  Kacheln, Unterschrift als Bild, QR auf die Akte. Lazy-Route.
- Domäne (`core/domain/rapport.ts`): `Rapport`, `RapportStatus` erweitern (`offen · erstellt · unterschrieben ·
  freigegeben · verrechnet`), `Arbeitsschritt`, `Zeitblock`, `Unterschrift`, `Abschlussart`; `Einsatz.verlauf`
  (Statuswechsel mit Zeitstempel); `Auftrag.rapportId`. Reducer-Aktionen im Dispo-Store: `setStatusMitZeit`,
  `saveRapport`, `signRapport`, `freigebenRapport`, `verrechnen`; alles undo-fähig, alles im Protokoll.
- Mock: Rapporte für alle erledigten Einsätze der letzten zwei Wochen aus dem Generator (deterministisch, Saat),
  drei handverlesene mit Fotos, Unterschrift und Ersatzteilen (A02, A11, A30), ein unterschriebener mit Mängeln
  («Probelauf i. O., Türgummi nachbestellen»).

## §4 · Rückkopplung ins Büro

- **Modul `rapporte` freischalten** (`/rapporte`): Liste mit Tabs offen / erstellt / unterschrieben / freigegeben /
  verrechnet, Filter Techniker/Zeitraum, Suche; Zeile → Rapport-Ansicht (dieselbe Komponente wie die App, nur
  lesend) mit Aktionen «Freigeben», «Verrechnen» (setzt `rechnungStatus`), «Zurück an Techniker» mit Bemerkung.
- **Akte**: Abschnitt «Rapport» statt 🔒 – Status, Zeiten, Arbeiten, Teile, Fotos (echt aus dem Rapport),
  Unterschrift-Miniatur, Knopf «Rapport öffnen»; Verlauf zeigt die echten Statuszeiten.
- **Live-Puls** rechnet mit `Einsatz.verlauf` statt Mock-Ableitung; «überzieht» kommt aus echten Zeiten.
- **Konflikt-Wächter**: neue Art «Rapport fehlt» (erledigt, älter als 24 h, kein Rapport) und «Unterschrift fehlt».
- **Panel Erledigt**: Rapport-Chip verlinkt in den Rapport; Rechnungsstatus «verrechnet» aus §4-Aktion.
- **Dashboard-Kachel** noch nicht (v0.4) – aber die Zähler «Rapporte offen / fällige Rechnungen» als Selektoren
  bereits bereitstellen, damit das Dashboard sie später nur noch rendert.

## §5 · Mock-Persistenz & Zwei-Fenster-Demo

- Dispo-Store (Einsätze, Pendenzen, Rapporte, Protokoll) als Schnappschuss in `localStorage` (`sl.dispo.stand.v1`),
  versioniert, beim Start geladen, wenn `MOCK_HEUTE` gleich geblieben ist – sonst verworfen (Daten hängen am Datum).
- `storage`-Ereignis spiegelt Änderungen in andere Fenster: Plantafel links, Techniker-App rechts, Status springt.
- «Demo zurücksetzen» im Benutzermenü (Rückfrage) stellt den Ausgangsbestand her.
- ADR (siehe §10, Skill `engineering:architecture`): warum `localStorage` jetzt, welche API-Schnittstelle später
  dieselben Aktionen bedient (`core/store.ts` bleibt, Persistenz-Adapter wird getauscht).

## §6 · Tests (erstmals)

- `vitest` als Dev-Abhängigkeit, `npm test`, läuft in `npm run build` nicht mit (bewusst), aber in `jh:check`-Doku.
- Pflichttests: `dispo.reducer` (plan/move/undo/redo, Rapport-Aktionen), `dispo.selectors` (Verknüpfungen,
  Wartet-Views, Puls aus Verlauf), `scoring`, `konflikte` (neue Arten), `zeitraster` (Lanes, Raster), `rapport`-Logik
  (Zeiten, Abschlussarten, Nummernkreis), `modulKlasse`. Ziel: jede Fachregel hat einen Test, keine UI-Tests.
- Teststrategie vorab mit Skill `engineering:testing-strategy` festhalten (`docs/tests/strategie.md`, kurz).

## §7 · Gestaltung

- Dieselbe Sprache wie der Leitstand (`README §4`): Anthrazit/Orange, Kategorie-Flächen, Messmarke, IBM Plex.
  Mobile: Grundschrift 16 px, Karten mit 12 px Abstand, Statusknopf 56 px hoch, volle Breite, Signal nur für die
  eine primäre Aktion. Dark Mode via vorhandenes `tokens.dark.css`; Kontrast-Script um die neuen Paare ergänzen.
- Unterschriftsfläche hell mit Hairline, Linie und «×»; Rapport-Druck wie `TechnikerDruck`.
- Keine Hero-Flächen, keine Illustrationen, kein Onboarding-Geplapper. Leere Zustände sagen, was zu tun ist.

## §8 · Innovationen (je ein «Warum»-Absatz im README §8, Nummern 14 ff.)

14. **Ein-Daumen-Status mit echten Zeiten** – Fahr- und Arbeitszeit entstehen aus den Statusknöpfen, nicht aus
    Nachtragen. 15. **Rapport in 90 Sekunden** – alles vorbefüllt, nur bestätigen. 16. **Teil fehlt → Kreis schliesst
    sich** – «bestellen» im Rapport erzeugt Wartet-auf-Teil und Folgetermin-Vorschlag ab Liefertermin.
17. **Typenschild-Foto schlägt Gerätedaten vor** (Mock-OCR). 18. **Zwei-Fenster-Live** – Büro sieht den Status-
    wechsel im selben Moment. 19. **Nicht angetroffen** als eigener Abschluss mit SMS-Vorlage und Pendenz.

## §9 · Skills und Werkzeuge – wann was

| Phase | Skill / Werkzeug | Ergebnis |
| --- | --- | --- |
| 0 Entwurf | `engineering:system-design` | `docs/design/step-2-aussendienst.md`: Statusfluss Einsatz ↔ Rapport, Datenmodell, Aktionen |
| 0 Entwurf | `engineering:architecture` | `docs/adr/ADR-001-persistenz-mock-zu-api.md`, `ADR-002-techniker-app-als-route.md` (statt zweiter App) |
| 0 Entwurf | `engineering:testing-strategy` | `docs/tests/strategie.md` |
| 1–6 Bau | `run` / Browser-Pane | nach jedem Schritt im Browser prüfen; Handy mit `resize_window` Preset `mobile` **und** Desktop |
| 7 Abschluss | `code-review` (hoch), `simplify` | Befunde beheben, nicht nur auflisten |
| 7 Abschluss | `security-review` | Rollen/Routen (`/app`, `/rapporte`), Datei-Upload, `tel:`/`mailto:`-Links, localStorage |
| 7 Abschluss | `engineering:documentation` | README §7/§8/§11, CHANGELOG rev 03, TODO |
| 7 Abschluss | `npm run demo:video` erweitern | zweite Tour «Technikertag» (Telefonrahmen): Status, Rapport, Unterschrift, Büro sieht es |

Subagenten nur für wirklich unabhängige Teile (Tests schreiben, Mock-Rapporte generieren) – UI und Store bleiben
in einer Hand. Nach jedem Schritt: `npm run jh:sign && npm run jh:check && npm run jh:contrast && npm test && npm run build`.

## §10 · Vorgehen (jeder Schritt endet mit «→ zeigen»: Screenshot hell/dunkel, Handy + Desktop)

0. Entwurf (§9, Phase 0) – Design-Doc, zwei ADRs, Teststrategie. → zeigen (Dokumente, keine UI).
1. Domäne, Reducer-Aktionen, Selektoren, Mock-Rapporte, Tests grün. → zeigen (Testlauf, Protokoll).
2. Techniker-App: Login-Weiche, `/app` Heute-Liste, Einsatzkarte, Status-Knöpfe, Live-Puls echt. → zeigen.
3. Rapport-Formular mit Zeiten, Arbeiten, Teilen, Fotos, Unterschrift, Abschlussarten; Druckansicht. → zeigen.
4. Büro: Modul Rapporte, Akte-Abschnitt, Konflikt-Arten, Panel Erledigt. → zeigen.
5. Persistenz + Zwei-Fenster-Demo + «Demo zurücksetzen». → zeigen (zwei Fenster nebeneinander).
6. Mock-SMS (unterwegs, nicht angetroffen, Rapport per Mail) mit Vorschau und Protokoll. → zeigen.
7. Abschluss: Reviews (§9), Signaturen, Kontrast, Build, Screenshots in `docs/screenshots/` (`hell-app-*`,
   `dunkel-app-*`, `hell-rapport-*`), Demo-Video mit zweiter Tour, README/CHANGELOG/TODO, Memory-Notiz, Commits.

## §11 · Abnahme (muss alles stimmen)

- `tsc` 0 Fehler · `jh:check` ok · `jh:contrast` alle AA · `npm test` grün · `npm run build` ok.
- Als `mb` angemeldet: Heute-Liste, Abfahrt → Angekommen → Fertig → Rapport → Unterschrift → Abschliessen in
  unter 2 Minuten ohne Tastatur ausser Freitext; Plantafel im zweiten Fenster zeigt jeden Status sofort.
- «Teil bestellen» im Rapport erzeugt Wartet-auf-Teil + Folgetermin-Pendenz; «Folgetermin ab Liefertermin
  vorschlagen» funktioniert darauf.
- Modul Rapporte: Freigeben → Verrechnen setzt Rechnungsstatus; Akte zeigt Rapport und echte Fotos.
- Konflikt-Wächter meldet «Rapport fehlt»; Undo nimmt Rapport-Aktionen zurück; Reload behält den Stand;
  «Demo zurücksetzen» stellt ihn her.
- Keine Datei ohne `rev 03`, wenn sie angefasst wurde; keine `styles['kebab']`-Zugriffe; keine neuen Abhängigkeiten
  ausser `vitest`.

## §12 · Offene Fragen an die Sutt AG (als `jh?` im Code, Liste in README §9 ergänzen)

Rapportpflicht und Unterschrift (immer? nur bei Verrechnung an Mieter?) · Nummernkreis Rapporte · Pausen und
Fahrzeit als Arbeitszeit · Fotos: Pflichtmotive? · Nicht angetroffen: Wartegebühr? · Freigabe durch wen? ·
SMS-Absender und Vorlagen · Ersatzteile ab Fahrzeuglager: Bestandsführung jetzt oder in v0.4? · Techniker-Handys:
Firmengeräte (PWA) oder privat (Browser)? · Offline-Bedarf (Keller, Tiefgarage) real?

## §13 · Bewusst nicht in Step 2

Kein Backend, kein echter SMS/Mail-Versand, keine echte OCR, keine Bestandsführung Lager (v0.4), kein Dashboard
(v0.4), keine Zeiterfassung als Modul (v0.5) – aber die Zeiten aus dem Rapport sind so modelliert, dass v0.5 sie
nur noch summiert.
