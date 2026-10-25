/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/rapport/rapportStatus.ts                   │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Eine Sprache für Rapport- und Abschlussstatus: Icon und Chip-Ton      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { BadgeCheck, FileCheck, FileText, Receipt, Signature } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RapportStatus } from '../../core/domain/auftrag';
import type { Abschlussart } from '../../core/domain/rapport';
import type { ChipTone } from '../../core/ui/Chip';

// ── §1 · Rapportstatus ───────────────────────────────────────────

// jh› Panel Erledigt, Akte und Modul Rapporte zeigen denselben Chip – sonst lernt
//     der Disponent drei Farbsprachen für dieselbe Sache.
export const RAPPORT_ICON: Readonly<Record<RapportStatus, LucideIcon>> = {
  offen: FileText,
  erstellt: FileCheck,
  unterschrieben: Signature,
  freigegeben: BadgeCheck,
  verrechnet: Receipt,
};

export const RAPPORT_TON: Readonly<Record<RapportStatus, ChipTone>> = {
  offen: 'signal',
  erstellt: 'neutral',
  unterschrieben: 'ok',
  freigegeben: 'ok',
  verrechnet: 'mute',
};

// ── §2 · Abschluss ───────────────────────────────────────────────

export const ABSCHLUSS_TON: Readonly<Record<Abschlussart, ChipTone>> = {
  erledigt: 'ok',
  folgetermin: 'signal',
  'teil-bestellt': 'signal',
  'nicht-angetroffen': 'danger',
};

/* ◆ jh · eof */
