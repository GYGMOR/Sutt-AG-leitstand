/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/einstellungen/ModulEinstellungen.tsx       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Module je Mandant: ein- und ausschalten, Registerstand, Rollen        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Fragment, useMemo } from 'react';
import { ROLLEN, ROLLE_LABEL } from '../../core/auth/auth.types';
import { MODUL_GRUPPEN } from '../../core/modules.config';
import type { ModulId } from '../../core/modules.config';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { Schalter } from '../../core/ui/Form';
import type { EinstellungProps } from './EinstellungenPage';
import { modulFreigabeSetzen, modulZustaende } from './einstellungen.model';
import type { ModulZustand } from './einstellungen.model';
import styles from './Einstellungen.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

const KERN: readonly ModulId[] = ['dashboard', 'plantafel'];

// jh› Drei Stufen: Register (gebaut?), Mandant (hier), Rolle (Benutzer & Rollen). Ein abgeschaltetes Modul
//     verschwindet aus der Navigation und beantwortet seine Route mit «folgt» – der Stand bleibt erhalten.
export function ModulEinstellungen({ mandant, darf, speichern }: EinstellungProps) {
  const zustaende = useMemo(() => modulZustaende(mandant), [mandant]);
  const setzen = (eintrag: ModulZustand, aktiv: boolean | undefined) =>
    speichern({ modulFreigaben: modulFreigabeSetzen(mandant.modulFreigaben, eintrag.modul, aktiv) }, `Modul ${eintrag.modul.label} ${aktiv === undefined ? 'auf Registerstand zurückgesetzt' : aktiv ? 'freigeschaltet' : 'abgeschaltet'}`);

  return (
    <section className={styles.karte} aria-label="Module">
      <p className={styles.karteText}>Welche Module dieser Mandant nutzt. Dashboard und Plantafel sind Kern und bleiben an; Module, die noch nicht gebaut sind, zeigen ihre Version. Welche Rolle ein Modul sieht, steht im Register – Rechte je Aktion unter «Benutzer & Rollen».</p>
      {MODUL_GRUPPEN.map((gruppe) => (
        <Fragment key={gruppe.id}>
          <h3 className={styles.gruppeTitel}>{gruppe.label}</h3>
          {zustaende
            .filter((eintrag) => eintrag.modul.gruppe === gruppe.id)
            .map((eintrag) => {
              const { modul } = eintrag;
              const Icon = modul.icon;
              const gebaut = modul.freigeschaltet;
              const kern = KERN.includes(modul.id);
              return (
                <div key={modul.id} className={styles.modulZeile}>
                  <Icon size={18} strokeWidth={1.5} className={styles.modulIcon} aria-hidden />
                  <div className={styles.modulText}>
                    <span className={styles.modulName}>
                      {modul.label}
                      {eintrag.ueberschrieben && (
                        <>
                          {' '}
                          <Chip tone="signal" size="sm">
                            angepasst
                          </Chip>
                        </>
                      )}
                    </span>
                    <span className={styles.modulMeta}>{modul.beschreibung}</span>
                  </div>
                  <div className={styles.modulRollen}>
                    {modul.rollen.length === ROLLEN.length ? (
                      <Chip tone="mute">alle Rollen</Chip>
                    ) : (
                      modul.rollen.map((rolle) => (
                        <Chip key={rolle} tone="mute">
                          {ROLLE_LABEL[rolle]}
                        </Chip>
                      ))
                    )}
                  </div>
                  <div className={styles.aktionen}>
                    {!gebaut ? (
                      <Chip tone="mute">folgt {modul.version ?? 'später'}</Chip>
                    ) : kern ? (
                      <Chip tone="ok">Kernmodul</Chip>
                    ) : (
                      <>
                        <Schalter checked={eintrag.aktiv} onChange={(aktiv) => darf && setzen(eintrag, aktiv)}>
                          {eintrag.aktiv ? 'aktiv' : 'aus'}
                        </Schalter>
                        {eintrag.ueberschrieben && darf && (
                          <Button variant="ghost" size="sm" onClick={() => setzen(eintrag, undefined)}>
                            Register
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </Fragment>
      ))}
    </section>
  );
}

/* ◆ jh · eof */
