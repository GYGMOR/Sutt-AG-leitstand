/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/einstellungen/DatenschutzBereich.tsx       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Datenschutz: Stelle, Aufbewahrung, Löschlauf · Protokoll mit Export   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { Download, Eraser, Save } from 'lucide-react';
import { ladeHerunter } from '../../core/datei';
import { todayIso } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import { DATENKATEGORIEN, FRISTBEGINN_LABEL } from '../../core/datenschutz/aufbewahrung';
import type { DatenKategorieId } from '../../core/datenschutz/aufbewahrung';
import { JOURNAL_ART_LABEL, JOURNAL_BEREICH_LABEL } from '../../core/domain/journal';
import type { JournalArt, JournalBereich, JournalEintrag } from '../../core/domain/journal';
import { formatDatum, formatZeitpunktKurz } from '../../core/format';
import type { DatenschutzStelle } from '../../core/mandant/mandant.types';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import type { ChipTone } from '../../core/ui/Chip';
import { ConfirmDialog } from '../../core/ui/Dialog';
import { Auswahl, Eingabe, Feld } from '../../core/ui/Form';
import { Suchfeld } from '../../core/ui/Suchfeld';
import { Tabelle } from '../../core/ui/Tabelle';
import type { Spalte } from '../../core/ui/Tabelle';
import type { DispoState } from '../dispo/store/dispo.reducer';
import type { DispoAktionen } from '../dispo/store/useDispoAktionen';
import { exportName } from '../personal/personal.model';
import type { EinstellungProps } from './EinstellungenPage';
import { LEERER_JOURNAL_FILTER, filterJournal, jahreLabel, journalCsv, loeschgrenzenFuer, loeschposten, zaehleJournal } from './einstellungen.model';
import type { JournalFilter } from './einstellungen.model';
import styles from './Einstellungen.module.css';

// ── §1 · Datenschutz ─────────────────────────────────────────────

interface DatenschutzProps extends EinstellungProps {
  state: DispoState;
  aktionen: DispoAktionen;
  heute: IsoDatum;
  /** Recht «datenschutz:verwalten» – Löschläufe ausführen. */
  darfLoeschen: boolean;
}

// jh› Datenminimierung ist hier keine Fussnote, sondern eine Tabelle: Jede Kategorie hat Zweck,
//     Rechtsgrundlage und Frist (DSG Art. 6 Abs. 4). Der Löschlauf wendet genau diese Fristen an.
// jh# 021 Löschlauf serverseitig auch für Aufträge, Rapporte und Kunden (Anonymisierung nach Abschluss) – der
//         Browser-Stand kennt nur Journal, Zeiten, Absenzen, Nachrichten und Einsatzverläufe.
export function DatenschutzEinstellungen({ mandant, darf, speichern, state, aktionen, heute, darfLoeschen }: DatenschutzProps) {
  const [stelle, setStelle] = useState<DatenschutzStelle>(mandant.datenschutz);
  const [fristen, setFristen] = useState<Record<string, string>>(() => Object.fromEntries(DATENKATEGORIEN.map((kategorie) => [kategorie.id, mandant.aufbewahrung[kategorie.id] === undefined ? '' : String(mandant.aufbewahrung[kategorie.id])])));
  const [loeschlaufOffen, setLoeschlaufOffen] = useState(false);
  const posten = useMemo(() => loeschposten(state, mandant, heute), [state, mandant, heute]);
  const total = posten.reduce((summe, eintrag) => summe + eintrag.anzahl, 0);
  const stelleOk = stelle.verantwortlich.trim() !== '' && /^\S+@\S+\.\S+$/.test(stelle.email.trim());
  const stelleGeaendert = JSON.stringify(stelle) !== JSON.stringify(mandant.datenschutz);

  const fristenSpeichern = () => {
    const aufbewahrung: Partial<Record<DatenKategorieId, number>> = {};
    for (const kategorie of DATENKATEGORIEN) {
      const roh = fristen[kategorie.id]?.trim() ?? '';
      const wert = Number(roh);
      if (roh !== '' && Number.isFinite(wert) && wert > 0 && wert !== kategorie.aufbewahrungJahre) aufbewahrung[kategorie.id] = wert;
    }
    const text = Object.entries(aufbewahrung)
      .map(([id, jahre]) => `${id} ${jahre} Jahre`)
      .join(', ');
    speichern({ aufbewahrung }, `Aufbewahrungsfristen geändert: ${text || 'alle auf Katalogwert'}`);
  };

  const loeschen = () => {
    const text = posten.filter((eintrag) => eintrag.anzahl > 0).map((eintrag) => `${eintrag.anzahl}× ${eintrag.kategorie.label}`).join(', ');
    aktionen.loeschlauf(loeschgrenzenFuer(mandant, heute), `Löschlauf ausgeführt: ${text || 'nichts löschfällig'}`);
  };

  return (
    <>
      <section className={styles.karte} aria-label="Verantwortliche Stelle">
        <header className={styles.karteKopf}>
          <h2 className={styles.modulName}>Verantwortliche Stelle</h2>
          <span className={styles.fussnote}>DSG Art. 5 lit. j, Art. 19 (Informationspflicht) · erscheint unter «Meine Daten»</span>
        </header>
        <div className={styles.formular}>
          <Feld label="Verantwortlich" render={(id) => <Eingabe id={id} value={stelle.verantwortlich} disabled={!darf} onChange={(event) => setStelle({ ...stelle, verantwortlich: event.target.value })} />} />
          <Feld label="E-Mail für Datenschutzanfragen" render={(id) => <Eingabe id={id} type="email" value={stelle.email} mono disabled={!darf} onChange={(event) => setStelle({ ...stelle, email: event.target.value })} />} />
          <Feld label="Telefon" render={(id) => <Eingabe id={id} value={stelle.telefon} mono disabled={!darf} onChange={(event) => setStelle({ ...stelle, telefon: event.target.value })} />} />
          <Feld label="Datenschutzberater/in (optional, DSG Art. 10)" render={(id) => <Eingabe id={id} value={stelle.beraterName ?? ''} disabled={!darf} onChange={(event) => setStelle({ ...stelle, ...(event.target.value.trim() ? { beraterName: event.target.value } : { beraterName: undefined }) })} />} />
        </div>
        <div className={styles.aktionen}>
          <Button variant="primary" size="sm" icon={Save} disabled={!darf || !stelleOk || !stelleGeaendert} onClick={() => speichern({ datenschutz: { ...stelle, verantwortlich: stelle.verantwortlich.trim(), email: stelle.email.trim() } }, `Verantwortliche Stelle geändert: ${stelle.verantwortlich.trim()}, ${stelle.email.trim()}`)}>
            Speichern
          </Button>
        </div>
      </section>

      <section className={styles.karte} aria-label="Aufbewahrung">
        <header className={styles.karteKopf}>
          <h2 className={styles.modulName}>Datenkategorien und Aufbewahrung</h2>
          <span className={styles.fussnote}>Bearbeitungsverzeichnis (DSG Art. 12) · leer = Katalogwert</span>
        </header>
        <table className={styles.tabelle}>
          <thead>
            <tr>
              <th scope="col">Kategorie</th>
              <th scope="col">Zweck</th>
              <th scope="col">Rechtsgrundlage</th>
              <th scope="col">Betroffene</th>
              <th scope="col">Frist</th>
              <th scope="col">Löschung</th>
            </tr>
          </thead>
          <tbody>
            {DATENKATEGORIEN.map((kategorie) => (
              <tr key={kategorie.id}>
                <td>
                  <strong>{kategorie.label}</strong>
                  {kategorie.besondersSchuetzenswert && (
                    <>
                      {' '}
                      <Chip tone="signal" size="sm">
                        besonders schützenswert
                      </Chip>
                    </>
                  )}
                  <br />
                  <span className={styles.fussnote}>{kategorie.beispiele}</span>
                </td>
                <td>{kategorie.zweck}</td>
                <td className={styles.fussnote}>{kategorie.rechtsgrundlage}</td>
                <td>{kategorie.betroffene}</td>
                <td className={styles.zahl}>
                  <Eingabe type="number" min={1} max={30} className={styles.fristEingabe} value={fristen[kategorie.id] ?? ''} placeholder={String(kategorie.aufbewahrungJahre)} mono disabled={!darf} aria-label={`Frist ${kategorie.label} in Jahren`} onChange={(event) => setFristen({ ...fristen, [kategorie.id]: event.target.value })} />
                  <br />
                  <span className={styles.fussnote}>Jahre {FRISTBEGINN_LABEL[kategorie.ab]}</span>
                </td>
                <td>{kategorie.loeschung === 'loeschen' ? 'löschen' : 'anonymisieren'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.aktionen}>
          <Button variant="primary" size="sm" icon={Save} disabled={!darf} onClick={fristenSpeichern}>
            Fristen speichern
          </Button>
          <span className={styles.fussnote}>Längere Fristen brauchen einen Grund (DSG Art. 6 Abs. 4) – kürzere als die gesetzlichen Pflichten sind nicht zulässig.</span>
        </div>
      </section>

      <section className={styles.karte} aria-label="Löschlauf">
        <header className={styles.karteKopf}>
          <h2 className={styles.modulName}>Löschlauf</h2>
          <Chip tone={total > 0 ? 'signal' : 'ok'}>{total > 0 ? `${total} Datensätze löschfällig` : 'nichts löschfällig'}</Chip>
        </header>
        <table className={styles.tabelle}>
          <thead>
            <tr>
              <th scope="col">Kategorie</th>
              <th scope="col">Frist</th>
              <th scope="col">Stichtag</th>
              <th scope="col">Löschfällig</th>
            </tr>
          </thead>
          <tbody>
            {posten.map((eintrag) => (
              <tr key={eintrag.kategorie.id}>
                <td>{eintrag.kategorie.label}</td>
                <td>
                  {jahreLabel(eintrag.jahre)} {FRISTBEGINN_LABEL[eintrag.kategorie.ab]}
                </td>
                <td className={styles.mono}>vor {formatDatum(eintrag.stichtag)}</td>
                <td className={styles.zahl}>{eintrag.anzahl}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.hinweis}>Der Löschlauf entfernt Einträge des Browser-Stands, deren Frist abgelaufen ist, und protokolliert das Ergebnis (ohne Personenbezug). Im Produkt läuft er nächtlich auf dem Server; Aufträge, Rapporte und Kunden werden dort nach Abschluss anonymisiert.</p>
        <div className={styles.aktionen}>
          <Button variant="danger" size="sm" icon={Eraser} disabled={!darfLoeschen || total === 0} onClick={() => setLoeschlaufOffen(true)}>
            Löschlauf ausführen
          </Button>
          {!darfLoeschen && <span className={styles.fussnote}>Braucht das Recht «Löschläufe» (Administration).</span>}
        </div>
        <ConfirmDialog
          open={loeschlaufOffen}
          titel={`${total} Datensätze löschen?`}
          text="Die Einträge werden endgültig aus dem Stand entfernt. Die Fristen folgen dem Katalog oben; das Journal erhält einen Eintrag über den Lauf."
          bestaetigen="Löschen"
          gefaehrlich
          onConfirm={() => {
            setLoeschlaufOffen(false);
            loeschen();
          }}
          onClose={() => setLoeschlaufOffen(false)}
        />
      </section>
    </>
  );
}

// ── §2 · Protokoll ───────────────────────────────────────────────

const ART_TON: Readonly<Record<JournalArt, ChipTone>> = { aenderung: 'neutral', einsicht: 'tint', anmeldung: 'mute', export: 'signal', loeschung: 'danger', system: 'mute' };
const ANZEIGE_MAX = 400;

const JOURNAL_SPALTEN: readonly Spalte<JournalEintrag>[] = [
  { id: 'zeitpunkt', label: 'Zeitpunkt', render: (eintrag) => formatZeitpunktKurz(eintrag.zeitpunkt), sortWert: (eintrag) => eintrag.zeitpunkt, mono: true, breite: '110px' },
  { id: 'benutzer', label: 'Wer', render: (eintrag) => eintrag.benutzer, sortWert: (eintrag) => eintrag.benutzer, mono: true, breite: '80px' },
  { id: 'bereich', label: 'Bereich', render: (eintrag) => <Chip tone="mute">{JOURNAL_BEREICH_LABEL[eintrag.bereich]}</Chip>, sortWert: (eintrag) => eintrag.bereich },
  { id: 'art', label: 'Art', render: (eintrag) => <Chip tone={ART_TON[eintrag.art]}>{JOURNAL_ART_LABEL[eintrag.art]}</Chip>, sortWert: (eintrag) => eintrag.art },
  {
    id: 'text',
    label: 'Was',
    render: (eintrag) => (
      <span>
        {eintrag.text}
        {eintrag.rueckgaengig && (
          <>
            {' '}
            <Chip tone="signal" size="sm">
              rückgängig
            </Chip>
          </>
        )}
      </span>
    ),
  },
  { id: 'betrifft', label: 'Betrifft', render: (eintrag) => [eintrag.betrifft, eintrag.mitarbeiterId].filter(Boolean).join(' · ') || '–', mono: true, nebensaechlich: true },
];

interface ProtokollProps {
  journal: readonly JournalEintrag[];
  darfLesen: boolean;
  darfExport: boolean;
  aktionen: DispoAktionen;
}

export function ProtokollEinstellungen({ journal, darfLesen, darfExport, aktionen }: ProtokollProps) {
  const [filter, setFilter] = useState<JournalFilter>(LEERER_JOURNAL_FILTER);
  const zaehler = useMemo(() => zaehleJournal(journal), [journal]);
  const sichtbar = useMemo(() => filterJournal(journal, filter), [journal, filter]);

  if (!darfLesen) return <p className={styles.hinweis}>Das Protokoll braucht das Recht «Protokoll sehen».</p>;

  const exportieren = () => {
    ladeHerunter(exportName('protokoll', [todayIso()], 'csv'), journalCsv(sichtbar), 'text/csv');
    aktionen.protokolliere({ bereich: 'datenschutz', art: 'export', text: `Protokoll (${sichtbar.length} Einträge) als CSV exportiert` });
  };

  return (
    <section className={styles.karte} aria-label="Protokoll">
      <header className={styles.karteKopf}>
        <h2 className={styles.modulName}>
          Journal · {sichtbar.length} von {journal.length}
        </h2>
        <div className={styles.aktionen}>
          <Auswahl value={filter.bereich} aria-label="Bereich" onChange={(event) => setFilter({ ...filter, bereich: event.target.value as JournalBereich | 'alle' })}>
            <option value="alle">Alle Bereiche</option>
            {(Object.keys(JOURNAL_BEREICH_LABEL) as JournalBereich[]).map((bereich) => (
              <option key={bereich} value={bereich}>
                {JOURNAL_BEREICH_LABEL[bereich]} ({zaehler.bereiche[bereich] ?? 0})
              </option>
            ))}
          </Auswahl>
          <Auswahl value={filter.art} aria-label="Art" onChange={(event) => setFilter({ ...filter, art: event.target.value as JournalArt | 'alle' })}>
            <option value="alle">Alle Arten</option>
            {(Object.keys(JOURNAL_ART_LABEL) as JournalArt[]).map((art) => (
              <option key={art} value={art}>
                {JOURNAL_ART_LABEL[art]} ({zaehler.arten[art] ?? 0})
              </option>
            ))}
          </Auswahl>
          <Suchfeld wert={filter.suche} onChange={(suche) => setFilter({ ...filter, suche })} placeholder="Text, Kürzel, Datensatz …" label="Protokoll durchsuchen" />
          {darfExport && (
            <Button variant="secondary" size="sm" icon={Download} onClick={exportieren}>
              CSV
            </Button>
          )}
        </div>
      </header>
      <Tabelle spalten={JOURNAL_SPALTEN} zeilen={sichtbar.slice(0, ANZEIGE_MAX)} zeilenId={(eintrag) => eintrag.id} label="Journal" standardSortierung={{ id: 'zeitpunkt', richtung: 'ab' }} dicht leer="Keine Einträge für diesen Filter." />
      {sichtbar.length > ANZEIGE_MAX && <p className={styles.fussnote}>Die ersten {ANZEIGE_MAX} Einträge – der CSV-Export enthält alle {sichtbar.length}.</p>}
      <p className={styles.hinweis}>Das Journal ist unveränderlich (append-only): Auch «Rückgängig» löscht keinen Eintrag, sondern schreibt einen neuen. Protokollierung nach DSV Art. 4 – mindestens ein Jahr aufbewahrt, nur für Datensicherheit, Nachvollziehbarkeit und Auskunft verwendet.</p>
    </section>
  );
}

/* ◆ jh · eof */
