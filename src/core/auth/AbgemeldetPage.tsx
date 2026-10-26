/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/AbgemeldetPage.tsx                       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  «Sie wurden abgemeldet» – manuell oder nach Inaktivität               │
   └────────────────────────────────────────────────────────────────────────┘ */

import { LogIn } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../ui/Button';
import { AuthLayout } from './AuthLayout';
import type { AbmeldeZustand } from './RequireAuth';
import styles from './AbgemeldetPage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

export function AbgemeldetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const inaktiv = (location.state as AbmeldeZustand | null)?.grund === 'inaktiv';
  return (
    <AuthLayout>
      <div className={styles.inhalt}>
        <h1 className={styles.titel}>{inaktiv ? 'Automatisch abgemeldet.' : 'Sie wurden abgemeldet.'}</h1>
        <p className={styles.text}>
          {inaktiv
            ? 'Die Sitzung ist wegen Inaktivität abgelaufen. Der Stand des Leitstands bleibt erhalten – nach der Anmeldung geht es dort weiter.'
            : 'Die Sitzung ist beendet. Ungespeicherte Planänderungen im Mockup wurden verworfen.'}
        </p>
        <Button variant="primary" icon={LogIn} onClick={() => navigate('/login')}>
          Erneut anmelden
        </Button>
      </div>
    </AuthLayout>
  );
}

/* ◆ jh · eof */
