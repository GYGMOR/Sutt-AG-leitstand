# ADR-009: Website als Mehrseiter ohne Framework – Anfragen als eigener Kanal neben dem Dispo-Stand

**Status:** Accepted · **Datum:** 2026-10-30 · **Entscheid:** ◆ JH (Projektleitung) · **Bezug:** ADR-001, ADR-003, ADR-008

## Kontext

Die Website der Sutt AG soll neu entstehen (Master-Prompt rev 06, Phase B): Leistungen, Marken, Ablauf, Über uns, Kontakt,
Karriere, Impressum, Datenschutz – und ein Anfrageformular, dessen Eingaben im Leitstand landen. Randbedingungen: dieselbe
Handschrift und dieselben Tokens wie Leitstand und App (ADR-008), Lighthouse ≥ 95 in allen Kategorien, WCAG AA, Handy zuerst,
weiterhin **kein Backend**. Gehostet wird die Website später auf der Hauptdomain, das Portal und die App auf Subdomains; für
die Demo liegen alle drei unter GitHub Pages (`/<repo>/`, `/<repo>/app/`, `/<repo>/webseite/`).

Zwei Fragen waren zu entscheiden: **Wie wird die Website gebaut** (Einseiter, Mehrseiter, Framework)? Und **wie kommt eine
Anfrage in den Leitstand** – direkt als Pendenz in den Dispo-Stand (so der Prompt) oder als eigener Kanal?

## Entscheid

- **Mehrseiter aus fünf statischen HTML-Seiten** (`index`, `anfrage`, `karriere`, `impressum`, `datenschutz`), gebaut mit Vite
  (`build.rollupOptions.input`), **ohne Framework**: ein Vite-Plugin setzt Kopf und Fuss aus `webseite/teile/*.html` an der
  Marke `<!-- @teil kopf -->` ein (im Dev-Modus bei jedem Aufruf, im Build einmal). TypeScript nur für Menü, Ziele und das Formular.
- **Dieselbe Basis wie die App**: `base` aus `SL_BASE` (`scripts/basis.ts → webseiteBasis`), lokal `/webseite/`, auf Pages
  `/<repo>/webseite/`. Der Leitstand reicht `/webseite` im Dev-Modus an Port 5175 durch; Links zu Portal und App kommen aus den
  Build-Konstanten `__SL_LEITSTAND_URL__` / `__SL_APP_URL__`.
- **Anfragen sind ein eigener Kanal**, nicht Teil des Dispo-Stands: Domäne `core/domain/anfrage.ts` (Typ, Prüfung, Nummer
  `W-26-0101`, Ablage), Browser-Schlüssel `sl.website.anfragen.v1`, im Leitstand der kleine Store `modules/website/anfrageStore.ts`,
  der denselben Schlüssel spiegelt (`storage`-Ereignis, wie Mandant und Dispo-Stand). Die Website schreibt mit genau den
  Funktionen, die der Leitstand liest (`pruefeAnfrage`, `neueAnfrage`, `speichereAnfragen`) – geteilt über `@sl`.
- **Eingang zeigt, Modul entscheidet**: Der Eingang der Plantafel zeigt neue Anfragen als Hinweis («2 neue Anfragen von der
  Website · 1 dringend») mit Sprung ins Modul **SMS & Website**. Dort steht der Kundenvorschlag (Kundennummer → Telefon →
  E-Mail → Adresse), und «Auftrag erfassen» öffnet die Schnellerfassung **vorbelegt** (Kunde, Liegenschaft, Wohnung, Telefon,
  Anrufer, Fehlerbild, Kategorie, Dringlichkeit, Geräteart, Marke, Kanal «Website», Hinweis mit Nummer und Wunschtermin). Erst
  dieser Schritt legt Auftrag und Pendenz an – mit Chip «Website» im Eingang. Ablehnen und Antworten (Mail oder SMS, Vorlage,
  Mock-Versand) schreiben an die Anfrage und ins Journal.
- **Vorlagen zentral**: SMS- und Mail-Vorlagen des Betriebs (Terminbestätigung, unterwegs, nicht angetroffen, Rapport, Antwort
  auf Anfrage) liegen im Mandanten (`nachrichtVorlagen`) und werden im Modul gepflegt; Akte, Rapportmodul und App lesen sie über
  `vorlageText(art, kontext, vorlagen)` mit Platzhaltern `{techniker} {kontakt} {datum} {zeit} {ankunft} {rapport} {anfrage} {telefon}`.

## Optionen

### Aufbau der Website

| Option | Komplexität | Lighthouse / A11y | Pflege | Einschätzung |
| --- | --- | --- | --- | --- |
| A · Einseiter mit Sektionen (bisheriges Gerüst) | niedrig | gut, aber ein Dokument für alles – Impressum und Datenschutz als Anker | Rechtstexte und Formular blähen die Startseite | zu wenig für Karriere, Rechtliches, Tiefen-Links |
| **B · Mehrseiter, statisch, Teile per Vite-Plugin (gewählt)** | niedrig–mittel | sehr gut: kein JS fürs Rendern, echte URLs je Seite, `noindex` für Rechtliches | Kopf/Fuss einmal in `teile/`, Seiten in HTML | passt zu fünf Seiten und zum Ziel ≥ 95 |
| C · Framework (React/Astro) wie Leitstand | mittel–hoch | gut mit SSG, Hydration kostet | zweiter Build-Stack oder React auf einer Marketingseite | Zeremonie ohne Nutzen bei fünf Seiten |

### Weg der Anfrage

| Option | Datenhygiene | Kopplung | Übergang zur API | Einschätzung |
| --- | --- | --- | --- | --- |
| A · Website schreibt eine `Pendenz` direkt in den Dispo-Stand (Prompt) | ungeprüfte Fremddaten ohne Kunden-ID im Produktivstand; Stand-Format der Website muss dem Dispo-Reducer folgen | Website kennt den Dispo-Stand | schwer: der Stand ist später serverseitig, die Website bleibt öffentlich | abgelehnt |
| **B · Eigener Kanal `anfragen`, Annahme über die Schnellerfassung (gewählt)** | Anfrage bleibt Anfrage, Auftrag entsteht geprüft mit Kunde | Website kennt nur `core/domain/anfrage.ts` | ein Endpunkt `POST /anfragen`, Leitstand liest `GET /anfragen` – dieselben Typen | gewählt |
| C · Mail an die Disposition | keine Struktur | keine | Mail bleibt Mail | entwertet die Schnellerfassung |

## Abwägung

Der Prompt wollte die Anfrage «als Pendenz mit Quelle website». Der Zweck – die Disposition sieht die Anfrage sofort im Eingang
und erfasst den Auftrag mit einem Klick – ist mit Option B erfüllt, ohne dass ungeprüfte Fremddaten in den Dispo-Stand geraten:
Der Eingang zeigt den Hinweis, der Kunde wird erkannt oder angelegt, die Schnellerfassung ist vorbelegt, und die entstehende Pendenz
trägt den Kanal «Website». Für die API ist B die natürliche Grenze: die Website spricht einen öffentlichen Endpunkt an, der Leitstand
einen internen – mit demselben Typ `Anfrage`. Die Origin-Bedingung (Website und Leitstand teilen den Browser-Speicher nur unter
derselben Domain) ist wie in ADR-008 eine Folge des fehlenden Backends; im Dev-Modus läuft die Website deshalb über den
Leitstand-Proxy (`5173/webseite/`), auf Pages liegen alle drei unter `/<repo>/`.

## Konsequenzen

- Leichter: fünf schnelle Seiten ohne Hydration, Tiefen-Links (`anfrage.html?anliegen=mietgeraet`), Formularprüfung identisch
  in Website und Leitstand, Vorlagen an einem Ort, Anfragen-Historie mit Antworten im Leitstand.
- Schwerer: drei Dev-Server; Kopf/Fuss-Änderungen brauchen einen Reload (kein HMR für die Teile); Fotos aus dem Formular werden
  nur als Dateiname übergeben (Bildablage ist jh# 012).
- Zu revidieren: mit der API ersetzt `POST /anfragen` den Browser-Schlüssel; dann kann die Website auf die Hauptdomain, der Leitstand
  auf `portal.`, die App auf `app.` – der Website-Code ändert nur `speichereAnfragen`. Spam-Schutz (Honeypot heute) wird serverseitig
  ergänzt (Rate-Limit, Turnstile o. ä.).

## Massnahmen

1. [x] `webseite/`: fünf Seiten, Teile-Plugin, Basis aus `SL_BASE`, Formular mit geteilter Prüfung, Schema-Karte, Dark Mode nach System.
2. [x] `core/domain/anfrage.ts` (+ Tests), `modules/website/*` (Anfragen, Dossier, Antwort, Vorlagen), Eingang-Hinweis, Chip «Website», Vorbelegung der Schnellerfassung.
3. [x] Vorlagen im Mandanten (`nachrichtVorlagen`), `vorlageText` mit Platzhaltern, neue Art `anfrage-antwort`.
4. [x] Pages: `pages-site.mjs` nimmt `webseite/dist` auf; Dev-Proxy `/webseite`; `dev:alle` nennt die Proxy-Adresse.
5. [ ] API-Schritt: `POST /anfragen` mit Rate-Limit und Spam-Schutz, Bildupload, Mail-/SMS-Versand über Gateway.
6. [ ] Livegang: Texte, Bilder und Bildrechte, Handelsregister/UID, Datenschutzerklärung juristisch prüfen (README §9).
