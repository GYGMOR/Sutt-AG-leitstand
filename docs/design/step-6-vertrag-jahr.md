# Step 6 · Phase A – Vertrag & «Mein Jahr» · ◆ JH · rev 06

## Auftrag

Mitarbeitende sollen ihren **ganzen Vertragszeitraum** sehen – Planung, Stempel, Saldo – vom Eintritt bis zum
Vertragsende; ohne Enddatum «bis auf Weiteres». Es gibt unbefristete, befristete und temporäre Verträge sowie solche
«auf Widerruf». Alles muss «fein säuberlich» stimmen: Gleitzeit im Plus/Minus, Ferien, Abschlüsse.

## Entscheide

| Frage | Entscheid | Warum |
| --- | --- | --- |
| Datenmodell | `vertragsart` + `vertragsnotiz` an `Mitarbeiter`; Beginn/Ende bleiben `eintritt`/`austritt` | Alle Aufrufer (`istAngestellt`, Soll, Ferien pro rata, Aufbewahrung ab Austritt) laufen unverändert; `vertragVon()` liefert die Vertragssicht |
| Offenes Ende | `austritt` leer; `vertragsende()` liefert `VERTRAG_OFFEN = 2099-12-31` nur für Vergleiche | Kein Platzhalterdatum in den Daten, keine «2099» in der Oberfläche |
| Pflichtfelder | befristet und temporär brauchen ein Ende (`pruefeVertrag`) | Sonst läuft eine Befristung still aus |
| Vorlauf | 60 Tage (`VERTRAG_VORLAUF_TAGE`), Dashboard · Mitarbeitende · Personalakte | Kündigungsfristen und Verlängerungen brauchen Vorlauf |
| Planung nach Ende | erlaubt, aber Konflikt «Nach Vertragsende» (Wächter); Absenzen ausserhalb lehnt der Dialog ab | Verlängerung kann unterwegs sein – der Wächter sagt es, blockiert nicht |
| Saldo-Kette | `saldoKumuliert` ab **Systembeginn** (Tag nach `zeitUebertragPer`) über Jahresgrenzen | Leitstand, Jahresmatrix und App zeigen denselben Wert; der Übertrag ist der Startwert vor der Erfassung |
| Jahre | `vertragsjahre()`: Eintrittsjahr … Jahr des Vertragsendes, offen bis Folgejahr | Ferien fürs nächste Jahr planen, aber nicht bis 2099 blättern |

## Modell (`modules/personal/personal.model.ts`)

- `berechneJahr(mitarbeiter, jahr, quelle, mandant, heute, jetztMin)` → `MeinJahr` mit zwölf `JahrMonat` (Zustand
  `vor-systembeginn · nicht-angestellt · zukunft · laufend · vergangen`, Soll/Ist/Saldo, Abschluss, Tage mit Warnung),
  Jahrestotal, `kumuliertMin` (per Jahresende bzw. heute), `systembeginn`, `vertrag`, `ferien`.
- `standHeute()` → Gleitzeit heute, Ferienrest, Vertragstext, Tage bis zum Vertragsende.
- `vertragLabel()` → «Unbefristet seit 01.03.2019», «Befristet 01.08.2025 – 31.07.2029», «Auf Widerruf seit … · widerrufen per …».
- `buildJahresZeilen` (Jahresmatrix der Zeiterfassung) rechnet mit `berechneJahr` – eine Rechnung für Admin-Matrix, Dossier und App.

## Oberfläche

- **Leitstand**: Mitarbeiter-Dialog (Vertragsart mit Hinweistext, Notiz, Beginn, Ende mit Pflichthinweis), Personalakte (Vertrag als
  Fakten, Chip), Mitarbeitende-Tabelle (Status zuoberst, wenn das Ende naht), Dashboard-Karte «Abwesend heute» mit Liste «Verträge
  enden bald», Zeitkonto-Dossier mit Abschnitt **«Mein Jahr»** (Jahreswahl, Stand heute, Monatstabelle, Jahrestotal, CSV).
- **App** (Tab Zeit): Umschalter Woche · Monat · Jahr; Woche und Monat blätterbar (nicht in die Zukunft, nicht vor Systembeginn/Eintritt);
  Jahr mit Stand-heute-Karte, Monatsliste (Tipp öffnet den Monat), Jahrestotal, Ferien.

## Tests

`core/domain/personal.test.ts` (Vertrag, Vorlauf, Jahre, Pflichtfelder), `modules/personal/personal.model.test.ts` (Zustände,
Saldo-Kette, Stand heute, Ausgetretene), Konflikt «Vertragsende» in `konflikte.test.ts`; bestehende Jahresmatrix-Tests laufen
unverändert über die neue Rechnung. Stand 214 Tests.

## Offen

- `jh?` Bedeutung «auf Widerruf» (README §9, Frage 32).
- Phasen B–G des Master-Prompts.
