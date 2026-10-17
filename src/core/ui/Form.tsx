/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Form.tsx                                   │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Formularbausteine: Feld, Eingabe, Auswahl, Textbereich, Schalter      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { CapsLabel } from './CapsLabel';
import { cx } from './cx';
import styles from './Form.module.css';

// ── §1 · Feld ────────────────────────────────────────────────────

interface FeldProps {
  label: string;
  hinweis?: ReactNode;
  fehler?: string;
  /** Wird dem Kind als `id` übergeben – über `render`. */
  render: (id: string) => ReactNode;
  className?: string;
}

export function Feld({ label, hinweis, fehler, render, className }: FeldProps) {
  const id = useId();
  return (
    <div className={cx(styles.feld, fehler && styles.feldFehler, className)}>
      <CapsLabel as="label" htmlFor={id}>
        {label}
      </CapsLabel>
      {render(id)}
      {fehler && (
        <p className={styles.fehler} role="alert">
          {fehler}
        </p>
      )}
      {!fehler && hinweis && <p className={styles.hinweis}>{hinweis}</p>}
    </div>
  );
}

// ── §2 · Eingaben ────────────────────────────────────────────────

type EingabeProps = InputHTMLAttributes<HTMLInputElement> & { mono?: boolean; nachsatz?: ReactNode };

export const Eingabe = forwardRef<HTMLInputElement, EingabeProps>(function Eingabe({ className, mono = false, nachsatz, ...rest }, ref) {
  if (!nachsatz) return <input ref={ref} className={cx(styles.eingabe, mono && styles.mono, className)} {...rest} />;
  return (
    <div className={styles.mitNachsatz}>
      <input ref={ref} className={cx(styles.eingabe, mono && styles.mono, className)} {...rest} />
      <span className={styles.nachsatz}>{nachsatz}</span>
    </div>
  );
});

type AuswahlProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Auswahl({ className, children, ...rest }: AuswahlProps) {
  return (
    <select className={cx(styles.eingabe, styles.auswahl, className)} {...rest}>
      {children}
    </select>
  );
}

type TextbereichProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textbereich({ className, ...rest }: TextbereichProps) {
  return <textarea className={cx(styles.eingabe, styles.textbereich, className)} {...rest} />;
}

// ── §3 · Schalter ────────────────────────────────────────────────

interface SchalterProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function Schalter({ checked, onChange, children, className }: SchalterProps) {
  return (
    <label className={cx(styles.schalter, className)}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className={styles.kasten} />
      <span>{children}</span>
    </label>
  );
}

/* ◆ jh · eof */
