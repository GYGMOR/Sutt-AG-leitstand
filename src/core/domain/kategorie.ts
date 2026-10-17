/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/domain/kategorie.ts                           │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Auftragskategorien – Farbe in der Fläche (wie Outlook-Kategorien)     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { FileText, KeyRound, PaintRoller, ShieldCheck, Siren, Truck, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Auftragsart, Dringlichkeit } from './auftrag';

// ── §1 · Typen ───────────────────────────────────────────────────

export type Kategorie =
  | 'reparatur'
  | 'montage'
  | 'lieferung'
  | 'garantie'
  | 'mietgeraet'
  | 'malerarbeiten'
  | 'offerte'
  | 'notfall';

export interface KategorieMeta {
  id: Kategorie;
  label: string;
  /** Kurzform für enge Blöcke und Pillen. */
  kurz: string;
  icon: LucideIcon;
}

// ── §2 · Katalog ─────────────────────────────────────────────────

// jh? «Malerarbeiten» steht im Funktionsumfang – bietet Sutt das selbst an
//     oder vermittelt sie nur den Maler nach einem Wasserschaden?
export const KATEGORIEN: readonly KategorieMeta[] = [
  { id: 'reparatur', label: 'Reparatur', kurz: 'Rep.', icon: Wrench },
  { id: 'montage', label: 'Installation / Montage', kurz: 'Montage', icon: Wrench },
  { id: 'lieferung', label: 'Lieferung', kurz: 'Lief.', icon: Truck },
  { id: 'garantie', label: 'Garantie', kurz: 'Gar.', icon: ShieldCheck },
  { id: 'mietgeraet', label: 'Mietgerät', kurz: 'Miete', icon: KeyRound },
  { id: 'malerarbeiten', label: 'Malerarbeiten', kurz: 'Maler', icon: PaintRoller },
  { id: 'offerte', label: 'Offerte / Besichtigung', kurz: 'Offerte', icon: FileText },
  { id: 'notfall', label: 'Notfall', kurz: 'Notfall', icon: Siren },
];

export const KATEGORIE_LABEL: Readonly<Record<Kategorie, string>> = Object.fromEntries(
  KATEGORIEN.map((meta) => [meta.id, meta.label]),
) as Record<Kategorie, string>;

export function kategorieMeta(id: Kategorie): KategorieMeta {
  const meta = KATEGORIEN.find((kandidat) => kandidat.id === id);
  if (!meta) throw new Error(`Kategorie ${id} unbekannt`);
  return meta;
}

// ── §3 · Ableitung ───────────────────────────────────────────────

const KATEGORIE_VON_ART: Readonly<Record<Auftragsart, Kategorie>> = {
  Reparatur: 'reparatur',
  Service: 'reparatur',
  Montage: 'montage',
  Lieferung: 'lieferung',
  Garantie: 'garantie',
  Mietgerät: 'mietgeraet',
  Malerarbeiten: 'malerarbeiten',
  Abklärung: 'offerte',
};

/** Standard-Kategorie aus Auftragsart; ein Notfall überstimmt alles. */
export function kategorieFor(art: Auftragsart, dringlichkeit: Dringlichkeit): Kategorie {
  if (dringlichkeit === 'notfall') return 'notfall';
  return KATEGORIE_VON_ART[art];
}

/* ◆ jh · eof */
