/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/views/Liste.tsx                      │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Tabelle: sortieren, gruppieren, Spalten wählen, Sammelaktionen        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Columns2, Rows3, X } from 'lucide-react';
import { parseIsoInput } from '../../../core/datum';
import type { IsoDatum } from '../../../core/datum';
import { STATUS_LABEL } from '../../../core/domain/einsatz';
import { KATEGORIE_LABEL } from '../../../core/domain/kategorie';
import { REGION_LABEL, fullName } from '../../../core/domain/stammdaten';
import type { Techniker } from '../../../core/domain/stammdaten';
import { formatDatumKurz, formatDauer, formatWochentag, formatZeitspanne } from '../../../core/format';
import { Avatar } from '../../../core/ui/Avatar';
import { Button, IconButton } from '../../../core/ui/Button';
import { Chip } from '../../../core/ui/Chip';
import { Auswahl, Eingabe, Schalter } from '../../../core/ui/Form';
import { Popover } from '../../../core/ui/Popover';
import { Typenschild } from '../../../core/ui/Typenschild';
import { cx } from '../../../core/ui/cx';
import { kategorieKlasse, statusKlasse } from '../../../core/ui/farben';
import type { EinsatzView } from '../store/dispo.selectors';
import styles from './Liste.module.css';

// ── §1 · Spalten ─────────────────────────────────────────────────

type SpalteId = 'datum' | 'zeit' | 'techniker' | 'auftrag' | 'kunde' | 'ort' | 'geraet' | 'kategorie' | 'status' | 'dauer';
type Gruppierung = 'keine' | 'techniker' | 'status' | 'kategorie' | 'region';

interface Spalte {
  id: SpalteId;
  label: string;
  sortWert: (view: EinsatzView) => string | number;
  render: (view: EinsatzView) => ReactNode;
  mono?: boolean;
}

const SPALTEN: readonly Spalte[] = [
  { id: 'datum', label: 'Datum', mono: true, sortWert: (v) => v.einsatz.datum, render: (v) => `${formatWochentag(v.einsatz.datum, 'kurz')} ${formatDatumKurz(v.einsatz.datum)}` },
  { id: 'zeit', label: 'Zeit', mono: true, sortWert: (v) => v.einsatz.startMin, render: (v) => formatZeitspanne(v.einsatz.startMin, v.einsatz.dauerMin) },
  {
    id: 'techniker', label: 'Techniker', sortWert: (v) => v.techniker.nachname,
    render: (v) => (
      <span className={styles.technikerZelle}>
        <Avatar techniker={v.techniker} size="sm" /> {v.techniker.nachname}
      </span>
    ),
  },
  { id: 'auftrag', label: 'Auftrag', sortWert: (v) => v.auftrag.nummer, render: (v) => <Typenschild label="Nr." wert={v.auftrag.nummer} /> },
  { id: 'kunde', label: 'Kunde', sortWert: (v) => v.kunde.name, render: (v) => v.kunde.name },
  { id: 'ort', label: 'Ort', sortWert: (v) => `${v.liegenschaft.adresse.ort} ${v.liegenschaft.adresse.strasse}`, render: (v) => `${v.liegenschaft.adresse.ort} · ${v.liegenschaft.adresse.strasse} ${v.liegenschaft.adresse.hausnummer}` },
  { id: 'geraet', label: 'Gerät', sortWert: (v) => `${v.geraet.marke} ${v.geraet.art}`, render: (v) => `${v.geraet.marke} ${v.geraet.art}` },
  {
    id: 'kategorie', label: 'Kategorie', sortWert: (v) => v.auftrag.kategorie,
    render: (v) => (
      <Chip tone="tint" className={kategorieKlasse(v.auftrag.kategorie)}>
        {KATEGORIE_LABEL[v.auftrag.kategorie]}
      </Chip>
    ),
  },
  {
    id: 'status', label: 'Status', sortWert: (v) => v.einsatz.status,
    render: (v) => (
      <span className={cx(styles.status, statusKlasse(v.einsatz.status))}>
        <span className={styles.swatch} aria-hidden /> {STATUS_LABEL[v.einsatz.status]}
      </span>
    ),
  },
  { id: 'dauer', label: 'Dauer', mono: true, sortWert: (v) => v.einsatz.dauerMin, render: (v) => formatDauer(v.einsatz.dauerMin) },
];

const GRUPPEN: readonly { id: Gruppierung; label: string }[] = [
  { id: 'keine', label: 'Keine Gruppierung' },
  { id: 'techniker', label: 'Nach Techniker' },
  { id: 'status', label: 'Nach Status' },
  { id: 'kategorie', label: 'Nach Kategorie' },
  { id: 'region', label: 'Nach Region' },
];

function gruppenLabel(view: EinsatzView, gruppierung: Gruppierung): string {
  switch (gruppierung) {
    case 'techniker':
      return `${view.techniker.kuerzel} · ${fullName(view.techniker)}`;
    case 'status':
      return STATUS_LABEL[view.einsatz.status];
    case 'kategorie':
      return KATEGORIE_LABEL[view.auftrag.kategorie];
    case 'region':
      return REGION_LABEL[view.region];
    default:
      return '';
  }
}

// ── §2 · Komponente ──────────────────────────────────────────────

interface ListeProps {
  views: readonly EinsatzView[];
  techniker: readonly Techniker[];
  heute: IsoDatum;
  mehrfach: readonly string[];
  ausgewaehltId: string | null;
  onSelectEinsatz: (einsatzId: string) => void;
  onToggleMehrfach: (einsatzId: string) => void;
  onSetMehrfach: (ids: readonly string[]) => void;
  onAssign: (ids: readonly string[], technikerId: string) => void;
  onShift: (ids: readonly string[], datum: IsoDatum) => void;
}

export function Liste({ views, techniker, heute, mehrfach, ausgewaehltId, onSelectEinsatz, onToggleMehrfach, onSetMehrfach, onAssign, onShift }: ListeProps) {
  const [sortSpalte, setSortSpalte] = useState<SpalteId>('datum');
  const [absteigend, setAbsteigend] = useState(false);
  const [gruppierung, setGruppierung] = useState<Gruppierung>('keine');
  const [versteckt, setVersteckt] = useState<SpalteId[]>([]);
  const [spaltenOffen, setSpaltenOffen] = useState(false);
  const [zielTechniker, setZielTechniker] = useState('');
  const [zielDatum, setZielDatum] = useState<string>(heute);
  const spaltenRef = useRef<HTMLButtonElement>(null);

  const sichtbareSpalten = SPALTEN.filter((spalte) => !versteckt.includes(spalte.id));

  const sortiert = useMemo(() => {
    const spalte = SPALTEN.find((kandidat) => kandidat.id === sortSpalte) ?? SPALTEN[0];
    if (!spalte) return [...views];
    const richtung = absteigend ? -1 : 1;
    return [...views].sort((a, b) => {
      const wa = spalte.sortWert(a);
      const wb = spalte.sortWert(b);
      const vergleich = typeof wa === 'number' && typeof wb === 'number' ? wa - wb : String(wa).localeCompare(String(wb), 'de-CH');
      // jh› Gleichstand: immer nach Datum/Zeit – die Liste bleibt chronologisch lesbar.
      return richtung * vergleich || a.einsatz.datum.localeCompare(b.einsatz.datum) || a.einsatz.startMin - b.einsatz.startMin;
    });
  }, [views, sortSpalte, absteigend]);

  const gruppen = useMemo(() => {
    if (gruppierung === 'keine') return [{ label: '', views: sortiert }];
    const map = new Map<string, EinsatzView[]>();
    for (const view of sortiert) {
      const label = gruppenLabel(view, gruppierung);
      map.set(label, [...(map.get(label) ?? []), view]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de-CH')).map(([label, liste]) => ({ label, views: liste }));
  }, [sortiert, gruppierung]);

  function sortieren(id: SpalteId) {
    if (id === sortSpalte) {
      setAbsteigend((wert) => !wert);
      return;
    }
    setSortSpalte(id);
    setAbsteigend(false);
  }

  const alleGewaehlt = views.length > 0 && views.every((view) => mehrfach.includes(view.einsatz.id));

  return (
    <div className={styles.liste}>
      <div className={styles.werkzeuge}>
        <span className={styles.anzahl}>
          <span className={styles.mono}>{views.length}</span> Einsätze
        </span>
        <label className={styles.gruppierung}>
          <Rows3 size={16} strokeWidth={1.5} aria-hidden />
          <Auswahl value={gruppierung} onChange={(event) => setGruppierung(event.target.value as Gruppierung)} aria-label="Gruppierung">
            {GRUPPEN.map((gruppe) => (
              <option key={gruppe.id} value={gruppe.id}>
                {gruppe.label}
              </option>
            ))}
          </Auswahl>
        </label>
        <Button ref={spaltenRef} variant="ghost" size="sm" icon={Columns2} onClick={() => setSpaltenOffen((wert) => !wert)}>
          Spalten
        </Button>
        <Popover anchor={spaltenRef.current} open={spaltenOffen} onClose={() => setSpaltenOffen(false)} placement="bottom-start" breite={220} label="Spalten wählen">
          <div className={styles.spaltenwahl}>
            {SPALTEN.map((spalte) => (
              <Schalter key={spalte.id} checked={!versteckt.includes(spalte.id)} onChange={(an) => setVersteckt((liste) => (an ? liste.filter((id) => id !== spalte.id) : [...liste, spalte.id]))}>
                {spalte.label}
              </Schalter>
            ))}
          </div>
        </Popover>
      </div>

      {mehrfach.length > 0 && (
        <div className={styles.sammelleiste}>
          <strong>
            <span className={styles.mono}>{mehrfach.length}</span> ausgewählt
          </strong>
          <label className={styles.sammelfeld}>
            <span>Techniker zuweisen</span>
            <Auswahl value={zielTechniker} onChange={(event) => setZielTechniker(event.target.value)}>
              <option value="">wählen …</option>
              {techniker.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.kuerzel} · {fullName(person)}
                </option>
              ))}
            </Auswahl>
            <Button variant="secondary" size="sm" disabled={!zielTechniker} onClick={() => zielTechniker && onAssign(mehrfach, zielTechniker)}>
              Zuweisen
            </Button>
          </label>
          <label className={styles.sammelfeld}>
            <span>Verschieben auf</span>
            <Eingabe type="date" value={zielDatum} mono onChange={(event) => setZielDatum(event.target.value)} />
            <Button
              variant="secondary"
              size="sm"
              disabled={!parseIsoInput(zielDatum)}
              onClick={() => {
                const datum = parseIsoInput(zielDatum);
                if (datum) onShift(mehrfach, datum);
              }}
            >
              Verschieben
            </Button>
          </label>
          <IconButton icon={X} label="Auswahl aufheben" size="sm" onClick={() => onSetMehrfach([])} />
        </div>
      )}

      <div className={styles.tabellenRahmen}>
        <table className={styles.tabelle}>
          <thead>
            <tr>
              <th scope="col" className={styles.kasten}>
                <input type="checkbox" aria-label="Alle auswählen" checked={alleGewaehlt} onChange={() => onSetMehrfach(alleGewaehlt ? [] : views.map((view) => view.einsatz.id))} />
              </th>
              {sichtbareSpalten.map((spalte) => (
                <th key={spalte.id} scope="col" aria-sort={sortSpalte === spalte.id ? (absteigend ? 'descending' : 'ascending') : 'none'}>
                  <button type="button" className={cx(styles.sortKnopf, sortSpalte === spalte.id && styles.sortAktiv)} onClick={() => sortieren(spalte.id)}>
                    {spalte.label}
                    {sortSpalte === spalte.id ? (
                      absteigend ? <ArrowDown size={16} strokeWidth={1.5} aria-hidden /> : <ArrowUp size={16} strokeWidth={1.5} aria-hidden />
                    ) : (
                      <ArrowUpDown size={16} strokeWidth={1.5} aria-hidden className={styles.sortLeer} />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          {gruppen.map((gruppe) => (
            <tbody key={gruppe.label || 'alle'}>
              {gruppe.label && (
                <tr className={styles.gruppenZeile}>
                  <th scope="rowgroup" colSpan={sichtbareSpalten.length + 1}>
                    {gruppe.label} <span className={styles.mono}>{gruppe.views.length}</span>
                  </th>
                </tr>
              )}
              {gruppe.views.map((view) => (
                <tr
                  key={view.einsatz.id}
                  className={cx(styles.zeile, view.einsatz.id === ausgewaehltId && styles.zeileAktiv, mehrfach.includes(view.einsatz.id) && styles.zeileGewaehlt, !view.imFilter && styles.zeileAbgeblendet)}
                  onClick={() => onSelectEinsatz(view.einsatz.id)}
                >
                  <td className={styles.kasten} onClick={(event) => event.stopPropagation()}>
                    <input type="checkbox" aria-label={`${view.auftrag.nummer} auswählen`} checked={mehrfach.includes(view.einsatz.id)} onChange={() => onToggleMehrfach(view.einsatz.id)} />
                  </td>
                  {sichtbareSpalten.map((spalte) => (
                    <td key={spalte.id} className={cx(spalte.mono && styles.mono)}>
                      {spalte.render(view)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
        {views.length === 0 && <p className={styles.leer}>Keine Einsätze im gewählten Zeitraum.</p>}
      </div>
    </div>
  );
}

/* ◆ jh · eof */
