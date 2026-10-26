/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/rahmen/navigation.ts                           │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Bereiche der App: vier Tabs am Handy, alle Einträge am Rand breit     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { CalendarCheck, CalendarRange, Camera, Package, Route, ScanLine, Timer, TreePalm, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── §1 · Einträge ────────────────────────────────────────────────

export interface NavEintrag {
  pfad: string;
  label: string;
  icon: LucideIcon;
  /** In der Tableiste am Handy (höchstens vier – der fünfte Platz ist «Mehr»). */
  haupt: boolean;
  /** Exakter Pfadvergleich (Heute = «/»). */
  ende?: boolean;
  beschreibung: string;
}

// jh› Vier Tabs sind der Daumen-Radius: Heute, Tour, Zeit, Kamera. Alles andere liegt unter «Mehr»
//     und ab 900 px Breite sichtbar am linken Rand – dieselbe Liste, andere Form.
export const NAVIGATION: readonly NavEintrag[] = [
  { pfad: '/', label: 'Heute', icon: CalendarCheck, haupt: true, ende: true, beschreibung: 'Einsätze von heute, Status melden' },
  { pfad: '/tour', label: 'Tour', icon: Route, haupt: true, beschreibung: 'Reihenfolge, Fahrzeiten, Karte, Navigation' },
  { pfad: '/zeit', label: 'Zeit', icon: Timer, haupt: true, beschreibung: 'Stempeluhr, Woche, Monat, Nachtragen' },
  { pfad: '/kamera', label: 'Kamera', icon: Camera, haupt: true, beschreibung: 'Fotos zum Einsatz, Typenschild' },
  { pfad: '/scannen', label: 'Scannen', icon: ScanLine, haupt: false, beschreibung: 'Barcode, QR, Artikel, Auftrag' },
  { pfad: '/woche', label: 'Woche', icon: CalendarRange, haupt: false, beschreibung: 'Die nächsten sieben Tage' },
  { pfad: '/fahrzeug', label: 'Fahrzeug', icon: Package, haupt: false, beschreibung: 'Bestand an Bord, Verbrauch, Nachschub' },
  { pfad: '/absenzen', label: 'Absenzen', icon: TreePalm, haupt: false, beschreibung: 'Ferien beantragen, Ferienkonto' },
  { pfad: '/profil', label: 'Profil', icon: UserRound, haupt: false, beschreibung: 'Konto, Darstellung, Abmelden' },
];

export const HAUPT_NAVIGATION: readonly NavEintrag[] = NAVIGATION.filter((eintrag) => eintrag.haupt);
export const WEITERE_NAVIGATION: readonly NavEintrag[] = NAVIGATION.filter((eintrag) => !eintrag.haupt);

/* ◆ jh · eof */
