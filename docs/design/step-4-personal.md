# Design · Step 4 Personal – Zeiterfassung, Absenzen, Benutzer & Rollen, Einstellungen, Datenschutz

◆ JH · 2026.10 · rev 05 · Stand nach dem Bau. Grundlage: `README.jh.md`, ADR-001 bis ADR-007, `docs/datenschutz/konzept.md`.

## 1 · Anforderungen

**Funktional (Kundenwunsch und Auftrag)**
- Zeiterfassung: Kommen, Gehen, Pause – als grosse Stempeluhr auf Handy, Tablet und PC; **selbst nachtragen** bleibt möglich
  (sichtbar als «manuell», für Vorgesetzte unter «Zu prüfen»). Arbeits- und Fahrzeiten aus dem Einsatzplan als Vorschlag,
  Monatsabschluss pro Mitarbeitenden (einreichen → genehmigen/zurückweisen, Vier-Augen-Prinzip).
- Admin und Personal sehen die Woche als farbige Chips je Person und Tag (Erfasst/Erwartet, Überstunden/Kompensiert), den
  Monat als Matrix Personen × Tage mit Tagessaldo, Feiertagszeile und Ferienrest, dazu Jahr (Monatssaldi) und Tag (Zeitstrahl).
- Absenzen: beantragen, genehmigen, Ferienkonto, Planer – erscheinen als Ganztag im Plan; Krankheit und Unfall nur mit Recht.
- Benutzer & Rollen: Konten, Rollen, Zusatz- und Entzugsrechte je Konto, Umfang (eigene · Team · alle) aus dem Organigramm,
  Personalakten, Sperren, Anbieter-Verknüpfung.
- Einstellungen: Betrieb (Kanton, **Zeitzone**, Arbeitszeitmodell, Sitzung), Feiertage, Anmeldung über Microsoft Entra ID und
  Google Workspace (Tenant, Gruppen → Rolle, JIT, nur SSO), Datenschutz (Stelle, Fristen, Löschlauf), Protokoll, Module.
- Dashboard mit Diagrammen; «Meine Daten» für jede angemeldete Person.

**Nicht-funktional**
- DSG (CH, 2023) und DSGVO (EU) «by design»: Datenminimierung, Zweckbindung, Protokollierung, Auskunft, Fristen, Maskierung
  besonders schützenswerter Daten – nicht als Hinweistext, sondern als Mechanik im Stand (ADR-007).
- Rechte je Aktion, hierarchisch (Rolle → Profil → Zusatz/Entzug → Umfang), prüfbar ohne DOM (ADR-005).
- Zeitzone des Betriebs (`Europe/Zurich`) mit Zeitumstellung **im Programm**: Stempel, Tagesgrenzen und Dauern rechnen in der
  Zone, nicht in der des Geräts; 23- und 25-Stunden-Tage sind korrekt.
- Ein Stand, ein Store (ADR-003); Mandant als eigener kleiner Store, in andere Fenster gespiegelt.

## 2 · Datenfluss

```
 Module (Sichten)      Zeiterfassung · Absenzen · Benutzer · Einstellungen · Meine Daten · Dashboard · App (Tab Zeit) · Topbar (Pille)
                              ▲ useStandFuerSicht() / useDispoState()   ·   useRechte()   ·   useMandant()
 Store                 DispoState v4 = Stammdaten (… mitarbeiter, benutzer, absenzen) + Bestand (… zeiteintraege,
                       monatsabschluesse) + journal (append-only) + protokoll (Undo) + auswahl
 Mandant               mandantStore «sl.mandant.v1»: Firma, Kanton, Zeitzone, Arbeitszeit, Feiertage, Anbieter, Fristen, Module
 Anmeldung             authStore (Sitzung) ← Verzeichnis aus dem Stand (main.tsx): lokal (Mock) oder Claims → kontoAusIdentitaet()
```

Jede schreibende Aktion läuft über `commit()` im Reducer und schreibt zusätzlich einen Journaleintrag (wer, wann, was, wen).
Einsichten in fremde Personendaten und Exporte werden mit `protokolliere` ohne Undo verbucht.

## 3 · Datenmodell (neu)

```ts
// core/domain/personal.ts
interface Mitarbeiter { id; kuerzel; vorname; nachname; funktion; pensum; eintritt; austritt?; technikerId?; vorgesetzterId?;
                        ferienTageProJahr; ferienUebertragTage; zeitUebertragMin; zeitUebertragPer: IsoDatum; email; telefon? }

// core/domain/zeit.ts
interface ZeitEintrag { id; mitarbeiterId; datum; art: 'arbeit' | 'pause'; vonMin; bisMin | null; quelle: 'stempel' | 'manuell' | 'einsatz';
                        geraet?; einsatzId?; bemerkung?; erfasstAm; erfasstVon; korrekturen: ZeitKorrektur[]; geloescht? }
interface Monatsabschluss { id; mitarbeiterId; monat; status: 'eingereicht' | 'genehmigt' | 'zurueckgewiesen'; sollMin; istMin; saldoMin; saldoKumuliertMin; … }
berechneTag({ datum, mitarbeiter, eintraege, modell, feiertag, absenz, jetztMin, zone }) → TagesSaldo (Warnungen ArG 10/15/15a/16/18, Umstellung)

// core/domain/absenz.ts · core/domain/feiertage.ts · core/domain/journal.ts
Absenz { art (ferien, krank, unfall, militaer, schulung, kompensation, unbezahlt, fahrzeugservice, abwesend); status; halberTag? }
feiertageImJahr(jahr, kanton, betrieblich) – Osterformel nach Meeus · JournalEintrag { zeitpunkt; benutzer; bereich; art; text; betrifft?; mitarbeiterId? }

// core/berechtigung/rechte.ts
type Recht = `${Bereich}:${Aktion}` · PROFILE je Rolle · Benutzer { rolle; zusatzRechte?; entzogeneRechte?; umfang? }
darfPerson(traeger, bereich, mitarbeiterId, { eigeneId, teamIds }) – Team = alle (indirekt) Unterstellten

// core/mandant/mandant.types.ts · core/zeitzone.ts · core/auth/identitaet.ts
Mandant { firma; kanton; zeitzone; arbeitszeit; betrieblicheFeiertage; ferienTageStandard; sitzungMinuten; nurSso; anbieter; aufbewahrung; modulFreigaben; datenschutz }
jetztInZone(zone) · lokalZuInstant · dauerZwischen · umstellungAm · naechsteUmstellung   (Regeln aus der ICU-Datenbank, keine eigene Tabelle)
kontoAusIdentitaet(claims, konfig, bestehende, jetzt) – Domain, Subject/E-Mail, Sperre, Gruppen → Rolle, JIT
```

## 4 · Aktionen (Store)

| Aktion | Wirkung |
| --- | --- |
| `stempeln` | Kommen/Pause/Weiter/Gehen für «jetzt» in der Zone des Betriebs; reine Funktion über die Einträge des Tages |
| `zeitEintraegeAnlegen` · `zeitEintragKorrigieren` · `zeitEintragLoeschen` · `zeitEintragErgaenzen` | manuell (sichtbar), Korrektur mit Grund und Spur (ArGV 1 Art. 73), Löschen als Markierung, Notiz/Einsatz am laufenden Eintrag |
| `monatEinreichen` · `monatEntscheiden` | Abschluss friert Soll/Ist/Saldo ein; genehmigt = Monat gesperrt |
| `absenzBeantragen` · `absenzEntscheiden` · `absenzAendern` · `absenzLoeschen` | Genehmigung nach Art; genehmigte Absenzen gelten im Plan als Ganztag |
| `mitarbeiterSpeichern` · `benutzerSpeichern` | Personalakte, Konto mit Rolle, Rechten, Umfang, Sperre |
| `loeschlauf` · `protokolliere` · `benutzerAnmeldung` | Fristen anwenden; Einsicht/Export/Anmeldung ohne Undo ins Journal |

## 5 · Ansichten

- **Zeiterfassung** `/zeiterfassung/:id?` – Ansichten **Liste · Tag · Woche · Monat · Jahr** (`?ansicht=`), Kacheln als Sicht
  (Eingestempelt, Warnungen, Zu prüfen, Eingereicht, Ohne Abschluss), Zeitraum-Navigation je Ansicht, CSV je Ansicht.
  Woche: Chip je Tag (Ton: Soll erreicht · läuft · Abweichung/manuell · Regel verletzt · fehlt · Absenz · frei), Erfasst/Erwartet,
  Saldo Woche, Überstunden/Kompensiert. Monat: Matrix Personen × Tage mit Tagessaldo (+1:20 / −0:45), Absenzkürzel, Feiertagszeile,
  Soll/Ist/Saldo/Total/Ferienrest, Totalzeile. Jahr: Monatssaldi mit Abschlussmarke, Monate vor dem Übertrag leer. Tag: Zeitstrahl
  06–19 Uhr mit Arbeits- und Pausenblöcken, Jetzt-Linie. Dossier je Person: Stempeluhr (eigene), Monat, Abschluss, Tage, Einträge, Spur.
- **Stempeluhr** (`modules/personal/Stempeluhr.tsx`): Pille in der Topbar; grosse Uhr mit Kreis (grün Einstempeln · rot Ausstempeln ·
  gelb Pause beenden), Sekundenzähler, Zonenzeit mit MEZ/MESZ, Umstellungshinweis, Notiz · Pause · **Nachtragen** · Einsatz,
  Einträge von heute; Container-Query: Handy untereinander, ab 640 px Kreis links. Streifen auf der Heute-Seite der App.
- **Techniker-App** Tab **Zeit**: grosse Uhr, Woche als Chips, Monat mit Soll/Ist/Saldo/Total, letzte Tage, Nachtragen, Monat einreichen.
- **Absenzen** `/absenzen/:id?`: Liste oder Planer (Monat, Personen × Tage, Artfarben), Antrag, Dossier mit Entscheid und Ferienkonto.
- **Benutzer & Rollen** `/benutzer/:bereich?`: Konten (Dossier mit Rechte-Matrix, Umfang, Journal), Rollen & Rechte (Matrix aller
  Rechte × Rollen), Mitarbeitende (Personalakte mit Ferienkonto, Datenschutz, Auskunft), Organigramm.
- **Einstellungen** `/einstellungen/:bereich?`: Betrieb (Zeitzone mit aktueller Zeit und nächster Umstellung), Feiertage, Anmeldung
  (zwei Anbieter-Karten, Umleitungs-URI, Gruppen → Rolle, Verbindungstest, nur SSO), Datenschutz, Protokoll, Module.
- **Meine Daten** `/meine-daten` (Benutzermenü): Konto, Personalakte, wer meine Daten angesehen hat, Kategorien mit Fristen,
  Rechte und verantwortliche Stelle, Export (JSON).
- **Dashboard** «Auswertung»: Donut «Im Dienst jetzt», Balken «Auslastung heute», Linie «Erledigte Einsätze 28 Tage», gestapelte
  Säulen «Rapporte je Woche», Anteile «Einsätze nach Kategorie» – eigene SVG/HTML-Bausteine in `core/ui/Diagramm.tsx`, jede
  Karte mit Tabellen-Zwilling, Tooltip und Tastatur.
- **Anmeldung**: Tasten «Mit Microsoft-/Google-Konto anmelden» (nur aktive Anbieter), Mock-Dialog «Konto wählen» mit Fremdkonto
  und Person ohne Konto; `nurSso` blendet die lokale Anmeldung aus.

## 6 · Rechte und Hierarchie (ADR-005)

Rolle → Rechteprofil (Aussendienst ⊂ Disposition ⊂ Büro; Administration = alles ausser Gesundheitsdaten) → Zusatz/Entzug je Konto
→ Umfang je Personenbereich (zeit, absenzen, personal: eigene · Team · alle). «Team» ist das Organigramm (`vorgesetzterId`,
rekursiv). Eigene Rechte ändert niemand selbst. Module werden dreistufig freigegeben: Register, Mandant, Rolle.

## 7 · Zeitzone und Umstellung

`core/zeitzone.ts` rechnet mit `Intl.DateTimeFormat` (ICU) – keine eigene Regeltabelle. Stempel entstehen in Zonenzeit
(`jetztInZone`), Dauern am Umstellungstag über `dauerZwischen` (01:00–04:00 = 120 min im März, 240 min im Oktober), Tageslänge
1380/1440/1500 min, nächste Umstellung in den Einstellungen und auf der Stempeluhr. Die Zone ist eine Eigenschaft des Betriebs
(Mandant), nicht des Geräts: Ein Techniker im Ausland stempelt Schweizer Zeit.

## 8 · Datenschutz (ADR-007, `docs/datenschutz/konzept.md`)

Journal append-only (auch Undo schreibt), Einsicht in fremde Akten protokolliert, Gesundheitsdaten nur mit `personal:gesundheit`
(sonst «Abwesend», an jeder Stelle über `useStandFuerSicht`), Datenkatalog mit Zweck, Rechtsgrundlage, Frist und Löschart,
Löschlauf nach Fristen, Auskunft als JSON (DSG Art. 25 / DSGVO Art. 15), Sitzungsablauf, keine Passwörter im Produkt (SSO, MFA
beim Anbieter), Zeitstempel ohne Verhaltensüberwachung (ArGV 3 Art. 26).

## 9 · Tests

`core/zeitzone.test.ts`, `core/domain/zeit.test.ts` (Stempel, Soll, ArG-Regeln, Umstellung), `feiertage.test.ts`, `absenz.test.ts`,
`core/berechtigung/rechte.test.ts`, `core/auth/identitaet.test.ts`, `core/datenschutz/aufbewahrung.test.ts`,
`modules/zeiterfassung/zeiterfassung.model.test.ts` (Zeilen, Töne, Woche, Jahr, Tag), `absenzen.model.test.ts`, `benutzer.model.test.ts`,
`einstellungen.model.test.ts`, `dashboard.model.test.ts` (Auswertung), Reducer-Tests Personal – 196 Tests.

## 10 · Offen / Annahmen (jh?)

Gleitzeit-Obergrenze und Verfall, Kernzeit, Ferienübertrag-Regel, Samstag als Arbeitstag, Gruppen im Entra-Tenant, Datenschutzberater,
Fristen (mit Treuhand bestätigen), Rolle der Lernenden (Pensum, Schule), ob die App auch im Ausland stempeln darf.
