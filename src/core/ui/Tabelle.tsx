/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Tabelle.tsx                                │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Sortierbare Tabelle: Spalten als Definition, Zeile = Auswahl          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cx } from './cx';
import styles from './Tabelle.module.css';

// ── §1 · Typen ───────────────────────────────────────────────────

export interface Spalte<T> {
  id: string;
  label: string;
  render: (zeile: T) => ReactNode;
  /** Sortierwert – fehlt er, ist die Spalte nicht sortierbar. */
  sortWert?: (zeile: T) => string | number;
  breite?: string;
  align?: 'left' | 'right';
  mono?: boolean;
  /** Unter 760 px Containerbreite ausgeblendet. */
  nebensaechlich?: boolean;
}

export interface Sortierung {
  id: string;
  richtung: 'auf' | 'ab';
}

interface TabelleProps<T> {
  spalten: readonly Spalte<T>[];
  zeilen: readonly T[];
  zeilenId: (zeile: T) => string;
  label: string;
  aktivId?: string | null;
  onZeile?: (zeile: T) => void;
  standardSortierung?: Sortierung;
  zeilenKlasse?: (zeile: T) => string | undefined;
  leer?: ReactNode;
  /** Kompaktere Zeilen (Dossier-Listen). */
  dicht?: boolean;
}

// ── §2 · Sortieren ───────────────────────────────────────────────

function vergleiche(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'de-CH', { numeric: true, sensitivity: 'base' });
}

export function sortiereZeilen<T>(zeilen: readonly T[], spalten: readonly Spalte<T>[], sortierung: Sortierung | null): T[] {
  const spalte = sortierung ? spalten.find((kandidat) => kandidat.id === sortierung.id) : undefined;
  const wert = spalte?.sortWert;
  if (!sortierung || !wert) return [...zeilen];
  const faktor = sortierung.richtung === 'auf' ? 1 : -1;
  return [...zeilen].sort((a, b) => vergleiche(wert(a), wert(b)) * faktor);
}

// ── §3 · Komponente ──────────────────────────────────────────────

// jh› Eine Tabelle für alle Module: Spalten sind Daten, nicht Markup – sortieren, auswählen,
//     Tastatur (↵/Leertaste öffnet), nebensächliche Spalten verschwinden, wenn das Dossier Platz braucht.
export function Tabelle<T>({ spalten, zeilen, zeilenId, label, aktivId, onZeile, standardSortierung, zeilenKlasse, leer, dicht = false }: TabelleProps<T>) {
  const [sortierung, setSortierung] = useState<Sortierung | null>(standardSortierung ?? null);
  const sortiert = useMemo(() => sortiereZeilen(zeilen, spalten, sortierung), [zeilen, spalten, sortierung]);

  const umsortieren = (spalte: Spalte<T>) => {
    if (!spalte.sortWert) return;
    setSortierung((aktuell) => (aktuell?.id === spalte.id ? { id: spalte.id, richtung: aktuell.richtung === 'auf' ? 'ab' : 'auf' } : { id: spalte.id, richtung: 'auf' }));
  };

  const tastatur = (event: KeyboardEvent<HTMLTableRowElement>, zeile: T) => {
    if (!onZeile) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onZeile(zeile);
    }
  };

  return (
    <div className={styles.rahmen}>
      <table className={cx(styles.tabelle, dicht && styles.dicht)} aria-label={label}>
        <thead>
          <tr>
            {spalten.map((spalte) => {
              const aktiv = sortierung?.id === spalte.id;
              const SortIcon = aktiv ? (sortierung?.richtung === 'auf' ? ArrowUp : ArrowDown) : ArrowUpDown;
              return (
                <th key={spalte.id} scope="col" className={cx(spalte.nebensaechlich && styles.nebensaechlich, spalte.align === 'right' && styles.rechts)} style={spalte.breite ? { width: spalte.breite } : undefined}>
                  {spalte.sortWert ? (
                    <button type="button" className={cx(styles.sortKnopf, aktiv && styles.sortAktiv)} onClick={() => umsortieren(spalte)} aria-sort={aktiv ? (sortierung?.richtung === 'auf' ? 'ascending' : 'descending') : undefined}>
                      {spalte.label}
                      <SortIcon size={12} strokeWidth={1.5} aria-hidden />
                    </button>
                  ) : (
                    <span className={styles.kopfText}>{spalte.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortiert.map((zeile) => {
            const id = zeilenId(zeile);
            const istAktiv = aktivId === id;
            return (
              <tr
                key={id}
                className={cx(styles.zeile, onZeile && styles.klickbar, istAktiv && styles.aktiv, zeilenKlasse?.(zeile))}
                tabIndex={onZeile ? 0 : undefined}
                aria-selected={onZeile ? istAktiv : undefined}
                onClick={onZeile ? () => onZeile(zeile) : undefined}
                onKeyDown={(event) => tastatur(event, zeile)}
              >
                {spalten.map((spalte) => (
                  <td key={spalte.id} className={cx(spalte.nebensaechlich && styles.nebensaechlich, spalte.align === 'right' && styles.rechts, spalte.mono && styles.mono)}>
                    {spalte.render(zeile)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {sortiert.length === 0 && <div className={styles.leer}>{leer ?? 'Keine Einträge.'}</div>}
    </div>
  );
}

/* ◆ jh · eof */
