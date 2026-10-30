/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/website/AntwortDialog.tsx                  │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Antwort auf eine Website-Anfrage: Mail oder SMS, Vorlage, Mock        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useState } from 'react';
import { Mail, MessageSquareText, Send } from 'lucide-react';
import type { IsoDatum } from '../../core/datum';
import type { Anfrage } from '../../core/domain/anfrage';
import { istEmail } from '../../core/domain/anfrage';
import type { NachrichtArt } from '../../core/domain/nachricht';
import { Button } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Feld, Textbereich } from '../../core/ui/Form';
import { antwortVorlage } from './website.model';
import styles from './Website.module.css';

// ── §1 · Dialog ──────────────────────────────────────────────────

interface AntwortDialogProps {
  open: boolean;
  anfrage: Anfrage | null;
  ablehnung: boolean;
  vorlagen: Readonly<Partial<Record<NachrichtArt, string>>>;
  heute: IsoDatum;
  onClose: () => void;
  onSenden: (text: string, kanal: 'mail' | 'sms') => void;
}

// jh› Kein Versand im Mockup: Vorschau, Bestätigung, Eintrag an der Anfrage und im Journal.
//     Mail, wenn eine Adresse da ist – sonst SMS an die Nummer.
export function AntwortDialog({ open, anfrage, ablehnung, vorlagen, heute, onClose, onSenden }: AntwortDialogProps) {
  const [text, setText] = useState('');
  const [gesendet, setGesendet] = useState(false);

  useEffect(() => {
    if (!open || !anfrage) return;
    setText(antwortVorlage(anfrage, heute, vorlagen, ablehnung));
    setGesendet(false);
  }, [open, anfrage, ablehnung, vorlagen, heute]);

  if (!anfrage) return null;
  const kanal: 'mail' | 'sms' = istEmail(anfrage.kontakt.email) ? 'mail' : 'sms';
  const an = kanal === 'mail' ? anfrage.kontakt.email.trim() : anfrage.kontakt.telefon.trim();
  const Icon = kanal === 'mail' ? Mail : MessageSquareText;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={ablehnung ? 'Anfrage ablehnen' : 'Anfrage beantworten'}
      untertitel={`${kanal === 'mail' ? 'E-Mail' : 'SMS'} an ${anfrage.kontakt.name} · ${an}`}
      breite="sm"
      aktionen={
        gesendet ? (
          <Button variant="secondary" onClick={onClose}>
            Schliessen
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              variant={ablehnung ? 'danger' : 'primary'}
              icon={Send}
              disabled={text.trim().length < 10}
              onClick={() => {
                onSenden(text.trim(), kanal);
                setGesendet(true);
              }}
            >
              {ablehnung ? 'Ablehnen und senden' : 'Senden'}
            </Button>
          </>
        )
      }
    >
      {gesendet ? (
        <p className={styles.antwort}>
          <Icon size={16} strokeWidth={1.5} aria-hidden /> Gesendet an {an} (Mockup: kein echter Versand – die Antwort steht an der Anfrage und im Journal).
        </p>
      ) : (
        <>
          <Feld label="Text" render={(id) => <Textbereich id={id} value={text} rows={9} onChange={(event) => setText(event.target.value)} />} />
          <p className={styles.fussnote}>Vorlage aus «SMS & Website → Vorlagen»; der Text lässt sich hier anpassen.</p>
        </>
      )}
    </Dialog>
  );
}

/* ◆ jh · eof */
