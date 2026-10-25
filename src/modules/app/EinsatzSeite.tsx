/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/app/EinsatzSeite.tsx                       │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Einsatz im Detail: Karte, Hinweise, Kontakte, Teile, Fotos, Verlauf   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { ArrowLeft, KeyRound, Phone } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { STATUS_LABEL } from '../../core/domain/einsatz';
import { formatZeitpunktKurz } from '../../core/format';
import { Button } from '../../core/ui/Button';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { AkteErsatzteile } from '../dispo/akte/AkteErsatzteile';
import { AkteFotos } from '../dispo/akte/AkteFotos';
import { rapportFuerEinsatz } from '../dispo/store/dispo.selectors';
import type { EinsatzView } from '../dispo/store/dispo.selectors';
import { NachrichtDialog } from '../rapport/NachrichtDialog';
import { aktiverEinsatz, sortiert, tagesZeileFuer } from './app.model';
import { useApp } from './AppKontext';
import { EinsatzKarte } from './EinsatzKarte';
import styles from './Seiten.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

export function EinsatzSeite() {
  const { einsatzId } = useParams();
  const { techniker, heute, jetztMin, state, aktionen, pfad } = useApp();
  const navigate = useNavigate();
  const [smsFuer, setSmsFuer] = useState<EinsatzView | null>(null);

  const einsatz = state.einsaetze.find((kandidat) => kandidat.id === einsatzId);
  const zeile = useMemo(
    () => (einsatz ? tagesZeileFuer(state.stammdaten, state.einsaetze, einsatz.technikerId, einsatz.datum, einsatz.datum === heute ? jetztMin : null) : null),
    [state.stammdaten, state.einsaetze, einsatz, heute, jetztMin],
  );
  const views = useMemo(() => (zeile ? sortiert(zeile.einsaetze) : []), [zeile]);
  const view = views.find((kandidat) => kandidat.einsatz.id === einsatzId);
  if (!einsatz || !view) return <Navigate to={pfad('/app')} replace />;

  const aktiv = einsatz.datum === heute && aktiverEinsatz(views)?.einsatz.id === einsatz.id;
  const { auftrag, kunde, liegenschaft } = view;
  const hinweise = [liegenschaft.zugang, ...liegenschaft.hinweise.map((hinweis) => hinweis.text), ...kunde.hinweise.map((hinweis) => hinweis.text), auftrag.notiz].filter((text): text is string => Boolean(text));

  return (
    <div className={styles.seite}>
      <Button variant="ghost" size="sm" icon={ArrowLeft} className={styles.zurueck} onClick={() => navigate(pfad('/app'))}>
        Heute
      </Button>
      <EinsatzKarte
        view={view}
        aktiv={aktiv}
        ausgeklappt
        rapport={rapportFuerEinsatz(state.rapporte, einsatz.id)}
        onSchritt={(ziel) => (ziel === 'rapport' ? navigate(pfad(`/app/rapport/${einsatz.id}`)) : aktionen.setStatus(einsatz.id, ziel, 'app'))}
        onInformieren={() => setSmsFuer(view)}
        onRapport={() => navigate(pfad(`/app/rapport/${einsatz.id}`))}
      />

      {hinweise.length > 0 && (
        <section className={styles.abschnitt}>
          <CapsLabel as="h3">Hinweise</CapsLabel>
          <ul className={styles.punkte}>
            {hinweise.map((text) => (
              <li key={text}>
                <KeyRound size={14} strokeWidth={1.5} aria-hidden /> {text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.abschnitt}>
        <CapsLabel as="h3">Kontakte</CapsLabel>
        <ul className={styles.kontakte}>
          <li>
            <a href={`tel:${auftrag.kontaktVorOrt.telefon.replace(/\s/g, '')}`} className={styles.kontakt}>
              <Phone size={16} strokeWidth={1.5} aria-hidden />
              <span>
                <strong>{auftrag.kontaktVorOrt.name}</strong> · {auftrag.kontaktVorOrt.rolle}
              </span>
              <span className={styles.mono}>{auftrag.kontaktVorOrt.telefon}</span>
            </a>
          </li>
          {liegenschaft.hauswart && (
            <li>
              <a href={`tel:${liegenschaft.hauswart.telefon.replace(/\s/g, '')}`} className={styles.kontakt}>
                <Phone size={16} strokeWidth={1.5} aria-hidden />
                <span>
                  <strong>{liegenschaft.hauswart.name}</strong> · Hauswart
                </span>
                <span className={styles.mono}>{liegenschaft.hauswart.telefon}</span>
              </a>
            </li>
          )}
          <li>
            <a href={`tel:${kunde.kontakt.telefon.replace(/\s/g, '')}`} className={styles.kontakt}>
              <Phone size={16} strokeWidth={1.5} aria-hidden />
              <span>
                <strong>{kunde.kontakt.name}</strong> · {kunde.name}
              </span>
              <span className={styles.mono}>{kunde.kontakt.telefon}</span>
            </a>
          </li>
        </ul>
      </section>

      <section className={styles.abschnitt}>
        <CapsLabel as="h3">Ersatzteile</CapsLabel>
        <AkteErsatzteile teile={auftrag.ersatzteile} heute={heute} />
      </section>

      <section className={styles.abschnitt}>
        <CapsLabel as="h3">Fotos</CapsLabel>
        <AkteFotos fotos={auftrag.fotos} />
      </section>

      {einsatz.verlauf && einsatz.verlauf.length > 0 && (
        <section className={styles.abschnitt}>
          <CapsLabel as="h3">Statusmeldungen</CapsLabel>
          <ul className={styles.verlauf}>
            {einsatz.verlauf.map((wechsel) => (
              <li key={`${wechsel.status}-${wechsel.zeitpunkt}`}>
                <span className={styles.mono}>{formatZeitpunktKurz(wechsel.zeitpunkt)}</span>
                <span>{STATUS_LABEL[wechsel.status]}</span>
                <span className={styles.quelle}>{wechsel.quelle === 'app' ? 'App' : wechsel.quelle === 'buero' ? 'Büro' : 'Mock'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {smsFuer && (
        <NachrichtDialog open art="unterwegs" auftrag={smsFuer.auftrag} einsatz={smsFuer.einsatz} techniker={techniker} ankunftMin={jetztMin + smsFuer.anfahrtMin} onSenden={aktionen.sendeNachricht} onClose={() => setSmsFuer(null)} />
      )}
    </div>
  );
}

/* ◆ jh · eof */
