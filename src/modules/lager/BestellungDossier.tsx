/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/lager/BestellungDossier.tsx                │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Bestellung: Fakten, Wareneingang buchen, stornieren, Verweise         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useState } from 'react';
import { PackageCheck, Truck, XCircle } from 'lucide-react';
import { BESTELL_STATUS_LABEL } from '../../core/domain/lager';
import { KENNUNG_LABEL } from '../../core/domain/stammdaten';
import { formatChf, formatDatum, formatZeitpunkt } from '../../core/format';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { ConfirmDialog } from '../../core/ui/Dialog';
import { DossierAbschnitt, DossierKopf, Fakten } from '../../core/ui/ModulSeite';
import { Typenschild } from '../../core/ui/Typenschild';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import type { DispoStammdaten } from '../dispo/dispo.types';
import type { DispoAktionen } from '../dispo/store/useDispoAktionen';
import type { BestellungView } from './lager.model';
import styles from './LagerPage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface BestellungDossierProps {
  view: BestellungView;
  stammdaten: Pick<DispoStammdaten, 'geraete'>;
  aktionen: DispoAktionen;
}

export function BestellungDossier({ view, stammdaten, aktionen }: BestellungDossierProps) {
  const { bestellung, artikel, auftrag, kunde } = view;
  const [stornieren, setStornieren] = useState(false);
  const geraet = auftrag ? stammdaten.geraete.get(auftrag.geraetId) : undefined;
  const statusTon = bestellung.status === 'offen' ? (view.ueberfaellig ? 'danger' : 'signal') : bestellung.status === 'eingetroffen' ? 'ok' : 'mute';

  return (
    <div className={styles.dossier}>
      <DossierKopf
        kennung={
          <>
            <Typenschild label="Bestellung" wert={bestellung.nummer} size="md" />
            <Chip tone={statusTon} size="md" icon={bestellung.status === 'eingetroffen' ? PackageCheck : Truck}>
              {view.ueberfaellig ? 'überfällig' : BESTELL_STATUS_LABEL[bestellung.status]}
            </Chip>
            {view.heute && (
              <Chip tone="ok" size="md">
                Lieferung heute
              </Chip>
            )}
          </>
        }
        titel={`${bestellung.menge}× ${bestellung.bezeichnung}`}
        untertitel={`${bestellung.lieferant} · bestellt ${formatZeitpunkt(bestellung.bestelltAm)} von ${bestellung.von}`}
        aktionen={
          bestellung.status === 'offen' ? (
            <>
              <Button variant="secondary" size="sm" icon={XCircle} onClick={() => setStornieren(true)}>
                Stornieren
              </Button>
              <Button variant="primary" size="sm" icon={PackageCheck} onClick={() => aktionen.wareneingang(bestellung.id)}>
                Wareneingang
              </Button>
            </>
          ) : undefined
        }
      />

      <DossierAbschnitt titel="Lieferung">
        <Fakten
          eintraege={[
            { label: 'Liefertermin', wert: formatDatum(bestellung.liefertermin), mono: true },
            { label: 'Eingetroffen', wert: bestellung.eingetroffenAm ? formatZeitpunkt(bestellung.eingetroffenAm) : '–', mono: true },
            { label: 'Menge', wert: `${bestellung.menge} ${artikel?.einheit ?? 'Stk'}`, mono: true },
            { label: 'Wert', wert: artikel ? formatChf(artikel.preisChf * bestellung.menge) : '–', mono: true },
          ]}
        />
        {bestellung.status === 'offen' && (
          <p className={styles.hinweis}>
            {auftrag ? 'Wareneingang bucht das Teil in Glattbrugg ein, setzt es am Auftrag auf «geliefert» und legt den Folgetermin in den Eingang – die Dispo sieht «Teil da».' : 'Wareneingang bucht die Menge in Glattbrugg ein.'}
          </p>
        )}
      </DossierAbschnitt>

      <DossierAbschnitt titel="Bezug">
        <ul className={styles.liste}>
          {artikel && (
            <li className={styles.listenZeile}>
              <Verweis zu={ZIEL.artikel(artikel.artikelNummer)} label="Artikel" wert={artikel.artikelNummer} text={artikel.bezeichnung} />
            </li>
          )}
          {auftrag && (
            <li className={styles.listenZeile}>
              <Verweis zu={ZIEL.auftrag(auftrag.id)} label="Auftrag" wert={auftrag.nummer} text={auftrag.fehlerbild} />
            </li>
          )}
          {kunde && (
            <li className={styles.listenZeile}>
              <Verweis zu={ZIEL.kunde(kunde.id)} label="Kunde" wert={kunde.nummer} text={kunde.name} />
            </li>
          )}
          {geraet && (
            <li className={styles.listenZeile}>
              <Verweis zu={ZIEL.geraet(geraet.id)} label={KENNUNG_LABEL[geraet.marke]} wert={geraet.seriennummer} text={`${geraet.marke} ${geraet.modell}`} />
            </li>
          )}
          {!auftrag && <li className={styles.leer}>Lagerauffüllung ohne Auftrag.</li>}
        </ul>
      </DossierAbschnitt>

      <ConfirmDialog
        open={stornieren}
        titel={`${bestellung.nummer} stornieren?`}
        text={auftrag ? `Das Teil wird vom Auftrag ${auftrag.nummer} entfernt; die Dispo sieht keinen Liefertermin mehr.` : 'Die Bestellung wird als storniert markiert.'}
        bestaetigen="Stornieren"
        gefaehrlich
        onConfirm={() => {
          setStornieren(false);
          aktionen.bestellungStornieren(bestellung.id);
        }}
        onClose={() => setStornieren(false)}
      />
    </div>
  );
}

/* ◆ jh · eof */
