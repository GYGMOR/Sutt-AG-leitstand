/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/rapport/ZurueckDialog.tsx                  │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  «Zurück an Techniker»: Bemerkung des Büros, Rapport wieder offen      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import type { Rapport } from '../../core/domain/rapport';
import { Button } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Feld, Textbereich } from '../../core/ui/Form';
import styles from './ZurueckDialog.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface ZurueckDialogProps {
  open: boolean;
  rapport: Rapport;
  technikerName: string;
  onConfirm: (bemerkung: string) => void;
  onClose: () => void;
}

const MINDESTLAENGE = 3;

// jh› Ohne Bemerkung kein Zurück: der Techniker muss wissen, was er ändern soll.
export function ZurueckDialog({ open, rapport, technikerName, onConfirm, onClose }: ZurueckDialogProps) {
  const [bemerkung, setBemerkung] = useState('');

  useEffect(() => {
    if (open) setBemerkung('');
  }, [open]);

  const bereit = bemerkung.trim().length >= MINDESTLAENGE;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={`${rapport.nummer} zurück an ${technikerName}`}
      untertitel="Der Rapport wird wieder bearbeitbar; eine vorhandene Unterschrift verfällt."
      breite="sm"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" icon={Undo2} onClick={() => onConfirm(bemerkung.trim())} disabled={!bereit}>
            Zurückgeben
          </Button>
        </>
      }
    >
      <div className={styles.inhalt}>
        <Feld
          label="Was fehlt oder stimmt nicht?"
          render={(id) => (
            <Textbereich
              id={id}
              rows={4}
              value={bemerkung}
              autoFocus
              placeholder="z. B. Arbeitszeit prüfen – 4 h für den Pumpentausch wirkt hoch; Foto vom Typenschild fehlt."
              onChange={(event) => setBemerkung(event.target.value)}
            />
          )}
        />
        <p className={styles.hinweis}>Der Techniker sieht die Bemerkung oben im Rapport. Nach der Korrektur kommt der Rapport wieder zur Prüfung.</p>
      </div>
    </Dialog>
  );
}

/* ◆ jh · eof */
