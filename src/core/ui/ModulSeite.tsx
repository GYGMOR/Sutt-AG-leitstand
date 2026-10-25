/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/ui/ModulSeite.tsx                             │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Modulraster: Liste mit Werkzeugen links, Dossier rechts, schmal um    │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';
import { cx } from './cx';
import styles from './ModulSeite.module.css';

// ── §1 · Seite ───────────────────────────────────────────────────

interface ModulSeiteProps {
  liste: ReactNode;
  detail: ReactNode;
  /** Dossier sichtbar – die Liste rückt zusammen, unter 1000 px verschwindet sie. */
  detailOffen: boolean;
  label: string;
  onZurueck?: () => void;
}

// jh› Ein Raster für alle Module: links die Liste mit Kacheln und Suche, rechts das Dossier.
//     Ohne Auswahl bekommt die Liste die ganze Breite – Tabellen brauchen Platz.
export function ModulSeite({ liste, detail, detailOffen, label, onZurueck }: ModulSeiteProps) {
  return (
    <div className={cx(styles.seite, detailOffen && styles.offen)}>
      <section className={styles.liste} aria-label={label}>
        {liste}
      </section>
      {detailOffen && (
        <section className={styles.detail} aria-label={`${label} – Dossier`}>
          {onZurueck && (
            <Button variant="ghost" size="sm" icon={ArrowLeft} className={styles.zurueck} onClick={onZurueck}>
              Liste
            </Button>
          )}
          {detail}
        </section>
      )}
    </div>
  );
}

// ── §2 · Werkzeugleiste ──────────────────────────────────────────

interface WerkzeugeProps {
  children: ReactNode;
  /** Text rechts, z. B. «27 von 384». */
  anzahl?: ReactNode;
}

export function ModulWerkzeuge({ children, anzahl }: WerkzeugeProps) {
  return (
    <div className={styles.werkzeuge}>
      {children}
      {anzahl !== undefined && <span className={styles.anzahl}>{anzahl}</span>}
    </div>
  );
}

// ── §3 · Dossier-Bausteine ───────────────────────────────────────

interface DossierKopfProps {
  kennung: ReactNode;
  titel: ReactNode;
  untertitel?: ReactNode;
  chips?: ReactNode;
  aktionen?: ReactNode;
}

export function DossierKopf({ kennung, titel, untertitel, chips, aktionen }: DossierKopfProps) {
  return (
    <header className={styles.kopf}>
      <div className={styles.kopfZeile}>
        <div className={styles.kennung}>{kennung}</div>
        {aktionen && <div className={styles.kopfAktionen}>{aktionen}</div>}
      </div>
      <h2 className={styles.titel}>{titel}</h2>
      {untertitel && <p className={styles.untertitel}>{untertitel}</p>}
      {chips && <div className={styles.chips}>{chips}</div>}
    </header>
  );
}

interface DossierAbschnittProps {
  titel: string;
  zusatz?: ReactNode;
  children: ReactNode;
}

export function DossierAbschnitt({ titel, zusatz, children }: DossierAbschnittProps) {
  return (
    <section className={styles.abschnitt}>
      <header className={styles.abschnittKopf}>
        <h3 className={styles.abschnittTitel}>{titel}</h3>
        {zusatz}
      </header>
      {children}
    </section>
  );
}

interface FaktenProps {
  eintraege: readonly { label: string; wert: ReactNode; mono?: boolean; breit?: boolean }[];
}

export function Fakten({ eintraege }: FaktenProps) {
  return (
    <dl className={styles.fakten}>
      {eintraege.map((eintrag) => (
        <div key={eintrag.label} className={cx(eintrag.breit && styles.faktBreit)}>
          <dt>{eintrag.label}</dt>
          <dd className={cx(eintrag.mono && styles.mono)}>{eintrag.wert}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ◆ jh · eof */
