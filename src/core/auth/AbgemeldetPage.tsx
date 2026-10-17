/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/AbgemeldetPage.tsx                       │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  «Sie wurden abgemeldet» mit Knopf «Erneut anmelden»                   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/Button';
import { AuthLayout } from './AuthLayout';
import styles from './AbgemeldetPage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

export function AbgemeldetPage() {
  const navigate = useNavigate();
  return (
    <AuthLayout>
      <div className={styles.inhalt}>
        <h1 className={styles.titel}>Sie wurden abgemeldet.</h1>
        <p className={styles.text}>Die Sitzung ist beendet. Ungespeicherte Planänderungen im Mockup wurden verworfen.</p>
        <Button variant="primary" icon={LogIn} onClick={() => navigate('/login')}>
          Erneut anmelden
        </Button>
      </div>
    </AuthLayout>
  );
}

/* ◆ jh · eof */
