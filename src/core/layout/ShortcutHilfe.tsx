/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/ShortcutHilfe.tsx                      │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Übersicht der Tastaturkürzel (?)                                      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { MOD_LABEL } from '../hooks/useHotkey';
import { Dialog } from '../ui/Dialog';
import { Kbd } from '../ui/Kbd';
import styles from './ShortcutHilfe.module.css';

// ── §1 · Kürzel ──────────────────────────────────────────────────

interface Kuerzel {
  tasten: readonly string[];
  text: string;
}

const GRUPPEN: readonly { titel: string; kuerzel: readonly Kuerzel[] }[] = [
  {
    titel: 'Navigation',
    kuerzel: [
      { tasten: ['T'], text: 'Heute' },
      { tasten: ['←', '→'], text: 'Zeitraum zurück / vor' },
      { tasten: ['1', '…', '4'], text: 'Plantafel · Kalender · Liste · Karte' },
      { tasten: ['['], text: 'Seitenleiste ein-/ausklappen' },
      { tasten: [']'], text: 'Rechtes Panel ein-/ausklappen' },
    ],
  },
  {
    titel: 'Arbeiten',
    kuerzel: [
      { tasten: ['N'], text: 'Neuer Auftrag (Telefon-Schnellerfassung)' },
      { tasten: [MOD_LABEL, 'K'], text: 'Kommandopalette: suchen und handeln' },
      { tasten: [MOD_LABEL, 'Z'], text: 'Rückgängig' },
      { tasten: [MOD_LABEL, 'Y'], text: 'Wiederherstellen' },
      { tasten: ['Esc'], text: 'Akte, Palette oder Dialog schliessen' },
    ],
  },
  {
    titel: 'Plantafel',
    kuerzel: [
      { tasten: ['Leertaste'], text: 'Markierten Einsatz aufnehmen (Tastatur-Drag)' },
      { tasten: ['←', '→'], text: 'Beim Ziehen: ± ein Rasterschritt' },
      { tasten: ['↑', '↓'], text: 'Beim Ziehen: Technikerzeile wechseln' },
      { tasten: ['↵'], text: 'Ablegen' },
      { tasten: [MOD_LABEL, 'Rad'], text: 'Rasterdichte 15 / 30 / 60 min' },
    ],
  },
];

// ── §2 · Komponente ──────────────────────────────────────────────

interface ShortcutHilfeProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutHilfe({ open, onClose }: ShortcutHilfeProps) {
  return (
    <Dialog open={open} onClose={onClose} titel="Tastaturkürzel" untertitel="Alles ist auch ohne Maus erreichbar" breite="md">
      <div className={styles.raster}>
        {GRUPPEN.map((gruppe) => (
          <section key={gruppe.titel} className={styles.gruppe}>
            <h3 className={styles.titel}>{gruppe.titel}</h3>
            <dl className={styles.liste}>
              {gruppe.kuerzel.map((eintrag) => (
                <div key={eintrag.text} className={styles.zeile}>
                  <dt>
                    <Kbd keys={eintrag.tasten} />
                  </dt>
                  <dd>{eintrag.text}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}

/* ◆ jh · eof */
