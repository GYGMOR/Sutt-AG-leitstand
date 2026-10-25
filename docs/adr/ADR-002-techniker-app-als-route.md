# ADR-002: Techniker-App als Route `/app` in derselben SPA

**Status:** Accepted · **Datum:** 2026-10-25 · **Entscheid:** ◆ JH (Projektleitung)

## Kontext

Die Techniker brauchen eine Handy-Oberfläche: Tagesplan, Statusknöpfe, Servicerapport mit Fotos und Unterschrift.
Sie teilt Domäne, Store, Tokens und Komponenten mit dem Leitstand. Offen war, ob das eine zweite Anwendung
(eigenes Vite-Projekt, eigene Auslieferung) oder ein Bereich der bestehenden SPA wird. Randbedingungen: ein
Entwicklungstag, kein Backend, Demo auf dem Desktop im Telefonrahmen neben der Plantafel.

## Entscheid

`/app` ist eine Route derselben SPA mit eigenem Layout (`modules/app/`), ohne `AppShell`. Rolle Aussendienst landet
nach dem Login direkt dort; Innendienst erreicht sie über die Seitenleiste («Techniker-App») und das Benutzermenü
(«Als Techniker ansehen», Technikerwahl per `?als=T-MB`). Auf Bildschirmen ab 720 px erscheint sie in einem
Telefonrahmen (`?rahmen=0` schaltet ihn ab). Später kann derselbe Code als PWA installiert werden.

## Optionen

### A · Route in derselben SPA (gewählt)
| Dimension | Einschätzung |
| --- | --- |
| Komplexität | niedrig – Routing, eigenes Layout, Rollen-Weiche |
| Kosten | keine zusätzliche Auslieferung |
| Skalierung | Bundle wächst um ~60 kB; Code-Splitting per lazy Route |
| Vertrautheit | hoch |

**Pro:** ein Store, ein Build, ein Login, Zwei-Fenster-Sync trivial, Komponenten (Chips, Typenschild, Fotos) wiederverwendbar.
**Contra:** Desktop-Bundle enthält App-Code (lazy abgefedert); Mobile-Layout muss im Desktop-Projekt gepflegt werden.

### B · Zweites Vite-Projekt (Monorepo-Paket)
| Dimension | Einschätzung |
| --- | --- |
| Komplexität | mittel bis hoch – Workspace, geteiltes Paket für `core/`, zwei Builds |
| Kosten | zweite Auslieferung, zweite Signatur-/Kontrastläufe |
| Skalierung | sauber getrennt, kleinstes Bundle |
| Vertrautheit | mittel |

**Pro:** klare Trennung, kleineres Handy-Bundle. **Contra:** ohne Backend kein gemeinsamer Stand (nur über
`localStorage` derselben Origin – was wieder dieselbe SPA voraussetzt); Mehraufwand ohne Nutzen im Mockup.

### C · Native/Expo-App
**Pro:** Kamera, Offline, Push nativ. **Contra:** zweiter Technologiestapel, nichts wiederverwendbar, kein Backend
zum Anbinden – frühestens nach dem API-Schritt sinnvoll.

## Abwägung

Im Mockup zählt der gemeinsame Stand und das Tempo. A nutzt beides. Die Grenze bleibt sauber, wenn `modules/app/`
nur über den Dispo-Store und `core/` spricht – kein Import aus `modules/dispo/views`. Die Entscheidung für eine PWA
oder native App fällt mit der API-Entscheidung, nicht vorher.

## Konsequenzen

- Leichter: Demo (zwei Fenster, ein Login), Wiederverwendung, Tests.
- Schwerer: Disziplin bei Importen; Mobile-CSS lebt neben Desktop-CSS (Tokens helfen).
- Zu revidieren: PWA-Manifest/Service-Worker und Offline-Warteschlange beim API-Schritt (`jh#` folgt).

## Massnahmen

1. [x] Modul `app` im Register, Route `/app/*` lazy, Rollen-Weiche in `LoginPage`.
2. [x] Eigenes Layout `AppLayout` mit Telefonrahmen auf dem Desktop.
3. [ ] PWA-Manifest beim API-Schritt.
