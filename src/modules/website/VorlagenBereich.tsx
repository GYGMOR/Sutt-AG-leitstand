/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/website/VorlagenBereich.tsx                │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Vorlagen des Betriebs für SMS und Mail – Text, Platzhalter, Vorschau  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { NACHRICHT_ARTEN, NACHRICHT_KANAL, NACHRICHT_LABEL, VORLAGE_PLATZHALTER, fuelleVorlage, standardVorlage } from '../../core/domain/nachricht';
import type { NachrichtArt } from '../../core/domain/nachricht';
import { Button } from '../../core/ui/Button';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { Chip } from '../../core/ui/Chip';
import { Textbereich } from '../../core/ui/Form';
import styles from './Website.module.css';

// ── §1 · Beispielwerte für die Vorschau ──────────────────────────

const VORSCHAU_KONTEXT = {
  technikerName: 'Marco Brunner',
  kontaktName: 'Lea Hofstetter',
  datum: '03.11.2026',
  zeit: '08:30',
  ankunft: '08:20',
  rapportNummer: 'R-26-00585',
  anfrageNummer: 'W-26-0101',
};

interface VorlagenBereichProps {
  vorlagen: Readonly<Partial<Record<NachrichtArt, string>>>;
  onSpeichern: (art: NachrichtArt, text: string | null) => void;
}

// ── §2 · Komponente ──────────────────────────────────────────────

function VorlageKarte({ art, gespeichert, onSpeichern }: { art: NachrichtArt; gespeichert: string | undefined; onSpeichern: (text: string | null) => void }) {
  const standard = standardVorlage(art);
  const [text, setText] = useState(gespeichert ?? standard);
  useEffect(() => {
    setText(gespeichert ?? standard);
  }, [gespeichert, standard]);
  const geaendert = text !== (gespeichert ?? standard);
  const kanal = NACHRICHT_KANAL[art];

  return (
    <section className={styles.vorlage} aria-label={NACHRICHT_LABEL[art]}>
      <div className={styles.vorlageKopf}>
        <h3>{NACHRICHT_LABEL[art]}</h3>
        <Chip tone={kanal === 'sms' ? 'neutral' : 'tint'}>{kanal === 'sms' ? 'SMS' : 'E-Mail'}</Chip>
      </div>
      <Textbereich value={text} rows={kanal === 'sms' ? 3 : 6} aria-label={`Vorlage ${NACHRICHT_LABEL[art]}`} onChange={(event) => setText(event.target.value)} />
      <p className={styles.vorschau}>{fuelleVorlage(text, VORSCHAU_KONTEXT)}</p>
      <div className={styles.aktionen}>
        <Button variant="primary" size="sm" icon={Save} disabled={!geaendert || text.trim().length < 10} onClick={() => onSpeichern(text.trim())}>
          Speichern
        </Button>
        {gespeichert !== undefined && (
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => onSpeichern(null)}>
            Standard
          </Button>
        )}
        {kanal === 'sms' && <span className={styles.fussnote}>{text.length} Zeichen · eine SMS hat 160</span>}
      </div>
    </section>
  );
}

// jh› Eine Vorlage, ein Ort: Was hier steht, lesen die Akte, das Modul Servicerapporte und die Techniker-App.
export function VorlagenBereich({ vorlagen, onSpeichern }: VorlagenBereichProps) {
  return (
    <div>
      <dl className={styles.platzhalter} aria-label="Platzhalter">
        {VORLAGE_PLATZHALTER.map((eintrag) => (
          <div key={eintrag.schluessel} style={{ display: 'contents' }}>
            <dt>{eintrag.schluessel}</dt>
            <dd>{eintrag.bedeutung}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.vorlagen}>
        {NACHRICHT_ARTEN.map((art) => (
          <VorlageKarte key={art} art={art} gespeichert={vorlagen[art]} onSpeichern={(text) => onSpeichern(art, text)} />
        ))}
      </div>
      <p className={styles.platzhalter}>
        <CapsLabel as="span">Hinweis</CapsLabel>
        <span className={styles.fussnote}>Vorlagen gelten je Mandant und sofort in Büro und App; der Versand selbst folgt mit der API (SMS-Gateway, Mail).</span>
      </p>
    </div>
  );
}

/* ◆ jh · eof */
