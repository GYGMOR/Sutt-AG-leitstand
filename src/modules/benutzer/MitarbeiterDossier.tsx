/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/benutzer/MitarbeiterDossier.tsx            │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Personalakte: Stammdaten, Team, Ferienkonto, Konto, Auskunft          │
   └────────────────────────────────────────────────────────────────────────┘ */

import { FileDown, Pencil, UserPlus } from 'lucide-react';
import { ladeHerunter } from '../../core/datei';
import type { IsoDatum } from '../../core/datum';
import { datenKategorie, loeschdatum } from '../../core/datenschutz/aufbewahrung';
import { FUNKTION_LABEL, mitarbeiterName } from '../../core/domain/personal';
import { formatDatum } from '../../core/format';
import type { Mandant } from '../../core/mandant/mandant.types';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { DossierAbschnitt, DossierKopf, Fakten } from '../../core/ui/ModulSeite';
import { Typenschild } from '../../core/ui/Typenschild';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import type { DispoState } from '../dispo/store/dispo.reducer';
import type { DispoAktionen } from '../dispo/store/useDispoAktionen';
import { PersonAvatar } from '../personal/PersonAvatar';
import { exportName } from '../personal/personal.model';
import type { Rechte } from '../personal/rechte';
import personal from '../personal/Personal.module.css';
import { auskunftFuer } from './benutzer.model';
import type { MitarbeiterZeile } from './benutzer.model';

// ── §1 · Dossier ─────────────────────────────────────────────────

interface MitarbeiterDossierProps {
  zeile: MitarbeiterZeile;
  state: DispoState;
  rechte: Rechte;
  aktionen: DispoAktionen;
  mandant: Mandant;
  heute: IsoDatum;
  onBearbeiten: () => void;
  onKontoAnlegen: () => void;
}

export function MitarbeiterDossier({ zeile, state, rechte, aktionen, mandant, heute, onBearbeiten, onKontoAnlegen }: MitarbeiterDossierProps) {
  const { person, ferien } = zeile;
  const { mitarbeiter, konto } = person;
  const darfBearbeiten = rechte.hat('personal:bearbeiten') && rechte.darfPerson('personal', mitarbeiter.id);
  const darfAuskunft = rechte.hat('personal:exportieren') && rechte.darfPerson('personal', mitarbeiter.id);
  const aufbewahrung = datenKategorie('personalstamm');
  const jahre = mandant.aufbewahrung.personalstamm ?? aufbewahrung.aufbewahrungJahre;

  const auskunft = () => {
    const daten = auskunftFuer(mitarbeiter, state, heute);
    ladeHerunter(exportName('auskunft', [mitarbeiter.kuerzel, heute], 'json'), JSON.stringify(daten, null, 2), 'application/json');
    aktionen.protokolliere({ bereich: 'personal', art: 'export', text: `Datenauskunft für ${mitarbeiterName(mitarbeiter)} erstellt (DSG Art. 25)`, mitarbeiterId: mitarbeiter.id });
  };

  return (
    <div className={personal.dossier}>
      <DossierKopf
        kennung={
          <>
            <PersonAvatar mitarbeiter={mitarbeiter} techniker={person.techniker} size="md" />
            <Typenschild label="Kürzel" wert={mitarbeiter.kuerzel} size="md" />
          </>
        }
        titel={mitarbeiterName(mitarbeiter)}
        untertitel={`${FUNKTION_LABEL[mitarbeiter.funktion]} · ${mitarbeiter.pensum} % · seit ${formatDatum(mitarbeiter.eintritt)}`}
        chips={
          <>
            <Chip tone={person.aktiv ? 'ok' : 'mute'}>{person.aktiv ? 'Angestellt' : `Ausgetreten ${mitarbeiter.austritt ? formatDatum(mitarbeiter.austritt) : ''}`}</Chip>
            {konto ? <Chip tone={konto.aktiv ? 'neutral' : 'danger'}>Konto {konto.aktiv ? `@${konto.benutzername}` : 'gesperrt'}</Chip> : <Chip tone="signal">Kein Konto</Chip>}
            {person.techniker && <Chip tone="neutral">{person.techniker.fahrzeug}</Chip>}
          </>
        }
        aktionen={
          <>
            {darfBearbeiten && (
              <Button variant="secondary" size="sm" icon={Pencil} onClick={onBearbeiten}>
                Bearbeiten
              </Button>
            )}
            {!konto && rechte.hat('benutzer:verwalten') && (
              <Button variant="primary" size="sm" icon={UserPlus} onClick={onKontoAnlegen}>
                Konto anlegen
              </Button>
            )}
          </>
        }
      />

      <DossierAbschnitt titel="Stammdaten">
        <Fakten
          eintraege={[
            { label: 'E-Mail', wert: mitarbeiter.email, mono: true },
            { label: 'Telefon', wert: mitarbeiter.telefon ?? '–', mono: true },
            { label: 'Vorgesetzte/r', wert: person.vorgesetzte ? <Verweis zu={ZIEL.mitarbeiter(person.vorgesetzte.id)} label="Person" wert={person.vorgesetzte.kuerzel} text={mitarbeiterName(person.vorgesetzte)} /> : 'Geschäftsleitung' },
            { label: 'Team', wert: person.team.length > 0 ? `${person.team.length} direkt unterstellt` : '–' },
            { label: 'Eintritt', wert: formatDatum(mitarbeiter.eintritt), mono: true },
            { label: 'Austritt', wert: mitarbeiter.austritt ? formatDatum(mitarbeiter.austritt) : '–', mono: true },
            { label: 'Ferien / Jahr (100 %)', wert: `${mitarbeiter.ferienTageProJahr} Tage`, mono: true },
            { label: `Gleitzeit per ${formatDatum(mitarbeiter.zeitUebertragPer)}`, wert: `${(mitarbeiter.zeitUebertragMin / 60).toFixed(2)} h`, mono: true },
            { label: 'Konto', wert: konto ? <Verweis zu={ZIEL.konto(konto.id)} label="Konto" wert={konto.benutzername} /> : 'keines' },
          ]}
        />
      </DossierAbschnitt>

      <DossierAbschnitt titel={`Ferienkonto ${ferien.jahr}`}>
        <Fakten
          eintraege={[
            { label: 'Anspruch', wert: `${ferien.anspruchTage} Tage`, mono: true },
            { label: 'Übertrag', wert: `${ferien.uebertragTage} Tage`, mono: true },
            { label: 'Bezogen', wert: `${ferien.bezogenTage} Tage`, mono: true },
            { label: 'Geplant', wert: `${ferien.geplantTage} Tage`, mono: true },
            { label: 'Beantragt', wert: `${ferien.beantragtTage} Tage`, mono: true },
            { label: 'Rest', wert: <span className={ferien.restTage < 0 ? personal.minus : undefined}>{ferien.restTage} Tage</span>, mono: true },
          ]}
        />
        <p className={personal.fussnote}>
          <Verweis zu={ZIEL.zeitkonto(mitarbeiter.id)} label="Zeitkonto" wert={mitarbeiter.kuerzel} /> · <Verweis zu={ZIEL.absenzenVon(mitarbeiter.id)} label="Absenzen" wert={mitarbeiter.kuerzel} />
        </p>
      </DossierAbschnitt>

      {person.team.length > 0 && (
        <DossierAbschnitt titel="Team">
          <ul className={personal.liste}>
            {person.team.map((mitglied) => (
              <li key={mitglied.id} className={personal.listenZeile}>
                <PersonAvatar mitarbeiter={mitglied} techniker={state.stammdaten.techniker.find((techniker) => techniker.id === mitglied.technikerId)} size="sm" />
                <span className={personal.listenText}>
                  <span className={personal.listenHaupt}>{mitarbeiterName(mitglied)}</span> · {FUNKTION_LABEL[mitglied.funktion]}
                </span>
                <Verweis zu={ZIEL.mitarbeiter(mitglied.id)} label="Person" wert={mitglied.kuerzel} />
              </li>
            ))}
          </ul>
        </DossierAbschnitt>
      )}

      <DossierAbschnitt titel="Datenschutz">
        <Fakten
          eintraege={[
            { label: 'Aufbewahrung', wert: `${jahre} Jahre ab Austritt (${aufbewahrung.rechtsgrundlage})`, breit: true },
            { label: 'Frühestes Löschdatum', wert: mitarbeiter.austritt ? formatDatum(loeschdatum(aufbewahrung, jahre, mitarbeiter.austritt)) : 'noch angestellt', mono: true },
          ]}
        />
        {darfAuskunft && (
          <div className={personal.aktionen}>
            <Button variant="secondary" size="sm" icon={FileDown} onClick={auskunft}>
              Auskunft erstellen (DSG Art. 25)
            </Button>
            <span className={personal.fussnote}>JSON mit Personalakte, Konto, Zeiten, Absenzen und Journal – die Erstellung wird protokolliert.</span>
          </div>
        )}
      </DossierAbschnitt>
    </div>
  );
}

/* ◆ jh · eof */
