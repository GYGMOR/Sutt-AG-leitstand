/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/EinsatzSeite.tsx                        │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Einsatz im Detail: Karte, Hinweise, Kontakte, Teile, Fotos, Verlauf   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { ArrowLeft, Camera, KeyRound, Phone } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { STATUS_LABEL } from '@sl/core/domain/einsatz';
import { formatZeitpunktKurz } from '@sl/core/format';
import { Button } from '@sl/core/ui/Button';
import { CapsLabel } from '@sl/core/ui/CapsLabel';
import { aktiverEinsatz, sortiert, tagesZeileFuer } from '@sl/modules/app/app.model';
import { AkteErsatzteile } from '@sl/modules/dispo/akte/AkteErsatzteile';
import { AkteFotos } from '@sl/modules/dispo/akte/AkteFotos';
import { rapportFuerEinsatz } from '@sl/modules/dispo/store/dispo.selectors';
import type { EinsatzView } from '@sl/modules/dispo/store/dispo.selectors';
import { NachrichtDialog } from '@sl/modules/rapport/NachrichtDialog';
import { EinsatzKarte } from '../bausteine/EinsatzKarte';
import styles from '../bausteine/Seiten.module.css';
import { useApp } from '../rahmen/AppKontext';

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
  if (!einsatz || !view) return <Navigate to={pfad('/')} replace />;

  const aktiv = einsatz.datum === heute && aktiverEinsatz(views)?.einsatz.id === einsatz.id;
  const { auftrag, kunde, liegenschaft } = view;
  const hinweise = [liegenschaft.zugang, ...liegenschaft.hinweise.map((hinweis) => hinweis.text), ...kunde.hinweise.map((hinweis) => hinweis.text), auftrag.notiz].filter((text): text is string => Boolean(text));
  const smsTechniker = techniker ?? view.techniker;

  return (
    <div className={styles.seite}>
      <Button variant="ghost" size="sm" icon={ArrowLeft} className={styles.zurueck} onClick={() => navigate(pfad('/'))}>
        Heute
      </Button>
      <div className={styles.zweispaltig}>
        <div className={styles.spalte}>
          <EinsatzKarte
            view={view}
            aktiv={aktiv}
            ausgeklappt
            rapport={rapportFuerEinsatz(state.rapporte, einsatz.id)}
            onSchritt={(ziel) => (ziel === 'rapport' ? navigate(pfad(`/rapport/${einsatz.id}`)) : aktionen.setStatus(einsatz.id, ziel, 'app'))}
            onInformieren={() => setSmsFuer(view)}
            onRapport={() => navigate(pfad(`/rapport/${einsatz.id}`))}
          />

          <section className={styles.abschnitt}>
            <div className={styles.abschnittKopf}>
              <CapsLabel as="h3">Fotos</CapsLabel>
              <Button variant="secondary" size="sm" icon={Camera} onClick={() => navigate(pfad(`/kamera?einsatz=${einsatz.id}`))}>
                Foto aufnehmen
              </Button>
            </div>
            <AkteFotos fotos={auftrag.fotos} />
          </section>
        </div>

        <div className={styles.spalte}>
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
        </div>
      </div>

      {smsFuer && (
        <NachrichtDialog open art="unterwegs" auftrag={smsFuer.auftrag} einsatz={smsFuer.einsatz} techniker={smsTechniker} ankunftMin={jetztMin + smsFuer.anfahrtMin} onSenden={aktionen.sendeNachricht} onClose={() => setSmsFuer(null)} />
      )}
    </div>
  );
}

/* ◆ jh · eof */
