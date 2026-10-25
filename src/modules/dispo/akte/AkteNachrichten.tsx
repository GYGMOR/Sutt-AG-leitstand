/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/akte/AkteNachrichten.tsx             │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Gesendete SMS und Mails zum Auftrag (Mock-Versand), neueste zuerst    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Mail, MessageSquareText } from 'lucide-react';
import { NACHRICHT_LABEL } from '../../../core/domain/nachricht';
import type { Nachricht } from '../../../core/domain/nachricht';
import { formatZeitpunktKurz } from '../../../core/format';
import styles from './AkteNachrichten.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface AkteNachrichtenProps {
  nachrichten: readonly Nachricht[];
}

export function AkteNachrichten({ nachrichten }: AkteNachrichtenProps) {
  const sortiert = [...nachrichten].sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt));
  return (
    <ul className={styles.liste}>
      {sortiert.map((nachricht) => (
        <li key={nachricht.id} className={styles.nachricht}>
          <span className={styles.kanal} title={nachricht.kanal === 'sms' ? 'SMS' : 'E-Mail'}>
            {nachricht.kanal === 'sms' ? <MessageSquareText size={16} strokeWidth={1.5} aria-hidden /> : <Mail size={16} strokeWidth={1.5} aria-hidden />}
          </span>
          <div className={styles.text}>
            <span className={styles.kopf}>
              <strong>{NACHRICHT_LABEL[nachricht.art]}</strong>
              <span className={styles.mono}>{formatZeitpunktKurz(nachricht.zeitpunkt)}</span>
              <span className={styles.von}>{nachricht.von}</span>
            </span>
            <span className={styles.an}>
              an {nachricht.empfaenger} · <span className={styles.mono}>{nachricht.an}</span>
            </span>
            <p className={styles.inhalt}>{nachricht.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ◆ jh · eof */
