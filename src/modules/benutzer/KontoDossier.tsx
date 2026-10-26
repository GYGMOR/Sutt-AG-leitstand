/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/benutzer/KontoDossier.tsx                  │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Konto-Dossier: Stammdaten, Anbieter, Rechte-Matrix, Umfang, Journal   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { Check, KeyRound, Lock, LockOpen, Minus, MonitorOff, Pencil, Plus } from 'lucide-react';
import { ROLLE_LABEL } from '../../core/auth/auth.types';
import { ANBIETER_INFO } from '../../core/auth/identitaet';
import { PERSONEN_BEREICHE, PROFILE, UMFAENGE, UMFANG_LABEL, umfangVon } from '../../core/berechtigung/rechte';
import type { Bereich, Umfang } from '../../core/berechtigung/rechte';
import { JOURNAL_BEREICH_LABEL } from '../../core/domain/journal';
import type { JournalEintrag } from '../../core/domain/journal';
import { mitarbeiterName } from '../../core/domain/personal';
import { formatZeitpunktKurz } from '../../core/format';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { ConfirmDialog } from '../../core/ui/Dialog';
import { Auswahl } from '../../core/ui/Form';
import { DossierAbschnitt, DossierKopf, Fakten } from '../../core/ui/ModulSeite';
import { Typenschild } from '../../core/ui/Typenschild';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import { cx } from '../../core/ui/cx';
import type { DispoAktionen } from '../dispo/store/useDispoAktionen';
import { PersonAvatar } from '../personal/PersonAvatar';
import type { Rechte } from '../personal/rechte';
import personal from '../personal/Personal.module.css';
import { rechtUmschalten, rechteMatrix } from './benutzer.model';
import type { KontoView } from './benutzer.model';
import styles from './BenutzerPage.module.css';

// ── §1 · Rechte-Matrix ───────────────────────────────────────────

interface MatrixProps {
  view: KontoView;
  editierbar: boolean;
  onUmschalten: (recht: Parameters<typeof rechtUmschalten>[1]) => void;
}

const HERKUNFT_ICON = { rolle: Check, zusatz: Plus, entzogen: Minus, keine: undefined } as const;

function RechteMatrix({ view, editierbar, onUmschalten }: MatrixProps) {
  const matrix = useMemo(() => rechteMatrix(view.benutzer), [view.benutzer]);
  return (
    <div className={styles.matrix}>
      {matrix.map((bereich) => (
        <div key={bereich.bereich} className={styles.matrixBereich}>
          <span className={styles.matrixLabel}>{bereich.label}</span>
          <div className={styles.matrixRechte}>
            {bereich.rechte.map((eintrag) => {
              const Icon = HERKUNFT_ICON[eintrag.herkunft];
              return (
                <button
                  key={eintrag.info.recht}
                  type="button"
                  className={cx(styles.recht, styles[eintrag.herkunft], !eintrag.aktiv && styles.rechtInaktiv)}
                  title={`${eintrag.info.beschreibung} · ${eintrag.herkunft === 'rolle' ? 'aus der Rolle' : eintrag.herkunft === 'zusatz' ? 'Zusatzrecht' : eintrag.herkunft === 'entzogen' ? 'entzogen' : 'nicht enthalten'}${editierbar ? ' · klicken zum Ändern' : ''}`}
                  disabled={!editierbar}
                  aria-pressed={eintrag.aktiv}
                  onClick={() => onUmschalten(eintrag.info.recht)}
                >
                  {Icon && <Icon size={12} strokeWidth={2} aria-hidden />}
                  <span>{eintrag.info.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className={styles.matrixLegende}>
        <span className={cx(styles.recht, styles.rolle)}>
          <Check size={12} strokeWidth={2} aria-hidden /> aus der Rolle
        </span>
        <span className={cx(styles.recht, styles.zusatz)}>
          <Plus size={12} strokeWidth={2} aria-hidden /> Zusatzrecht
        </span>
        <span className={cx(styles.recht, styles.entzogen, styles.rechtInaktiv)}>
          <Minus size={12} strokeWidth={2} aria-hidden /> entzogen
        </span>
        <span className={cx(styles.recht, styles.keine, styles.rechtInaktiv)}>nicht enthalten</span>
      </p>
    </div>
  );
}

// ── §2 · Dossier ─────────────────────────────────────────────────

interface KontoDossierProps {
  view: KontoView;
  rechte: Rechte;
  aktionen: DispoAktionen;
  journal: readonly JournalEintrag[];
  onBearbeiten: () => void;
}

export function KontoDossier({ view, rechte, aktionen, journal, onBearbeiten }: KontoDossierProps) {
  const { benutzer, person } = view;
  const [sperren, setSperren] = useState(false);
  const darfVerwalten = rechte.hat('benutzer:verwalten');
  const eigenes = rechte.benutzer?.id === benutzer.id;
  const eintraege = useMemo(() => journal.filter((eintrag) => eintrag.betrifft === benutzer.id || eintrag.benutzer === benutzer.kuerzel).slice(0, 8), [journal, benutzer]);
  const anbieter = benutzer.sso ? ANBIETER_INFO[benutzer.sso.anbieter] : null;

  const umfangSetzen = (bereich: Bereich, umfang: Umfang) => {
    const standard = PROFILE[benutzer.rolle].umfang[bereich] ?? 'eigene';
    const { [bereich]: _alt, ...rest } = benutzer.umfang ?? {};
    aktionen.benutzerSpeichern({ ...benutzer, umfang: umfang === standard ? rest : { ...rest, [bereich]: umfang } });
  };

  return (
    <div className={personal.dossier}>
      <DossierKopf
        kennung={
          <>
            {person ? <PersonAvatar mitarbeiter={person} techniker={view.techniker} size="md" /> : <span className={cx(personal.avatar, personal.md)}>{benutzer.kuerzel}</span>}
            <Typenschild label="Konto" wert={benutzer.benutzername} size="md" />
          </>
        }
        titel={`${benutzer.vorname} ${benutzer.nachname}`}
        untertitel={`${ROLLE_LABEL[benutzer.rolle]}${benutzer.email ? ` · ${benutzer.email}` : ''}`}
        chips={
          <>
            <Chip tone={benutzer.aktiv ? 'ok' : 'danger'} icon={benutzer.aktiv ? LockOpen : Lock}>
              {benutzer.aktiv ? 'Aktiv' : 'Gesperrt'}
            </Chip>
            {anbieter && <Chip tone="neutral">{anbieter.kurz}{benutzer.mfa ? ' · MFA' : ''}</Chip>}
            {(view.zusatz > 0 || view.entzogen > 0) && (
              <Chip tone="signal">
                {view.zusatz > 0 && `+${view.zusatz}`}
                {view.zusatz > 0 && view.entzogen > 0 && ' / '}
                {view.entzogen > 0 && `−${view.entzogen}`} Rechte
              </Chip>
            )}
          </>
        }
        aktionen={
          darfVerwalten && (
            <>
              <Button variant="secondary" size="sm" icon={Pencil} onClick={onBearbeiten}>
                Bearbeiten
              </Button>
              {!eigenes && (
                <Button variant={benutzer.aktiv ? 'ghost' : 'primary'} size="sm" icon={benutzer.aktiv ? Lock : LockOpen} onClick={() => (benutzer.aktiv ? setSperren(true) : aktionen.benutzerSpeichern({ ...benutzer, aktiv: true }))}>
                  {benutzer.aktiv ? 'Sperren' : 'Entsperren'}
                </Button>
              )}
            </>
          )
        }
      />

      <DossierAbschnitt titel="Konto">
        <Fakten
          eintraege={[
            { label: 'Personalakte', wert: person ? <Verweis zu={ZIEL.mitarbeiter(person.id)} label="Person" wert={person.kuerzel} text={mitarbeiterName(person)} /> : 'keine' },
            { label: 'Techniker im Plan', wert: view.techniker ? `${view.techniker.kuerzel} · ${view.techniker.fahrzeug}` : '–' },
            { label: 'Anbieter', wert: benutzer.sso ? `${ANBIETER_INFO[benutzer.sso.anbieter].label} · ${benutzer.sso.email}` : 'lokal (Benutzername)' },
            ...(benutzer.sso ? [{ label: 'Externe ID', wert: benutzer.sso.externeId, mono: true }, { label: 'Verknüpft am', wert: formatZeitpunktKurz(benutzer.sso.verknuepftAm), mono: true }] : []),
            { label: 'Letzte Anmeldung', wert: benutzer.letzteAnmeldung ? formatZeitpunktKurz(benutzer.letzteAnmeldung) : 'noch nie', mono: true },
            { label: 'Erstellt', wert: benutzer.erstelltAm ? formatZeitpunktKurz(benutzer.erstelltAm) : '–', mono: true },
          ]}
        />
        {darfVerwalten && (
          <div className={personal.aktionen}>
            <Button variant="ghost" size="sm" icon={KeyRound} onClick={() => aktionen.protokolliere({ bereich: 'benutzer', art: 'system', text: `Passwort-Link für ${benutzer.benutzername} ausgelöst (Mock)`, betrifft: benutzer.id })}>
              Passwort-Link senden (Mock)
            </Button>
            <Button variant="ghost" size="sm" icon={MonitorOff} onClick={() => aktionen.protokolliere({ bereich: 'benutzer', art: 'system', text: `Alle Sitzungen von ${benutzer.benutzername} beendet (Mock)`, betrifft: benutzer.id })}>
              Sitzungen beenden (Mock)
            </Button>
          </div>
        )}
      </DossierAbschnitt>

      <DossierAbschnitt titel="Rechte" zusatz={<span className={personal.fussnote}>Rolle {ROLLE_LABEL[benutzer.rolle]}: {PROFILE[benutzer.rolle].beschreibung}</span>}>
        <RechteMatrix view={view} editierbar={darfVerwalten && !eigenes} onUmschalten={(recht) => aktionen.benutzerSpeichern({ ...benutzer, ...rechtUmschalten(benutzer, recht) })} />
        {eigenes && <p className={personal.fussnote}>Eigene Rechte ändert niemand selbst – auch die Administration nicht (Vier-Augen-Prinzip).</p>}
      </DossierAbschnitt>

      <DossierAbschnitt titel="Umfang" zusatz={<span className={personal.fussnote}>Auf wessen Daten die Personenrechte wirken</span>}>
        <div className={styles.umfang}>
          {PERSONEN_BEREICHE.map((bereich) => (
            <label key={bereich} className={styles.umfangFeld}>
              <span className={styles.umfangLabel}>{bereich === 'zeit' ? 'Zeiterfassung' : bereich === 'absenzen' ? 'Absenzen' : 'Personaldaten'}</span>
              <Auswahl value={umfangVon(benutzer, bereich)} disabled={!darfVerwalten || eigenes} onChange={(event) => umfangSetzen(bereich, event.target.value as Umfang)}>
                {UMFAENGE.map((umfang) => (
                  <option key={umfang} value={umfang}>
                    {UMFANG_LABEL[umfang]}
                    {umfang === (PROFILE[benutzer.rolle].umfang[bereich] ?? 'eigene') ? ' (Rolle)' : ''}
                  </option>
                ))}
              </Auswahl>
            </label>
          ))}
        </div>
      </DossierAbschnitt>

      <DossierAbschnitt titel="Journal" zusatz={<span className={personal.fussnote}>letzte {eintraege.length}</span>}>
        {eintraege.length === 0 && <p className={personal.fussnote}>Noch keine Einträge.</p>}
        <ul className={personal.liste}>
          {eintraege.map((eintrag) => (
            <li key={eintrag.id} className={personal.listenZeile}>
              <span className={personal.mono}>{formatZeitpunktKurz(eintrag.zeitpunkt)}</span>
              <span className={personal.listenText}>
                <span className={personal.listenHaupt}>{eintrag.benutzer}</span> · {eintrag.text}
              </span>
              <Chip tone="mute">{JOURNAL_BEREICH_LABEL[eintrag.bereich]}</Chip>
            </li>
          ))}
        </ul>
      </DossierAbschnitt>

      <ConfirmDialog
        open={sperren}
        titel={`Konto ${benutzer.benutzername} sperren?`}
        text="Die Person kann sich nicht mehr anmelden – lokal und über den Anbieter. Daten bleiben bis zur Löschfrist erhalten."
        bestaetigen="Sperren"
        gefaehrlich
        onConfirm={() => {
          setSperren(false);
          aktionen.benutzerSpeichern({ ...benutzer, aktiv: false });
        }}
        onClose={() => setSperren(false)}
      />
    </div>
  );
}

/* ◆ jh · eof */
