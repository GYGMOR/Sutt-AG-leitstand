# SUTT Leitstand · Start auf einem neuen Notebook (Mac oder Windows)

> **Ganz ohne Installation:** Läuft die Demo auf GitHub Pages (README §1), genügt der Link – `https://<konto>.github.io/<repo>/`
> für den Leitstand, `…/<repo>/app/` für die Techniker-App. Anmelden wie in Abschnitt 4. Der Rest dieser Anleitung ist für den
> Start auf dem eigenen Rechner.

Alles läuft lokal mit Testdaten – **kein Server, keine Datenbank, kein Konto nötig.** Es braucht genau zwei Dinge:

| Was | Woher | Hinweis |
| --- | --- | --- |
| **Node.js** (LTS 22, mindestens 20.19) | https://nodejs.org → «LTS» → Mac: `.pkg`, Windows: `.msi` | bringt `npm` mit; prüfen im Terminal mit `node -v` |
| **Browser** | Chrome, Edge oder Safari | Chrome empfohlen (Kamera-Scanner läuft dort auch am Mac) |

Git ist nicht nötig, wenn der Projektordner als ZIP kommt. Auf dem Mac genügt das vorinstallierte Terminal.

## 1 · Projekt holen

Den Ordner `SuttiAG-Webapplikation` auf den Rechner kopieren – ohne `node_modules` und `dist` (die entstehen beim nächsten Schritt). Mit Git: `git clone …`.

## 2 · Abhängigkeiten installieren (einmalig, 2–5 Minuten)

Terminal öffnen, in den Ordner wechseln (Mac: `cd ` tippen, Ordner aus dem Finder ins Terminal ziehen, Enter), dann:

```bash
npm install
```

Windows-Besonderheit: ohne Symlink-Recht meldet `npm install` am Ende `EISDIR … sutt-webseite` – das ist harmlos, die Skripte laufen trotzdem.

## 3 · Starten

Alle drei Teile in einem Terminal:

```bash
npm run dev:alle
```

| Teil | Adresse | Was man sieht |
| --- | --- | --- |
| **Leitstand** (Portal) | http://localhost:5173 | Login → Plantafel, Dashboard, Module |
| **Techniker-App** | http://localhost:5173/app/ (oder http://localhost:5174/app/) | Handy-Oberfläche, auch am Mac im Fenster |
| **Website** (Gerüst) | http://localhost:5175 | Startseite mit Links zu App und Leitstand |

Einzeln geht es mit `npm run dev`, `npm run dev:app`, `npm run dev:web`. Beenden mit `Ctrl+C`.

## 4 · Anmelden (Demo-Zugänge, Passwort beliebig)

| Benutzer | Rolle | Startet in |
| --- | --- | --- |
| `jh` | Disposition | Plantafel |
| `rw` | Büro | Dashboard |
| `admin` | Administration | Dashboard, sieht auch Einstellungen und Benutzer & Rollen |
| `mb` · `sk` · `lf` | Aussendienst (Techniker) | Techniker-App |
| `te` | gesperrtes Konto | Fehlermeldung (Demo der Sperre) |

Der Leitstand und die App teilen sich die Anmeldung: wer sich als `mb` anmeldet, landet in der App; das Büro öffnet die App über die Seitenleiste («Techniker-App», neuer Tab) und wählt im Profil «Als Techniker ansehen».

## 5 · Fünf-Minuten-Rundgang fürs Meeting

1. Als `jh` anmelden → **Plantafel**: Auftrag aus dem Eingang rechts in den Plan ziehen (freie Fenster färben sich grün/gelb/rot), `Ctrl+Z` nimmt es zurück.
2. Einsatz anklicken → **Akte** mit Karte, Kontakten, Gerät, Verlauf; `Ctrl+K` sucht nach «Hofstetter», `N` erfasst einen Auftrag am Telefon.
3. **Zwei Fenster**: Seitenleiste → Techniker-App (neuer Tab) → «Als Techniker ansehen» → Status «Abfahrt / Angekommen / Fertig» drücken – die Plantafel im ersten Fenster zeigt es sofort.
4. In der App «Fertig» → **Servicerapport** mit Zeiten, Arbeiten, Teilen, Foto, Unterschrift mit der Maus → Abschliessen → im Leitstand unter «Servicerapporte» prüfen und freigeben.
5. **Zeiterfassung** (als `admin`): Ansichten Woche (Chips) und Monat (Matrix); grosse **Stempeluhr** im eigenen Zeitkonto und in der App unter «Zeit».
6. **Einstellungen** (als `admin`): Betrieb mit Zeitzone, Feiertage, Anmeldung (Microsoft/Google), Datenschutz, Protokoll.

«Demo zurücksetzen» im Benutzermenü (oben rechts) stellt den Ausgangszustand her. Der Stand lebt im Browser; ein neuer Tag beginnt automatisch frisch.

## 6 · Auf dem Handy anschauen

Handy ins gleiche WLAN, IP des Notebooks ermitteln (Mac: Systemeinstellungen → WLAN → Details, oder im Terminal `ipconfig getifaddr en0`; Windows: `ipconfig`), dann auf dem Handy `http://<IP>:5174/app/` öffnen. macOS fragt beim ersten Start, ob «node» Verbindungen annehmen darf → **Erlauben**. «Zum Home-Bildschirm» installiert die App wie eine echte.

## 7 · Wenn etwas hakt

| Meldung | Ursache · Abhilfe |
| --- | --- |
| `Vite requires Node.js version 20.19+` | Node zu alt → LTS von nodejs.org installieren, Terminal neu öffnen |
| `Port 5173 is already in use` | ein früheres Terminal läuft noch → dort `Ctrl+C` oder Terminal schliessen |
| Seite bleibt leer, Konsole meldet Modulfehler | einmal neu laden (`Cmd+R`); hilft es nicht: `npm install` erneut |
| Karte zeigt nur die Schemakarte | ohne Google-Key läuft OpenStreetMap, ohne Netz die Schemakarte – kein Fehler. Optional `.env` mit `VITE_GOOGLE_MAPS_API_KEY=` nach `.env.example` |
| Scanner: «kein Barcode-Leser» | Browser ohne `BarcodeDetector` (Safari am Mac) → Code eintippen oder Beispiel antippen; am Handy und in Chrome geht die Kamera |

Prüfen, ob alles sauber ist: `npm run typecheck:alle`, `npm run test:alle`, `npm run jh:check`.

◆ JH · rev 05
