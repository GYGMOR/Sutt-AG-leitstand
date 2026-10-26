/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/einstellungen/EinstellungenPage.tsx        │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Modul Einstellungen: Bereiche, Lese- oder Schreibrecht, Protokoll     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useEffect, useMemo } from 'react';
import { Settings } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { meldeAenderungen } from '../../core/aenderungen';
import { useHeute } from '../../core/arbeitstag';
import { useRegisterKommandos } from '../../core/kommando';
import type { Kommando } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { setMandant, useMandant } from '../../core/mandant/mandantStore';
import type { Mandant } from '../../core/mandant/mandant.types';
import { findModul } from '../../core/modules.config';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { SegmentedControl } from '../../core/ui/SegmentedControl';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '../../mock';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import { useDemoReset } from '../dispo/store/useDemoReset';
import { useRechte } from '../personal/rechte';
import { useGlobaleSuchquellen } from '../suche/globaleSuche';
import { AnmeldungEinstellungen } from './AnmeldungEinstellungen';
import { BetriebEinstellungen, FeiertagEinstellungen } from './BetriebEinstellungen';
import { DatenschutzEinstellungen, ProtokollEinstellungen } from './DatenschutzBereich';
import { EINSTELLUNG_BEREICHE, isEinstellungBereich } from './einstellungen.model';
import type { EinstellungBereich } from './einstellungen.model';
import { ModulEinstellungen } from './ModulEinstellungen';
import styles from './Einstellungen.module.css';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Gemeinsame Props ────────────────────────────────────────

export interface EinstellungProps {
  mandant: Mandant;
  /** Recht «einstellungen:verwalten». */
  darf: boolean;
  /** Schreibt in den Mandanten und protokolliert die Änderung (Journal, Bereich Einstellungen). */
  speichern: (aenderung: Partial<Mandant>, text: string) => void;
}

// ── §2 · Seite ───────────────────────────────────────────────────

// jh› Einstellungen sind kein Betriebsstand: Sie liegen im Mandanten-Store, jede Änderung landet aber als
//     Journaleintrag im Stand – wer hat wann das Arbeitszeitmodell oder einen Anbieter geändert.
export function EinstellungenPage() {
  const { bereich: param } = useParams();
  const bereich: EinstellungBereich = isEinstellungBereich(param) ? param : 'betrieb';
  const navigate = useNavigate();
  const heute = useHeute();
  const mandant = useMandant();
  const state = useDispoState();
  const rechte = useRechte();
  const aktionen = useDispoAktionen();
  const darf = rechte.hat('einstellungen:verwalten');

  useGlobaleSuchquellen();
  useEffect(() => {
    meldeAenderungen('dispo', state.protokoll.length);
  }, [state.protokoll.length]);

  const speichern = useCallback(
    (aenderung: Partial<Mandant>, text: string) => {
      setMandant(aenderung);
      aktionen.protokolliere({ bereich: 'einstellungen', art: 'aenderung', text });
    },
    [aktionen],
  );

  const wechseln = useCallback((neu: EinstellungBereich) => navigate(`/einstellungen/${neu}`), [navigate]);
  const demoReset = useDemoReset();
  const kommandos = useMemo<Kommando[]>(
    () => [...EINSTELLUNG_BEREICHE.map<Kommando>((eintrag) => ({ id: `einstellungen:${eintrag.value}`, label: `Einstellungen: ${eintrag.label}`, gruppe: 'ansicht', icon: Settings, run: () => wechseln(eintrag.value) })), demoReset.kommando],
    [demoReset.kommando, wechseln],
  );
  useRegisterKommandos('einstellungen', kommandos);

  const aktuell = EINSTELLUNG_BEREICHE.find((eintrag) => eintrag.value === bereich);
  const props: EinstellungProps = { mandant, darf, speichern };

  return (
    <AppShell modul={findModul('einstellungen')} menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <div className={styles.seite}>
        <header className={styles.kopf}>
          <div>
            <CapsLabel>Einstellungen · {mandant.firma}</CapsLabel>
            <h1 className={styles.titel}>{aktuell?.label}</h1>
          </div>
          <SegmentedControl label="Bereich" options={EINSTELLUNG_BEREICHE} value={bereich} onChange={wechseln} />
        </header>
        {!darf && <p className={styles.hinweis}>Nur lesen: Änderungen brauchen das Recht «Einstellungen ändern» (Rolle Administration).</p>}
        <div className={styles.bereich}>
          {bereich === 'betrieb' && <BetriebEinstellungen key={JSON.stringify([mandant.firma, mandant.adresse, mandant.kanton, mandant.zeitzone, mandant.arbeitszeit, mandant.ferienTageStandard, mandant.sitzungMinuten])} {...props} />}
          {bereich === 'feiertage' && <FeiertagEinstellungen {...props} heute={heute} />}
          {bereich === 'anmeldung' && <AnmeldungEinstellungen {...props} aktionen={aktionen} />}
          {bereich === 'datenschutz' && <DatenschutzEinstellungen key={JSON.stringify([mandant.datenschutz, mandant.aufbewahrung])} {...props} state={state} aktionen={aktionen} heute={heute} darfLoeschen={rechte.hat('datenschutz:verwalten')} />}
          {bereich === 'protokoll' && <ProtokollEinstellungen journal={state.journal} darfLesen={rechte.hat('protokoll:lesen')} darfExport={rechte.hat('protokoll:exportieren')} aktionen={aktionen} />}
          {bereich === 'module' && <ModulEinstellungen {...props} />}
        </div>
      </div>
    </AppShell>
  );
}

/* ◆ jh · eof */
