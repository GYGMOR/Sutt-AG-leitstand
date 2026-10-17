/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/ProtokollPopover.tsx                 │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Änderungsprotokoll: Zeit · Text · Benutzer, Undo/Redo                 │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Redo2, Undo2 } from 'lucide-react';
import { splitZeitpunkt } from '../../core/datum';
import { formatZeit } from '../../core/format';
import { MOD_LABEL } from '../../core/hooks/useHotkey';
import { Button } from '../../core/ui/Button';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { Popover } from '../../core/ui/Popover';
import { cx } from '../../core/ui/cx';
import type { ProtokollEintrag } from './store/dispo.reducer';
import styles from './ProtokollPopover.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface ProtokollPopoverProps {
  anchor: HTMLElement | null;
  open: boolean;
  protokoll: readonly ProtokollEintrag[];
  zukunft: readonly ProtokollEintrag[];
  onClose: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

function Zeile({ eintrag, verworfen = false }: { eintrag: ProtokollEintrag; verworfen?: boolean }) {
  return (
    <li className={cx(styles.zeile, verworfen && styles.verworfen)}>
      <span className={styles.zeit}>{formatZeit(splitZeitpunkt(eintrag.zeit).minuten)}</span>
      <span className={styles.text}>{eintrag.text}</span>
      <span className={styles.benutzer}>({eintrag.benutzer})</span>
    </li>
  );
}

export function ProtokollPopover({ anchor, open, protokoll, zukunft, onClose, onUndo, onRedo }: ProtokollPopoverProps) {
  return (
    <Popover anchor={anchor} open={open} onClose={onClose} placement="bottom-end" breite={380} label="Änderungsprotokoll">
      <div className={styles.protokoll}>
        <header className={styles.kopf}>
          <CapsLabel>Änderungsprotokoll</CapsLabel>
          <div className={styles.knoepfe}>
            <Button variant="ghost" size="sm" icon={Undo2} disabled={protokoll.length === 0} onClick={onUndo} title={`Rückgängig (${MOD_LABEL} Z)`}>
              Rückgängig
            </Button>
            <Button variant="ghost" size="sm" icon={Redo2} disabled={zukunft.length === 0} onClick={onRedo} title={`Wiederherstellen (${MOD_LABEL} Y)`}>
              Wiederherstellen
            </Button>
          </div>
        </header>
        <ul className={styles.liste}>
          {/* jh› Verworfene Schritte stehen oben, grau – ein Blick zeigt, was Redo zurückbringt. */}
          {[...zukunft].reverse().map((eintrag) => (
            <Zeile key={eintrag.id} eintrag={eintrag} verworfen />
          ))}
          {protokoll.map((eintrag) => (
            <Zeile key={eintrag.id} eintrag={eintrag} />
          ))}
          {protokoll.length === 0 && zukunft.length === 0 && <li className={styles.leer}>Noch keine Planänderung in dieser Sitzung.</li>}
        </ul>
      </div>
    </Popover>
  );
}

/* ◆ jh · eof */
