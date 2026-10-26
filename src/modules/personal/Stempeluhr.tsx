/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/personal/Stempeluhr.tsx                    │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Stempeluhr: Pille (Topbar), grosse Uhr mit Kreis, Streifen (App)      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Check, ChevronRight, Clock3, Coffee, Globe, LogIn, LogOut, Play, StickyNote, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Einsatz } from '../../core/domain/einsatz';
import { STEMPEL_LABEL, STEMPEL_STATUS_LABEL, dauerMin, istAktiv, pausenPflichtMin } from '../../core/domain/zeit';
import type { StempelArt, StempelStatus, ZeitEintrag, ZeitGeraet } from '../../core/domain/zeit';
import { formatDatumLang, formatDauer, formatSaldo, formatZeit } from '../../core/format';
import { Button, IconButton } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Feld, Textbereich } from '../../core/ui/Form';
import { cx } from '../../core/ui/cx';
import { umstellungLabel } from '../../core/zeitzone';
import { resolveAuftrag } from '../dispo/store/dispo.selectors';
import { useDispoState } from '../dispo/store/dispoStore';
import { useDispoAktionen } from '../dispo/store/useDispoAktionen';
import personal from './Personal.module.css';
import { useStempeluhr } from './useStempeluhr';
import type { Stempeluhr } from './useStempeluhr';
import styles from './Stempeluhr.module.css';

// ── §1 · Bausteine ───────────────────────────────────────────────

const ICON: Readonly<Record<StempelArt, LucideIcon>> = { kommen: LogIn, gehen: LogOut, 'pause-start': Coffee, 'pause-ende': Play };

interface HauptTaste {
  art: StempelArt;
  label: string;
  klasse: string | undefined;
}

// jh› Die grosse Taste zeigt immer die eine Handlung, die jetzt dran ist: grün rein, rot raus, gelb weiter.
const HAUPT: Readonly<Record<StempelStatus, HauptTaste>> = {
  draussen: { art: 'kommen', label: 'Einstempeln', klasse: styles.einstempeln },
  arbeitet: { art: 'gehen', label: 'Ausstempeln', klasse: styles.ausstempeln },
  pause: { art: 'pause-ende', label: 'Pause beenden', klasse: styles.weiter },
};

function pad2(wert: number): string {
  return String(wert).padStart(2, '0');
}

function statusText(uhr: Stempeluhr, mitArbeit: boolean): string {
  if (uhr.status === 'draussen') {
    if (uhr.kommenMin === null) return STEMPEL_STATUS_LABEL.draussen;
    return `Ausgestempelt · ${uhr.gehenMin === null ? formatDauer(uhr.arbeitMin) : formatZeit(uhr.gehenMin)}${mitArbeit ? ` · ${formatDauer(uhr.arbeitMin)} heute` : ''}`;
  }
  const seit = uhr.seitMin === null ? '' : ` seit ${formatZeit(uhr.seitMin)}`;
  if (uhr.status === 'pause') return `Pause${seit}`;
  return `Eingestempelt${seit}${mitArbeit ? ` · ${formatDauer(uhr.arbeitMin)}` : ''}`;
}

function formatTimer(sekunden: number): string {
  const stunden = Math.floor(sekunden / 3600);
  const minuten = Math.floor((sekunden % 3600) / 60);
  return `${pad2(stunden)}:${pad2(minuten)}:${pad2(sekunden % 60)}`;
}

function formatOffset(minuten: number): string {
  const betrag = Math.abs(minuten);
  return `UTC${minuten < 0 ? '−' : '+'}${pad2(Math.floor(betrag / 60))}:${pad2(betrag % 60)}`;
}

function saldoKlasse(minuten: number): string | undefined {
  if (minuten > 0) return styles.plus;
  if (minuten < 0) return styles.minus;
  return undefined;
}

// ── §2 · Pille (Topbar) ──────────────────────────────────────────

// jh› Die Topbar zeigt nur Zustand und die eine passende Taste: Kommen, Gehen – Pause und Weiter sind klein daneben.
export function StempeluhrPille() {
  const uhr = useStempeluhr('leitstand');
  if (!uhr.mitarbeiterId || !uhr.darf) return null;
  const [haupt, zweit] = uhr.status === 'draussen' ? (['kommen', undefined] as const) : (['gehen', uhr.status === 'pause' ? 'pause-ende' : 'pause-start'] as const);
  const HauptIcon = ICON[haupt];
  return (
    <div className={cx(styles.pille, styles[uhr.status])} role="group" aria-label="Stempeluhr">
      <span className={styles.punkt} aria-hidden />
      <span className={styles.pilleText} title={`${uhr.name} · Soll heute ${formatDauer(uhr.sollMin)} · Saldo ${formatSaldo(uhr.arbeitMin - uhr.sollMin)} · ${uhr.uhr.kurz}`}>
        {statusText(uhr, true)}
      </span>
      {zweit && (
        <button type="button" className={styles.pilleKnopf} onClick={() => uhr.stempeln(zweit)} title={STEMPEL_LABEL[zweit]}>
          {zweit === 'pause-start' ? <Coffee size={14} strokeWidth={1.5} aria-hidden /> : <Play size={14} strokeWidth={1.5} aria-hidden />}
          <span>{STEMPEL_LABEL[zweit]}</span>
        </button>
      )}
      <button type="button" className={cx(styles.pilleKnopf, styles.pilleHaupt)} onClick={() => uhr.stempeln(haupt)} title={`${STEMPEL_LABEL[haupt]} ${formatZeit(uhr.jetztMin)}`}>
        <HauptIcon size={14} strokeWidth={1.5} aria-hidden />
        <span>{STEMPEL_LABEL[haupt]}</span>
      </button>
    </div>
  );
}

// ── §3 · Runde Nebentaste ────────────────────────────────────────

interface RundProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  betont?: boolean;
  title?: string;
}

function RundKnopf({ icon: Icon, label, onClick, disabled = false, betont = false, title }: RundProps) {
  return (
    <button type="button" className={cx(styles.rund, betont && styles.betont)} disabled={disabled} title={title} onClick={onClick}>
      <span className={styles.rundKreis}>
        <Icon size={22} strokeWidth={1.5} aria-hidden />
      </span>
      {label}
    </button>
  );
}

// ── §4 · Dialoge: Notiz, Einsatz ─────────────────────────────────

interface NotizDialogProps {
  open: boolean;
  eintrag: ZeitEintrag | null;
  onClose: () => void;
  onSpeichern: (text: string) => void;
}

function NotizDialog({ open, eintrag, onClose, onSpeichern }: NotizDialogProps) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (open) setText(eintrag?.bemerkung ?? '');
  }, [open, eintrag]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel="Notiz zum laufenden Eintrag"
      untertitel={eintrag ? `${eintrag.art === 'arbeit' ? 'Arbeit' : 'Pause'} seit ${formatZeit(eintrag.vonMin)}` : undefined}
      breite="sm"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            icon={StickyNote}
            onClick={() => {
              onSpeichern(text.trim());
              onClose();
            }}
          >
            Speichern
          </Button>
        </>
      }
    >
      <div className={personal.formular}>
        <Feld label="Notiz" hinweis="Erscheint im Zeitkonto und bei den Vorgesetzten – bitte keine Gesundheitsangaben." render={(id) => <Textbereich id={id} rows={3} value={text} onChange={(event) => setText(event.target.value)} />} />
      </div>
    </Dialog>
  );
}

interface EinsatzDialogProps {
  open: boolean;
  einsaetze: readonly Einsatz[];
  aktuell: string | null;
  label: (einsatzId: string) => string;
  onClose: () => void;
  onWahl: (einsatzId: string | null) => void;
}

function EinsatzDialog({ open, einsaetze, aktuell, label, onClose, onWahl }: EinsatzDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel="Einsatz zuordnen"
      untertitel="Der laufende Arbeitsblock gehört zu diesem Einsatz – für die Auswertung Arbeits- und Fahrzeit je Auftrag."
      breite="sm"
      aktionen={
        <Button variant="secondary" onClick={onClose}>
          Schliessen
        </Button>
      }
    >
      <ul className={personal.liste}>
        {einsaetze.map((einsatz) => {
          const gewaehlt = einsatz.id === aktuell;
          return (
            <li key={einsatz.id} className={personal.listenZeile}>
              <span className={personal.mono}>{formatZeit(einsatz.startMin)}</span>
              <span className={personal.listenText}>
                <span className={personal.listenHaupt}>{label(einsatz.id)}</span>
              </span>
              <Button
                variant={gewaehlt ? 'primary' : 'secondary'}
                size="sm"
                icon={gewaehlt ? Check : undefined}
                onClick={() => {
                  onWahl(gewaehlt ? null : einsatz.id);
                  onClose();
                }}
              >
                {gewaehlt ? 'Zugeordnet' : 'Wählen'}
              </Button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}

// ── §5 · Grosse Uhr (App, Zeitkonto) ─────────────────────────────

interface GrossProps {
  geraet: ZeitGeraet;
  /** Öffnet das Nachtragen – fehlt, wenn die Person nicht erfassen darf. */
  onNachtragen?: () => void;
}

// jh› Die Uhr tickt in der Zone des Betriebs. Der Kreis ist die einzige grosse Taste; Notiz, Pause,
//     Nachtragen und Einsatz stehen klein darunter – auf dem Handy untereinander, am PC daneben.
export function StempeluhrGross({ geraet, onNachtragen }: GrossProps) {
  const uhr = useStempeluhr(geraet, true);
  const state = useDispoState();
  const aktionen = useDispoAktionen();
  const [notizOffen, setNotizOffen] = useState(false);
  const [einsatzOffen, setEinsatzOffen] = useState(false);

  const heutige = useMemo(
    () => (uhr.mitarbeiterId ? state.zeiteintraege.filter((eintrag) => eintrag.mitarbeiterId === uhr.mitarbeiterId && eintrag.datum === uhr.uhr.datum && istAktiv(eintrag)).sort((a, b) => a.vonMin - b.vonMin) : []),
    [state.zeiteintraege, uhr.mitarbeiterId, uhr.uhr.datum],
  );

  if (!uhr.mitarbeiterId) {
    return <p className={styles.hinweis}>Keine Personalakte verknüpft – die Stempeluhr steht nur der eigenen Person zur Verfügung.</p>;
  }

  const haupt = HAUPT[uhr.status];
  const laufender = uhr.laufender ?? null;
  const saldo = uhr.arbeitMin - uhr.sollMin;
  const pflicht = pausenPflichtMin(uhr.arbeitMin);
  const pauseFehlt = pflicht > 0 && uhr.pauseMin < pflicht && uhr.status !== 'pause';
  const einsatzLabel = (einsatzId: string): string => {
    const einsatz = state.einsaetze.find((kandidat) => kandidat.id === einsatzId);
    if (!einsatz) return 'Einsatz';
    const kontext = resolveAuftrag(state.stammdaten, einsatz.auftragId);
    return `${kontext.auftrag.nummer} · ${kontext.kunde.name}`;
  };

  return (
    <section className={cx(styles.gross, styles[uhr.status])} aria-label="Stempeluhr">
      <header className={styles.grossKopf}>
        <div className={styles.grossTitel}>
          <span className={styles.grossHeute}>Heute</span>
          <span className={styles.grossDatum}>{formatDatumLang(uhr.uhr.datum)}</span>
        </div>
        <div className={styles.grossZone} title={`Zeitzone ${uhr.zone} · ${formatOffset(uhr.uhr.offsetMin)}${uhr.naechsteUmstellung ? ` · nächste Umstellung ${uhr.naechsteUmstellung.datum}` : ''}`}>
          <span className={styles.grossUhrzeit} aria-live="off">
            {formatZeit(uhr.jetztMin)}:{pad2(uhr.uhr.sekunden)}
          </span>
          <span>
            <Globe size={12} strokeWidth={1.5} aria-hidden /> {uhr.uhr.kurz} · {uhr.zone}
          </span>
        </div>
      </header>

      {uhr.umstellungHeute && (
        <p className={styles.umstellung}>
          <Clock3 size={16} strokeWidth={1.5} aria-hidden /> Heute {umstellungLabel(uhr.umstellungHeute)} – die Stempel rechnen damit.
        </p>
      )}

      <div className={styles.grossKoerper}>
        <div className={styles.grossMitte}>
          <button type="button" className={cx(styles.kreis, haupt.klasse)} disabled={!uhr.darf} onClick={() => uhr.stempeln(haupt.art)} aria-label={`${haupt.label} um ${formatZeit(uhr.jetztMin)}`}>
            <span className={styles.kreisAktion}>{haupt.label}</span>
            <span className={styles.kreisTimer}>{formatTimer(uhr.arbeitSekunden)}</span>
            <span className={styles.kreisUnter}>{uhr.status === 'pause' ? `Pause seit ${formatZeit(uhr.seitMin ?? uhr.jetztMin)}` : 'heute gearbeitet'}</span>
          </button>
          <p className={styles.grossStatus}>
            <span className={styles.punkt} aria-hidden /> {statusText(uhr, false)}
          </p>
          {uhr.status === 'pause' && (
            <Button variant="danger" size="sm" icon={LogOut} disabled={!uhr.darf} onClick={() => uhr.stempeln('gehen')}>
              Ausstempeln
            </Button>
          )}
        </div>

        <div className={styles.grossRechts}>
          <dl className={styles.grossZahlen}>
            <div>
              <dt>Arbeit</dt>
              <dd>{formatDauer(uhr.arbeitMin)}</dd>
            </div>
            <div>
              <dt>Pause</dt>
              <dd className={cx(pauseFehlt && styles.warn)}>{formatDauer(uhr.pauseMin)}</dd>
            </div>
            <div>
              <dt>Soll</dt>
              <dd>{formatDauer(uhr.sollMin)}</dd>
            </div>
            <div>
              <dt>Saldo</dt>
              <dd className={saldoKlasse(saldo)}>{formatSaldo(saldo)}</dd>
            </div>
          </dl>
          {pauseFehlt && uhr.status === 'arbeitet' && <p className={styles.warnung}>Pflichtpause {formatDauer(pflicht)} noch nicht erreicht (ArG 15).</p>}
          {!uhr.darf && <p className={styles.hinweis}>Stempeln ist für heute gesperrt (Monat genehmigt oder kein Recht).</p>}

          <div className={styles.rundReihe}>
            <RundKnopf icon={StickyNote} label="Notiz" disabled={!laufender} title={laufender ? 'Notiz zum laufenden Eintrag' : 'Zuerst einstempeln'} onClick={() => setNotizOffen(true)} />
            <RundKnopf
              icon={uhr.status === 'pause' ? Play : Coffee}
              label={uhr.status === 'pause' ? 'Weiter' : 'Pause'}
              disabled={!uhr.darf || uhr.status === 'draussen'}
              title={uhr.status === 'pause' ? 'Pause beenden' : 'Pause beginnen'}
              onClick={() => uhr.stempeln(uhr.status === 'pause' ? 'pause-ende' : 'pause-start')}
            />
            {onNachtragen && <RundKnopf icon={CalendarPlus} label="Nachtragen" betont title="Zeit selbst eintragen – z. B. Stempel vergessen" onClick={onNachtragen} />}
            {uhr.einsaetzeHeute.length > 0 && <RundKnopf icon={Wrench} label="Einsatz" disabled={!laufender || laufender.art !== 'arbeit'} title="Laufende Arbeit einem Einsatz zuordnen" onClick={() => setEinsatzOffen(true)} />}
          </div>

          {heutige.length > 0 ? (
            <ul className={styles.heuteListe} aria-label="Einträge heute">
              {heutige.map((eintrag) => (
                <li key={eintrag.id} className={styles.heuteZeile}>
                  <span className={styles.heuteZeit}>
                    {formatZeit(eintrag.vonMin)}–{eintrag.bisMin === null ? 'läuft' : formatZeit(eintrag.bisMin)}
                  </span>
                  <span className={styles.heuteText}>
                    <span className={cx(styles.heuteArt, eintrag.art === 'pause' && styles.pauseArt)} aria-hidden />
                    {eintrag.art === 'arbeit' ? 'Arbeit' : 'Pause'}
                    {eintrag.einsatzId && ` · ${einsatzLabel(eintrag.einsatzId)}`}
                    {eintrag.bemerkung && ` · ${eintrag.bemerkung}`}
                    {eintrag.quelle === 'manuell' && ' · nachgetragen'}
                  </span>
                  <span className={styles.heuteDauer}>{formatDauer(dauerMin(eintrag, uhr.jetztMin, uhr.umstellungHeute ? uhr.zone : undefined))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.hinweis}>Heute noch keine Zeiten – mit dem Kreis einstempeln oder nachtragen.</p>
          )}
        </div>
      </div>

      <NotizDialog open={notizOffen} eintrag={laufender} onClose={() => setNotizOffen(false)} onSpeichern={(text) => laufender && aktionen.zeitEintragErgaenzen(laufender.id, { bemerkung: text })} />
      <EinsatzDialog open={einsatzOffen} einsaetze={uhr.einsaetzeHeute} aktuell={laufender?.einsatzId ?? null} label={einsatzLabel} onClose={() => setEinsatzOffen(false)} onWahl={(einsatzId) => laufender && aktionen.zeitEintragErgaenzen(laufender.id, { einsatzId })} />
    </section>
  );
}

// ── §6 · Streifen (Heute-Seite der App) ──────────────────────────

interface StreifenProps {
  geraet: ZeitGeraet;
  onOeffnen: () => void;
}

export function StempeluhrStreifen({ geraet, onOeffnen }: StreifenProps) {
  const uhr = useStempeluhr(geraet);
  if (!uhr.mitarbeiterId) return null;
  const haupt = HAUPT[uhr.status];
  const Icon = ICON[haupt.art];
  return (
    <section className={cx(styles.streifen, styles[uhr.status])} aria-label="Stempeluhr">
      <span className={styles.punkt} aria-hidden />
      <button type="button" className={styles.streifenText} onClick={onOeffnen}>
        <span>{statusText(uhr, false)}</span>
        <span className={styles.streifenMeta}>
          heute {formatDauer(uhr.arbeitMin)} · Soll {formatDauer(uhr.sollMin)}
        </span>
      </button>
      <Button variant={haupt.art === 'gehen' ? 'danger' : 'primary'} size="sm" icon={Icon} disabled={!uhr.darf} onClick={() => uhr.stempeln(haupt.art)}>
        {STEMPEL_LABEL[haupt.art]}
      </Button>
      <IconButton icon={ChevronRight} label="Zur Stempeluhr" size="sm" onClick={onOeffnen} />
    </section>
  );
}

/* ◆ jh · eof */
