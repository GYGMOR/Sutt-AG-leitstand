/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/FolgtPage.tsx                          │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Saubere «Folgt»-Seite für noch gesperrte Module                       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { ArrowLeft, Lock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { ROLLE_LABEL } from '../auth/auth.types';
import { useBenutzer } from '../auth/authStore';
import { useMandant } from '../mandant/mandantStore';
import { MODUL_GRUPPEN, modulByPfad, pruefeFreigabe } from '../modules.config';
import { Button } from '../ui/Button';
import { CapsLabel } from '../ui/CapsLabel';
import { Chip } from '../ui/Chip';
import { AppShell } from './AppShell';
import styles from './FolgtPage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

export function FolgtPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const benutzer = useBenutzer();
  const { modulFreigaben } = useMandant();
  const modul = modulByPfad(location.pathname);

  if (!modul) {
    return (
      <AppShell>
        <div className={styles.seite}>
          <CapsLabel>Seite nicht gefunden</CapsLabel>
          <h1 className={styles.titel}>Diese Adresse kennt der Leitstand nicht.</h1>
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/dispo/plantafel')}>
            Zur Plantafel
          </Button>
        </div>
      </AppShell>
    );
  }

  const freigabe = pruefeFreigabe(modul, benutzer?.rolle ?? null, modulFreigaben);
  const gruppe = MODUL_GRUPPEN.find((eintrag) => eintrag.id === modul.gruppe)?.label ?? '';
  const Icon = modul.icon;

  return (
    <AppShell modul={modul}>
      <div className={styles.seite}>
        <CapsLabel>{gruppe}</CapsLabel>
        <div className={styles.kopf}>
          <span className={styles.icon}>
            <Icon size={20} strokeWidth={1.5} aria-hidden />
          </span>
          <h1 className={styles.titel}>{modul.label}</h1>
          {modul.version && <Chip tone="mute">geplant für {modul.version}</Chip>}
        </div>
        <p className={styles.beschreibung}>{modul.beschreibung}</p>

        <div className={styles.hinweis}>
          <Lock size={16} strokeWidth={1.5} aria-hidden />
          {!freigabe.ok && freigabe.grund === 'keine-berechtigung' ? (
            <span>
              Für die Rolle <strong>{ROLLE_LABEL[benutzer?.rolle ?? 'buero']}</strong> nicht freigegeben. Freigabe über Benutzer &amp; Rollen.
            </span>
          ) : (
            <span>Dieses Modul ist {modul.version ? 'noch nicht gebaut' : 'für diesen Mandanten abgeschaltet'}. Die Freischaltung erfolgt in den Einstellungen unter «Module».</span>
          )}
        </div>

        <dl className={styles.fakten}>
          <div>
            <dt>Freigegeben für</dt>
            <dd>{modul.rollen.map((rolle) => ROLLE_LABEL[rolle]).join(' · ')}</dd>
          </div>
          <div>
            <dt>Pfad</dt>
            <dd className={styles.mono}>{modul.pfad}</dd>
          </div>
        </dl>

        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/dispo/plantafel')}>
          Zur Plantafel
        </Button>
      </div>
    </AppShell>
  );
}

/* ◆ jh · eof */
