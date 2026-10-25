/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/app/EinsatzKarte.tsx                       │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Einsatzkarte fürs Handy: Zeit, Kunde, Gerät, Fahrt, Statusknopf       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Car, ChevronRight, FileText, MessageSquareText, Phone, Route } from 'lucide-react';
import { RAPPORT_LABEL } from '../../core/domain/auftrag';
import { STATUS_LABEL } from '../../core/domain/einsatz';
import type { EinsatzStatus } from '../../core/domain/einsatz';
import type { Rapport } from '../../core/domain/rapport';
import { formatAdresse } from '../../core/domain/stammdaten';
import { formatDauer, formatKm, formatZeitspanne } from '../../core/format';
import { googleRouteUrl } from '../../core/geo';
import { Button } from '../../core/ui/Button';
import { cx } from '../../core/ui/cx';
import { kategorieKlasse, statusKlasse } from '../../core/ui/farben';
import { KundenChips } from '../dispo/KundenChips';
import type { EinsatzView } from '../dispo/store/dispo.selectors';
import { naechsterSchritt } from './app.model';
import styles from './EinsatzKarte.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface EinsatzKarteProps {
  view: EinsatzView;
  /** Der Einsatz, um den es jetzt geht – bekommt den grossen Statusknopf. */
  aktiv: boolean;
  rapport: Rapport | undefined;
  ausgeklappt?: boolean;
  onSchritt: (ziel: EinsatzStatus | 'rapport') => void;
  onDetails?: () => void;
  onInformieren?: () => void;
  onRapport: () => void;
}

export function EinsatzKarte({ view, aktiv, rapport, ausgeklappt = false, onSchritt, onDetails, onInformieren, onRapport }: EinsatzKarteProps) {
  const { einsatz, auftrag, kunde, liegenschaft, geraet } = view;
  const schritt = naechsterSchritt(einsatz.status);
  const abgeschlossen = einsatz.status === 'erledigt' || einsatz.status === 'wartet-teil';
  const telefon = auftrag.kontaktVorOrt.telefon.replace(/\s/g, '');

  return (
    <article className={cx(styles.karte, kategorieKlasse(auftrag.kategorie), aktiv && styles.aktiv, abgeschlossen && styles.abgeschlossen)}>
      <header className={styles.kopf}>
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
