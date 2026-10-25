/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/rapport/NachrichtDialog.tsx                │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Mock-Versand: SMS/Mail an den Kontakt vor Ort mit Vorschau            │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useState } from 'react';
import { Mail, MessageSquareText, Send } from 'lucide-react';
import type { Auftrag } from '../../core/domain/auftrag';
import type { Einsatz } from '../../core/domain/einsatz';
import { NACHRICHT_KANAL, NACHRICHT_LABEL, vorlageText } from '../../core/domain/nachricht';
import type { NachrichtArt } from '../../core/domain/nachricht';
import { fullName } from '../../core/domain/stammdaten';
import type { Techniker } from '../../core/domain/stammdaten';
import { formatDatum, formatZeit } from '../../core/format';
import { Button } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Feld, Textbereich } from '../../core/ui/Form';
import type { NachrichtEntwurf } from '../dispo/store/useDispoAktionen';
import styles from './NachrichtDialog.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface NachrichtDialogProps {
  open: boolean;
  art: NachrichtArt;
  auftrag: Auftrag;
  einsatz: Einsatz | null;
  techniker: Techniker | null;
  /** Für «unterwegs»: voraussichtliche Ankunft in Minuten des Tages. */
  ankunftMin?: number;
  rapportNummer?: string;
  onSenden: (entwurf: NachrichtEntwurf) => void;
  onClose: () => void;
}

// jh› Kein Versand im Mockup: Vorschau, Bestätigung, Protokoll in der Akte. Der Text ist
//     editierbar, damit der Techniker nicht an der Vorlage scheitert.
export function NachrichtDialog({ open, art, auftrag, einsatz, techniker, ankunftMin, rapportNummer, onSenden, onClose }: NachrichtDialogProps) {
  const kanal = NACHRICHT_KANAL[art];
  const vorlage = vorlageText(art, {
    technikerName: techniker ? fullName(techniker) : 'unser Techniker',
    kontaktName: auftrag.kontaktVorOrt.name,
    datum: einsatz ? formatDatum(einsatz.datum) : '',
    zeit: einsatz ? formatZeit(einsatz.startMin) : '',
    ...(ankunftMin !== undefined ? { ankunft: formatZeit(ankunftMin) } : {}),
    ...(rapportNummer ? { rapportNummer } : {}),
  });
  const [text, setText] = useState(vorlage);
  const [gesendet, setGesendet] = useState(false);

  useEffect(() => {
    if (open) {
      setText(vorlage);
      setGesendet(false);
    }
    // jh› Nur beim Öffnen zurücksetzen – nicht bei jedem Tick der Vorlage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, art]);

  const an = kanal === 'sms' ? auftrag.kontaktVorOrt.telefon : (auftrag.kontaktVorOrt.email ?? `${auftrag.kontaktVorOrt.name.toLowerCase().replace(/\s+/g, '.')}@mail.example`);
  const Icon = kanal === 'sms' ? MessageSquareText : Mail;

  const senden = () => {
    onSenden({ art, auftragId: auftrag.id, ...(einsatz ? { einsatzId: einsatz.id } : {}), an, empfaenger: auftrag.kontaktVorOrt.name, text });
    setGesendet(true);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={NACHRICHT_LABEL[art]}
      untertitel={`${kanal === 'sms' ? 'SMS' : 'E-Mail'} an ${auftrag.kontaktVorOrt.name} · ${an}`}
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
            <Button variant="primary" icon={Send} onClick={senden} disabled={text.trim().length === 0}>
              Senden
            </Button>
          </>
        )
      }
    >
      <div className={styles.inhalt}>
        {gesendet ? (
          <p className={styles.bestaetigung}>
            <Icon size={16} strokeWidth={1.5} aria-hidden /> Gesendet (Mockup – kein echter Versand). Die Nachricht steht im Verlauf der Akte.
          </p>
        ) : (
          <>
            <Feld label={kanal === 'sms' ? 'Nachricht' : 'Mailtext'} hinweis={kanal === 'sms' ? `${text.length} Zeichen · ${text.length > 160 ? '2 SMS' : '1 SMS'}` : undefined} render={(id) => <Textbereich id={id} rows={kanal === 'sms' ? 4 : 7} value={text} onChange={(event) => setText(event.target.value)} />} />
            <p className={styles.hinweis}>Absender: Sutt AG · Vorlage lässt sich vor dem Senden anpassen.</p>
          </>
        )}
      </div>
    </Dialog>
  );
}

/* ◆ jh · eof */
