/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/app/LagerSeite.tsx                         │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Mein Fahrzeug: Bestand an Bord, knappe Teile, Lieferungen für mich    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo } from 'react';
import { Package, PackageCheck, Truck } from 'lucide-react';
import { ARTIKEL_GRUPPE_LABEL, fahrzeugOrt } from '../../core/domain/lager';
import type { Artikel, ArtikelGruppe } from '../../core/domain/lager';
import { formatDatumKurz } from '../../core/format';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { Chip } from '../../core/ui/Chip';
import { cx } from '../../core/ui/cx';
import { useApp } from './AppKontext';
import styles from './Seiten.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface Bordeintrag {
  artikel: Artikel;
  menge: number;
}

const GRUPPEN: readonly ArtikelGruppe[] = ['ersatzteil', 'zubehoer', 'verbrauch'];

// jh› Der Techniker sieht, was im Auto liegt – und welches Teil für seine Aufträge unterwegs ist.
// jh# 017 Fahrzeuglager in der App nur lesend – Auffüllen anfordern und Verbrauch melden fehlen noch.
export function LagerSeite() {
  const { techniker, heute, state } = useApp();
  const ort = fahrzeugOrt(techniker.id);

  const anBord = useMemo<Bordeintrag[]>(
    () =>
      state.bestaende
        .filter((bestand) => bestand.ort === ort && bestand.menge > 0)
        .map((bestand) => ({ artikel: state.stammdaten.artikel.get(bestand.artikelNummer), menge: bestand.menge }))
        .filter((eintrag): eintrag is Bordeintrag => eintrag.artikel !== undefined)
        .sort((a, b) => a.artikel.bezeichnung.localeCompare(b.artikel.bezeichnung, 'de-CH')),
    [state.bestaende, state.stammdaten.artikel, ort],
  );

  const meineAuftraege = useMemo(() => new Set(state.einsaetze.filter((einsatz) => einsatz.technikerId === techniker.id).map((einsatz) => einsatz.auftragId)), [state.einsaetze, techniker.id]);
  const lieferungen = useMemo(
    () => state.bestellungen.filter((bestellung) => bestellung.status === 'offen' && bestellung.auftragId && meineAuftraege.has(bestellung.auftragId)).sort((a, b) => a.liefertermin.localeCompare(b.liefertermin)),
    [state.bestellungen, meineAuftraege],
  );
  const stueck = anBord.reduce((summe, eintrag) => summe + eintrag.menge, 0);

  return (
    <div className={styles.seite}>
      <section className={styles.leiste}>
        <div>
          <span className={styles.leisteZahl}>{anBord.length}</span>
          <span className={styles.leisteLabel}>Artikel</span>
        </div>
        <div>
          <span className={styles.leisteZahl}>{stueck}</span>
          <span className={styles.leisteLabel}>Stück</span>
        </div>
        <div>
          <span className={styles.leisteZahl}>{anBord.filter((eintrag) => eintrag.artikel.gruppe === 'ersatzteil' && eintrag.menge <= 1).length}</span>
          <span className={styles.leisteLabel}>knapp</span>
        </div>
        <div>
          <span className={styles.leisteZahl}>{lieferungen.length}</span>
          <span className={styles.leisteLabel}>unterwegs</span>
        </div>
      </section>

      <p className={styles.hinweisKarte}>
        <Truck size={16} strokeWidth={1.5} aria-hidden /> {techniker.fahrzeug} · Auffüllen bucht das Büro im Lager (Umbuchung Glattbrugg → Fahrzeug).
      </p>

      {GRUPPEN.map((gruppe) => {
        const eintraege = anBord.filter((eintrag) => eintrag.artikel.gruppe === gruppe);
        if (eintraege.length === 0) return null;
        return (
          <section key={gruppe} className={styles.abschnitt}>
            <CapsLabel as="h3">{ARTIKEL_GRUPPE_LABEL[gruppe]}</CapsLabel>
            <ul className={styles.bord}>
              {eintraege.map((eintrag) => (
                <li key={eintrag.artikel.artikelNummer} className={styles.bordZeile}>
                  <Package size={16} strokeWidth={1.5} aria-hidden className={styles.bordIcon} />
                  <span className={styles.bordText}>
                    <span>{eintrag.artikel.bezeichnung}</span>
                    <span className={styles.quelle}>
                      {eintrag.artikel.artikelNummer}
                      {eintrag.artikel.marke && ` · ${eintrag.artikel.marke}`}
                    </span>
                  </span>
                  <span className={cx(styles.mono, styles.bordMenge, gruppe === 'ersatzteil' && eintrag.menge <= 1 && styles.bordKnapp)}>{eintrag.menge}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {anBord.length === 0 && <p className={styles.leer}>Nichts an Bord – das Büro füllt das Fahrzeug im Lager auf.</p>}

      {lieferungen.length > 0 && (
        <section className={styles.abschnitt}>
          <CapsLabel as="h3">Unterwegs für meine Aufträge</CapsLabel>
          <ul className={styles.bord}>
            {lieferungen.map((bestellung) => {
              const auftrag = bestellung.auftragId ? state.stammdaten.auftraege.get(bestellung.auftragId) : undefined;
              return (
                <li key={bestellung.id} className={styles.bordZeile}>
                  <PackageCheck size={16} strokeWidth={1.5} aria-hidden className={styles.bordIcon} />
                  <span className={styles.bordText}>
                    <span>
                      {bestellung.menge}× {bestellung.bezeichnung}
                    </span>
                    <span className={styles.quelle}>{auftrag ? `${auftrag.nummer} · ${auftrag.fehlerbild}` : 'Lager'}</span>
                  </span>
                  <Chip tone={bestellung.liefertermin < heute ? 'danger' : bestellung.liefertermin === heute ? 'ok' : 'neutral'}>{formatDatumKurz(bestellung.liefertermin)}</Chip>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ◆ jh · eof */
