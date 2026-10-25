/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/app/RapportSeite.tsx                       │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Rapport erfassen: Entwurf, Speichern, Abschliessen, SMS, Mail         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { ArrowLeft, Check, MessageSquareText, Save } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router';
import type { NachrichtArt } from '../../core/domain/nachricht';
import { ABSCHLUSS_LABEL, istSchreibgeschuetzt } from '../../core/domain/rapport';
import { Button } from '../../core/ui/Button';
import { rapportFuerEinsatz, resolveAuftrag, technikerOf } from '../dispo/store/dispo.selectors';
import type { RapportEntwurf } from '../dispo/store/useDispoAktionen';
import { NachrichtDialog } from '../rapport/NachrichtDialog';
import { entwurfAus, neuerRapportEntwurf } from '../rapport/rapport.model';
import { RapportFormular } from '../rapport/RapportFormular';
import { useApp } from './AppKontext';
import styles from './Seiten.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

export function RapportSeite() {
  const { einsatzId } = useParams();
  const { jetztMin, state, aktionen, kuerzel, pfad } = useApp();
  const navigate = useNavigate();

  const einsatz = state.einsaetze.find((kandidat) => kandidat.id === einsatzId);
  const vorhanden = einsatzId ? rapportFuerEinsatz(state.rapporte, einsatzId) : undefined;
  const kontext = useMemo(() => (einsatz && state.stammdaten.auftraege.has(einsatz.auftragId) ? resolveAuftrag(state.stammdaten, einsatz.auftragId) : null), [einsatz, state.stammdaten]);
  const techniker = einsatz ? technikerOf(state.stammdaten, einsatz.technikerId) : null;

  const [entwurf, setEntwurf] = useState<RapportEntwurf | null>(() => {
    if (!einsatz || !kontext || !techniker) return null;
    return vorhanden ? entwurfAus(vorhanden) : neuerRapportEntwurf(kontext.auftrag, kontext.geraet, einsatz, techniker, jetztMin);
  });
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [nachricht, setNachricht] = useState<NachrichtArt | null>(null);

  if (!einsatz || !kontext || !techniker || !entwurf) return <Navigate to={pfad('/app')} replace />;
  const lesend = vorhanden ? istSchreibgeschuetzt(vorhanden) : false;
  const status = vorhanden?.status ?? 'offen';

  const speichern = () => {
    const rapport = aktionen.saveRapport(entwurf);
    setEntwurf({ ...entwurf, id: rapport.id, nummer: rapport.nummer });
    setHinweis(`${rapport.nummer} gespeichert`);
    window.setTimeout(() => setHinweis(null), 2500);
  };

  const abschliessen = () => {
    const { rapport } = aktionen.abschliessenRapport(entwurf);
    navigate(pfad('/app'), { state: { meldung: `${rapport.nummer} abgeschlossen · ${ABSCHLUSS_LABEL[rapport.abschluss]}` } });
  };

  return (
    <div className={styles.seite}>
      <Button variant="ghost" size="sm" icon={ArrowLeft} className={styles.zurueck} onClick={() => navigate(pfad(`/app/einsatz/${einsatz.id}`))}>
        Einsatz
      </Button>

      <RapportFormular
        entwurf={entwurf}
        onChange={setEntwurf}
        status={status}
        auftrag={kontext.auftrag}
        kunde={kontext.kunde}
        liegenschaft={kontext.liegenschaft}
        geraet={kontext.geraet}
        einsatz={einsatz}
        techniker={techniker}
        kuerzel={kuerzel}
        lesend={lesend}
        rueckmeldung={vorhanden?.rueckmeldung}
        onGeraetUebernehmen={(vorschlag) => aktionen.updateGeraet({ ...kontext.geraet, ...vorschlag }, 'Typenschild erkannt (App)')}
        onMailSenden={() => setNachricht('rapport-mail')}
      />

      {!lesend && (
        <footer className={styles.fuss}>
          {hinweis && (
            <span className={styles.fussHinweis} role="status">
              <Check size={14} strokeWidth={1.5} aria-hidden /> {hinweis}
            </span>
          )}
          {entwurf.abschluss === 'nicht-angetroffen' && (
            <Button variant="secondary" size="md" icon={MessageSquareText} onClick={() => setNachricht('nicht-angetroffen')}>
              SMS «nicht angetroffen»
            </Button>
          )}
          <div className={styles.fussKnoepfe}>
            <Button variant="secondary" size="md" icon={Save} onClick={speichern}>
              Speichern
            </Button>
            <Button variant="primary" size="md" icon={Check} onClick={abschliessen}>
              Abschliessen
            </Button>
          </div>
        </footer>
      )}

      {nachricht && (
        <NachrichtDialog
          open
          art={nachricht}
          auftrag={kontext.auftrag}
          einsatz={einsatz}
          techniker={techniker}
          rapportNummer={entwurf.nummer}
          onSenden={aktionen.sendeNachricht}
          onClose={() => setNachricht(null)}
        />
      )}
    </div>
  );
}

/* ◆ jh · eof */
