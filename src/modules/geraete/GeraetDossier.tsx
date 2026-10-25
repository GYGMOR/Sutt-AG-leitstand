/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/geraete/GeraetDossier.tsx                  │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Gerätedossier: Typenschild, Standort, Einsätze, Teile, Fotos, Scan    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { Building, Check, MapPin, Pencil, Plus, ScanLine, ShieldCheck, Wrench } from 'lucide-react';
import { STATUS_LABEL } from '../../core/domain/einsatz';
import { KATEGORIE_LABEL } from '../../core/domain/kategorie';
import { KENNUNG_LABEL, formatAdresse } from '../../core/domain/stammdaten';
import type { Techniker } from '../../core/domain/stammdaten';
import { formatDatum, formatDatumKurz, formatWochentag, formatZeitspanne } from '../../core/format';
import { Avatar } from '../../core/ui/Avatar';
import { Button, IconButton } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { DetailZeile } from '../../core/ui/DetailZeile';
import { DossierAbschnitt, DossierKopf } from '../../core/ui/ModulSeite';
import { Typenschild, TypenschildPlatte } from '../../core/ui/Typenschild';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import { cx } from '../../core/ui/cx';
import { kategorieKlasse, statusKlasse } from '../../core/ui/farben';
import { AkteFotos } from '../dispo/akte/AkteFotos';
import type { Vorbelegung } from '../dispo/Schnellerfassung';
import type { DispoAktionen } from '../dispo/store/useDispoAktionen';
import { PHASE_LABEL, PHASE_TON } from '../auftraege/auftraege.model';
import { typenschildVorschlag } from '../rapport/rapport.model';
import { GARANTIE_LABEL } from './geraete.model';
import type { GeraetView } from './geraete.model';
import { GeraetDialog } from './GeraetDialog';
import styles from './GeraetePage.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface GeraetDossierProps {
  view: GeraetView;
  techniker: readonly Techniker[];
  aktionen: DispoAktionen;
  onNeuerAuftrag: (vorbelegung: Vorbelegung) => void;
}

const EINSAETZE_IM_DOSSIER = 12;

export function GeraetDossier({ view, techniker, aktionen, onNeuerAuftrag }: GeraetDossierProps) {
  const { geraet, standort } = view;
  const [bearbeiten, setBearbeiten] = useState(false);
  const technikerById = useMemo(() => new Map(techniker.map((person) => [person.id, person])), [techniker]);
  const auftragProEinsatz = useMemo(() => new Map(view.auftraege.flatMap((auftrag) => auftrag.einsaetze.map((einsatz) => [einsatz.id, auftrag] as const))), [view.auftraege]);
  const vorschlag = view.unvollstaendig ? typenschildVorschlag(geraet) : null;
  const garantieTon = view.garantie === 'laeuft' ? 'ok' : view.garantie === 'abgelaufen' ? 'mute' : 'neutral';

  return (
    <div className={styles.dossier}>
      <DossierKopf
        kennung={
          <>
            <Typenschild label={KENNUNG_LABEL[geraet.marke]} wert={geraet.seriennummer} size="md" />
            <Chip icon={ShieldCheck} tone={garantieTon} size="md">
              {GARANTIE_LABEL[view.garantie]}
              {geraet.garantieBis && ` · ${formatDatum(geraet.garantieBis)}`}
            </Chip>
            {view.unvollstaendig && (
              <Chip icon={ScanLine} tone="signal" size="md">
                Typenschild fehlt
              </Chip>
            )}
          </>
        }
        titel={`${geraet.marke} ${geraet.modell}`}
        untertitel={`${geraet.art} · Baujahr ${geraet.baujahr}${standort ? ` · ${standort.kunde.name}` : ''}`}
        aktionen={
          <>
            {standort && (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => onNeuerAuftrag({ kundeId: standort.kunde.id, liegenschaftId: standort.liegenschaft.id, geraetId: geraet.id, ...(standort.wohnung ? { wohnungNummer: standort.wohnung.nummer } : {}) })}>
                Neuer Auftrag
              </Button>
            )}
            <IconButton icon={Pencil} label="Gerät bearbeiten" size="sm" onClick={() => setBearbeiten(true)} />
          </>
        }
      />

      {vorschlag && (
        <div className={styles.vorschlag}>
          <ScanLine size={18} strokeWidth={1.5} aria-hidden />
          <div className={styles.vorschlagText}>
            <strong>Typenschild-Vorschlag</strong>
            <span>
              {geraet.marke} {vorschlag.modell} · Typ {vorschlag.typNummer} · {KENNUNG_LABEL[geraet.marke]} {vorschlag.seriennummer}
            </span>
            <span className={styles.vorschlagHinweis}>Aus dem Typenschildfoto der Techniker-App (Mock-OCR) – prüfen, dann übernehmen.</span>
          </div>
          <Button variant="primary" size="sm" icon={Check} onClick={() => aktionen.updateGeraet({ ...geraet, ...vorschlag }, 'Typenschild übernommen')}>
            Übernehmen
          </Button>
        </div>
      )}

      <DossierAbschnitt titel="Typenschild">
        <TypenschildPlatte
          titel="Typenschild"
          marke={geraet.marke}
          zeilen={[
            { schluessel: geraet.art, wert: geraet.modell },
            { schluessel: 'Typ', wert: geraet.typNummer },
            { schluessel: KENNUNG_LABEL[geraet.marke], wert: geraet.seriennummer },
            { schluessel: 'Baujahr', wert: String(geraet.baujahr) },
            { schluessel: 'Garantie', wert: geraet.garantieBis ? `bis ${formatDatum(geraet.garantieBis)}` : 'keine' },
          ]}
        />
      </DossierAbschnitt>

      <DossierAbschnitt titel="Standort">
        {standort ? (
          <>
            <DetailZeile
              icon={MapPin}
              label="Liegenschaft"
              wert={<Verweis zu={ZIEL.liegenschaft(standort.kunde.id, standort.liegenschaft.id)} label="Objekt" wert={standort.liegenschaft.objektNummer ?? standort.liegenschaft.bezeichnung} text={formatAdresse(standort.liegenschaft.adresse)} />}
              zusatz={standort.wohnung ? `${standort.wohnung.nummer} · ${standort.wohnung.lage}` : standort.liegenschaft.bezeichnung}
            />
            <DetailZeile icon={Building} label="Kunde" wert={<Verweis zu={ZIEL.kunde(standort.kunde.id)} label="Kunde" wert={standort.kunde.nummer} text={standort.kunde.name} />} zusatz={standort.kunde.kontakt.telefon} />
          </>
        ) : (
          <p className={styles.leer}>Noch keinem Auftrag zugeordnet – Standort unbekannt.</p>
        )}
      </DossierAbschnitt>

      <DossierAbschnitt titel="Einsätze" zusatz={<span className={styles.mono}>{view.einsaetze.length}</span>}>
        {view.einsaetze.length === 0 && <p className={styles.leer}>Noch kein Einsatz an diesem Gerät.</p>}
        <ul className={styles.einsaetze}>
          {view.einsaetze.slice(0, EINSAETZE_IM_DOSSIER).map((einsatz) => {
            const auftrag = auftragProEinsatz.get(einsatz.id);
            const person = technikerById.get(einsatz.technikerId);
            return (
              <li key={einsatz.id} className={cx(styles.einsatz, statusKlasse(einsatz.status))}>
                <span className={styles.einsatzPunkt} aria-hidden />
                <span className={styles.mono}>
                  {formatWochentag(einsatz.datum, 'kurz')} {formatDatumKurz(einsatz.datum)} · {formatZeitspanne(einsatz.startMin, einsatz.dauerMin)}
                </span>
                {person && (
                  <span className={styles.einsatzTechniker}>
                    <Avatar techniker={person} size="sm" /> {person.kuerzel}
                  </span>
                )}
                <span className={styles.einsatzText}>
                  {auftrag && (
                    <Chip tone="tint" className={kategorieKlasse(auftrag.auftrag.kategorie)}>
                      {KATEGORIE_LABEL[auftrag.auftrag.kategorie]}
                    </Chip>
                  )}{' '}
                  {auftrag?.auftrag.fehlerbild ?? STATUS_LABEL[einsatz.status]}
                </span>
                {auftrag && <Verweis zu={ZIEL.auftrag(auftrag.auftrag.id)} label="Auftrag" wert={auftrag.auftrag.nummer} />}
              </li>
            );
          })}
        </ul>
      </DossierAbschnitt>

      <DossierAbschnitt titel="Ersatzteile" zusatz={<span className={styles.mono}>{view.teile.length}</span>}>
        {view.teile.length === 0 && <p className={styles.leer}>Noch keine Teile an diesem Gerät.</p>}
        {view.teile.length > 0 && (
          <table className={styles.teile}>
            <thead>
              <tr>
                <th scope="col">Datum</th>
                <th scope="col">Teil</th>
                <th scope="col">Status</th>
                <th scope="col">Auftrag</th>
              </tr>
            </thead>
            <tbody>
              {view.teile.map((teil, index) => (
                <tr key={`${teil.auftragId}-${teil.artikelNummer}-${index}`}>
                  <td className={styles.mono}>{formatDatumKurz(teil.datum)}</td>
                  <td>
                    {teil.menge > 1 && <span className={styles.mono}>{teil.menge}× </span>}
                    {teil.bezeichnung} <span className={cx(styles.mono, styles.teilNummer)}>{teil.artikelNummer}</span>
                  </td>
                  <td>{teil.text}</td>
                  <td>
                    <Verweis zu={ZIEL.auftrag(teil.auftragId)} label="Auftrag" wert={teil.auftragNummer} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DossierAbschnitt>

      <DossierAbschnitt titel="Fotos" zusatz={<span className={styles.mono}>{view.fotos.length}</span>}>
        <AkteFotos fotos={view.fotos} />
      </DossierAbschnitt>

      {geraet.historie.length > 0 && (
        <DossierAbschnitt titel="Frühere Ereignisse" zusatz={<span className={styles.mono}>{geraet.historie.length}</span>}>
          <ul className={styles.historie}>
            {geraet.historie.map((ereignis) => (
              <li key={`${ereignis.datum}-${ereignis.text}`}>
                <Wrench size={14} strokeWidth={1.5} aria-hidden />
                <span className={styles.mono}>{formatDatum(ereignis.datum)}</span> · {ereignis.text} · {ereignis.technikerKuerzel}
              </li>
            ))}
          </ul>
        </DossierAbschnitt>
      )}

      <DossierAbschnitt titel="Aufträge" zusatz={<span className={styles.mono}>{view.auftraege.length}</span>}>
        <ul className={styles.auftraege}>
          {view.auftraege.map((auftrag) => (
            <li key={auftrag.auftrag.id}>
              <Verweis zu={ZIEL.auftrag(auftrag.auftrag.id)} label="Auftrag" wert={auftrag.auftrag.nummer} text={auftrag.auftrag.fehlerbild} />
              <Chip tone={PHASE_TON[auftrag.phase]}>{PHASE_LABEL[auftrag.phase]}</Chip>
            </li>
          ))}
        </ul>
      </DossierAbschnitt>

      {bearbeiten && (
        <GeraetDialog
          open
          geraet={geraet}
          onClose={() => setBearbeiten(false)}
          onSave={(neu) => {
            aktionen.updateGeraet(neu, 'Gerätedaten bearbeitet');
            setBearbeiten(false);
          }}
        />
      )}
    </div>
  );
}

/* ◆ jh · eof */
