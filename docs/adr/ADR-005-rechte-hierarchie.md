# ADR-005: Rechte – Rolle als Startpunkt, Konto als Ausnahme, Organigramm als Umfang

**Status:** Accepted
**Date:** 2026-10-26
**Deciders:** JH, Sutt AG (Rollenzuschnitt ist zu bestätigen – jh?)

## Context

Mit Zeiterfassung, Absenzen und Personalakten hält der Leitstand erstmals Daten *über* Mitarbeitende, nicht nur Arbeitsdaten.
«Wer darf was von wem sehen oder ändern?» muss je Aktion beantwortbar sein, für Vorgesetzte ohne Büro-Rolle (Teamleiter im
Aussendienst) genauso wie für die Administration, die Gesundheitsdaten gerade *nicht* sehen soll (Need-to-know, DSG Art. 6 Abs. 2).

## Decision

- **Recht = Bereich:Aktion** (`zeit:korrigieren`, `personal:gesundheit`, …), Katalog in `core/berechtigung/rechte.ts`. Jede
  schreibende Aktion und jede Sicht auf Personendaten prüft genau einen Eintrag (`hatRecht`).
- **Rolle → Rechteprofil** als Startpunkt: Aussendienst ⊂ Disposition ⊂ Büro; Administration = alle Rechte ausser
  `personal:gesundheit`.
- **Konto → Zusatz und Entzug**: einzelne Rechte je Konto dazu oder weg; der Rollenwechsel bereinigt Ausnahmen, die zur neuen
  Rolle nichts ändern. Eigene Rechte ändert niemand selbst (Vier-Augen-Prinzip).
- **Umfang je Personenbereich** (`zeit`, `absenzen`, `personal`): eigene · Team · alle. «Team» sind alle direkt und indirekt
  Unterstellten nach `Mitarbeiter.vorgesetzterId` – das Organigramm ist die Berechtigungsgrenze, nicht eine zweite Liste.
- **Module** werden dreistufig freigegeben: Register (gebaut), Mandant (Einstellungen → Module), Rolle (Register). Rechte je
  Aktion prüft dann das Modul.
- Die Auswertung (`useRechte`) nimmt die Rolle aus der Sitzung (Rollenwechsel zur Demo), Zusatz/Entzug/Umfang aus dem Konto im
  Stand – so greift eine Änderung der Administration sofort, in allen Fenstern.

## Options Considered

### Option A: Reine Rollen (RBAC)
**Pros:** Einfach zu erklären. **Cons:** Jede Ausnahme («SK darf Zeiten ihres Teams genehmigen») braucht eine neue Rolle;
Gesundheitsdaten lassen sich nicht sauber aus der Administration herausnehmen.

### Option B: Attribute (ABAC) mit Regeln
**Pros:** Beliebig fein. **Cons:** Regeln sind für die Administration nicht lesbar; keine Matrix, die man ausdrucken kann.

### Option C: Rolle + Zusatz/Entzug + Umfang aus dem Organigramm (gewählt)
**Pros:** Die Rechte-Matrix im Konto zeigt jeden Zustand (aus der Rolle, Zusatz, entzogen, nicht enthalten); Team ergibt sich
aus Daten, die ohnehin gepflegt werden. **Cons:** Zwei Quellen (Rolle, Konto) – gelöst durch `herkunftVon()` je Recht.

## Consequences

- `darfPerson()` ist reine Logik und getestet; UI-Schlösser sind Folge, nicht Ursache.
- Vorgesetzte sehen Zeiten und Absenzen ihres Teams, Büro alle; Krankheit/Unfall erscheinen ohne `personal:gesundheit` als
  «Abwesend» (`useStandFuerSicht`, `absenzenFuerSicht`).
- Offen (jh?): ob Lernende und Teamleiter eigene Rollen brauchen oder Zusatzrechte genügen.

## Action Items
1. [x] Katalog, Profile, `rechteVon`, `darfPerson`, Tests.
2. [x] Rechte-Matrix und Umfang im Konto-Dossier, Organigramm, Modulfreigabe je Mandant.
3. [ ] Rollenzuschnitt mit Sutt abgleichen (README §9).
