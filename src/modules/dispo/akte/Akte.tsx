/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/akte/Akte.tsx                        │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Auftrags-Akte: Karte, Kopf, Detailzeilen, Fotos, Teile, Verlauf, Tun  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  Building,
  CalendarClock,
  CalendarPlus,
  Car,
  ChevronDown,
  Copy,
  FileText,
  Inbox,
  Link2,
  Lock,
  MapPin,
  Maximize2,
  MessageSquare,
  Move,
  Pencil,
  Phone,
  Receipt,
  Route,
  ShieldCheck,
  Trash,
  WashingMachine,
  X,
} from 'lucide-react';
import type { IsoDatum, Minuten } from '../../../core/datum';
import { EINSATZ_STATUS, STATUS_LABEL, isMovable } from '../../../core/domain/einsatz';
import type { Einsatz, EinsatzStatus } from '../../../core/domain/einsatz';
import { KATEGORIE_LABEL } from '../../../core/domain/kategorie';
import { KENNUNG_LABEL, KUNDENART_LABEL, formatAdresse, fullName } from '../../../core/domain/stammdaten';
import { formatDatum, formatDatumKurz, formatDauer, formatKm, formatWochentag, formatZeitspanne } from '../../../core/format';
import { googleRouteUrl } from '../../../core/geo';
import { Avatar } from '../../../core/ui/Avatar';
import { Button, IconButton } from '../../../core/ui/Button';
import { CapsLabel } from '../../../core/ui/CapsLabel';
import { Chip } from '../../../core/ui/Chip';
import { DetailZeile } from '../../../core/ui/DetailZeile';
import { ConfirmDialog, Dialog } from '../../../core/ui/Dialog';
import { Typenschild, TypenschildPlatte } from '../../../core/ui/Typenschild';
import { cx } from '../../../core/ui/cx';
import { kategorieKlasse, statusKlasse } from '../../../core/ui/farben';
import type { DispoStammdaten, PlanZiel } from '../dispo.types';
import { MapCanvas } from '../karte/MapCanvas';
import type { KartenLinie, KartenPin } from '../karte/karte.types';
import { KundenChips } from '../KundenChips';
import type { EinsatzAenderung } from '../store/dispo.reducer';
import { verknuepfungenFuerAuftrag } from '../store/dispo.selectors';
import { AkteErsatzteile } from './AkteErsatzteile';
import { AkteFotos } from './AkteFotos';
import { AkteVerlauf } from './AkteVerlauf';
import type { AuftragAkte } from './akte.model';
import { BearbeitenDialog } from './BearbeitenDialog';
import { SlotVorschlaege } from './SlotVorschlaege';
import { VerschiebenPopover } from './VerschiebenPopover';
import styles from './Akte.module.css';

// ── §1 · Hilfen ──────────────────────────────────────────────────

function Abschnitt({ titel, zusatz, children }: { titel: string; zusatz?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.abschnitt}>
      <header className={styles.abschnittKopf}>
        <CapsLabel as="h3">{titel}</CapsLabel>
        {zusatz}
      </header>
      {children}
    </section>
  );
}

function kopieren(text: string): void {
  // jh› Clipboard kann in eingebetteten Fenstern fehlen – dann passiert einfach nichts.
  void navigator.clipboard?.writeText(text).catch(() => undefined);
}

function Kontaktaktionen({ telefon, name }: { telefon: string; name: string }) {
  return (
    <>
      <a className={styles.telefon} href={`tel:${telefon.replace(/\s/g, '')}`} title={`${name} anrufen`} aria-label={`${name} anrufen`}>
        <Phone size={16} strokeWidth={1.5} aria-hidden />
      </a>
      <span className={styles.gesperrtIcon} title="SMS-Bestätigung – Modul «SMS & Website» folgt (v0.6)">
        <MessageSquare size={16} strokeWidth={1.5} aria-hidden />
        <Lock size={16} strokeWidth={1.5} aria-hidden className={styles.schlossKlein} />
      </span>
    </>
  );
}

// ── §2 · Akte ────────────────────────────────────────────────────

interface AkteProps {
  akte: AuftragAkte;
  stammdaten: DispoStammdaten;
  einsaetze: readonly Einsatz[];
  heute: IsoDatum;
  jetztMin: Minuten;
  onClose: () => void;
  onSetStatus: (einsatzId: string, status: EinsatzStatus) => void;
  onRequestFolgetermin: (einsatzId: string) => void;
  onUnplan: (einsatzId: string) => void;
  onPlan: (pendenzId: string, ziel: PlanZiel) => void;
  onMove: (einsatzId: string, ziel: PlanZiel) => void;
  onSave: (auftrag: AuftragAkte['auftrag'], einsatz?: EinsatzAenderung) => void;
  onCopy: (auftragId: string) => void;
  onDelete: (auftragId: string) => void;
  onSelectPendenz: (pendenzId: string) => void;
  onOpenEinsatz: (einsatz: Einsatz) => void;
}

// jh› Nicht-modal im Panel: der Plan bleibt bedienbar, ein Klick auf den
//     nächsten Einsatz wechselt die Akte, ohne das Panel zu schliessen.
export function Akte({ akte, stammdaten, einsaetze, heute, jetztMin, onClose, onSetStatus, onRequestFolgetermin, onUnplan, onPlan, onMove, onSave, onCopy, onDelete, onSelectPendenz, onOpenEinsatz }: AkteProps) {
  const { auftrag, kunde, liegenschaft, geraet, einsatz, pendenz, techniker, koordinaten, vorgaenger } = akte;
  const [bearbeiten, setBearbeiten] = useState(false);
  const [verschieben, setVerschieben] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
  const [kartenDialog, setKartenDialog] = useState(false);
  const [historieOffen, setHistorieOffen] = useState(false);
  const verschiebenRef = useRef<HTMLButtonElement>(null);

  const pins: KartenPin[] = [
    { id: auftrag.id, koordinaten, label: auftrag.nummer.slice(-3), farbeKlasse: kategorieKlasse(auftrag.kategorie), aktiv: true, titel: `${auftrag.nummer} · ${formatAdresse(liegenschaft.adresse)}` },
    ...(vorgaenger ? [{ id: 'vorgaenger', koordinaten: vorgaenger.koordinaten, label: '←', gedimmt: true, titel: vorgaenger.label }] : []),
  ];
  const linien: KartenLinie[] = vorgaenger ? [{ id: 'route', punkte: [vorgaenger.koordinaten, koordinaten], farbeToken: '--sl-ink-2', gestrichelt: true }] : [];
  const routeUrl = googleRouteUrl(koordinaten, vorgaenger?.koordinaten);
  const garantie = geraet.garantieBis ? (geraet.garantieBis < heute ? `abgelaufen ${formatDatum(geraet.garantieBis)}` : `bis ${formatDatum(geraet.garantieBis)}`) : 'keine';
  const zeigeEinsatzListe = akte.einsaetze.length > 1 || (pendenz !== null && akte.einsaetze.length > 0);
  // jh› Zusammenhänge zu anderen Aufträgen (Mietgerät, Ersatzlieferung, Folgearbeiten) – anklickbar, wenn disponiert.
  const verknuepfungen = useMemo(() => verknuepfungenFuerAuftrag(stammdaten, einsaetze, auftrag.id, einsatz).filter((eintrag) => eintrag.art === 'bezug' || eintrag.art === 'bezogen'), [stammdaten, einsaetze, auftrag.id, einsatz]);

  return (
    <div className={styles.akte} role="region" aria-label={`Akte ${auftrag.nummer}`}>
      {/* ── Kartenkopf ── */}
      <div className={styles.kartenkopf}>
        <MapCanvas pins={pins} linien={linien} fokusId={auftrag.id} className={styles.karte} />
        <div className={styles.kartenAktionen}>
          <a className={styles.kartenKnopf} href={routeUrl} target="_blank" rel="noreferrer" title="Route in Google Maps öffnen">
            <Route size={16} strokeWidth={1.5} aria-hidden /> Route
          </a>
          <button type="button" className={styles.kartenKnopf} onClick={() => setKartenDialog(true)} title="Karte vergrössern">
            <Maximize2 size={16} strokeWidth={1.5} aria-hidden /> Vergrössern
          </button>
        </div>
        <IconButton icon={X} label="Akte schliessen (Esc)" size="sm" className={styles.schliessen} onClick={onClose} />
      </div>
      {vorgaenger && (
        <p className={styles.fahrzeit}>
          <Car size={16} strokeWidth={1.5} aria-hidden />
          <span className={styles.mono}>
            ↳ {vorgaenger.fahrzeitMin} min · {formatKm(vorgaenger.km)}
          </span>
          <span>{vorgaenger.label}</span>
        </p>
      )}

      <div className={styles.inhalt}>
        {/* ── Kopf ── */}
        <header className={styles.kopf}>
          <div className={styles.kopfZeile}>
            <Typenschild label="Auftrag" wert={auftrag.nummer} size="md" />
            <IconButton icon={Pencil} label="Bearbeiten" size="sm" onClick={() => setBearbeiten(true)} />
          </div>
          <h2 className={styles.titel}>{kunde.name}</h2>
          <div className={styles.chips}>
            <Chip tone="tint" className={kategorieKlasse(auftrag.kategorie)} size="md">
              {KATEGORIE_LABEL[auftrag.kategorie]}
            </Chip>
            {einsatz && (
              <Chip tone="neutral" size="md" className={cx(styles.statusChip, statusKlasse(einsatz.status))}>
                <span className={styles.swatch} aria-hidden />
                {STATUS_LABEL[einsatz.status]}
              </Chip>
            )}
            {pendenz && (
              <Chip tone="signal" size="md" icon={Inbox}>
                {pendenz.anlass === 'folgetermin' ? 'Folgetermin offen' : 'Nicht disponiert'}
              </Chip>
            )}
          </div>
          {verknuepfungen.length > 0 && (
            <div className={styles.verknuepfungen}>
              {verknuepfungen.map((verknuepfung, index) => {
                const ziel = verknuepfung.einsatzId ? einsaetze.find((kandidat) => kandidat.id === verknuepfung.einsatzId) : undefined;
                return (
                  <button
                    key={`${verknuepfung.auftragId}-${index}`}
                    type="button"
                    className={styles.verknuepfung}
                    disabled={!ziel}
                    title={ziel ? 'Verknüpften Einsatz öffnen' : verknuepfung.text}
                    onClick={() => ziel && onOpenEinsatz(ziel)}
                  >
                    <Link2 size={14} strokeWidth={1.5} aria-hidden />
                    <span>{verknuepfung.text}</span>
                  </button>
                );
              })}
            </div>
          )}
          <KundenChips kunde={kunde} liegenschaft={liegenschaft} />
        </header>

        {/* ── Pendenz: Vorschläge ── */}
        {pendenz && (
          <Abschnitt titel="Planen">
            <dl className={styles.fakten}>
              <div>
                <dt>Geschätzt</dt>
                <dd className={styles.mono}>{formatDauer(pendenz.dauerMin)}</dd>
              </div>
              <div>
                <dt>Frühestens</dt>
                <dd className={styles.mono}>{pendenz.fruehestensAm ? formatDatum(pendenz.fruehestensAm) : 'sofort'}</dd>
              </div>
              {pendenz.hinweis && (
                <div className={styles.breit}>
                  <dt>Hinweis</dt>
                  <dd>{pendenz.hinweis}</dd>
                </div>
              )}
            </dl>
            <SlotVorschlaege
              stammdaten={stammdaten}
              einsaetze={einsaetze}
              auftragId={auftrag.id}
              dauerMin={pendenz.dauerMin}
              abDatum={pendenz.fruehestensAm && pendenz.fruehestensAm > heute ? pendenz.fruehestensAm : heute}
              heute={heute}
              jetztMin={jetztMin}
              onPlan={(ziel) => onPlan(pendenz.id, ziel)}
            />
            <p className={styles.hinweis}>Oder die Karte aus dem Eingang direkt in den Plan ziehen.</p>
          </Abschnitt>
        )}

        {/* ── Einsatz & Status ── */}
        {einsatz && techniker && (
          <Abschnitt titel="Einsatz">
            <DetailZeile
              icon={CalendarClock}
              label="Zeitraum"
              mono
              wert={`${formatWochentag(einsatz.datum, 'kurz')} ${formatDatum(einsatz.datum)} · ${formatZeitspanne(einsatz.startMin, einsatz.dauerMin)}`}
              zusatz={formatDauer(einsatz.dauerMin)}
              aktionen={
                isMovable(einsatz.status) ? (
                  <>
                    <IconButton icon={Move} label="Verschieben" size="sm" onClick={() => setVerschieben(true)} ref={verschiebenRef} />
                    <IconButton icon={Inbox} label="Zurück in den Eingang" size="sm" onClick={() => onUnplan(einsatz.id)} />
                  </>
                ) : undefined
              }
            />
            <div className={styles.technikerZeile}>
              <Avatar techniker={techniker} size="lg" />
              <div>
                <p className={styles.technikerName}>{fullName(techniker)}</p>
                <p className={styles.technikerMeta}>
                  <Car size={16} strokeWidth={1.5} aria-hidden /> {techniker.fahrzeug} · <span className={styles.mono}>{techniker.telefon}</span>
                </p>
              </div>
            </div>
            {/* jh? Status setzt im Mockup der Disponent – später meldet ihn die Techniker-App. */}
            <div className={styles.statusleiste} role="radiogroup" aria-label="Status setzen">
              {EINSATZ_STATUS.map(({ status, label }) => (
                <button
                  key={status}
                  type="button"
                  role="radio"
                  aria-checked={einsatz.status === status}
                  className={cx(styles.statusKnopf, statusKlasse(status), einsatz.status === status && styles.statusAktiv)}
                  onClick={() => onSetStatus(einsatz.id, status)}
                >
                  {label}
                </button>
              ))}
            </div>
          </Abschnitt>
        )}

        {/* ── Ort & Parteien ── */}
        <Abschnitt titel="Einsatzort & Parteien">
          <DetailZeile
            icon={MapPin}
            label="Einsatzort"
            wert={
              <>
                {formatAdresse(liegenschaft.adresse)}
                {auftrag.wohnung && (
                  <span className={styles.wohnung}>
                    {' '}
                    · <span className={styles.mono}>{auftrag.wohnung.nummer}</span> · {auftrag.wohnung.lage}
                  </span>
                )}
              </>
            }
            zusatz={liegenschaft.zugang}
            aktionen={<IconButton icon={Copy} label="Adresse kopieren" size="sm" onClick={() => kopieren(formatAdresse(liegenschaft.adresse))} />}
          />
          <DetailZeile
            icon={Building}
            label={kunde.art === 'verwaltung' ? 'Liegenschaft / Verwaltung' : 'Liegenschaft'}
            wert={
              <>
                {liegenschaft.bezeichnung}
                {liegenschaft.objektNummer && <span className={styles.mono}> · {liegenschaft.objektNummer}</span>}
              </>
            }
            zusatz={`${KUNDENART_LABEL[kunde.art]} · ${kunde.nummer}`}
          />
          <DetailZeile
            icon={Phone}
            label={auftrag.kontaktVorOrt.rolle}
            wert={auftrag.kontaktVorOrt.name}
            zusatz={<span className={styles.mono}>{auftrag.kontaktVorOrt.telefon}</span>}
            aktionen={<Kontaktaktionen telefon={auftrag.kontaktVorOrt.telefon} name={auftrag.kontaktVorOrt.name} />}
          />
          {kunde.kontakt.name !== auftrag.kontaktVorOrt.name && (
            <DetailZeile
              icon={Building}
              label={kunde.art === 'verwaltung' ? 'Verwaltung' : 'Auftraggeber'}
              wert={kunde.kontakt.name}
              zusatz={<span className={styles.mono}>{kunde.kontakt.telefon}</span>}
              aktionen={<Kontaktaktionen telefon={kunde.kontakt.telefon} name={kunde.kontakt.name} />}
            />
          )}
          <DetailZeile
            icon={Receipt}
            label="Rechnungsempfänger"
            wert={
              auftrag.rechnung.art === 'garantie'
                ? `${auftrag.rechnung.marke} – Herstellergarantie`
                : auftrag.rechnung.art === 'mieter'
                  ? auftrag.kontaktVorOrt.name
                  : kunde.name
            }
            zusatz={
              auftrag.rechnung.art === 'garantie'
                ? `Fall ${auftrag.rechnung.fallNummer}`
                : auftrag.rechnung.art === 'mieter'
                  ? auftrag.rechnung.grund
                  : auftrag.rechnung.referenz
            }
          />
        </Abschnitt>

        {/* ── Gerät & Fehlerbild ── */}
        <Abschnitt titel="Gerät & Fehlerbild">
          <TypenschildPlatte
            titel="Typenschild"
            marke={geraet.marke}
            zeilen={[
              { schluessel: geraet.art, wert: geraet.modell },
              { schluessel: 'Typ', wert: geraet.typNummer },
              { schluessel: KENNUNG_LABEL[geraet.marke], wert: geraet.seriennummer },
              { schluessel: 'Baujahr', wert: String(geraet.baujahr) },
              { schluessel: 'Garantie', wert: garantie },
            ]}
          />
          {geraet.historie.length > 0 && (
            <div className={styles.historie}>
              <button type="button" className={styles.historieKopf} onClick={() => setHistorieOffen((wert) => !wert)} aria-expanded={historieOffen}>
                <WashingMachine size={16} strokeWidth={1.5} aria-hidden />
                {geraet.historie.length} frühere{geraet.historie.length === 1 ? 'r Einsatz' : ' Einsätze'} an diesem Gerät
                <ChevronDown size={16} strokeWidth={1.5} aria-hidden className={cx(styles.chevron, historieOffen && styles.chevronOffen)} />
              </button>
              {historieOffen && (
                <ul className={styles.historieListe}>
                  {geraet.historie.map((ereignis) => (
                    <li key={`${ereignis.datum}-${ereignis.text}`}>
                      <span className={styles.mono}>{formatDatum(ereignis.datum)}</span> · {ereignis.text} · {ereignis.technikerKuerzel}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <blockquote className={styles.fehlerbild}>{auftrag.fehlerbild}</blockquote>
          {auftrag.notiz && <p className={styles.notiz}>{auftrag.notiz}</p>}
        </Abschnitt>

        <Abschnitt titel="Fotos" zusatz={<span className={styles.mono}>{auftrag.fotos.length}</span>}>
          <AkteFotos fotos={auftrag.fotos} />
        </Abschnitt>

        <Abschnitt titel="Ersatzteile">
          <AkteErsatzteile teile={auftrag.ersatzteile} heute={heute} />
        </Abschnitt>

        <Abschnitt titel="Verlauf">
          <AkteVerlauf phasen={akte.phasen} />
        </Abschnitt>

        {zeigeEinsatzListe && (
          <Abschnitt titel="Einsätze zu diesem Auftrag" zusatz={<span className={styles.mono}>{akte.einsaetze.length}</span>}>
            <ul className={styles.einsatzListe}>
              {akte.einsaetze.map((eintrag) => (
                <li key={eintrag.id}>
                  <button type="button" className={cx(styles.einsatzEintrag, statusKlasse(eintrag.status), eintrag.id === einsatz?.id && styles.einsatzAktuell)} onClick={() => onOpenEinsatz(eintrag)}>
                    <span className={styles.mono}>
                      {formatWochentag(eintrag.datum, 'kurz')} {formatDatumKurz(eintrag.datum)}
                    </span>
                    <span className={styles.mono}>{formatZeitspanne(eintrag.startMin, eintrag.dauerMin)}</span>
                    <span className={styles.einsatzStatus}>{STATUS_LABEL[eintrag.status]}</span>
                    <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Abschnitt>
        )}
      </div>

      {/* ── Aktionen (fixiert) ── */}
      <footer className={styles.aktionen}>
        <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setBearbeiten(true)}>
          Bearbeiten
        </Button>
        <Button variant="secondary" size="sm" icon={Copy} onClick={() => onCopy(auftrag.id)}>
          Kopieren
        </Button>
        {einsatz && isMovable(einsatz.status) && (
          <Button variant="secondary" size="sm" icon={Move} onClick={() => setVerschieben(true)}>
            Verschieben
          </Button>
        )}
        {einsatz && !akte.offeneFolge && (
          <Button variant="secondary" size="sm" icon={CalendarPlus} onClick={() => onRequestFolgetermin(einsatz.id)}>
            Folgetermin
          </Button>
        )}
        {akte.offeneFolge && (
          <Button variant="secondary" size="sm" icon={Inbox} onClick={() => onSelectPendenz(akte.offeneFolge?.id ?? '')}>
            Folgetermin im Eingang
          </Button>
        )}
        <span className={styles.gesperrt} title="Modul «Servicerapporte» folgt (v0.6)">
          <Lock size={16} strokeWidth={1.5} aria-hidden /> <FileText size={16} strokeWidth={1.5} aria-hidden /> Servicerapport
        </span>
        <span className={styles.gesperrt} title="Modul «SMS & Website» folgt (v0.6)">
          <Lock size={16} strokeWidth={1.5} aria-hidden /> <MessageSquare size={16} strokeWidth={1.5} aria-hidden /> SMS
        </span>
        <Button variant="danger" size="sm" icon={Trash} className={styles.loeschen} onClick={() => setLoeschen(true)}>
          Löschen
        </Button>
      </footer>

      {bearbeiten && (
        <BearbeitenDialog
          open
          auftrag={auftrag}
          einsatz={einsatz}
          techniker={stammdaten.techniker}
          onClose={() => setBearbeiten(false)}
          onSave={(neu, aenderung) => {
            onSave(neu, aenderung);
            setBearbeiten(false);
          }}
        />
      )}
      {einsatz && verschieben && (
        <VerschiebenPopover anchor={verschiebenRef.current} open einsatz={einsatz} techniker={stammdaten.techniker} onClose={() => setVerschieben(false)} onMove={(ziel) => onMove(einsatz.id, ziel)} />
      )}
      <ConfirmDialog
        open={loeschen}
        titel={`Auftrag ${auftrag.nummer} löschen?`}
        text={`Alle Einsätze und offenen Pendenzen zu «${kunde.name} – ${auftrag.fehlerbild}» werden aus dem Plan entfernt. Rückgängig ist möglich.`}
        bestaetigen="Löschen"
        gefaehrlich
        onConfirm={() => {
          setLoeschen(false);
          onDelete(auftrag.id);
        }}
        onClose={() => setLoeschen(false)}
      />
      <Dialog open={kartenDialog} onClose={() => setKartenDialog(false)} titel={formatAdresse(liegenschaft.adresse)} untertitel={vorgaenger ? `${vorgaenger.fahrzeitMin} min · ${formatKm(vorgaenger.km)} ${vorgaenger.label}` : undefined} breite="lg">
        <div className={styles.grosseKarte}>
          <MapCanvas pins={pins} linien={linien} fokusId={auftrag.id} uebersicht typwahl />
        </div>
        <p className={styles.hinweis}>
          <ShieldCheck size={16} strokeWidth={1.5} aria-hidden /> Koordinaten sind Näherungswerte · <a href={routeUrl} target="_blank" rel="noreferrer">In Google Maps öffnen</a>
        </p>
      </Dialog>
    </div>
  );
}

/* ◆ jh · eof */
