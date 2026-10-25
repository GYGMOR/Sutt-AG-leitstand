/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/auftraege/AuftragDossier.tsx               │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Dossier eines Auftrags: Einsätze, Rapport, Parteien, Gerät, Lager     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { Building, CalendarRange, Copy, Inbox, Link2, Pencil, Phone, Receipt, ShoppingCart, Trash } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { IsoDatum, Minuten } from '../../core/datum';
import { DRINGLICHKEIT_LABEL, RECHNUNG_LABEL, isDringend } from '../../core/domain/auftrag';
import { STATUS_LABEL } from '../../core/domain/einsatz';
import type { Einsatz } from '../../core/domain/einsatz';
import { KATEGORIE_LABEL } from '../../core/domain/kategorie';
import { BESTELL_STATUS_LABEL } from '../../core/domain/lager';
import type { Bestellung } from '../../core/domain/lager';
import type { Nachricht } from '../../core/domain/nachricht';
import { KENNUNG_LABEL, KUNDENART_LABEL, formatAdresse, fullName } from '../../core/domain/stammdaten';
import { formatChf, formatDatum, formatDatumKurz, formatDauer, formatWochentag, formatZeitpunkt, formatZeitspanne } from '../../core/format';
import { Avatar } from '../../core/ui/Avatar';
import { Button, IconButton } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { DetailZeile } from '../../core/ui/DetailZeile';
import { ConfirmDialog } from '../../core/ui/Dialog';
import { DossierAbschnitt, DossierKopf, Fakten } from '../../core/ui/ModulSeite';
import { Typenschild, TypenschildPlatte } from '../../core/ui/Typenschild';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import { cx } from '../../core/ui/cx';
import { kategorieKlasse, statusKlasse } from '../../core/ui/farben';
import { AkteErsatzteile } from '../dispo/akte/AkteErsatzteile';
import { AkteFotos } from '../dispo/akte/AkteFotos';
import { AkteNachrichten } from '../dispo/akte/AkteNachrichten';
import { AkteRapport } from '../dispo/akte/AkteRapport';
import { AkteVerlauf } from '../dispo/akte/AkteVerlauf';
import { BearbeitenDialog } from '../dispo/akte/BearbeitenDialog';
import type { DispoStammdaten } from '../dispo/dispo.types';
import { KundenChips } from '../dispo/KundenChips';
import { buildPhasen, rapportFuerEinsatz } from '../dispo/store/dispo.selectors';
import { setAnsicht } from '../dispo/store/dispoStore';
import type { DispoAktionen } from '../dispo/store/useDispoAktionen';
import { BestellDialog } from '../lager/BestellDialog';
import { PHASE_LABEL, PHASE_TON } from './auftraege.model';
import type { AuftragView } from './auftraege.model';
import styles from './AuftraegePage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface AuftragDossierProps {
  view: AuftragView;
  stammdaten: DispoStammdaten;
  rapporte: Parameters<typeof rapportFuerEinsatz>[0];
  bestellungen: readonly Bestellung[];
  nachrichten: readonly Nachricht[];
  heute: IsoDatum;
  jetztMin: Minuten;
  aktionen: DispoAktionen;
  setDatum: (datum: IsoDatum) => void;
}

export function AuftragDossier({ view, stammdaten, rapporte, bestellungen, nachrichten, heute, aktionen, setDatum }: AuftragDossierProps) {
  const navigate = useNavigate();
  const { auftrag, kunde, liegenschaft, geraet, einsaetze, pendenz, phase, rapport, betrag } = view;
  const [bearbeiten, setBearbeiten] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
  const [bestellen, setBestellen] = useState(false);
  const technikerById = useMemo(() => new Map(stammdaten.techniker.map((techniker) => [techniker.id, techniker])), [stammdaten.techniker]);
  const phasen = useMemo(() => buildPhasen(auftrag, einsaetze, pendenz, technikerById), [auftrag, einsaetze, pendenz, technikerById]);
  const letzter = view.letzter;
  const eigeneBestellungen = bestellungen.filter((bestellung) => bestellung.auftragId === auftrag.id);
  const bezug = auftrag.bezugAuftragId ? stammdaten.auftraege.get(auftrag.bezugAuftragId) : undefined;

  const imPlan = (einsatz: Einsatz) => {
    setDatum(einsatz.datum);
    aktionen.select({ art: 'einsatz', einsatzId: einsatz.id });
    navigate('/dispo/plantafel');
  };
  const imEingang = (pendenzId: string) => {
    aktionen.select({ art: 'pendenz', pendenzId });
    setAnsicht({ panelEingeklappt: false, panelTab: 'eingang' });
    navigate('/dispo/plantafel');
  };

  return (
    <div className={styles.dossier}>
      <DossierKopf
        kennung={
          <>
            <Typenschild label="Auftrag" wert={auftrag.nummer} size="md" />
            <Chip tone="tint" className={kategorieKlasse(auftrag.kategorie)} size="md">
              {KATEGORIE_LABEL[auftrag.kategorie]}
            </Chip>
            <Chip tone={PHASE_TON[phase]} size="md">
              {PHASE_LABEL[phase]}
            </Chip>
            {isDringend(auftrag.dringlichkeit) && (
              <Chip tone="signal" size="md">
                {DRINGLICHKEIT_LABEL[auftrag.dringlichkeit]}
              </Chip>
            )}
          </>
        }
        titel={kunde.name}
        untertitel={
          <>
            {formatAdresse(liegenschaft.adresse)}
            {auftrag.wohnung && ` · ${auftrag.wohnung.nummer} · ${auftrag.wohnung.lage}`}
          </>
        }
        chips={<KundenChips kunde={kunde} liegenschaft={liegenschaft} />}
        aktionen={
          <>
            <IconButton icon={Pencil} label="Bearbeiten" size="sm" onClick={() => setBearbeiten(true)} />
            <IconButton icon={Copy} label="Kopieren" size="sm" onClick={() => aktionen.copyAuftrag(auftrag.id)} />
            <IconButton icon={Trash} label="Löschen" size="sm" tone="danger" onClick={() => setLoeschen(true)} />
          </>
        }
      />

      <DossierAbschnitt titel="Einsätze" zusatz={<span className={styles.mono}>{einsaetze.length}</span>}>
        {pendenz && (
          <div className={styles.pendenz}>
            <Inbox size={16} strokeWidth={1.5} aria-hidden />
            <span>
              <strong>{pendenz.anlass === 'folgetermin' ? 'Folgetermin offen' : 'Im Eingang'}</strong> seit {formatZeitpunkt(pendenz.erstelltAm)}
              {pendenz.fruehestensAm && ` · frühestens ${formatDatum(pendenz.fruehestensAm)}`}
              {pendenz.hinweis && ` · ${pendenz.hinweis}`}
            </span>
            <Button variant="secondary" size="sm" icon={CalendarRange} onClick={() => imEingang(pendenz.id)}>
              Planen
            </Button>
          </div>
        )}
        {phase === 'ohne-termin' && (
          <div className={styles.pendenz}>
            <Inbox size={16} strokeWidth={1.5} aria-hidden />
            <span>Kein Einsatz und keine Pendenz – der Auftrag ist aus dem Plan gefallen.</span>
            <Button variant="primary" size="sm" icon={Inbox} onClick={() => aktionen.pendenzAnlegen(auftrag.id)}>
              In den Eingang
            </Button>
          </div>
        )}
        {einsaetze.length > 0 && (
          <ul className={styles.einsaetze}>
            {[...einsaetze].reverse().map((einsatz) => {
              const techniker = technikerById.get(einsatz.technikerId);
              return (
                <li key={einsatz.id} className={cx(styles.einsatz, statusKlasse(einsatz.status))}>
                  <span className={styles.einsatzPunkt} aria-hidden />
                  <span className={styles.mono}>
                    {formatWochentag(einsatz.datum, 'kurz')} {formatDatumKurz(einsatz.datum)} · {formatZeitspanne(einsatz.startMin, einsatz.dauerMin)}
                  </span>
                  {techniker && (
                    <span className={styles.einsatzTechniker}>
                      <Avatar techniker={techniker} size="sm" /> {techniker.kuerzel}
                    </span>
                  )}
                  <span className={styles.einsatzStatus}>{STATUS_LABEL[einsatz.status]}</span>
                  <Button variant="ghost" size="sm" icon={CalendarRange} onClick={() => imPlan(einsatz)}>
                    Im Plan
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </DossierAbschnitt>

      {letzter && (
        <DossierAbschnitt titel="Servicerapport">
          <AkteRapport
            rapport={rapportFuerEinsatz(rapporte, letzter.id) ?? (rapport ?? undefined)}
            einsatz={letzter}
            techniker={technikerById.get(letzter.technikerId) ?? null}
            heute={heute}
            onFreigeben={aktionen.freigebenRapport}
            onVerrechnen={aktionen.verrechnenRapport}
            onZurueck={aktionen.zurueckAnTechniker}
          />
        </DossierAbschnitt>
      )}

      <DossierAbschnitt titel="Parteien & Rechnung">
        <DetailZeile icon={Phone} label={auftrag.kontaktVorOrt.rolle} wert={auftrag.kontaktVorOrt.name} zusatz={<span className={styles.mono}>{auftrag.kontaktVorOrt.telefon}</span>} />
        <DetailZeile icon={Building} label={KUNDENART_LABEL[kunde.art]} wert={<Verweis zu={ZIEL.kunde(kunde.id)} label="Kunde" wert={kunde.nummer} text={kunde.name} />} zusatz={`${kunde.kontakt.name} · ${kunde.kontakt.telefon}`} />
        <DetailZeile
          icon={Receipt}
          label="Rechnung"
          wert={
            auftrag.rechnung.art === 'garantie' ? `${auftrag.rechnung.marke} – Herstellergarantie, Fall ${auftrag.rechnung.fallNummer}` : auftrag.rechnung.art === 'mieter' ? `${auftrag.kontaktVorOrt.name} – ${auftrag.rechnung.grund}` : `${kunde.name}${auftrag.rechnung.referenz ? ` · ${auftrag.rechnung.referenz}` : ''}`
          }
          zusatz={
            <>
              {RECHNUNG_LABEL[auftrag.rechnungStatus]}
              {betrag && ` · ${formatChf(betrag.totalChf)} (Arbeit ${formatChf(betrag.arbeitChf)} · Anfahrt ${formatChf(betrag.anfahrtChf)} · Teile ${formatChf(betrag.teileChf)})`}
            </>
          }
        />
        {bezug && (
          <DetailZeile icon={Link2} label="Bezug" wert={<Verweis zu={ZIEL.auftrag(bezug.id)} label="Auftrag" wert={bezug.nummer} text={bezug.fehlerbild} />} zusatz={KATEGORIE_LABEL[bezug.kategorie]} />
        )}
      </DossierAbschnitt>

      <DossierAbschnitt titel="Gerät & Fehlerbild" zusatz={<Verweis zu={ZIEL.geraet(geraet.id)} label={KENNUNG_LABEL[geraet.marke]} wert={geraet.seriennummer} text="Gerätekartei" />}>
        <TypenschildPlatte
          titel="Typenschild"
          marke={geraet.marke}
          zeilen={[
            { schluessel: geraet.art, wert: geraet.modell },
            { schluessel: 'Typ', wert: geraet.typNummer },
            { schluessel: KENNUNG_LABEL[geraet.marke], wert: geraet.seriennummer },
            { schluessel: 'Baujahr', wert: String(geraet.baujahr) },
          ]}
        />
        <blockquote className={styles.fehlerbild}>{auftrag.fehlerbild}</blockquote>
        {auftrag.notiz && <p className={styles.notiz}>{auftrag.notiz}</p>}
        <Fakten
          eintraege={[
            { label: 'Angefragt', wert: `${formatZeitpunkt(auftrag.angefragtAm)} · ${auftrag.kanal}`, mono: true },
            { label: 'Bestellt', wert: auftrag.bestelltAm ? formatZeitpunkt(auftrag.bestelltAm) : 'noch nicht erteilt', mono: true },
            { label: 'Dauer geschätzt', wert: formatDauer(auftrag.dauerMin), mono: true },
            { label: 'Auftragsart', wert: auftrag.art },
          ]}
        />
      </DossierAbschnitt>

      <DossierAbschnitt titel="Fotos" zusatz={<span className={styles.mono}>{auftrag.fotos.length}</span>}>
        <AkteFotos fotos={auftrag.fotos} />
      </DossierAbschnitt>

      <DossierAbschnitt
        titel="Ersatzteile & Bestellungen"
        zusatz={
          <Button variant="ghost" size="sm" icon={ShoppingCart} onClick={() => setBestellen(true)}>
            Teil bestellen
          </Button>
        }
      >
        <AkteErsatzteile teile={auftrag.ersatzteile} heute={heute} />
        {eigeneBestellungen.length > 0 && (
          <ul className={styles.bestellungen}>
            {eigeneBestellungen.map((bestellung) => (
              <li key={bestellung.id}>
                <Verweis zu={ZIEL.bestellung(bestellung.id)} label="Bestellung" wert={bestellung.nummer} text={`${bestellung.menge}× ${bestellung.bezeichnung}`} />
                <Chip tone={bestellung.status === 'offen' ? 'signal' : bestellung.status === 'eingetroffen' ? 'ok' : 'mute'}>
                  {BESTELL_STATUS_LABEL[bestellung.status]}
                  {bestellung.status === 'offen' && ` · ${formatDatumKurz(bestellung.liefertermin)}`}
                </Chip>
              </li>
            ))}
          </ul>
        )}
      </DossierAbschnitt>

      <DossierAbschnitt titel="Verlauf">
        <AkteVerlauf phasen={phasen} />
      </DossierAbschnitt>

      {nachrichten.length > 0 && (
        <DossierAbschnitt titel="Nachrichten" zusatz={<span className={styles.mono}>{nachrichten.length}</span>}>
          <AkteNachrichten nachrichten={nachrichten} />
        </DossierAbschnitt>
      )}

      {bearbeiten && (
        <BearbeitenDialog
          open
          auftrag={auftrag}
          einsatz={view.naechster}
          techniker={stammdaten.techniker}
          onClose={() => setBearbeiten(false)}
          onSave={(neu, aenderung) => {
            aktionen.updateAuftrag(neu, aenderung);
            setBearbeiten(false);
          }}
        />
      )}
      <BestellDialog open={bestellen} stammdaten={stammdaten} auftragId={auftrag.id} onClose={() => setBestellen(false)} onBestellen={(angaben) => aktionen.bestellen(angaben)} />
      <ConfirmDialog
        open={loeschen}
        titel={`Auftrag ${auftrag.nummer} löschen?`}
        text={`Einsätze, Pendenzen, Rapporte und Nachrichten zu «${kunde.name} – ${auftrag.fehlerbild}» werden entfernt. Rückgängig ist möglich.`}
        bestaetigen="Löschen"
        gefaehrlich
        onConfirm={() => {
          setLoeschen(false);
          aktionen.deleteAuftrag(auftrag.id);
          navigate('/auftraege');
        }}
        onClose={() => setLoeschen(false)}
      />
      <p className={styles.fussnote}>
        Techniker {view.techniker ? fullName(view.techniker) : '–'} · Rechnung {RECHNUNG_LABEL[auftrag.rechnungStatus]}
      </p>
    </div>
  );
}

/* ◆ jh · eof */
