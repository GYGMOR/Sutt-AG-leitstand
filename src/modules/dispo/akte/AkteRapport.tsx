/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/akte/AkteRapport.tsx                 │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Rapport in der Akte: Kennzahlen, Unterschrift, Freigabe, Zurück       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import { BadgeCheck, FileText, FileWarning, Printer, Receipt, Signature, Smartphone, Undo2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { IsoDatum } from '../../../core/datum';
import { RAPPORT_LABEL } from '../../../core/domain/auftrag';
import type { Einsatz } from '../../../core/domain/einsatz';
import { ABSCHLUSS_LABEL, kannFreigeben, kannVerrechnen, verrechenbareMinuten } from '../../../core/domain/rapport';
import type { Rapport } from '../../../core/domain/rapport';
import { fullName } from '../../../core/domain/stammdaten';
import type { Techniker } from '../../../core/domain/stammdaten';
import { formatDauer, formatSeit, formatZeitpunktKurz } from '../../../core/format';
import { Button } from '../../../core/ui/Button';
import { Chip } from '../../../core/ui/Chip';
import { Typenschild } from '../../../core/ui/Typenschild';
import { ABSCHLUSS_TON, RAPPORT_ICON, RAPPORT_TON } from '../../rapport/rapportStatus';
import { UnterschriftBild } from '../../rapport/UnterschriftFeld';
import { ZurueckDialog } from '../../rapport/ZurueckDialog';
import styles from './AkteRapport.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface AkteRapportProps {
  rapport: Rapport | undefined;
  einsatz: Einsatz;
  techniker: Techniker | null;
  heute: IsoDatum;
  onFreigeben: (rapportId: string) => void;
  onVerrechnen: (rapportId: string) => void;
  onZurueck: (rapportId: string, bemerkung: string) => void;
}

// jh› Die Techniker-App öffnet in einem zweiten Fenster – so zeigt die Demo Büro und
//     Aussendienst nebeneinander, synchron über den gespeicherten Stand (ADR-001).
function oeffneApp(pfad: string): void {
  window.open(pfad, '_blank', 'noopener');
}

export function AkteRapport({ rapport, einsatz, techniker, heute, onFreigeben, onVerrechnen, onZurueck }: AkteRapportProps) {
  const navigate = useNavigate();
  const [zurueck, setZurueck] = useState(false);
  const kuerzel = techniker?.kuerzel ?? '–';

  if (!rapport) {
    const fertig = einsatz.status === 'erledigt' || einsatz.status === 'wartet-teil';
    return (
      <div className={styles.rapport}>
        {fertig ? (
          <p className={styles.fehlt}>
            <FileWarning size={16} strokeWidth={1.5} aria-hidden /> Rapport fehlt – Einsatz erledigt {formatSeit(einsatz.datum, heute)}.
          </p>
        ) : (
          <p className={styles.hinweis}>Entsteht in der Techniker-App, sobald {kuerzel} «Fertig» drückt. Anfahrt und Arbeitszeit kommen aus den Statusknöpfen.</p>
        )}
        <div className={styles.knoepfe}>
          <Button variant="secondary" size="sm" icon={Smartphone} onClick={() => oeffneApp(fertig ? `/app/rapport/${einsatz.id}?als=${einsatz.technikerId}` : `/app?als=${einsatz.technikerId}`)}>
            {fertig ? 'In der App erfassen' : 'Techniker-App öffnen'}
          </Button>
        </div>
      </div>
    );
  }

  const erledigteSchritte = rapport.arbeiten.filter((schritt) => schritt.erledigt).length;
  const bestellen = rapport.teile.filter((teil) => teil.verwendung === 'bestellen').length;

  return (
    <div className={styles.rapport}>
      <div className={styles.kopf}>
        <Typenschild label="Rapport" wert={rapport.nummer} />
        <Chip icon={RAPPORT_ICON[rapport.status]} tone={RAPPORT_TON[rapport.status]}>
          {RAPPORT_LABEL[rapport.status]}
        </Chip>
        <Chip tone={ABSCHLUSS_TON[rapport.abschluss]}>{ABSCHLUSS_LABEL[rapport.abschluss]}</Chip>
      </div>

      <dl className={styles.fakten}>
        <div>
          <dt>Zeiten</dt>
          <dd className={styles.mono}>
            Anfahrt {formatDauer(rapport.zeiten.anfahrtMin)} · Arbeit {formatDauer(rapport.zeiten.arbeitMin)}
            {rapport.zeiten.pauseMin > 0 && ` · Pause ${formatDauer(rapport.zeiten.pauseMin)}`} → {formatDauer(verrechenbareMinuten(rapport.zeiten))}
          </dd>
        </div>
        <div>
          <dt>Arbeiten</dt>
          <dd>
            {erledigteSchritte} von {rapport.arbeiten.length} erledigt
            {rapport.diagnoseCode && (
              <>
                {' '}
                · <span className={styles.mono}>{rapport.diagnoseCode}</span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Teile</dt>
          <dd>{rapport.teile.length === 0 ? 'keine' : `${rapport.teile.length}${bestellen > 0 ? ` · ${bestellen} zu bestellen` : ''}`}</dd>
        </div>
        <div>
          <dt>Fotos</dt>
          <dd>{rapport.fotos.length}</dd>
        </div>
      </dl>

      {rapport.bemerkung && <blockquote className={styles.bemerkung}>{rapport.bemerkung}</blockquote>}

      <div className={styles.unterschrift}>
        {rapport.unterschrift ? (
          <>
            <UnterschriftBild pfad={rapport.unterschrift.pfad} className={styles.unterschriftBild} />
            <span className={styles.unterschriftName}>
              {rapport.unterschrift.name} · {formatZeitpunktKurz(rapport.unterschrift.zeitpunkt)}
            </span>
          </>
        ) : (
          <span className={styles.ohne}>
            <Signature size={14} strokeWidth={1.5} aria-hidden /> Ohne Unterschrift
          </span>
        )}
      </div>

      {rapport.rueckmeldung && (
        <p className={styles.rueckmeldung}>
          <Undo2 size={14} strokeWidth={1.5} aria-hidden /> Zurück an {kuerzel} ({rapport.rueckmeldung.von}, {formatZeitpunktKurz(rapport.rueckmeldung.zeitpunkt)}): {rapport.rueckmeldung.bemerkung}
        </p>
      )}

      <div className={styles.knoepfe}>
        <Button variant="ghost" size="sm" icon={FileText} onClick={() => navigate(`/rapporte/${rapport.id}`)}>
          Öffnen
        </Button>
        <Button variant="ghost" size="sm" icon={Printer} onClick={() => navigate(`/rapporte/${rapport.id}/druck`)}>
          Drucken
        </Button>
        {kannFreigeben(rapport) && (
          <>
            <Button variant="secondary" size="sm" icon={Undo2} onClick={() => setZurueck(true)}>
              Zurück an {kuerzel}
            </Button>
            <Button variant="primary" size="sm" icon={BadgeCheck} onClick={() => onFreigeben(rapport.id)}>
              Freigeben
            </Button>
          </>
        )}
        {kannVerrechnen(rapport) && (
          <Button variant="primary" size="sm" icon={Receipt} onClick={() => onVerrechnen(rapport.id)}>
            Verrechnen
          </Button>
        )}
        {rapport.status === 'verrechnet' && rapport.verrechnetAm && <span className={styles.meta}>verrechnet {formatZeitpunktKurz(rapport.verrechnetAm)}</span>}
      </div>

      <ZurueckDialog
        open={zurueck}
        rapport={rapport}
        technikerName={techniker ? fullName(techniker) : kuerzel}
        onConfirm={(bemerkung) => {
          setZurueck(false);
          onZurueck(rapport.id, bemerkung);
        }}
        onClose={() => setZurueck(false)}
      />
    </div>
  );
}

/* ◆ jh · eof */
