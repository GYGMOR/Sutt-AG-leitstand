/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dashboard/Auswertung.tsx                   │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Auswertung: Dienst-Donut, Auslastung, Erledigt-Verlauf, Rapporte      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { Clock, FileText } from 'lucide-react';
import type { IsoDatum, Minuten } from '../../core/datum';
import { fullName } from '../../core/domain/stammdaten';
import { formatDatum, formatDatumKurz, formatDauer, formatProzent, formatWochentag, formatZeit } from '../../core/format';
import { Button } from '../../core/ui/Button';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { Anteile, Balken, DiagrammKarte, Donut, Linie, Saeulen } from '../../core/ui/Diagramm';
import type { Serie } from '../../core/ui/Diagramm';
import type { Auswertung as AuswertungDaten } from './dashboard.model';
import styles from './DashboardPage.module.css';

// ── §1 · Farben je Entität ───────────────────────────────────────

// jh› Farbe folgt der Sache, nie dem Rang: Kategorien tragen dieselben Kanten wie in der Plantafel,
//     Rapportstatus und Dienststand feste Plätze – ein Filter darf nie umfärben.
const DIENST: readonly Serie[] = [
  { id: 'eingestempelt', label: 'Eingestempelt', farbe: 'var(--sl-dv-2)' },
  { id: 'pause', label: 'In der Pause', farbe: 'var(--sl-dv-3)' },
  { id: 'draussen', label: 'Nicht eingestempelt', farbe: 'var(--sl-dv-rest)' },
];

const RAPPORT_SERIEN: readonly Serie[] = [
  { id: 'pruefen', label: 'Zu prüfen', farbe: 'var(--sl-dv-1)' },
  { id: 'freigegeben', label: 'Freigegeben', farbe: 'var(--sl-dv-2)' },
  { id: 'verrechnet', label: 'Verrechnet', farbe: 'var(--sl-dv-3)' },
];

function kategorieFarbe(id: string): string {
  return id === 'andere' ? 'var(--sl-dv-rest)' : `var(--sl-kat-${id}-edge)`;
}

// ── §2 · Komponente ──────────────────────────────────────────────

interface AuswertungProps {
  auswertung: AuswertungDaten;
  heute: IsoDatum;
  jetztMin: Minuten;
  onPerson: (mitarbeiterId: string) => void;
  onZeit: () => void;
  onRapporte: () => void;
}

export function Auswertung({ auswertung, heute, jetztMin, onZeit, onRapporte }: AuswertungProps) {
  const { dienst, auslastung, erledigt, rapporte, kategorien } = auswertung;
  const imDienst = dienst.eingestempelt + dienst.pause;
  const erledigtTotal = erledigt.reduce((summe, tag) => summe + tag.anzahl, 0);
  const kategorienTotal = kategorien.reduce((summe, eintrag) => summe + eintrag.anzahl, 0);

  return (
    <section className={styles.auswertung} aria-label="Auswertung">
      <header className={styles.karteKopf}>
        <CapsLabel as="h2">Auswertung · letzte {auswertung.tage} Tage</CapsLabel>
        <span className={styles.kopfText}>
          {formatDatumKurz(auswertung.von)}–{formatDatum(heute)} · Stand {formatZeit(jetztMin)}
        </span>
      </header>
      <div className={styles.diagramme}>
        <DiagrammKarte
          titel="Im Dienst jetzt"
          untertitel={`${dienst.gesamt} Mitarbeitende`}
          legende={DIENST}
          leer={dienst.gesamt === 0}
          tabelle={{
            kopf: ['Zustand', 'Personen'],
            zeilen: [
              ['Eingestempelt', dienst.eingestempelt],
              ['In der Pause', dienst.pause],
              ['Nicht eingestempelt', dienst.draussen],
            ],
          }}
        >
          <Donut
            teile={[
              { id: 'eingestempelt', label: 'Eingestempelt', wert: dienst.eingestempelt, farbe: 'var(--sl-dv-2)' },
              { id: 'pause', label: 'In der Pause', wert: dienst.pause, farbe: 'var(--sl-dv-3)' },
              { id: 'draussen', label: 'Nicht eingestempelt', wert: dienst.draussen, farbe: 'var(--sl-dv-rest)' },
            ]}
            mitte={{ wert: String(imDienst), label: imDienst === 1 ? 'im Dienst' : 'im Dienst' }}
          />
          <div className={styles.diagrammFuss}>
            <Button variant="ghost" size="sm" icon={Clock} onClick={onZeit}>
              Tagesbild
            </Button>
          </div>
        </DiagrammKarte>

        <DiagrammKarte
          titel="Auslastung heute"
          untertitel="Einsatz und Fahrt im Verhältnis zum Soll"
          leer={auslastung.length === 0}
          tabelle={{ kopf: ['Techniker/in', 'Einsatz', 'Fahrt', 'Soll', 'Auslastung'], zeilen: auslastung.map((zeile) => [fullName(zeile.techniker), formatDauer(zeile.verplantMin), formatDauer(zeile.fahrzeitMin), formatDauer(zeile.sollMin), formatProzent(zeile.anteil)]) }}
        >
          <Balken
            farbe="var(--sl-dv-1)"
            marke={1}
            zeilen={auslastung.map((zeile) => ({
              id: zeile.techniker.id,
              label: zeile.techniker.kuerzel,
              wert: zeile.anteil,
              anzeige: zeile.sollMin > 0 ? formatProzent(zeile.anteil) : 'abwesend',
              tooltip: {
                titel: fullName(zeile.techniker),
                zeilen: [
                  { wert: formatDauer(zeile.verplantMin), label: 'Einsatz', farbe: 'var(--sl-dv-1)' },
                  { wert: formatDauer(zeile.fahrzeitMin), label: 'Fahrt' },
                  { wert: formatDauer(zeile.sollMin), label: 'Soll' },
                ],
              },
            }))}
          />
        </DiagrammKarte>

        <DiagrammKarte
          titel="Erledigte Einsätze"
          untertitel={`je Tag · ${erledigtTotal} in ${auswertung.tage} Tagen`}
          leer={erledigt.length === 0}
          tabelle={{ kopf: ['Tag', 'Erledigt'], zeilen: erledigt.map((tag) => [`${formatWochentag(tag.datum, 'kurz')} ${formatDatum(tag.datum)}`, tag.anzahl]) }}
        >
          <Linie farbe="var(--sl-dv-1)" einheit="Einsätze" punkte={erledigt.map((tag) => ({ id: tag.datum, label: formatDatumKurz(tag.datum), wert: tag.anzahl, titel: `${formatWochentag(tag.datum)}, ${formatDatum(tag.datum)}` }))} />
        </DiagrammKarte>

        <DiagrammKarte
          titel="Rapporte je Woche"
          untertitel="nach Status, letzte 8 Wochen"
          legende={RAPPORT_SERIEN}
          leer={rapporte.length === 0}
          tabelle={{ kopf: ['Woche', 'Zu prüfen', 'Freigegeben', 'Verrechnet', 'Total'], zeilen: rapporte.map((woche) => [`${woche.label} · ab ${formatDatumKurz(woche.montag)}`, woche.pruefen, woche.freigegeben, woche.verrechnet, woche.pruefen + woche.freigegeben + woche.verrechnet]) }}
        >
          <Saeulen serien={RAPPORT_SERIEN} gruppen={rapporte.map((woche) => ({ id: woche.montag, label: woche.label, titel: `${woche.label} · ab ${formatDatumKurz(woche.montag)}`, werte: [woche.pruefen, woche.freigegeben, woche.verrechnet] }))} />
          <div className={styles.diagrammFuss}>
            <Button variant="ghost" size="sm" icon={FileText} onClick={onRapporte}>
              Rapporte
            </Button>
          </div>
        </DiagrammKarte>

        <DiagrammKarte
          titel="Einsätze nach Kategorie"
          untertitel={`${kategorienTotal} Einsätze, Anteile`}
          leer={kategorien.length === 0}
          tabelle={{ kopf: ['Kategorie', 'Einsätze', 'Anteil'], zeilen: kategorien.map((eintrag) => [eintrag.label, eintrag.anzahl, kategorienTotal > 0 ? `${Math.round((eintrag.anzahl / kategorienTotal) * 100)} %` : '–']) }}
        >
          <Anteile teile={kategorien.map((eintrag) => ({ id: eintrag.id, label: eintrag.label, wert: eintrag.anzahl, farbe: kategorieFarbe(eintrag.id) }))} />
        </DiagrammKarte>
      </div>
    </section>
  );
}

/* ◆ jh · eof */
