/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/kunden/HinweisFelder.tsx                   │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Hinweise bearbeiten: Art wählen, Text, entfernen – Kunde und Haus     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { HINWEIS_ARTEN, HINWEIS_LABEL } from '../../core/domain/stammdaten';
import type { HinweisArt, KundenHinweis } from '../../core/domain/stammdaten';
import { IconButton } from '../../core/ui/Button';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { Chip } from '../../core/ui/Chip';
import { Auswahl, Eingabe } from '../../core/ui/Form';
import { HINWEIS_ICON, HINWEIS_TON } from '../dispo/KundenChips';
import styles from './KundenPage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface HinweisFelderProps {
  hinweise: readonly KundenHinweis[];
  onChange: (hinweise: readonly KundenHinweis[]) => void;
}

export function HinweisFelder({ hinweise, onChange }: HinweisFelderProps) {
  const [art, setArt] = useState<HinweisArt>('parkplatz');
  const [text, setText] = useState('');

  const hinzufuegen = () => {
    const inhalt = text.trim();
    if (!inhalt) return;
    onChange([...hinweise, { art, text: inhalt }]);
    setText('');
  };

  return (
    <div className={styles.hinweisFelder}>
      <CapsLabel as="span">Hinweise für den Techniker</CapsLabel>
      {hinweise.length > 0 && (
        <ul className={styles.hinweisListe}>
          {hinweise.map((hinweis, index) => (
            <li key={`${hinweis.art}-${index}`}>
              <Chip icon={HINWEIS_ICON[hinweis.art]} tone={HINWEIS_TON[hinweis.art]}>
                {HINWEIS_LABEL[hinweis.art]}
              </Chip>
              <span className={styles.hinweisText}>{hinweis.text}</span>
              <IconButton icon={Trash2} label="Hinweis entfernen" size="sm" onClick={() => onChange(hinweise.filter((_, position) => position !== index))} />
            </li>
          ))}
        </ul>
      )}
      <div className={styles.hinweisNeu}>
        <Auswahl value={art} aria-label="Art des Hinweises" onChange={(event) => setArt(event.target.value as HinweisArt)}>
          {HINWEIS_ARTEN.map((eintrag) => (
            <option key={eintrag} value={eintrag}>
              {HINWEIS_LABEL[eintrag]}
            </option>
          ))}
        </Auswahl>
        <Eingabe value={text} placeholder="z. B. Schlüssel beim Hauswart, Mo–Fr 8–11 Uhr" aria-label="Hinweistext" onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), hinzufuegen())} />
        <IconButton icon={Plus} label="Hinweis hinzufügen" size="md" onClick={hinzufuegen} disabled={!text.trim()} />
      </div>
    </div>
  );
}

/* ◆ jh · eof */
