# Step 7 · Phase B – Website, Anfragen und Modul «SMS & Website» · ◆ JH · rev 06

## Auftrag

Die Website der Sutt AG neu aufbauen – in der Handschrift von Leitstand und App, Handy zuerst, Lighthouse ≥ 95 – mit einem
Anfrageformular, dessen Eingaben der Disposition im Leitstand erscheinen. Dazu das Modul **SMS & Website** freischalten:
Anfragen (annehmen, ablehnen, beantworten) und die SMS-/Mail-Vorlagen des Betriebs zentral pflegen. Alles mit auf GitHub Pages.

## Entscheide

| Frage | Entscheid | Warum |
| --- | --- | --- |
| Ein- oder Mehrseiter | fünf statische Seiten, Kopf/Fuss als Teile über ein Vite-Plugin (ADR-009) | echte URLs für Anfrage und Rechtliches, kein JS fürs Rendern, Pflege an einer Stelle |
| Weg der Anfrage | eigener Kanal (`sl.website.anfragen.v1`, `anfrageStore`), nicht direkt in den Dispo-Stand | ungeprüfte Fremddaten ohne Kunden-ID gehören nicht in den Produktivstand; die API bekommt einen eigenen Endpunkt |
| Sichtbarkeit im Eingang | Hinweis «n neue Anfragen von der Website» mit Sprung ins Modul; angenommene Anfragen als Pendenz mit Chip «Website» | Disposition sieht die Anfrage sofort, entscheidet aber bewusst |
| Kunde erkennen | Kundennummer → Telefon (Hauswart, Kontakt, frühere Aufträge) → E-Mail → Adresse der Liegenschaft; Vorschlag, kein Automatismus | Hauswarte rufen mit derselben Nummer an wie auf der Website; falsche Zuordnung wäre teurer als ein Klick |
| Übergabe | «Auftrag erfassen» öffnet die Schnellerfassung vorbelegt (Kunde, Liegenschaft, Wohnung, Telefon, Anrufer, Fehlerbild, Kategorie, Dringlichkeit, Geräteart, Marke, Kanal, Hinweis) | dieselbe Maske wie am Telefon – nichts zweimal bauen |
| Antworten | Mail, wenn eine Adresse da ist, sonst SMS; Text aus Vorlage `anfrage-antwort`; Ablehnung mit eigenem Text; Mock-Versand mit Eintrag an der Anfrage und im Journal | wie in Akte und App: Vorschau, Protokoll, kein echter Versand |
| Vorlagen | im Mandanten (`nachrichtVorlagen`), je `NachrichtArt`, Platzhalter `{techniker} {kontakt} {datum} {zeit} {ankunft} {rapport} {anfrage} {telefon}`; Standard zurücksetzbar | eine Quelle für Akte, Rapportmodul, App und Anfragen |
| Nummer | `W-26-0101`, fortlaufend je Jahr aus der Liste; Kennung aus dem Zeitpunkt | Kunde nennt die Nummer am Telefon, Büro findet sie sofort |
| Dark Mode | nach Systemeinstellung (`data-theme` aus `prefers-color-scheme`), dieselben Tokens | kein Schalter auf einer Marketingseite, aber kein grelles Weiss am Abend |
| Foto | nur der Dateiname wird übergeben, Hinweis im Formular | Bildablage ist jh# 012; ehrlich statt scheinbar |

## Gestaltung – «Schweizer Industrie», aber als Schaufenster

Die Regeln aus README §4 gelten für die Software. Die Website darf mehr Bühne sein (der Nutzer wollte «Hero-Video, geiles UX,
Nutzer sollen sich wohlfühlen»), bleibt aber in der Familie: Anthrazit, warmes Papier, Orange nur als Signal, IBM Plex, Haarlinien
statt Schatten, Radius 3 px, Messmarke links. Was dazukommt: grosse Typo (bis 76 px), ein Hero mit dem Einbau-Video
vollflächig hinter dem Text, Karten mit Hover (Kante nach oben, Orange-Linie),
Einblenden beim Scrollen (`IntersectionObserver`, `data-reveal`), kompakter Kopf beim Scrollen, Vollflächen-Menü auf dem Handy
(Esc, Fokus auf den ersten Eintrag, Scroll-Sperre, zurück zum Knopf), feste Leiste «Anrufen · Termin anfragen» unter 900 px.
Orientiert an den Mustern guter Service-Websites: eine Botschaft im Hero, zwei Aktionen, Vertrauensleiste, Leistungen als Karten,
Ablauf in Schritten, FAQ, Aktions-Band, grosser Fuss. Keine Stockfotos, keine Verläufe, kein Glassmorphism.

**Video:** `webseite/public/video/einbau.webm` (1920 × 1080, 9,6 s, 2 MB, Techniker beim Einbau von Waschturm, Backofen und
Waschmaschine) deckt den ganzen Hero; `einbau.jpg` ist das erste Bild als Poster (erscheint sofort, bleibt bei «Bewegung reduzieren»
und «Daten sparen» stehen). Eine MP4-Fassung (`einbau.mp4`) wird automatisch mit angeboten, sobald sie im Ordner liegt – sinnvoll für
ältere iPhones ohne WebM. `vite.config.ts` prüft beim Bauen, welche Dateien da sind (`__SL_HERO_VIDEO__`), `main.ts` setzt Poster und
Quellen, startet stumm, hält ausserhalb des Bildschirms an; der Knopf (unten rechts, auf dem Handy oben rechts) hält es an (WCAG 2.2.2).
**Abdunklung:** Anthrazit von links (Desktop, unter dem Text mindestens 82 %) bzw. von unten (Handy, unter dem Text mindestens 82 %,
oben 30 %) – weisse Schrift bleibt so auch auf weissen Fliesen über 8:1, das orange «Pünktlich.» als grosse Schrift über 3:1; die
Vorzeile steht auf einem eigenen dunklen Schild.

## Website (`webseite/`)

- `index.html`: Hero (Video vollflächig im Hintergrund, Text darüber, drei Fakten ab Tablet, Pausen-Knopf, Pfeil nach unten), Logo-Band (`public/logos/<id>.svg|png|webp|jpg`, von `vite.config.ts` als `__SL_LOGOS__` gemeldet; die 13 Logos sind auf den Inhalt zugeschnitten und auf höchstens 480 × 200 px verkleinert, `main.ts` setzt die Breite nach gleicher Fläche – quadratisch füllt die Höhe, lange Schriftzüge werden breiter und flacher; ohne Datei der Name in Markenfarbe; Liste doppelt in der Spur, Kopie `aria-hidden`, Spur wandert eine halbe Breite nach rechts, rund 40 px/s, Halt bei Maus, Fokus und Knopf), Leistungen als Karten mit Icon
  (Reparatur · Installation/Montage · Lieferung · Mietgeräte · Garantie · Notfall, jede mit Tiefen-Link `anfrage.html?anliegen=…`),
  «So arbeiten wir» (vier Schritte, dunkel), «Warum Sutt» (drei Versprechen, Kopf bleibt stehen), FAQ (`<details>`), Band mit
  zwei Aktionen, Kontakt mit Öffnungszeiten, Route und Schema-Karte (SVG, «nicht massstäblich»).
- `anfrage.html` + `src/anfrage.ts`: fünf Schritte (Anliegen mit «dringend», Gerät mit Datalist aus `GERAETEARTEN`/`MARKEN`, Adresse,
  Wunschtermin, Kontakt mit Rolle), Datenschutz-Haken, Honeypot; Prüfung mit `pruefeAnfrage` (Fehlerliste mit Sprungmarken,
  `aria-invalid`), Ablage mit `neueAnfrage`/`speichereAnfragen`, Bestätigung mit Nummer und Kontaktweg, «Weitere Anfrage».
- `karriere.html` (drei Beispielstellen, Bewerbung per Mail), `impressum.html`, `datenschutz.html` (DSG: Daten, Zweck, Weitergabe, Frist,
  Browser-Speicher, Hosting, Rechte – als Entwurf gekennzeichnet).
- `teile/kopf.html` (Icon-Sprite, Sprungmarke, Marke, Navigation mit Telefon und Aktion, Menü-Knopf, im Handy-Menü «Kundenportal» und
  «Techniker-App») und `teile/fuss.html` (vier Spalten, Rechtliches, feste Leiste); `src/main.ts` setzt Thema, Jahr, Version, Ziele
  (im Dev-Modus Port 5173), aktive Seite, kompakten Kopf, Menü, Einblenden und das Hero-Video.
- `vite.config.ts`: `base` aus `SL_BASE` (`webseiteBasis`), `appType: 'mpa'`, Teile-Plugin, fünf Eingänge, `hmr.clientPort 5175`.

## Leitstand

- `core/domain/anfrage.ts`: Typen, Labels, `pruefeAnfrage`, `anfrageNummer`, `neueAnfrage`, `ladeAnfragen`, `speichereAnfragen`,
  `naechsteLaufnummer`; `core/domain/nachricht.ts`: `STANDARD_VORLAGEN`, `fuelleVorlage`, `vorlageText(…, vorlagen)`, Art `anfrage-antwort`.
- `modules/website/`: `anfrageStore.ts` (Spiegel des Browser-Schlüssels, Saat `MOCK_ANFRAGEN`), `website.model.ts` (Sichten, Kundenvorschlag,
  Suche, Vorbelegung, Antwortvorlage), `WebsitePage.tsx` (Kacheln Neu · Angenommen · Abgelehnt · Alle, Tabelle, Dossier, Bereich Vorlagen,
  Palette «Website öffnen»), `AnfrageDossier.tsx`, `AntwortDialog.tsx`, `VorlagenBereich.tsx`.
- Eingang: `EingangTab` mit Hinweis, `PendenzCard` mit Chip «Website», `Eingangskanal` + `'Website'`, `Schnellerfassung.Vorbelegung` erweitert.
- Mock: vier Anfragen (zwei neu, eine angenommen, eine abgelehnt); «Demo zurücksetzen» stellt sie wieder her.

## Pages und Dev

- `scripts/pages-site.mjs` kopiert `webseite/dist` nach `site/webseite/`, prüft die Basis, 404 leitet `webseite/…` auf die Website.
- Dev: Leitstand 5173 reicht `/webseite` an 5175 durch – nur so teilen Website und Leitstand den Browser-Speicher; `dev:alle` nennt die Adresse.

## Tests

`core/domain/anfrage.test.ts` (Prüfung, Nummer, Ablage), `modules/website/website.model.test.ts` (Kundenerkennung über Telefon,
Adresse, Aufträge; Zähler, Suche, Vorbelegung, Antwortvorlage). Stand 222 Tests.

## Offen

- `jh?` Website-Texte, Bilder und Bildrechte, Handelsregister/UID, Datenschutzerklärung juristisch prüfen (README §9, Frage 33).
- Phasen C–G des Master-Prompts.
