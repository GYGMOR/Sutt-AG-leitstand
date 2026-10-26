/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/absenzen/AbsenzDossier.tsx                 │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Absenz-Dossier: Zeitraum, Entscheid, Konflikte, Team, Ferienkonto     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import type { IsoDatum } from '../../core/datum';
import { ABSENZ_INFO, ABSENZ_LABEL, ABSENZ_STATUS_LABEL, ferienkonto } from '../../core/domain/absenz';
import type { Absenz } from '../../core/domain/absenz';
import { FUNKTION_LABEL, mitarbeiterName } from '../../core/domain/personal';
import { formatDatum, formatDatumKurz, formatWochentag, formatZeit, formatZeitpunktKurz } from '../../core/format';
import type { Mandant } from '../../core/mandant/mandant.types';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { ConfirmDialog } from '../../core/ui/Dialog';
import { DossierAbschnitt, DossierKopf, Fakten } from '../../core/ui/ModulSeite';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import type { DispoAktionen } from '../dispo/store/useDispoAktionen';
import type { DispoStammdaten } from '../dispo/dispo.types';
import { PersonAvatar } from '../personal/PersonAvatar';
import type { Rechte } from '../personal/rechte';
import personal from '../personal/Personal.module.css';
import { GrundDialog } from '../zeiterfassung/ZeitDialoge';
import { ABSENZ_STATUS_TON, ueberlappende } from './absenzen.model';
import type { AbsenzView } from './absenzen.model';

// ── §1 · Dossier ─────────────────────────────────────────────────

interface AbsenzDossierProps {
  view: AbsenzView;
  alleViews: readonly AbsenzView[];
  stammdaten: DispoStammdaten;
  rechte: Rechte;
  aktionen: DispoAktionen;
  mandant: Mandant;
  heute: IsoDatum;
  onBearbeiten: (absenz: Absenz) => void;
}

const protokolliert = new Set<string>();

export function AbsenzDossier({ view, alleViews, stammdaten, rechte, aktionen, mandant, heute, onBearbeiten }: AbsenzDossierProps) {
  const { absenz, person } = view;
  const eigene = rechte.mitarbeiter?.id === absenz.mitarbeiterId;
  const [ablehnen, setAblehnen] = useState(false);
  const [loeschen, setLoeschen] = useState(false);

  // jh› Gesundheitsdaten fremder Personen: jede Einsicht steht im Journal – die Person sieht sie unter «Meine Daten».
  useEffect(() => {
    if (eigene || !ABSENZ_INFO[absenz.art].gesundheit) return;
    const schluessel = `${rechte.benutzer?.id ?? '?'}:${absenz.id}`;
    if (protokolliert.has(schluessel)) return;
    protokolliert.add(schluessel);
    aktionen.einsichtProtokollieren('absenz', absenz.mitarbeiterId, `${ABSENZ_LABEL[absenz.art]} ${formatDatumKurz(absenz.von)} von ${mitarbeiterName(person.mitarbeiter)} angesehen`);
  }, [eigene, absenz, person.mitarbeiter, aktionen, rechte.benutzer?.id]);

  const darfEntscheiden = !eigene && rechte.hat('absenzen:genehmigen') && rechte.darfPerson('absenzen', absenz.mitarbeiterId);
  const darfBearbeiten = (eigene && absenz.status === 'beantragt' && rechte.hat('absenzen:erfassen')) || (rechte.hat('absenzen:bearbeiten') && rechte.darfPerson('absenzen', absenz.mitarbeiterId));
  const andere = useMemo(() => ueberlappende(alleViews, absenz), [alleViews, absenz]);
  const konto = useMemo(() => ferienkonto(person.mitarbeiter, stammdaten.absenzen, Number(absenz.von.slice(0, 4)), heute, mandant.kanton, mandant.betrieblicheFeiertage), [person.mitarbeiter, stammdaten.absenzen, absenz.von, heute, mandant]);
  const zeitraum = absenz.von === absenz.bis ? `${formatWochentag(absenz.von, 'kurz')} ${formatDatum(absenz.von)}` : `${formatDatumKurz(absenz.von)} – ${formatDatumKurz(absenz.bis)}`;

  return (
    <div className={personal.dossier}>
      <DossierKopf
        kennung={
          <>
            <PersonAvatar mitarbeiter={person.mitarbeiter} techniker={person.techniker} size="md" />
            <Chip tone={ABSENZ_STATUS_TON[absenz.status]} size="md">
              {ABSENZ_STATUS_LABEL[absenz.status]}
            </Chip>
          </>
        }
        titel={`${ABSENZ_LABEL[absenz.art]} · ${zeitraum}`}
        untertitel={`${mitarbeiterName(person.mitarbeiter)} · ${FUNKTION_LABEL[person.mitarbeiter.funktion]} · ${view.tage} Arbeitstag${view.tage === 1 ? '' : 'e'}${absenz.halberTag ? ` (${absenz.halberTag === 'vormittag' ? 'Vormittag' : 'Nachmittag'})` : ''}`}
        chips={
          <>
            {view.lage === 'laufend' && <Chip tone="ok">läuft</Chip>}
            {view.einsaetze.length > 0 && (
              <Chip tone="danger" icon={AlertTriangle}>
                {view.einsaetze.length} Einsätze geplant
              </Chip>
            )}
            {ABSENZ_INFO[absenz.art].gesundheit && <Chip tone="mute">Gesundheitsdatum</Chip>}
          </>
        }
        aktionen={
          <>
            {darfBearbeiten && (
              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => onBearbeiten(absenz)}>
                Bearbeiten
              </Button>
            )}
          </>
        }
      />

      <DossierAbschnitt titel="Antrag & Entscheid">
        <Fakten
          eintraege={[
            { label: 'Zeitraum', wert: zeitraum, mono: true },
            { label: 'Arbeitstage', wert: String(view.tage), mono: true },
            { label: 'Beantragt', wert: absenz.beantragtAm ? `${formatZeitpunktKurz(absenz.beantragtAm)} · ${absenz.beantragtVon ?? ''}` : '–', mono: true },
            { label: absenz.status === 'abgelehnt' ? 'Abgelehnt' : 'Entschieden', wert: absenz.entschiedenAm ? `${formatZeitpunktKurz(absenz.entschiedenAm)} · ${absenz.entschiedenVon ?? ''}` : 'offen', mono: true },
            ...(absenz.entscheidGrund ? [{ label: 'Begründung', wert: absenz.entscheidGrund, breit: true }] : []),
            ...(absenz.notiz ? [{ label: 'Notiz', wert: absenz.notiz, breit: true }] : []),
            ...(ABSENZ_INFO[absenz.art].gesundheit && (eigene || rechte.gesundheit) ? [{ label: 'Arztzeugnis', wert: absenz.arztzeugnis ? 'liegt vor' : 'keines' }] : []),
          ]}
        />
        <div className={personal.aktionen}>
          {absenz.status === 'beantragt' && darfEntscheiden && (
            <>
              <Button variant="primary" size="sm" icon={Check} onClick={() => aktionen.absenzEntscheiden(absenz.id, 'genehmigt')}>
                Genehmigen
              </Button>
              <Button variant="secondary" size="sm" icon={X} onClick={() => setAblehnen(true)}>
                Ablehnen
              </Button>
            </>
          )}
          {absenz.status === 'abgelehnt' && darfEntscheiden && (
            <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => aktionen.absenzEntscheiden(absenz.id, 'beantragt')}>
              Erneut prüfen
            </Button>
          )}
          {darfBearbeiten && (
            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setLoeschen(true)}>
              Löschen
            </Button>
          )}
          {absenz.status === 'beantragt' && eigene && <span className={personal.fussnote}>Entscheid durch {person.vorgesetzte ? mitarbeiterName(person.vorgesetzte) : 'die Vorgesetzten'}.</span>}
        </div>
      </DossierAbschnitt>

      <DossierAbschnitt titel="Einsatzplan">
        {view.einsaetze.length === 0 ? (
          <p className={personal.fussnote}>Keine Einsätze im Zeitraum geplant.</p>
        ) : (
          <>
            <p className={personal.warnung}>
              <AlertTriangle size={16} strokeWidth={1.5} aria-hidden />
              {view.einsaetze.length} geplante Einsätze liegen im Zeitraum – vor der Genehmigung in der Plantafel umplanen.
            </p>
            <ul className={personal.liste}>
              {view.einsaetze.map((einsatz) => {
                const auftrag = stammdaten.auftraege.get(einsatz.auftragId);
                return (
                  <li key={einsatz.id} className={personal.listenZeile}>
                    <span className={personal.mono}>
                      {formatWochentag(einsatz.datum, 'kurz')} {formatDatumKurz(einsatz.datum)} {formatZeit(einsatz.startMin)}
                    </span>
                    <span className={personal.listenText}>{auftrag ? `${stammdaten.kunden.get(auftrag.kundeId)?.kurzname ?? ''} · ${auftrag.fehlerbild}` : einsatz.auftragId}</span>
                    {auftrag && <Verweis zu={ZIEL.auftrag(auftrag.id)} label="Auftrag" wert={auftrag.nummer} />}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </DossierAbschnitt>

      <DossierAbschnitt titel="Gleichzeitig abwesend" zusatz={<span className={personal.fussnote}>{andere.length === 0 ? 'niemand' : `${andere.length} Person${andere.length === 1 ? '' : 'en'}`}</span>}>
        {andere.length > 0 && (
          <ul className={personal.liste}>
            {andere.map((anderer) => (
              <li key={anderer.absenz.id} className={personal.listenZeile}>
                <PersonAvatar mitarbeiter={anderer.person.mitarbeiter} techniker={anderer.person.techniker} size="sm" />
                <span className={personal.listenText}>
                  <span className={personal.listenHaupt}>{mitarbeiterName(anderer.person.mitarbeiter)}</span> · {ABSENZ_LABEL[anderer.absenz.art]} · {formatDatumKurz(anderer.absenz.von)}–{formatDatumKurz(anderer.absenz.bis)}
                </span>
                <Chip tone={ABSENZ_STATUS_TON[anderer.absenz.status]}>{ABSENZ_STATUS_LABEL[anderer.absenz.status]}</Chip>
              </li>
            ))}
          </ul>
        )}
      </DossierAbschnitt>

      <DossierAbschnitt titel={`Ferienkonto ${konto.jahr}`}>
        <Fakten
          eintraege={[
            { label: 'Anspruch', wert: `${konto.anspruchTage} Tage`, mono: true },
            { label: 'Übertrag', wert: `${konto.uebertragTage} Tage`, mono: true },
            { label: 'Bezogen', wert: `${konto.bezogenTage} Tage`, mono: true },
            { label: 'Geplant', wert: `${konto.geplantTage} Tage`, mono: true },
            { label: 'Beantragt', wert: `${konto.beantragtTage} Tage`, mono: true },
            { label: 'Rest', wert: <span className={konto.restTage < 0 ? personal.minus : undefined}>{konto.restTage} Tage</span>, mono: true },
          ]}
        />
        <p className={personal.fussnote}>
          <Verweis zu={ZIEL.absenzenVon(person.mitarbeiter.id)} label="Absenzen" wert={person.mitarbeiter.kuerzel} text="alle Absenzen" /> · <Verweis zu={ZIEL.zeitkonto(person.mitarbeiter.id)} label="Zeitkonto" wert={person.mitarbeiter.kuerzel} />
        </p>
      </DossierAbschnitt>

      <GrundDialog open={ablehnen} titel="Antrag ablehnen" text="Die Person sieht die Begründung in ihrem Antrag und in der App." bestaetigen="Ablehnen" onClose={() => setAblehnen(false)} onBestaetigen={(grund) => aktionen.absenzEntscheiden(absenz.id, 'abgelehnt', grund)} />
      <ConfirmDialog open={loeschen} titel="Absenz löschen?" text="Die Absenz wird entfernt; der Vorgang bleibt im Journal nachvollziehbar." bestaetigen="Löschen" gefaehrlich onConfirm={() => aktionen.absenzLoeschen(absenz.id)} onClose={() => setLoeschen(false)} />
    </div>
  );
}

/* ◆ jh · eof */
