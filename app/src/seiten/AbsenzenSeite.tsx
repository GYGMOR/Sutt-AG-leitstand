/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/AbsenzenSeite.tsx                       │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Absenzen: Ferienkonto, eigene Anträge, neu beantragen, zurückziehen   │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ABSENZ_LABEL, ABSENZ_STATUS_LABEL, absenzTage, ferienkonto } from '@sl/core/domain/absenz';
import type { Absenz } from '@sl/core/domain/absenz';
import { formatDatumKurz, formatZeitpunktKurz } from '@sl/core/format';
import { Button, IconButton } from '@sl/core/ui/Button';
import { Chip } from '@sl/core/ui/Chip';
import { ConfirmDialog } from '@sl/core/ui/Dialog';
import { AbsenzDialog } from '@sl/modules/absenzen/AbsenzDialog';
import { ABSENZ_STATUS_TON } from '@sl/modules/absenzen/absenzen.model';
import { buildPersonViews } from '@sl/modules/personal/personal.model';
import styles from '../bausteine/Seiten.module.css';
import { useApp } from '../rahmen/AppKontext';

// ── §1 · Komponente ──────────────────────────────────────────────

// jh› Dieselben Regeln wie im Leitstand (Dialog, Status je Art, Überschneidung) – nur die eigene Person.
//     Beantragte Absenzen darf man selbst ändern oder zurückziehen, entschiedene nicht.
export function AbsenzenSeite() {
  const { mitarbeiter, heute, state, aktionen, rechte, mandant } = useApp();
  const [dialogOffen, setDialogOffen] = useState(false);
  const [bearbeiten, setBearbeiten] = useState<Absenz | null>(null);
  const [loeschen, setLoeschen] = useState<Absenz | null>(null);

  const eigene = useMemo(() => (mitarbeiter ? state.stammdaten.absenzen.filter((absenz) => absenz.mitarbeiterId === mitarbeiter.id).sort((a, b) => b.von.localeCompare(a.von)) : []), [state.stammdaten.absenzen, mitarbeiter]);
  const kommende = eigene.filter((absenz) => absenz.bis >= heute).sort((a, b) => a.von.localeCompare(b.von));
  const vergangene = eigene.filter((absenz) => absenz.bis < heute).slice(0, 8);
  const jahr = Number(heute.slice(0, 4));
  const konto = useMemo(() => (mitarbeiter ? ferienkonto(mitarbeiter, state.stammdaten.absenzen, jahr, heute, mandant.kanton, mandant.betrieblicheFeiertage) : null), [mitarbeiter, state.stammdaten.absenzen, jahr, heute, mandant]);
  const personen = useMemo(() => (mitarbeiter ? buildPersonViews(state.stammdaten, heute, [mitarbeiter]) : []), [state.stammdaten, heute, mitarbeiter]);
  const darfBeantragen = rechte.hat('absenzen:erfassen');

  if (!mitarbeiter || !konto) return <p className={styles.leer}>Keine Personalakte verknüpft – Absenzen gehören zur eigenen Person.</p>;

  const zeile = (absenz: Absenz) => (
    <li key={absenz.id} className={styles.bordZeile}>
      <Chip tone={ABSENZ_STATUS_TON[absenz.status]}>{ABSENZ_STATUS_LABEL[absenz.status]}</Chip>
      <span className={styles.bordText}>
        <span>
          <strong>{ABSENZ_LABEL[absenz.art]}</strong> · {absenz.von === absenz.bis ? formatDatumKurz(absenz.von) : `${formatDatumKurz(absenz.von)} – ${formatDatumKurz(absenz.bis)}`}
          {absenz.halberTag && ' · halber Tag'}
        </span>
        <span className={styles.quelle}>
          {absenzTage(absenz, mandant.kanton, mandant.betrieblicheFeiertage)} Tage
          {absenz.notiz && ` · ${absenz.notiz}`}
          {absenz.entschiedenAm && ` · entschieden ${formatZeitpunktKurz(absenz.entschiedenAm)}`}
        </span>
      </span>
      {absenz.status === 'beantragt' && darfBeantragen ? <IconButton icon={Pencil} label="Antrag ändern" size="sm" onClick={() => setBearbeiten(absenz)} /> : <span />}
      {absenz.status === 'beantragt' && darfBeantragen ? <IconButton icon={Trash2} label="Antrag zurückziehen" size="sm" tone="danger" onClick={() => setLoeschen(absenz)} /> : <span />}
    </li>
  );

  return (
    <div className={styles.seite}>
      <header className={styles.seitentitel}>
        <h1>Absenzen</h1>
        <span>Ferienkonto {jahr}</span>
      </header>

      <div className={styles.zweispaltig}>
        <section className={styles.abschnitt} aria-label="Ferienkonto">
          <header className={styles.abschnittKopf}>
            <h2>Ferienkonto {jahr}</h2>
            {darfBeantragen && (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setDialogOffen(true)}>
                Beantragen
              </Button>
            )}
          </header>
          <dl className={styles.zeitZahlen}>
            <div>
              <dt>Anspruch</dt>
              <dd>{konto.anspruchTage + konto.uebertragTage}</dd>
            </div>
            <div>
              <dt>Bezogen</dt>
              <dd>{konto.bezogenTage}</dd>
            </div>
            <div>
              <dt>Geplant</dt>
              <dd>{konto.geplantTage}</dd>
            </div>
            <div>
              <dt>Rest</dt>
              <dd className={konto.restTage < 0 ? styles.minus : undefined}>{konto.restTage}</dd>
            </div>
          </dl>
          <p className={styles.quelle}>
            {konto.uebertragTage > 0 && `davon ${konto.uebertragTage} Tage Übertrag · `}
            {konto.beantragtTage > 0 ? `${konto.beantragtTage} Tage beantragt, noch nicht entschieden` : 'nichts offen'}
          </p>
        </section>

        <div className={styles.spalte}>
          <section className={styles.abschnitt} aria-label="Kommende Absenzen">
            <header className={styles.abschnittKopf}>
              <h2>Kommende</h2>
              <span className={styles.tagMeta}>{kommende.length}</span>
            </header>
            {kommende.length === 0 && <p className={styles.quelle}>Nichts geplant.</p>}
            <ul className={styles.bord}>{kommende.map(zeile)}</ul>
          </section>
          {vergangene.length > 0 && (
            <section className={styles.abschnitt} aria-label="Vergangene Absenzen">
              <header className={styles.abschnittKopf}>
                <h2>Vergangene</h2>
                <span className={styles.tagMeta}>letzte {vergangene.length}</span>
              </header>
              <ul className={styles.bord}>{vergangene.map(zeile)}</ul>
            </section>
          )}
        </div>
      </div>

      <AbsenzDialog
        open={dialogOffen || bearbeiten !== null}
        personen={personen}
        vorgabe={{ mitarbeiterId: mitarbeiter.id }}
        absenz={bearbeiten}
        rechte={rechte}
        mandant={mandant}
        absenzen={state.stammdaten.absenzen}
        heute={heute}
        onClose={() => {
          setDialogOffen(false);
          setBearbeiten(null);
        }}
        onSpeichern={(entwurf, bestehend) => {
          if (bestehend) aktionen.absenzAendern({ ...bestehend, ...entwurf });
          else aktionen.absenzBeantragen(entwurf);
        }}
      />
      <ConfirmDialog
        open={loeschen !== null}
        titel="Antrag zurückziehen?"
        text={loeschen ? `${ABSENZ_LABEL[loeschen.art]} ${formatDatumKurz(loeschen.von)} – ${formatDatumKurz(loeschen.bis)} wird gelöscht.` : ''}
        bestaetigen="Zurückziehen"
        gefaehrlich
        onConfirm={() => {
          if (loeschen) aktionen.absenzLoeschen(loeschen.id);
          setLoeschen(null);
        }}
        onClose={() => setLoeschen(null)}
      />
    </div>
  );
}

/* ◆ jh · eof */
