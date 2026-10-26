/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/bausteine/EinsatzKarte.tsx                     │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Einsatzkarte: Zeit, Kunde, Gerät, Fahrt, Anruf, Route, Statusknopf    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Car, ChevronRight, FileText, MessageSquareText, Phone, Route } from 'lucide-react';
import { RAPPORT_LABEL } from '@sl/core/domain/auftrag';
import { STATUS_LABEL } from '@sl/core/domain/einsatz';
import type { EinsatzStatus } from '@sl/core/domain/einsatz';
import type { Rapport } from '@sl/core/domain/rapport';
import { formatAdresse } from '@sl/core/domain/stammdaten';
import { formatDauer, formatKm, formatZeitspanne } from '@sl/core/format';
import { googleRouteUrl } from '@sl/core/geo';
import { Button } from '@sl/core/ui/Button';
import { cx } from '@sl/core/ui/cx';
import { kategorieKlasse, statusKlasse } from '@sl/core/ui/farben';
import { naechsterSchritt } from '@sl/modules/app/app.model';
import { KundenChips } from '@sl/modules/dispo/KundenChips';
import type { EinsatzView } from '@sl/modules/dispo/store/dispo.selectors';
import styles from './EinsatzKarte.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface EinsatzKarteProps {
  view: EinsatzView;
  /** Der Einsatz, um den es jetzt geht – bekommt den grossen Statusknopf. */
  aktiv: boolean;
  rapport: Rapport | undefined;
  ausgeklappt?: boolean;
  /** Laufende Nummer in der Tour (1, 2, 3 …). */
  nummer?: number;
  onSchritt: (ziel: EinsatzStatus | 'rapport') => void;
  onDetails?: () => void;
  onInformieren?: () => void;
  onRapport: () => void;
}

// jh› Ein Knopf des Moments (56 px, Signal) – alles andere bleibt leise. Anruf und Route sind
//     Links, kein Formular: Der Techniker steht mit der Werkzeugkiste vor der Tür.
export function EinsatzKarte({ view, aktiv, rapport, ausgeklappt = false, nummer, onSchritt, onDetails, onInformieren, onRapport }: EinsatzKarteProps) {
  const { einsatz, auftrag, kunde, liegenschaft, geraet } = view;
  const schritt = naechsterSchritt(einsatz.status);
  const abgeschlossen = einsatz.status === 'erledigt' || einsatz.status === 'wartet-teil';
  const telefon = auftrag.kontaktVorOrt.telefon.replace(/\s/g, '');

  return (
    <article className={cx(styles.karte, kategorieKlasse(auftrag.kategorie), aktiv && styles.aktiv, abgeschlossen && styles.abgeschlossen)}>
      <header className={styles.kopf}>
        {nummer !== undefined && <span className={styles.nummer}>{nummer}</span>}
        <span className={styles.zeit}>
          {formatZeitspanne(einsatz.startMin, einsatz.dauerMin)} <span className={styles.dauer}>· {formatDauer(einsatz.dauerMin)}</span>
        </span>
        <span className={cx(styles.status, statusKlasse(einsatz.status))}>
          <span className={styles.statusPunkt} aria-hidden />
          {STATUS_LABEL[einsatz.status]}
        </span>
        {view.dringend && <span className={styles.dringend}>{auftrag.dringlichkeit === 'notfall' ? 'Notfall' : 'Dringend'}</span>}
      </header>

      <h3 className={styles.kunde}>{kunde.name}</h3>
      <p className={styles.adresse}>
        {formatAdresse(liegenschaft.adresse)}
        {auftrag.wohnung && (
          <>
            {' '}
            · <span className={styles.mono}>{auftrag.wohnung.nummer}</span> {auftrag.wohnung.lage}
          </>
        )}
      </p>
      <p className={styles.geraet}>
        <strong>
          {geraet.marke} {geraet.art}
        </strong>{' '}
        – {auftrag.fehlerbild}
      </p>
      <p className={styles.fahrt}>
        <Car size={14} strokeWidth={1.5} aria-hidden /> {view.anfahrtMin} min · {formatKm(view.anfahrtKm)}
        {view.fahrzeitKnapp && <span className={styles.knapp}> · Fahrzeit knapp</span>}
      </p>
      {(ausgeklappt || aktiv) && <KundenChips kunde={kunde} liegenschaft={liegenschaft} kompakt={!ausgeklappt} />}

      <div className={styles.aktionen}>
        <a className={styles.aktion} href={`tel:${telefon}`} title={`${auftrag.kontaktVorOrt.name} anrufen`}>
          <Phone size={18} strokeWidth={1.5} aria-hidden /> {auftrag.kontaktVorOrt.rolle}
        </a>
        <a className={styles.aktion} href={googleRouteUrl(view.koordinaten)} target="_blank" rel="noreferrer" title="Route in Google Maps">
          <Route size={18} strokeWidth={1.5} aria-hidden /> Route
        </a>
        {onDetails && (
          <button type="button" className={cx(styles.aktion, styles.aktionRechts)} onClick={onDetails}>
            Details <ChevronRight size={18} strokeWidth={1.5} aria-hidden />
          </button>
        )}
      </div>

      {aktiv && schritt && (
        <button type="button" className={cx(styles.hauptknopf, schritt.ziel === 'rapport' && styles.hauptknopfRapport)} onClick={() => onSchritt(schritt.ziel)}>
          {schritt.label}
        </button>
      )}
      {aktiv && einsatz.status === 'unterwegs' && onInformieren && (
        <Button variant="secondary" size="md" icon={MessageSquareText} className={styles.nebenknopf} onClick={onInformieren}>
          Mieter informieren
        </Button>
      )}
      {abgeschlossen && (
        <button type="button" className={cx(styles.rapportZeile, !rapport && styles.rapportOffen)} onClick={onRapport}>
          <FileText size={16} strokeWidth={1.5} aria-hidden />
          <span>{rapport ? `${rapport.nummer} · ${RAPPORT_LABEL[rapport.status]}` : 'Rapport fehlt – jetzt erfassen'}</span>
          <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
        </button>
      )}
    </article>
  );
}

/* ◆ jh · eof */
