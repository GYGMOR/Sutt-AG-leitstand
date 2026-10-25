/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/rapport/RapportFormular.tsx                │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Servicerapport: Zeiten, Arbeiten, Teile, Fotos, Abschluss, Signatur   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, Check, ImagePlus, Minus, Plus, ScanLine, Square, SquareCheck, Trash2, Undo2 } from 'lucide-react';
import type { Minuten } from '../../core/datum';
import { nowZeitpunkt } from '../../core/datum';
import { FOTO_MOTIV_LABEL, RAPPORT_LABEL } from '../../core/domain/auftrag';
import type { Auftrag, FotoMotiv, RapportStatus } from '../../core/domain/auftrag';
import { zeitpunktVon } from '../../core/domain/einsatz';
import type { Einsatz } from '../../core/domain/einsatz';
import { ABSCHLUSSARTEN, ABSCHLUSS_LABEL, TEIL_VERWENDUNG_LABEL, ZEIT_RASTER, rundeAufRaster, verrechenbareMinuten } from '../../core/domain/rapport';
import type { Abschlussart, Rueckmeldung, TeilVerwendung, Zeiten } from '../../core/domain/rapport';
import { KENNUNG_LABEL, formatAdresse, fullName } from '../../core/domain/stammdaten';
import type { Geraet, Kunde, Liegenschaft, Techniker } from '../../core/domain/stammdaten';
import { formatDatum, formatDauer, formatZeitpunktKurz, formatZeitspanne } from '../../core/format';
import { Button, IconButton } from '../../core/ui/Button';
import { CapsLabel } from '../../core/ui/CapsLabel';
import { Chip } from '../../core/ui/Chip';
import { FotoKachel } from '../../core/ui/FotoKachel';
import { Auswahl, Eingabe, Feld, Textbereich } from '../../core/ui/Form';
import { SegmentedControl } from '../../core/ui/SegmentedControl';
import type { SegmentOption } from '../../core/ui/SegmentedControl';
import { Typenschild } from '../../core/ui/Typenschild';
import { cx } from '../../core/ui/cx';
import { kategorieKlasse } from '../../core/ui/farben';
import type { RapportEntwurf } from '../dispo/store/useDispoAktionen';
import { geraetUnvollstaendig, neuesFoto, typenschildVorschlag } from './rapport.model';
import type { GeraeteVorschlag } from './rapport.model';
import { UnterschriftBild, UnterschriftFeld } from './UnterschriftFeld';
import styles from './RapportFormular.module.css';

// ── §1 · Hilfen ──────────────────────────────────────────────────

const VERWENDUNG_OPTIONEN: readonly SegmentOption<TeilVerwendung>[] = [
  { value: 'eingebaut', label: 'eingebaut' },
  { value: 'fahrzeuglager', label: 'ab Fahrzeug' },
  { value: 'bestellen', label: 'bestellen' },
];

const ABSCHLUSS_TEXT: Readonly<Record<Abschlussart, string>> = {
  erledigt: 'Gerät läuft, Auftrag abgeschlossen.',
  folgetermin: 'Weiterer Einsatz nötig – landet im Eingang der Dispo.',
  'teil-bestellt': 'Einsatz wartet auf Teil; Folgetermin ab Liefertermin.',
  'nicht-angetroffen': 'Niemand da – erneut terminieren, SMS-Vorlage bereit.',
};

const MOTIVE: readonly FotoMotiv[] = ['typenschild', 'schaden', 'anschluss', 'einbau', 'uebersicht'];

function ZeitZeile({ label, wert, hinweis, lesend, onChange }: { label: string; wert: Minuten; hinweis?: string; lesend: boolean; onChange: (wert: Minuten) => void }) {
  return (
    <div className={styles.zeitZeile}>
      <div className={styles.zeitText}>
        <span className={styles.zeitLabel}>{label}</span>
        {hinweis && <span className={styles.zeitHinweis}>{hinweis}</span>}
      </div>
      <div className={styles.zeitSteller}>
        {!lesend && <IconButton icon={Minus} label={`${label} ${ZEIT_RASTER} min weniger`} size="md" onClick={() => onChange(rundeAufRaster(wert - ZEIT_RASTER))} disabled={wert <= 0} />}
        <span className={styles.zeitWert}>{formatDauer(wert)}</span>
        {!lesend && <IconButton icon={Plus} label={`${label} ${ZEIT_RASTER} min mehr`} size="md" onClick={() => onChange(rundeAufRaster(wert + ZEIT_RASTER))} />}
      </div>
    </div>
  );
}

// ── §2 · Formular ────────────────────────────────────────────────

export interface RapportFormularProps {
  entwurf: RapportEntwurf;
  onChange: (entwurf: RapportEntwurf) => void;
  status: RapportStatus;
  auftrag: Auftrag;
  kunde: Kunde;
  liegenschaft: Liegenschaft;
  geraet: Geraet;
  einsatz: Einsatz;
  techniker: Techniker;
  /** Kürzel des angemeldeten Benutzers für neue Fotos. */
  kuerzel: string;
  /** Nur lesen (Büro, verrechnet) – keine Steller, keine Unterschriftsfläche. */
  lesend?: boolean;
  rueckmeldung?: Rueckmeldung;
  onGeraetUebernehmen?: (vorschlag: GeraeteVorschlag) => void;
  /** «Rapport per Mail» – öffnet den Nachrichtendialog in der Seite. */
  onMailSenden?: () => void;
}

export function RapportFormular(props: RapportFormularProps) {
  const { entwurf, onChange, status, auftrag, kunde, liegenschaft, geraet, einsatz, techniker, kuerzel, lesend = false, rueckmeldung, onGeraetUebernehmen, onMailSenden } = props;
  const dateiRef = useRef<HTMLInputElement>(null);
  const [quellen, setQuellen] = useState<Record<string, string>>({});
  const [neuerSchritt, setNeuerSchritt] = useState('');
  const [neuesTeil, setNeuesTeil] = useState({ bezeichnung: '', artikelNummer: '' });
  const [unterschriftName, setUnterschriftName] = useState(entwurf.unterschrift?.name ?? auftrag.kontaktVorOrt.name);
  const [vorschlagGezeigt, setVorschlagGezeigt] = useState(true);

  const setze = (teil: Partial<RapportEntwurf>) => onChange({ ...entwurf, ...teil });
  const setzeZeiten = (teil: Partial<Zeiten>) => setze({ zeiten: { ...entwurf.zeiten, ...teil } });

  const unterwegs = zeitpunktVon(einsatz, 'unterwegs');
  const vorOrt = zeitpunktVon(einsatz, 'vor-ort');
  const fertig = zeitpunktVon(einsatz, 'erledigt') ?? zeitpunktVon(einsatz, 'wartet-teil');
  const zeitenHinweis = unterwegs && vorOrt ? `Abfahrt ${formatZeitpunktKurz(unterwegs)} · vor Ort ${formatZeitpunktKurz(vorOrt)}${fertig ? ` · fertig ${formatZeitpunktKurz(fertig)}` : ''}` : 'Keine Statusmeldungen – Zeiten aus dem Plan';

  // ·· Arbeiten
  const schrittUmschalten = (id: string) => setze({ arbeiten: entwurf.arbeiten.map((schritt) => (schritt.id === id ? { ...schritt, erledigt: !schritt.erledigt } : schritt)) });
  const schrittHinzufuegen = () => {
    const text = neuerSchritt.trim();
    if (!text) return;
    setze({ arbeiten: [...entwurf.arbeiten, { id: `AS-N${entwurf.arbeiten.length + 1}-${Date.now()}`, text, erledigt: true }] });
    setNeuerSchritt('');
  };

  // ·· Teile
  const verwendungSetzen = (artikelNummer: string, verwendung: TeilVerwendung) => setze({ teile: entwurf.teile.map((teil) => (teil.artikelNummer === artikelNummer ? { ...teil, verwendung } : teil)) });
  const teilEntfernen = (artikelNummer: string) => setze({ teile: entwurf.teile.filter((teil) => teil.artikelNummer !== artikelNummer) });
  const teilHinzufuegen = () => {
    const bezeichnung = neuesTeil.bezeichnung.trim();
    if (!bezeichnung) return;
    const artikelNummer = neuesTeil.artikelNummer.trim() || `OHNE-${entwurf.teile.length + 1}`;
    setze({ teile: [...entwurf.teile, { artikelNummer, bezeichnung, menge: 1, verwendung: 'bestellen' }] });
    setNeuesTeil({ bezeichnung: '', artikelNummer: '' });
  };
  const bestellt = entwurf.teile.filter((teil) => teil.verwendung === 'bestellen');

  // ·· Fotos
  const fotoHinzufuegen = (motiv: FotoMotiv, quelle?: string) => {
    const foto = neuesFoto(einsatz.id, motiv, kuerzel, nowZeitpunkt());
    if (quelle) setQuellen((alt) => ({ ...alt, [foto.id]: quelle }));
    setze({ fotos: [...entwurf.fotos, foto] });
  };
  const dateiGewaehlt = (event: ChangeEvent<HTMLInputElement>) => {
    const datei = event.target.files?.[0];
    if (!datei) return;
    // jh# 012 Kamerafotos leben nur als Object-URL im Fenster – Bildablage (IndexedDB/Upload) fehlt (ADR-001).
    fotoHinzufuegen(entwurf.fotos.length === 0 ? 'typenschild' : 'schaden', URL.createObjectURL(datei));
    event.target.value = '';
  };
  const fotoMotiv = (id: string, motiv: FotoMotiv) => setze({ fotos: entwurf.fotos.map((foto) => (foto.id === id ? { ...foto, motiv } : foto)) });
  const fotoEntfernen = (id: string) => setze({ fotos: entwurf.fotos.filter((foto) => foto.id !== id) });
  const zeigeVorschlag = vorschlagGezeigt && !lesend && geraetUnvollstaendig(geraet) && entwurf.fotos.some((foto) => foto.motiv === 'typenschild') && onGeraetUebernehmen;
  const vorschlag = zeigeVorschlag ? typenschildVorschlag(geraet) : null;

  // ·· Unterschrift
  const unterschriftSetzen = (pfad: string) => {
    if (!pfad) {
      const { unterschrift: _weg, ...rest } = entwurf;
      onChange(rest);
      return;
    }
    setze({ unterschrift: { name: unterschriftName.trim() || auftrag.kontaktVorOrt.name, zeitpunkt: nowZeitpunkt(), pfad } });
  };

  return (
    <div className={styles.formular}>
      {/* ── Kopf ── */}
      <section className={cx(styles.karte, styles.kopf)}>
        <div className={styles.kopfZeile}>
          <Typenschild label="Rapport" wert={entwurf.nummer ?? 'neu'} size="md" />
          <Chip tone={status === 'offen' || status === 'erstellt' ? 'signal' : status === 'verrechnet' ? 'mute' : 'ok'} size="md">
            {RAPPORT_LABEL[status]}
          </Chip>
        </div>
        <h2 className={styles.titel}>{kunde.name}</h2>
        <p className={styles.untertitel}>
          {formatAdresse(liegenschaft.adresse)}
          {auftrag.wohnung && ` · ${auftrag.wohnung.nummer}`}
        </p>
        <dl className={styles.fakten}>
          <div>
            <dt>Auftrag</dt>
            <dd>
              <span className={styles.mono}>{auftrag.nummer}</span> <Chip tone="tint" className={kategorieKlasse(auftrag.kategorie)}>{auftrag.art}</Chip>
            </dd>
          </div>
          <div>
            <dt>Gerät</dt>
            <dd>
              {geraet.marke} {geraet.modell} · <span className={styles.mono}>{KENNUNG_LABEL[geraet.marke]} {geraet.seriennummer}</span>
            </dd>
          </div>
          <div>
            <dt>Einsatz</dt>
            <dd className={styles.mono}>
              {formatDatum(einsatz.datum)} · {formatZeitspanne(einsatz.startMin, einsatz.dauerMin)} · {techniker.kuerzel}
            </dd>
          </div>
          <div className={styles.breit}>
            <dt>Fehlerbild</dt>
            <dd>
              {auftrag.fehlerbild}
              {entwurf.diagnoseCode && <span className={styles.code}>{entwurf.diagnoseCode}</span>}
            </dd>
          </div>
        </dl>
        {rueckmeldung && (
          <p className={styles.rueckmeldung}>
            <Undo2 size={16} strokeWidth={1.5} aria-hidden /> Zurück vom Büro ({rueckmeldung.von}, {formatZeitpunktKurz(rueckmeldung.zeitpunkt)}): {rueckmeldung.bemerkung}
          </p>
        )}
      </section>

      {/* ── Zeiten ── */}
      <section className={styles.karte}>
        <CapsLabel as="h3">Zeiten</CapsLabel>
        <ZeitZeile label="Anfahrt" wert={entwurf.zeiten.anfahrtMin} hinweis={zeitenHinweis} lesend={lesend} onChange={(wert) => setzeZeiten({ anfahrtMin: wert })} />
        <ZeitZeile label="Arbeit" wert={entwurf.zeiten.arbeitMin} lesend={lesend} onChange={(wert) => setzeZeiten({ arbeitMin: wert })} />
        <ZeitZeile label="Pause" wert={entwurf.zeiten.pauseMin} lesend={lesend} onChange={(wert) => setzeZeiten({ pauseMin: wert })} />
        <p className={styles.summe}>
          Verrechenbar <strong className={styles.mono}>{formatDauer(verrechenbareMinuten(entwurf.zeiten))}</strong>
        </p>
      </section>

      {/* ── Arbeiten ── */}
      <section className={styles.karte}>
        <CapsLabel as="h3">Arbeiten</CapsLabel>
        <ul className={styles.checkliste}>
          {entwurf.arbeiten.map((schritt) => (
            <li key={schritt.id}>
              <button type="button" className={cx(styles.schritt, schritt.erledigt && styles.schrittErledigt)} onClick={() => schrittUmschalten(schritt.id)} disabled={lesend} aria-pressed={schritt.erledigt}>
                {schritt.erledigt ? <SquareCheck size={20} strokeWidth={1.5} aria-hidden /> : <Square size={20} strokeWidth={1.5} aria-hidden />}
                <span>{schritt.text}</span>
              </button>
            </li>
          ))}
        </ul>
        {!lesend && (
          <div className={styles.zeile}>
            <Eingabe value={neuerSchritt} placeholder="Weiterer Arbeitsschritt …" onChange={(event) => setNeuerSchritt(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), schrittHinzufuegen())} aria-label="Weiterer Arbeitsschritt" />
            <IconButton icon={Plus} label="Arbeitsschritt hinzufügen" size="md" onClick={schrittHinzufuegen} disabled={!neuerSchritt.trim()} />
          </div>
        )}
        <Feld label="Bemerkung" render={(id) => <Textbereich id={id} rows={3} value={entwurf.bemerkung} placeholder="Was war, was wurde gemacht, worauf achten?" onChange={(event) => setze({ bemerkung: event.target.value })} disabled={lesend} />} />
      </section>

      {/* ── Ersatzteile ── */}
      <section className={styles.karte}>
        <CapsLabel as="h3">Ersatzteile</CapsLabel>
        {entwurf.teile.length === 0 && <p className={styles.leer}>Keine Teile verwendet.</p>}
        <ul className={styles.teile}>
          {entwurf.teile.map((teil) => (
            <li key={teil.artikelNummer} className={styles.teil}>
              <div className={styles.teilText}>
                <span className={styles.teilName}>
                  {teil.menge > 1 && <span className={styles.mono}>{teil.menge}× </span>}
                  {teil.bezeichnung}
                </span>
                <span className={cx(styles.mono, styles.teilNummer)}>{teil.artikelNummer}</span>
              </div>
              {lesend ? (
                <Chip tone={teil.verwendung === 'bestellen' ? 'signal' : 'neutral'}>{TEIL_VERWENDUNG_LABEL[teil.verwendung]}</Chip>
              ) : (
                <div className={styles.teilAktionen}>
                  <SegmentedControl label={`Verwendung ${teil.bezeichnung}`} options={VERWENDUNG_OPTIONEN} value={teil.verwendung} onChange={(wert) => verwendungSetzen(teil.artikelNummer, wert)} />
                  <IconButton icon={Trash2} label="Teil entfernen" size="sm" onClick={() => teilEntfernen(teil.artikelNummer)} />
                </div>
              )}
            </li>
          ))}
        </ul>
        {!lesend && (
          <div className={styles.zeile}>
            <Eingabe value={neuesTeil.bezeichnung} placeholder="Teil ohne Nummer, z. B. Türgummi" onChange={(event) => setNeuesTeil({ ...neuesTeil, bezeichnung: event.target.value })} aria-label="Bezeichnung" />
            <Eingabe value={neuesTeil.artikelNummer} placeholder="Art.-Nr." mono className={styles.schmal} onChange={(event) => setNeuesTeil({ ...neuesTeil, artikelNummer: event.target.value })} aria-label="Artikelnummer" />
            <IconButton icon={Plus} label="Teil hinzufügen" size="md" onClick={teilHinzufuegen} disabled={!neuesTeil.bezeichnung.trim()} />
          </div>
        )}
        {bestellt.length > 0 && (
          <p className={styles.hinweis}>
            {bestellt.length} Teil{bestellt.length === 1 ? '' : 'e'} zu bestellen → Abschluss «Teil bestellt» setzt den Einsatz auf «Wartet auf Teil» und legt den Folgetermin ab Liefertermin an.
          </p>
        )}
      </section>

      {/* ── Fotos ── */}
      <section className={styles.karte}>
        <div className={styles.kopfZeile}>
          <CapsLabel as="h3">Fotos</CapsLabel>
          <span className={styles.mono}>{entwurf.fotos.length}</span>
        </div>
        <ul className={styles.fotos}>
          {entwurf.fotos.map((foto) => (
            <li key={foto.id} className={styles.foto}>
              <FotoKachel foto={foto} quelle={quellen[foto.id]} />
              {lesend ? (
                <span className={styles.fotoLabel}>{FOTO_MOTIV_LABEL[foto.motiv]}</span>
              ) : (
                <div className={styles.fotoAktionen}>
                  <Auswahl value={foto.motiv} onChange={(event) => fotoMotiv(foto.id, event.target.value as FotoMotiv)} aria-label="Motiv">
                    {MOTIVE.map((motiv) => (
                      <option key={motiv} value={motiv}>
                        {FOTO_MOTIV_LABEL[motiv]}
                      </option>
                    ))}
                  </Auswahl>
                  <IconButton icon={Trash2} label="Foto entfernen" size="sm" onClick={() => fotoEntfernen(foto.id)} />
                </div>
              )}
            </li>
          ))}
        </ul>
        {!lesend && (
          <div className={styles.zeile}>
            <input ref={dateiRef} type="file" accept="image/*" capture="environment" className={styles.versteckt} onChange={dateiGewaehlt} aria-label="Foto aufnehmen" />
            <Button variant="secondary" size="md" icon={Camera} onClick={() => dateiRef.current?.click()}>
              Foto aufnehmen
            </Button>
            {/* jh› Ohne Kamera (Demo, Desktop): Platzhalter mit Motiv – sieht aus wie die Mockfotos der Akte. */}
            <Button variant="ghost" size="md" icon={ImagePlus} onClick={() => fotoHinzufuegen(MOTIVE[entwurf.fotos.length % MOTIVE.length] ?? 'uebersicht')}>
              Platzhalter
            </Button>
          </div>
        )}
        {vorschlag && (
          <div className={styles.vorschlag}>
            <ScanLine size={18} strokeWidth={1.5} aria-hidden />
            <div className={styles.vorschlagText}>
              <strong>Typenschild erkannt</strong>
              <span>
                {geraet.marke} {vorschlag.modell} · Typ {vorschlag.typNummer} · {KENNUNG_LABEL[geraet.marke]} {vorschlag.seriennummer}
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Check}
              onClick={() => {
                onGeraetUebernehmen?.(vorschlag);
                setVorschlagGezeigt(false);
              }}
            >
              Übernehmen
            </Button>
          </div>
        )}
        {!lesend && <p className={styles.hinweis}>Mockup: Kamerabilder bleiben nur in diesem Fenster; Platzhalter werden gespeichert.</p>}
      </section>

      {/* ── Abschluss ── */}
      <section className={styles.karte}>
        <CapsLabel as="h3">Abschluss</CapsLabel>
        <div className={styles.abschluss} role="radiogroup" aria-label="Abschluss">
          {ABSCHLUSSARTEN.map((art) => (
            <button key={art} type="button" role="radio" aria-checked={entwurf.abschluss === art} className={cx(styles.abschlussKnopf, entwurf.abschluss === art && styles.abschlussAktiv)} onClick={() => setze({ abschluss: art })} disabled={lesend}>
              <span className={styles.abschlussLabel}>{ABSCHLUSS_LABEL[art]}</span>
              <span className={styles.abschlussText}>{ABSCHLUSS_TEXT[art]}</span>
            </button>
          ))}
        </div>
        {(entwurf.abschluss === 'folgetermin' || entwurf.abschluss === 'nicht-angetroffen') && (
          <Feld label={entwurf.abschluss === 'folgetermin' ? 'Grund für den Folgetermin' : 'Hinweis'} render={(id) => <Eingabe id={id} value={entwurf.abschlussGrund ?? ''} placeholder={entwurf.abschluss === 'folgetermin' ? 'z. B. Zweites Gerät prüfen, Dichtung bestellen' : 'z. B. Zettel hinterlassen, Hauswart informiert'} onChange={(event) => setze({ abschlussGrund: event.target.value })} disabled={lesend} />} />
        )}
      </section>

      {/* ── Unterschrift ── */}
      <section className={styles.karte}>
        <CapsLabel as="h3">Unterschrift</CapsLabel>
        {lesend || status === 'freigegeben' || status === 'verrechnet' ? (
          entwurf.unterschrift ? (
            <div className={styles.signaturAnzeige}>
              <UnterschriftBild pfad={entwurf.unterschrift.pfad} />
              <span className={styles.signaturName}>
                {entwurf.unterschrift.name} · {formatZeitpunktKurz(entwurf.unterschrift.zeitpunkt)}
              </span>
            </div>
          ) : (
            <p className={styles.leer}>Ohne Unterschrift abgeschlossen.</p>
          )
        ) : (
          <>
            <Feld label="Unterzeichnet von" render={(id) => <Eingabe id={id} value={unterschriftName} onChange={(event) => setUnterschriftName(event.target.value)} />} />
            <UnterschriftFeld wert={entwurf.unterschrift?.pfad ?? ''} onChange={unterschriftSetzen} />
            <div className={styles.zeile}>
              <span className={styles.hinweis}>{entwurf.unterschrift ? `Unterschrieben · ${fullName(techniker)} bestätigt die Arbeiten.` : 'Ohne Unterschrift bleibt der Rapport «erstellt».'}</span>
              {onMailSenden && (
                <Button variant="ghost" size="sm" onClick={onMailSenden}>
                  Rapport per Mail
                </Button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* ◆ jh · eof */
