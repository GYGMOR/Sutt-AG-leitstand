/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Dialog.tsx                                 │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Modaler Dialog und Bestätigungsdialog (Löschen, Abmelden)             │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button, IconButton } from './Button';
import { cx } from './cx';
import styles from './Dialog.module.css';

// ── §1 · Dialog ──────────────────────────────────────────────────

interface DialogProps {
  open: boolean;
  onClose: () => void;
  titel: string;
  untertitel?: string;
  breite?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  /** Knöpfe rechts unten. */
  aktionen?: ReactNode;
}

export function Dialog({ open, onClose, titel, untertitel, breite = 'sm', children, aktionen }: DialogProps) {
  const titelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const vorherFokussiert = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    vorherFokussiert.current = document.activeElement;
    // jh› Fokus auf den ersten Knopf, danach zurück zum Auslöser – Tastaturpfad bleibt geschlossen.
    const erster = panelRef.current?.querySelector<HTMLElement>('button, input, select, textarea, [tabindex]');
    erster?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (vorherFokussiert.current instanceof HTMLElement) vorherFokussiert.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.schleier} onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titelId} className={cx(styles.dialog, styles[breite])}>
        <header className={styles.kopf}>
          <div>
            <h2 id={titelId} className={styles.titel}>
              {titel}
            </h2>
            {untertitel && <p className={styles.untertitel}>{untertitel}</p>}
          </div>
          <IconButton icon={X} label="Schliessen (Esc)" size="sm" onClick={onClose} />
        </header>
        <div className={styles.inhalt}>{children}</div>
        {aktionen && <footer className={styles.fuss}>{aktionen}</footer>}
      </div>
    </div>,
    document.body,
  );
}

// ── §2 · Bestätigung ─────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  titel: string;
  text: ReactNode;
  bestaetigen: string;
  gefaehrlich?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, titel, text, bestaetigen, gefaehrlich = false, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={titel}
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant={gefaehrlich ? 'danger' : 'primary'} onClick={onConfirm}>
            {bestaetigen}
          </Button>
        </>
      }
    >
      <p className={styles.text}>{text}</p>
    </Dialog>
  );
}

/* ◆ jh · eof */
