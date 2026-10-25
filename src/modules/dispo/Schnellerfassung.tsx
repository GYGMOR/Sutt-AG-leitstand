/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/Schnellerfassung.tsx                 │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Telefon-Schnellerfassung (N): Nummer → Kunde → Gerät → Slot, < 30 s   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarCheck, Inbox, Phone, Timer, X } from 'lucide-react';
import { nowZeitpunkt } from '../../core/datum';
import type { IsoDatum, Minuten } from '../../core/datum';
import { DRINGLICHKEIT_LABEL } from '../../core/domain/auftrag';
import type { Auftrag, Dringlichkeit } from '../../core/domain/auftrag';
import type { Einsatz, Pendenz } from '../../core/domain/einsatz';
import { KATEGORIEN, kategorieFor } from '../../core/domain/kategorie';
import type { Kategorie } from '../../core/domain/kategorie';
import { MARKEN, formatAdresse, regionOf } from '../../core/domain/stammdaten';
import type { Geraet, Geraeteart, Marke } from '../../core/domain/stammdaten';
import { formatDatumKurz, formatWochentag, formatZeitspanne } from '../../core/format';
import { Avatar } from '../../core/ui/Avatar';
import { Button, IconButton } from '../../core/ui/Button';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { Chip } from '../../core/ui/Chip';
import { Auswahl, Eingabe, Feld, Textbereich } from '../../core/ui/Form';
import { SegmentedControl } from '../../core/ui/SegmentedControl';
import type { SegmentOption } from '../../core/ui/SegmentedControl';
import { cx } from '../../core/ui/cx';
import { kategorieKlasse } from '../../core/ui/farben';
import type { DispoStammdaten } from './dispo.types';
import { suggestSlotsFuerProfil } from './scoring';
import type { SlotKandidat } from './scoring';
import { nextAuftragsnummer, nextId } from './store/useDispoAktionen';
import styles from './Schnellerfassung.module.css';

// ── §1 · Typen ───────────────────────────────────────────────────

/** Eintrag des Telefonbuchs – kommt vom Modulwurzel-Mock. */
export interface TelefonTreffer {
  ziffern: string;
  anzeige: string;
  name: string;
  rolle: string;
  kundeId: string;
  liegenschaftId?: string;
  wohnungNummer?: string;
}

/** Vorbelegung aus Kunden-, Geräte- oder Auftragsdossier – die Nummer bleibt frei. */
export interface Vorbelegung {
  kundeId?: string;
  liegenschaftId?: string;
  geraetId?: string;
  wohnungNummer?: string;
  telefon?: string;
}

interface SchnellerfassungProps {
  open: boolean;
  stammdaten: DispoStammdaten;
  einsaetze: readonly Einsatz[];
  telefonbuch: readonly TelefonTreffer[];
  heute: IsoDatum;
  jetztMin: Minuten;
  vorbelegung?: Vorbelegung;
  onClose: () => void;
  onCreate: (auftrag: Auftrag, optionen: { geraet?: Geraet; pendenz?: Pendenz; einsatz?: Einsatz }) => void;
}

const DRINGLICHKEIT_OPTIONEN: readonly SegmentOption<Dringlichkeit>[] = (['notfall', 'hoch', 'normal', 'tief'] as const).map((wert) => ({ value: wert, label: DRINGLICHKEIT_LABEL[wert] }));
const DAUERN: readonly Minuten[] = [30, 60, 90, 120, 180];
const GERAETEARTEN: readonly Geraeteart[] = ['Waschmaschine', 'Wärmepumpentrockner', 'Geschirrspüler', 'Backofen', 'Steamer', 'Kochfeld', 'Kühlschrank', 'Gefrierschrank'];

function nurZiffern(text: string): string {
  return text.replace(/\D/g, '');
}

// ── §2 · Komponente ──────────────────────────────────────────────

export function Schnellerfassung({ open, stammdaten, einsaetze, telefonbuch, heute, jetztMin, vorbelegung, onClose, onCreate }: SchnellerfassungProps) {
  const [telefon, setTelefon] = useState('');
  const [kundeId, setKundeId] = useState('');
  const [liegenschaftId, setLiegenschaftId] = useState('');
  const [wohnung, setWohnung] = useState('');
  const [anrufer, setAnrufer] = useState('');
  const [geraetId, setGeraetId] = useState<string>('neu');
  const [neuMarke, setNeuMarke] = useState<Marke>('Miele');
  const [neuArt, setNeuArt] = useState<Geraeteart>('Waschmaschine');
  const [kategorie, setKategorie] = useState<Kategorie>('reparatur');
  const [dringlichkeit, setDringlichkeit] = useState<Dringlichkeit>('normal');
  const [fehlerbild, setFehlerbild] = useState('');
  const [dauer, setDauer] = useState<Minuten>(60);
  const [slotIndex, setSlotIndex] = useState(0);
  const [start, setStart] = useState(() => Date.now());
  const [sekunden, setSekunden] = useState(0);
  const telefonRef = useRef<HTMLInputElement>(null);

  // jh› Stoppuhr: Ziel «Auftrag in unter 30 Sekunden» – sichtbar, nicht belehrend.
  useEffect(() => {
    if (!open) return undefined;
    setStart(Date.now());
    setSekunden(0);
    // jh› Aus einem Dossier geöffnet: Kunde, Liegenschaft, Gerät stehen schon – nur das Problem fehlt.
    if (vorbelegung) {
      if (vorbelegung.kundeId) setKundeId(vorbelegung.kundeId);
      if (vorbelegung.liegenschaftId) setLiegenschaftId(vorbelegung.liegenschaftId);
      if (vorbelegung.geraetId) setGeraetId(vorbelegung.geraetId);
      if (vorbelegung.wohnungNummer) setWohnung(vorbelegung.wohnungNummer);
      if (vorbelegung.telefon) setTelefon(vorbelegung.telefon);
    }
    window.setTimeout(() => telefonRef.current?.focus(), 0);
    const timer = window.setInterval(() => setSekunden(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Anrufer erkennen
  const treffer = useMemo(() => {
    const ziffern = nurZiffern(telefon);
    if (ziffern.length < 7) return [];
    return telefonbuch.filter((eintrag) => eintrag.ziffern.endsWith(ziffern.slice(-7)) || eintrag.ziffern.includes(ziffern)).slice(0, 4);
  }, [telefon, telefonbuch]);

  function uebernehmen(eintrag: TelefonTreffer) {
    setTelefon(eintrag.anzeige);
    setAnrufer(eintrag.name);
    setKundeId(eintrag.kundeId);
    if (eintrag.liegenschaftId) setLiegenschaftId(eintrag.liegenschaftId);
    if (eintrag.wohnungNummer) setWohnung(eintrag.wohnungNummer);
    // jh› Gerät des letzten Auftrags an dieser Wohnung vorschlagen – meistens ruft man wegen desselben Geräts an.
    const letzterAuftrag = [...stammdaten.auftraege.values()]
      .filter((auftrag) => auftrag.liegenschaftId === eintrag.liegenschaftId && (!eintrag.wohnungNummer || auftrag.wohnung?.nummer === eintrag.wohnungNummer))
      .sort((a, b) => b.angefragtAm.localeCompare(a.angefragtAm))[0];
    if (letzterAuftrag) setGeraetId(letzterAuftrag.geraetId);
  }

  const kunden = useMemo(() => [...stammdaten.kunden.values()].sort((a, b) => a.name.localeCompare(b.name, 'de-CH')), [stammdaten]);
  const liegenschaften = useMemo(() => [...stammdaten.liegenschaften.values()].filter((liegenschaft) => !kundeId || liegenschaft.kundeId === kundeId), [stammdaten, kundeId]);
  const liegenschaft = stammdaten.liegenschaften.get(liegenschaftId);
  const bekannteGeraete = useMemo(() => {
    if (!liegenschaftId) return [];
    const ids = new Set([...stammdaten.auftraege.values()].filter((auftrag) => auftrag.liegenschaftId === liegenschaftId).map((auftrag) => auftrag.geraetId));
    return [...ids].map((id) => stammdaten.geraete.get(id)).filter((geraet): geraet is Geraet => geraet !== undefined);
  }, [stammdaten, liegenschaftId]);

  const marke: Marke = geraetId === 'neu' ? neuMarke : (stammdaten.geraete.get(geraetId)?.marke ?? neuMarke);

  const vorschlaege = useMemo<SlotKandidat[]>(() => {
    if (!liegenschaft) return [];
    return suggestSlotsFuerProfil({
      stammdaten,
      einsaetze,
      profil: { region: regionOf(liegenschaft.adresse.ort), marke, koordinaten: liegenschaft.koordinaten, dringend: dringlichkeit === 'notfall' || dringlichkeit === 'hoch' },
      dauerMin: dauer,
      abDatum: heute,
      heute,
      jetztMin,
      anzahl: 3,
    });
  }, [stammdaten, einsaetze, liegenschaft, marke, dringlichkeit, dauer, heute, jetztMin]);

  const bereit = kundeId !== '' && liegenschaft !== undefined && fehlerbild.trim().length >= 3;

  function bauen(): { auftrag: Auftrag; geraet?: Geraet } | null {
    if (!bereit || !liegenschaft) return null;
    const id = nextId('A');
    let geraet: Geraet | undefined;
    let geraetRef = geraetId;
    if (geraetId === 'neu') {
      // jh# 010 Modell/Typ «noch nicht erfasst» – der Typenschild-Scan (Modul Geräte) trägt sie nach.
      geraet = { id: `G-${id}`, marke: neuMarke, art: neuArt, modell: `${neuMarke} ${neuArt}`, typNummer: 'noch nicht erfasst', seriennummer: 'offen', baujahr: new Date().getFullYear(), historie: [] };
      geraetRef = geraet.id;
    }
    const kunde = stammdaten.kunden.get(kundeId);
    const auftrag: Auftrag = {
      id,
      nummer: nextAuftragsnummer(stammdaten.auftraege),
      art: kategorie === 'reparatur' ? 'Reparatur' : kategorie === 'montage' ? 'Montage' : kategorie === 'lieferung' ? 'Lieferung' : kategorie === 'garantie' ? 'Garantie' : kategorie === 'mietgeraet' ? 'Mietgerät' : kategorie === 'malerarbeiten' ? 'Malerarbeiten' : kategorie === 'offerte' ? 'Abklärung' : 'Reparatur',
      kategorie: kategorie === 'notfall' || dringlichkeit !== 'notfall' ? kategorie : kategorieFor('Reparatur', dringlichkeit),
      dringlichkeit,
      fehlerbild: fehlerbild.trim(),
      kanal: 'Schnellerfassung',
      angefragtAm: nowZeitpunkt(),
      bestelltAm: nowZeitpunkt(),
      kundeId,
      liegenschaftId: liegenschaft.id,
      ...(wohnung.trim() ? { wohnung: { nummer: wohnung.trim(), lage: '' } } : {}),
      kontaktVorOrt: { rolle: kunde?.art === 'verwaltung' ? 'Mieter' : kunde?.art === 'gewerbe' ? 'Betrieb' : 'Eigentümer', name: anrufer.trim() || kunde?.kontakt.name || 'Anrufer', telefon: telefon.trim() || '—' },
      rechnung: { art: 'auftraggeber', ...(liegenschaft.objektNummer ? { referenz: `Objekt ${liegenschaft.objektNummer}` } : {}) },
      geraetId: geraetRef,
      ersatzteile: [],
      fotos: [],
      rapport: 'offen',
      rechnungStatus: 'offen',
      dauerMin: dauer,
    };
    return geraet ? { auftrag, geraet } : { auftrag };
  }

  function zuruecksetzen() {
    setTelefon('');
    setKundeId('');
    setLiegenschaftId('');
    setWohnung('');
    setAnrufer('');
    setGeraetId('neu');
    setFehlerbild('');
    setKategorie('reparatur');
    setDringlichkeit('normal');
    setDauer(60);
    setSlotIndex(0);
  }

  function inEingang() {
    const gebaut = bauen();
    if (!gebaut) return;
    const pendenz: Pendenz = { id: nextId('P'), auftragId: gebaut.auftrag.id, anlass: 'neu', dauerMin: dauer, erstelltAm: nowZeitpunkt(), hinweis: `Telefon ${telefon.trim() || 'ohne Nummer'}` };
    onCreate(gebaut.auftrag, { ...(gebaut.geraet ? { geraet: gebaut.geraet } : {}), pendenz });
    zuruecksetzen();
    onClose();
  }

  function direktPlanen() {
    const gebaut = bauen();
    const slot = vorschlaege[slotIndex];
    if (!gebaut || !slot) return;
    const einsatz: Einsatz = { id: nextId('E'), auftragId: gebaut.auftrag.id, technikerId: slot.technikerId, datum: slot.datum, startMin: slot.startMin, dauerMin: dauer, status: 'geplant' };
    onCreate(gebaut.auftrag, { ...(gebaut.geraet ? { geraet: gebaut.geraet } : {}), einsatz });
    zuruecksetzen();
    onClose();
  }

  if (!open) return null;

  return (
    <aside className={styles.panel} role="dialog" aria-label="Neuer Auftrag – Telefon-Schnellerfassung">
      <header className={styles.kopf}>
        <div>
          <CapsLabel>Neuer Auftrag</CapsLabel>
          <h2 className={styles.titel}>
            <Phone size={20} strokeWidth={1.5} aria-hidden /> Telefon-Schnellerfassung
          </h2>
        </div>
        <span className={cx(styles.uhr, sekunden > 30 && styles.uhrUeber)} title="Ziel: unter 30 Sekunden">
          <Timer size={16} strokeWidth={1.5} aria-hidden /> {sekunden} s
        </span>
        <IconButton icon={X} label="Schliessen (Esc)" size="sm" onClick={onClose} />
      </header>

      <div className={styles.inhalt}>
        <Feld
          label="Telefonnummer"
          hinweis={treffer.length === 0 && nurZiffern(telefon).length >= 7 ? 'Unbekannte Nummer – Kunde unten wählen.' : 'Bekannte Nummern werden erkannt (z. B. 079 381 22 64).'}
          render={(id) => <Eingabe id={id} ref={telefonRef} value={telefon} mono inputMode="tel" placeholder="0xx xxx xx xx" onChange={(event) => setTelefon(event.target.value)} />}
        />
        {treffer.length > 0 && (
          <ul className={styles.treffer}>
            {treffer.map((eintrag) => (
              <li key={eintrag.ziffern}>
                <button type="button" className={styles.trefferKnopf} onClick={() => uebernehmen(eintrag)}>
                  <span className={styles.trefferName}>{eintrag.name}</span>
                  <span className={styles.trefferMeta}>
                    {eintrag.rolle} · {stammdaten.kunden.get(eintrag.kundeId)?.kurzname}
                    {eintrag.liegenschaftId && ` · ${stammdaten.liegenschaften.get(eintrag.liegenschaftId)?.adresse.strasse}`}
                    {eintrag.wohnungNummer && ` ${eintrag.wohnungNummer}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.zeile}>
          <Feld
            label="Kunde"
            render={(id) => (
              <Auswahl
                id={id}
                value={kundeId}
                onChange={(event) => {
                  setKundeId(event.target.value);
                  setLiegenschaftId('');
                  setGeraetId('neu');
                }}
              >
                <option value="">wählen …</option>
                {kunden.map((kunde) => (
                  <option key={kunde.id} value={kunde.id}>
                    {kunde.name}
                  </option>
                ))}
              </Auswahl>
            )}
          />
          <Feld label="Anrufer" render={(id) => <Eingabe id={id} value={anrufer} placeholder="Name" onChange={(event) => setAnrufer(event.target.value)} />} />
        </div>
        <div className={styles.zeile}>
          <Feld
            label="Liegenschaft"
            render={(id) => (
              <Auswahl
                id={id}
                value={liegenschaftId}
                onChange={(event) => {
                  setLiegenschaftId(event.target.value);
                  setGeraetId('neu');
                }}
                disabled={!kundeId}
              >
                <option value="">wählen …</option>
                {liegenschaften.map((eintrag) => (
                  <option key={eintrag.id} value={eintrag.id}>
                    {formatAdresse(eintrag.adresse)}
                  </option>
                ))}
              </Auswahl>
            )}
          />
          <Feld label="Wohnung" render={(id) => <Eingabe id={id} value={wohnung} mono placeholder="W 2.03" onChange={(event) => setWohnung(event.target.value)} />} />
        </div>

        <Feld
          label="Gerät"
          render={(id) => (
            <Auswahl id={id} value={geraetId} onChange={(event) => setGeraetId(event.target.value)}>
              <option value="neu">Neues / unbekanntes Gerät</option>
              {bekannteGeraete.map((geraet) => (
                <option key={geraet.id} value={geraet.id}>
                  {geraet.marke} {geraet.modell} · SN {geraet.seriennummer}
                </option>
              ))}
            </Auswahl>
          )}
        />
        {geraetId === 'neu' && (
          <div className={styles.zeile}>
            <Feld
              label="Marke"
              render={(id) => (
                <Auswahl id={id} value={neuMarke} onChange={(event) => setNeuMarke(event.target.value as Marke)}>
                  {MARKEN.map((wert) => (
                    <option key={wert} value={wert}>
                      {wert}
                    </option>
                  ))}
                </Auswahl>
              )}
            />
            <Feld
              label="Geräteart"
              render={(id) => (
                <Auswahl id={id} value={neuArt} onChange={(event) => setNeuArt(event.target.value as Geraeteart)}>
                  {GERAETEARTEN.map((wert) => (
                    <option key={wert} value={wert}>
                      {wert}
                    </option>
                  ))}
                </Auswahl>
              )}
            />
          </div>
        )}

        <div className={styles.feld}>
          <CapsLabel>Kategorie</CapsLabel>
          <div className={styles.kategorien} role="radiogroup" aria-label="Kategorie">
            {KATEGORIEN.map((meta) => (
              <button key={meta.id} type="button" role="radio" aria-checked={kategorie === meta.id} className={cx(styles.kategorieKnopf, kategorie === meta.id && styles.kategorieAktiv)} onClick={() => setKategorie(meta.id)}>
                <Chip tone="tint" className={kategorieKlasse(meta.id)} icon={meta.icon}>
                  {meta.kurz}
                </Chip>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.zeile}>
          <div className={styles.feld}>
            <CapsLabel>Dringlichkeit</CapsLabel>
            <SegmentedControl label="Dringlichkeit" options={DRINGLICHKEIT_OPTIONEN} value={dringlichkeit} onChange={setDringlichkeit} />
          </div>
          <Feld
            label="Dauer"
            render={(id) => (
              <Auswahl id={id} value={dauer} onChange={(event) => setDauer(Number(event.target.value))}>
                {DAUERN.map((wert) => (
                  <option key={wert} value={wert}>
                    {wert} min
                  </option>
                ))}
              </Auswahl>
            )}
          />
        </div>

        <Feld label="Fehlerbild" render={(id) => <Textbereich id={id} value={fehlerbild} rows={2} placeholder="Was meldet der Anrufer?" onChange={(event) => setFehlerbild(event.target.value)} />} />

        {liegenschaft && (
          <div className={styles.feld}>
            <CapsLabel>Smart-Slot</CapsLabel>
            {vorschlaege.length === 0 && <p className={styles.hinweis}>Kein freier Slot in den nächsten 7 Tagen.</p>}
            <ul className={styles.slots} role="radiogroup" aria-label="Terminvorschlag">
              {vorschlaege.map((slot, index) => (
                <li key={`${slot.technikerId}-${slot.datum}-${slot.startMin}`}>
                  <button type="button" role="radio" aria-checked={slotIndex === index} className={cx(styles.slot, slotIndex === index && styles.slotAktiv)} onClick={() => setSlotIndex(index)}>
                    <Avatar techniker={slot.techniker} size="sm" />
                    <span className={styles.slotText}>
                      <span className={styles.slotTermin}>
                        {formatWochentag(slot.datum, 'kurz')} {formatDatumKurz(slot.datum)} · {formatZeitspanne(slot.startMin, slot.dauerMin)}
                      </span>
                      <span className={styles.slotGruende}>
                        {slot.techniker.nachname} · {slot.bewertung.gruende.join(' · ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className={styles.fuss}>
        <Button variant="secondary" icon={Inbox} disabled={!bereit} onClick={inEingang}>
          In den Eingang
        </Button>
        <Button variant="primary" icon={CalendarCheck} disabled={!bereit || vorschlaege.length === 0} onClick={direktPlanen}>
          Direkt einplanen
        </Button>
      </footer>
    </aside>
  );
}

/* ◆ jh · eof */
