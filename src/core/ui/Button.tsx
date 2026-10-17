/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/Button.tsx                                 │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Schaltflächen: Primär (Signal), Sekundär, Ghost, Gefahr, Icon         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';
import styles from './Button.module.css';

// ── §1 · Button ──────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: LucideIcon;
  iconAfter?: LucideIcon;
  children: ReactNode;
}

// jh› Primär = Signal-Orange mit Anthrazit-Schrift: Weiss auf #F86C04
//     erreicht nur 2.9:1 Kontrast, Anthrazit 5.9:1 (WCAG AA).
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconAfter: IconAfter, children, className, type = 'button', ...rest },
  ref,
) {
  // jh› Icons im System nur 16 oder 20 px – in Buttons immer 16.
  return (
    <button ref={ref} type={type} className={cx(styles.button, styles[variant], styles[size], className)} {...rest}>
      {Icon && <Icon size={16} strokeWidth={1.5} aria-hidden />}
      <span>{children}</span>
      {IconAfter && <IconAfter size={16} strokeWidth={1.5} aria-hidden />}
    </button>
  );
});

// ── §2 · IconButton ──────────────────────────────────────────────

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  label: string;
  size?: 'sm' | 'md';
  tone?: 'light' | 'chrome' | 'danger';
  /** Gedrückt-Zustand für Umschalter (z. B. Ansicht, Filter). */
  pressed?: boolean;
}

// jh› forwardRef, damit Popover den Knopf als Anker nutzen können.
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, size = 'md', tone = 'light', pressed, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cx(styles.iconButton, styles[size], tone === 'chrome' && styles.chrome, tone === 'danger' && styles.iconDanger, pressed && styles.pressed, className)}
      {...rest}
    >
      <Icon size={size === 'sm' ? 16 : 20} strokeWidth={1.5} aria-hidden />
    </button>
  );
});

/* ◆ jh · eof */
