/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/auth/IdentitaetDialog.tsx                     │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Mock-Anbieter: «Konto wählen» statt Microsoft- oder Google-Seite      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import type { Sitzung } from './auth.types';
import { anmeldenMitIdentitaet, listIdentitaeten } from './authStore';
import { ANBIETER_INFO } from './identitaet';
import type { IdentitaetsAnbieter, IdentitaetsClaims } from './identitaet';
import styles from './LoginPage.module.css';

// ── §1 · Dialog ──────────────────────────────────────────────────

interface IdentitaetDialogProps {
  anbieter: IdentitaetsAnbieter | null;
  bleibtAngemeldet: boolean;
  onClose: () => void;
  onAngemeldet: (sitzung: Sitzung) => void;
}

function initialen(claims: IdentitaetsClaims): string {
  return claims.name
    .split(/\s+/)
    .map((teil) => teil.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// jh# 020 Echter OIDC-Ablauf (Discovery-Dokument, PKCE, ID-Token gegen JWKS prüfen) statt Mock-Dialog;
//         die Zuordnung Claims → Konto bleibt kontoAusIdentitaet().
// jh› Im Produkt öffnet sich hier die Anmeldeseite des Anbieters (OIDC mit PKCE, MFA beim Anbieter) und
//     liefert ein ID-Token. Der Mock zeigt stattdessen die Konten des Mandanten – samt Fremdkonto und
//     einer Person ohne Konto, damit Domain-Prüfung, Sperre und JIT sichtbar werden.
export function IdentitaetDialog({ anbieter, bleibtAngemeldet, onClose, onAngemeldet }: IdentitaetDialogProps) {
  const [fehler, setFehler] = useState<string | null>(null);
  useEffect(() => {
    if (anbieter) setFehler(null);
  }, [anbieter]);
  if (!anbieter) return null;

  const info = ANBIETER_INFO[anbieter];
  const konten = listIdentitaeten(anbieter);
  const waehlen = (claims: IdentitaetsClaims) => {
    const ergebnis = anmeldenMitIdentitaet(claims, bleibtAngemeldet);
    if (!ergebnis.ok) {
      setFehler(ergebnis.fehler);
      return;
    }
    onAngemeldet(ergebnis.sitzung);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      titel={`${info.label} · Konto wählen`}
      untertitel="Mock des Anbieters – im Produkt erscheint hier die Anmeldeseite von Microsoft bzw. Google."
      breite="sm"
      aktionen={
        <Button variant="secondary" onClick={onClose}>
          Abbrechen
        </Button>
      }
    >
      <ul className={styles.konten}>
        {konten.map((claims) => (
          <li key={claims.sub}>
            <button type="button" className={styles.konto} onClick={() => waehlen(claims)}>
              <span className={styles.kontoAvatar} aria-hidden>
                {initialen(claims)}
              </span>
              <span className={styles.kontoText}>
                <span className={styles.kontoName}>{claims.name}</span>
                <span className={styles.kontoMail}>
                  {claims.email}
                  {claims.gruppen.length > 0 ? ` · ${claims.gruppen.join(', ')}` : ' · keine Gruppen'}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {fehler && (
        <p className={styles.fehler} role="alert">
          {fehler}
        </p>
      )}
      <p className={styles.hinweis}>Ablauf wie im Produkt: Anbieter aktiv? E-Mail-Domain erlaubt? Konto bekannt (Subject, dann E-Mail)? Gesperrt? Sonst neues Konto mit der Rolle aus den Gruppen (JIT).</p>
    </Dialog>
  );
}

/* ◆ jh · eof */
