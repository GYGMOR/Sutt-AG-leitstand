# Datenschutzkonzept · SUTT·LEITSTAND

◆ JH · 2026.10 · rev 05 · Entwurf für die Sutt AG – zur Prüfung durch Treuhand und Rechtsberatung (jh?).

Geltung: Schweizer Datenschutzgesetz (DSG, 1.9.2023) mit Datenschutzverordnung (DSV); für Mitarbeitende oder Kundinnen und
Kunden mit EU-Bezug zusätzlich die DSGVO. Das Konzept beschreibt, **wie die Software die Pflichten erfüllt** – nicht nur, dass.

## 1 · Grundsätze (DSG Art. 6, DSGVO Art. 5)

| Grundsatz | Umsetzung im Leitstand |
| --- | --- |
| Rechtmässigkeit, Treu und Glauben | Jede Datenkategorie nennt Zweck und Rechtsgrundlage (Katalog, Einstellungen → Datenschutz, «Meine Daten»). |
| Zweckbindung | Zeitstempel der Einsätze dienen Live-Puls und Rapport, nicht der Verhaltenskontrolle (ArGV 3 Art. 26); Zeiterfassung dient Nachweis und Lohn. |
| Verhältnismässigkeit, Datenminimierung | Nur Felder, die ein Zweck braucht; Gesundheitsdaten nur als Absenzart, keine Diagnosen; Fotos mit Motiv, keine Personenbilder. |
| Richtigkeit | Korrekturen mit Grund und Spur (ArGV 1 Art. 73); Berichtigung durch Personaladministration; Personalakte bearbeitbar. |
| Datensicherheit (Art. 8) | Rechte je Aktion, Umfang nach Organigramm, Sitzungsablauf, keine Passwörter (SSO mit MFA beim Anbieter), Journal. |
| Speicherbegrenzung | Aufbewahrungsfristen je Kategorie, Löschlauf, Anonymisierung statt Löschung bei Belegpflicht. |

## 2 · Rollen

- **Verantwortliche Stelle** (DSG Art. 5 lit. j): Sutt AG, Geschäftsleitung – Kontakt in Einstellungen → Datenschutz, sichtbar unter
  «Meine Daten». Datenschutzberater/in optional (DSG Art. 10).
- **Betroffene Personen**: Mitarbeitende (Personalakte, Zeiten, Absenzen, Konten, Journal) und Kundinnen/Kunden (Kontakte,
  Liegenschaften, Aufträge, Rapporte, Fotos, Nachrichten).
- **Auftragsbearbeiter** (DSG Art. 9): Identitätsanbieter (Microsoft, Google) für die Anmeldung; künftig Hosting der API – Verträge jh?.

## 3 · Verzeichnis der Bearbeitungstätigkeiten (DSG Art. 12, DSGVO Art. 30)

Der Katalog in `core/datenschutz/aufbewahrung.ts` ist das Verzeichnis; er wird in den Einstellungen gezeigt und bearbeitet:

| Kategorie | Zweck | Rechtsgrundlage | Betroffene | Frist | Löschung |
| --- | --- | --- | --- | --- | --- |
| Arbeitszeiten | Nachweis Arbeits-/Ruhezeiten, Lohn, Gleitzeit | ArG 46, ArGV 1 Art. 73 | Mitarbeitende | 5 Jahre ab Jahresende | löschen |
| Monatsabschlüsse | Lohngrundlage, Buchführung | OR 958f | Mitarbeitende | 10 Jahre ab Jahresende | löschen |
| Absenzen und Ferien (besonders schützenswert) | Ferienkonto, Planung, Lohnfortzahlung | OR 329a ff., ArGV 1 Art. 73 | Mitarbeitende | 5 Jahre ab Jahresende | anonymisieren |
| Personalstammdaten | Arbeitsvertrag, Organisation | OR 328b, DSG 31 Abs. 2 lit. a | Mitarbeitende | 10 Jahre ab Austritt | löschen |
| Benutzerkonten | Zugriffsschutz, Nachvollziehbarkeit | DSG 8, DSV 1–3 | Mitarbeitende | 1 Jahr ab Austritt | löschen |
| Protokoll (Journal) | Protokollierung, Missbrauchserkennung, Auskunft | DSV 4 | beide | 2 Jahre ab Erfassung | löschen |
| Kunden und Liegenschaften | Auftragsabwicklung, Service-Historie | Vertrag, OR 958f | Kunden | 10 Jahre ab Abschluss | anonymisieren |
| Aufträge und Einsätze | Leistung, Verrechnung, Gewährleistung | Vertrag, OR 958f | beide | 10 Jahre ab Abschluss | anonymisieren |
| Servicerapporte | Leistungsnachweis, Verrechnung | OR 958f | beide | 10 Jahre ab Abschluss | löschen |
| Fotos | Dokumentation, Gewährleistung | berechtigtes Interesse, OR 371 | Kunden | 2 Jahre ab Abschluss | löschen |
| Statuszeitstempel der Einsätze | Live-Puls, Rapportzeiten | berechtigtes Interesse, Zweckbindung | Mitarbeitende | 1 Jahr ab Erfassung | anonymisieren |
| Nachrichten (SMS, Mail) | Kundenkommunikation, Nachweis | Vertrag, berechtigtes Interesse | Kunden | 2 Jahre ab Erfassung | löschen |

## 4 · Besonders schützenswerte Daten (DSG Art. 5 lit. c)

Krankheit und Unfall sind Gesundheitsdaten. Sie werden als Absenzart gespeichert (keine Diagnose, Arztzeugnis als Vermerk) und nur
mit dem Recht `personal:gesundheit` als solche gezeigt – allen anderen als «Abwesend» ohne Notiz, in Plantafel, Dashboard,
Zeiterfassung und App gleich (`useStandFuerSicht`). Die Administration hat dieses Recht nicht von Haus aus (Need-to-know).

## 5 · Protokollierung (DSV Art. 4)

Das Journal ist unveränderlich (append-only, auch «Rückgängig» schreibt einen Eintrag) und hält: Zeitpunkt, handelnde Person,
Bereich, Art (Änderung, Einsicht, Anmeldung, Export, Löschung, System), Text, betroffener Datensatz, betroffene Person.
Protokolliert werden alle Änderungen über den Store, Einsichten in fremde Zeitkonten und Personalakten, Exporte (CSV, Auskunft),
An- und Abmeldungen (auch automatisch), Verbindungstests, Löschläufe, Änderungen der Einstellungen. Einsicht: Einstellungen →
Protokoll (Recht `protokoll:lesen`), je Person unter «Meine Daten». Aufbewahrung mindestens ein Jahr (Katalog: zwei Jahre); der
Browser-Stand hält 2000 Einträge, das Produkt archiviert serverseitig.

## 6 · Rechte der betroffenen Personen

| Recht | DSG | DSGVO | Umsetzung |
| --- | --- | --- | --- |
| Auskunft | Art. 25 | Art. 15 | «Meine Daten» → Export (JSON mit Akte, Konto, Zeiten, Absenzen, Abschlüssen, Journal); Personaladministration: «Auskunft erstellen» im Dossier – beides protokolliert. |
| Berichtigung | Art. 32 | Art. 16 | Personalakte bearbeiten (Recht `personal:bearbeiten`); Zeiten korrigieren mit Grund; Rückweisung eines Monats. |
| Löschung | Art. 32 | Art. 17 | Löschlauf nach Fristen; frühestes Löschdatum im Dossier; gesetzliche Aufbewahrung geht vor. |
| Datenherausgabe | Art. 28 | Art. 20 | JSON-Export, maschinenlesbar. |
| Information | Art. 19 | Art. 13 | «Meine Daten» zeigt Kategorien, Zwecke, Fristen, verantwortliche Stelle, Aufsicht (EDÖB). |

## 7 · Technische und organisatorische Massnahmen (DSG Art. 8, DSV Art. 1–3)

- Anmeldung über das Geschäftskonto (OIDC), MFA und Sperren beim Anbieter, keine Passwörter im System; «nur SSO» möglich.
- Rechte je Aktion, Umfang nach Organigramm, Vier-Augen-Prinzip (eigene Rechte, eigener Monat), Sperren von Konten.
- Automatische Abmeldung nach Inaktivität (Mandant, Standard 8 Stunden); Rückfrage bei ungespeicherten Änderungen.
- Exporte nur mit Recht und mit Journaleintrag; Zeitzone und Zeitstempel in Zonenzeit (Nachvollziehbarkeit).
- Fonts lokal, keine Drittdienste im Client ausser den konfigurierten Anbietern und Kartendiensten (Hinweis `jh# 007`).

## 8 · Mitarbeitende: Zeiterfassung und Überwachung

Die Zeiterfassung erfüllt ArG Art. 46 (Pflicht zur Erfassung) und zeigt Verstösse gegen ArG 10/15/15a/16/18 als Hinweis an die
Person und die Vorgesetzten – als Schutz, nicht als Sanktion. Statusstempel der Einsätze (Abfahrt, Ankunft, Fertig) dienen dem
Betrieb (Live-Puls, Rapportzeiten); eine Auswertung des Verhaltens einzelner Personen ist nicht vorgesehen (ArGV 3 Art. 26).
Standortdaten werden nicht erfasst.

## 9 · Offen (jh?)

Fristen bestätigen, Datenschutzberater benennen, Auftragsbearbeitungsverträge (Anbieter, Hosting), EU-Bezug (DSGVO Art. 30, 33 –
Meldung von Verletzungen binnen 72 Stunden), Umgang mit Arztzeugnissen (Ablage ausserhalb des Systems), Stempeln im Ausland.
