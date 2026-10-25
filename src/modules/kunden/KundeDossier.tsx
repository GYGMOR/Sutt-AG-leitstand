/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/kunden/KundeDossier.tsx                    │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Kundendossier: Kontakt, Liegenschaften mit Geräten, Aufträge, Geld    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useRef, useState } from 'react';
import { Building, KeyRound, Mail, MapPin, Pencil, Phone, Plus, Receipt, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useHeute } from '../../core/arbeitstag';
import { splitZeitpunkt } from '../../core/datum';
import { KATEGORIE_LABEL } from '../../core/domain/kategorie';
import type { Nachricht } from '../../core/domain/nachricht';
import { HINWEIS_LABEL, KENNUNG_LABEL, KUNDENART_LABEL, formatAdresse } from '../../core/domain/stammdaten';
import type { Liegenschaft } from '../../core/domain/stammdaten';
import { formatChf, formatDatum, formatDatumKurz, formatSeit, formatZeitpunktKurz } from '../../core/format';
import { Button, IconButton } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { DetailZeile } from '../../core/ui/DetailZeile';
import { DossierAbschnitt, DossierKopf } from '../../core/ui/ModulSeite';
import { Typenschild } from '../../core/ui/Typenschild';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import { cx } from '../../core/ui/cx';
import { kategorieKlasse } from '../../core/ui/farben';
import { AkteNachrichten } from '../dispo/akte/AkteNachrichten';
import { HINWEIS_ICON, HINWEIS_TON, KundenChips } from '../dispo/KundenChips';
import type { DispoAktionen } from '../dispo/store/useDispoAktionen';
import type { Vorbelegung } from '../dispo/Schnellerfassung';
import { PHASE_LABEL, PHASE_TON } from '../auftraege/auftraege.model';
import { KundeDialog } from './KundeDialog';
import type { KundeView, LiegenschaftView } from './kunden.model';
import { LiegenschaftDialog } from './LiegenschaftDialog';
import styles from './KundenPage.module.css';

// ── §1 · Liegenschaft ────────────────────────────────────────────

interface LiegenschaftKarteProps {
  view: LiegenschaftView;
  hervorgehoben: boolean;
  onBearbeiten: () => void;
  onNeuerAuftrag: (vorbelegung: Vorbelegung) => void;
}

function LiegenschaftKarte({ view, hervorgehoben, onBearbeiten, onNeuerAuftrag }: LiegenschaftKarteProps) {
  const { liegenschaft } = view;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (hervorgehoben) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [hervorgehoben]);

  return (
    <article ref={ref} className={cx(styles.liegenschaft, hervorgehoben && styles.liegenschaftAktiv)}>
      <header className={styles.liegenschaftKopf}>
        <div>
          <h4 className={styles.liegenschaftTitel}>{liegenschaft.bezeichnung}</h4>
          <p className={styles.liegenschaftAdresse}>
            {formatAdresse(liegenschaft.adresse)}
            {liegenschaft.objektNummer && <span className={styles.mono}> · {liegenschaft.objektNummer}</span>}
          </p>
        </div>
        <div className={styles.liegenschaftAktionen}>
          <Button variant="ghost" size="sm" icon={Plus} onClick={() => onNeuerAuftrag({ kundeId: liegenschaft.kundeId, liegenschaftId: liegenschaft.id })}>
            Auftrag
          </Button>
          <IconButton icon={Pencil} label="Liegenschaft bearbeiten" size="sm" onClick={onBearbeiten} />
        </div>
      </header>
      <div className={styles.liegenschaftFakten}>
        {liegenschaft.hauswart && (
          <span>
            <UserRound size={14} strokeWidth={1.5} aria-hidden /> Hauswart {liegenschaft.hauswart.name} · <a className={styles.mono} href={`tel:${liegenschaft.hauswart.telefon.replace(/\s/g, '')}`}>{liegenschaft.hauswart.telefon}</a>
          </span>
        )}
        {liegenschaft.zugang && (
          <span>
            <KeyRound size={14} strokeWidth={1.5} aria-hidden /> {liegenschaft.zugang}
          </span>
        )}
        {liegenschaft.hinweise.length > 0 && (
          <span className={styles.liegenschaftChips}>
            {liegenschaft.hinweise.map((hinweis, index) => (
              <Chip key={`${hinweis.art}-${index}`} icon={HINWEIS_ICON[hinweis.art]} tone={HINWEIS_TON[hinweis.art]} title={hinweis.text}>
                {HINWEIS_LABEL[hinweis.art]}
              </Chip>
            ))}
          </span>
        )}
      </div>
      {view.geraete.length > 0 && (
        <ul className={styles.geraete}>
          {view.geraete.slice(0, GERAETE_JE_LIEGENSCHAFT).map((eintrag) => (
            <li key={eintrag.geraet.id} className={styles.geraet}>
              <Verweis zu={ZIEL.geraet(eintrag.geraet.id)} label={KENNUNG_LABEL[eintrag.geraet.marke]} wert={eintrag.geraet.seriennummer} text={`${eintrag.geraet.marke} ${eintrag.geraet.art}`} />
              <span className={styles.geraetMeta}>
                {eintrag.wohnung && <span className={styles.mono}>{eintrag.wohnung.nummer} · </span>}
                {eintrag.geraet.modell} · Bj. {eintrag.geraet.baujahr}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.liegenschaftFuss}>
        {view.auftraege.length} Auftr{view.auftraege.length === 1 ? 'ag' : 'äge'}
        {view.offene > 0 && ` · ${view.offene} offen`}
        {view.geraete.length === 0 && ' · noch kein Gerät erfasst'}
        {view.geraete.length > GERAETE_JE_LIEGENSCHAFT && ` · ${view.geraete.length - GERAETE_JE_LIEGENSCHAFT} weitere Geräte in der Kartei`}
      </p>
    </article>
  );
}

// ── §2 · Dossier ─────────────────────────────────────────────────

interface KundeDossierProps {
  view: KundeView;
  nachrichten: readonly Nachricht[];
  hervorgehobeneLiegenschaft: string | null;
  aktionen: DispoAktionen;
  onNeuerAuftrag: (vorbelegung: Vorbelegung) => void;
}

const AUFTRAEGE_IM_DOSSIER = 10;
const GERAETE_JE_LIEGENSCHAFT = 8;

export function KundeDossier({ view, nachrichten, hervorgehobeneLiegenschaft, aktionen, onNeuerAuftrag }: KundeDossierProps) {
  const navigate = useNavigate();
  const heute = useHeute();
  const { kunde } = view;
  const [bearbeiten, setBearbeiten] = useState(false);
  const [liegenschaftDialog, setLiegenschaftDialog] = useState<{ offen: boolean; liegenschaft?: Liegenschaft }>({ offen: false });

  return (
    <div className={styles.dossier}>
      <DossierKopf
        kennung={
          <>
            <Typenschild label="Kunde" wert={kunde.nummer} size="md" />
            <Chip tone="neutral" size="md">
              {KUNDENART_LABEL[kunde.art]}
            </Chip>
            {view.offene > 0 && (
              <Chip tone="signal" size="md">
                {view.offene} offen
              </Chip>
            )}
          </>
        }
        titel={kunde.name}
        untertitel={`${formatAdresse(kunde.adresse)} · Kunde seit ${formatDatum(kunde.kundeSeit)}`}
        chips={<KundenChips kunde={kunde} />}
        aktionen={
          <>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => onNeuerAuftrag({ kundeId: kunde.id, telefon: kunde.kontakt.telefon })}>
              Neuer Auftrag
            </Button>
            <IconButton icon={Pencil} label="Kunde bearbeiten" size="sm" onClick={() => setBearbeiten(true)} />
          </>
        }
      />

      <DossierAbschnitt titel="Kontakt">
        <DetailZeile icon={Phone} label="Kontaktperson" wert={kunde.kontakt.name} zusatz={<a className={styles.mono} href={`tel:${kunde.kontakt.telefon.replace(/\s/g, '')}`}>{kunde.kontakt.telefon}</a>} />
        {kunde.kontakt.email && <DetailZeile icon={Mail} label="E-Mail" wert={<a href={`mailto:${kunde.kontakt.email}`}>{kunde.kontakt.email}</a>} />}
        <DetailZeile icon={MapPin} label="Adresse" wert={formatAdresse(kunde.adresse)} />
        {kunde.rechnungOffenSeit && <DetailZeile icon={Receipt} label="Älteste offene Rechnung" wert={`${formatDatum(kunde.rechnungOffenSeit)} · ${formatSeit(kunde.rechnungOffenSeit, heute)}`} />}
      </DossierAbschnitt>

      <DossierAbschnitt
        titel="Liegenschaften"
        zusatz={
          <Button variant="ghost" size="sm" icon={Building} onClick={() => setLiegenschaftDialog({ offen: true })}>
            Neue Liegenschaft
          </Button>
        }
      >
        {view.liegenschaften.length === 0 && <p className={styles.leer}>Noch keine Liegenschaft erfasst.</p>}
        <div className={styles.liegenschaften}>
          {view.liegenschaften.map((eintrag) => (
            <LiegenschaftKarte
              key={eintrag.liegenschaft.id}
              view={eintrag}
              hervorgehoben={eintrag.liegenschaft.id === hervorgehobeneLiegenschaft}
              onBearbeiten={() => setLiegenschaftDialog({ offen: true, liegenschaft: eintrag.liegenschaft })}
              onNeuerAuftrag={onNeuerAuftrag}
            />
          ))}
        </div>
      </DossierAbschnitt>

      <DossierAbschnitt
        titel="Aufträge"
        zusatz={
          <Button variant="ghost" size="sm" onClick={() => navigate(`/auftraege?suche=${encodeURIComponent(kunde.nummer)}`)}>
            Alle {view.auftraege.length} im Modul
          </Button>
        }
      >
        {view.auftraege.length === 0 && <p className={styles.leer}>Noch kein Auftrag.</p>}
        <ul className={styles.auftraege}>
          {view.auftraege.slice(0, AUFTRAEGE_IM_DOSSIER).map((auftrag) => (
            <li key={auftrag.auftrag.id} className={styles.auftrag}>
              <Verweis zu={ZIEL.auftrag(auftrag.auftrag.id)} label="Auftrag" wert={auftrag.auftrag.nummer} />
              <span className={styles.auftragText}>
                <span className={styles.mono}>{formatDatumKurz(auftrag.letzter?.datum ?? splitZeitpunkt(auftrag.auftrag.angefragtAm).datum)}</span> · {auftrag.geraet.marke} {auftrag.geraet.art} · {auftrag.auftrag.fehlerbild}
              </span>
              <Chip tone="tint" className={kategorieKlasse(auftrag.auftrag.kategorie)}>
                {KATEGORIE_LABEL[auftrag.auftrag.kategorie]}
              </Chip>
              <Chip tone={PHASE_TON[auftrag.phase]}>{PHASE_LABEL[auftrag.phase]}</Chip>
            </li>
          ))}
        </ul>
      </DossierAbschnitt>

      {view.rechnungenOffen.length > 0 && (
        <DossierAbschnitt titel="Rechnungen offen" zusatz={<span className={styles.mono}>{view.rechnungenOffen.length}</span>}>
          <ul className={styles.auftraege}>
            {view.rechnungenOffen.map((auftrag) => (
              <li key={auftrag.auftrag.id} className={styles.auftrag}>
                <Verweis zu={ZIEL.auftrag(auftrag.auftrag.id)} label="Auftrag" wert={auftrag.auftrag.nummer} />
                <span className={styles.auftragText}>{auftrag.auftrag.fehlerbild}</span>
                <span className={styles.mono}>{auftrag.betrag ? formatChf(auftrag.betrag.totalChf) : '–'}</span>
              </li>
            ))}
          </ul>
        </DossierAbschnitt>
      )}

      {nachrichten.length > 0 && (
        <DossierAbschnitt titel="Nachrichten" zusatz={<span className={styles.mono}>{nachrichten.length}</span>}>
          <AkteNachrichten nachrichten={nachrichten} />
        </DossierAbschnitt>
      )}

      <p className={styles.fussnote}>
        {view.letzterAuftragAm ? `Letzter Auftrag ${formatZeitpunktKurz(view.letzterAuftragAm)}` : 'Noch kein Auftrag'} · {view.geraete} Geräte · {view.liegenschaften.length} Liegenschaften
      </p>

      {bearbeiten && (
        <KundeDialog
          open
          kunde={kunde}
          onClose={() => setBearbeiten(false)}
          onSave={(neu) => {
            aktionen.updateKunde(neu);
            setBearbeiten(false);
          }}
        />
      )}
      {liegenschaftDialog.offen && (
        <LiegenschaftDialog
          open
          kunde={kunde}
          {...(liegenschaftDialog.liegenschaft ? { liegenschaft: liegenschaftDialog.liegenschaft } : {})}
          onClose={() => setLiegenschaftDialog({ offen: false })}
          onSave={(entwurf) => {
            const { id, ...rest } = entwurf;
            if (id) aktionen.updateLiegenschaft({ ...rest, id });
            else aktionen.createLiegenschaft(rest);
            setLiegenschaftDialog({ offen: false });
          }}
        />
      )}
    </div>
  );
}

/* ◆ jh · eof */
