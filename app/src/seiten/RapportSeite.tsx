/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/RapportSeite.tsx                        │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Rapport erfassen: Entwurf, Fahrzeugteile, Abschliessen, SMS, Mail     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { ArrowLeft, Check, MessageSquareText, Save } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { fahrzeugOrt } from '@sl/core/domain/lager';
import type { Artikel } from '@sl/core/domain/lager';
import type { NachrichtArt } from '@sl/core/domain/nachricht';
import { ABSCHLUSS_LABEL, istSchreibgeschuetzt } from '@sl/core/domain/rapport';
import { Button } from '@sl/core/ui/Button';
import { rapportFuerEinsatz, resolveAuftrag, technikerOf } from '@sl/modules/dispo/store/dispo.selectors';
import type { RapportEntwurf } from '@sl/modules/dispo/store/useDispoAktionen';
import { NachrichtDialog } from '@sl/modules/rapport/NachrichtDialog';
import { entwurfAus, neuerRapportEntwurf } from '@sl/modules/rapport/rapport.model';
import { RapportFormular } from '@sl/modules/rapport/RapportFormular';
import type { FahrzeugTeil } from '@sl/modules/rapport/RapportFormular';
import styles from '../bausteine/Seiten.module.css';
import { useApp } from '../rahmen/AppKontext';

// ── §1 · Komponente ──────────────────────────────────────────────

export function RapportSeite() {
  const { einsatzId } = useParams();
  const { jetztMin, state, aktionen, kuerzel, pfad } = useApp();
  const navigate = useNavigate();

  const einsatz = state.einsaetze.find((kandidat) => kandidat.id === einsatzId);
  const vorhanden = einsatzId ? rapportFuerEinsatz(state.rapporte, einsatzId) : undefined;
  const kontext = useMemo(() => (einsatz && state.stammdaten.auftraege.has(einsatz.auftragId) ? resolveAuftrag(state.stammdaten, einsatz.auftragId) : null), [einsatz, state.stammdaten]);
  const techniker = einsatz ? technikerOf(state.stammdaten, einsatz.technikerId) : null;

  // jh› Was im Fahrzeug liegt, steht im Rapport zum Antippen bereit – Marke des Geräts zuerst.
  const fahrzeugTeile = useMemo<FahrzeugTeil[]>(() => {
    if (!einsatz) return [];
    const ort = fahrzeugOrt(einsatz.technikerId);
    const marke = kontext?.geraet.marke;
    return state.bestaende
      .filter((bestand) => bestand.ort === ort && bestand.menge > 0)
      .map((bestand) => ({ artikel: state.stammdaten.artikel.get(bestand.artikelNummer), menge: bestand.menge }))
      .filter((eintrag): eintrag is { artikel: Artikel; menge: number } => eintrag.artikel !== undefined)
      .sort((a, b) => Number(b.artikel.marke === marke) - Number(a.artikel.marke === marke) || a.artikel.bezeichnung.localeCompare(b.artikel.bezeichnung, 'de-CH'))
      .map((eintrag) => ({ artikelNummer: eintrag.artikel.artikelNummer, bezeichnung: eintrag.artikel.bezeichnung, menge: eintrag.menge }));
  }, [einsatz, kontext, state.bestaende, state.stammdaten.artikel]);

  const [entwurf, setEntwurf] = useState<RapportEntwurf | null>(() => {
    if (!einsatz || !kontext || !techniker) return null;
    return vorhanden ? entwurfAus(vorhanden) : neuerRapportEntwurf(kontext.auftrag, kontext.geraet, einsatz, techniker, jetztMin);
  });
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [nachricht, setNachricht] = useState<NachrichtArt | null>(null);

  if (!einsatz || !kontext || !techniker || !entwurf) return <Navigate to={pfad('/')} replace />;
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
    navigate(pfad('/'), { state: { meldung: `${rapport.nummer} abgeschlossen · ${ABSCHLUSS_LABEL[rapport.abschluss]}` } });
  };

  return (
    <div className={styles.seite}>
      <Button variant="ghost" size="sm" icon={ArrowLeft} className={styles.zurueck} onClick={() => navigate(pfad(`/einsatz/${einsatz.id}`))}>
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
        fahrzeugTeile={fahrzeugTeile}
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

      {nachricht && <NachrichtDialog open art={nachricht} auftrag={kontext.auftrag} einsatz={einsatz} techniker={techniker} rapportNummer={entwurf.nummer} onSenden={aktionen.sendeNachricht} onClose={() => setNachricht(null)} />}
    </div>
  );
}

/* ◆ jh · eof */
