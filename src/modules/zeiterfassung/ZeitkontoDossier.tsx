/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/zeiterfassung/ZeitkontoDossier.tsx         │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Zeitkonto: Stempeluhr, Saldo, Tage, Korrekturen, Monatsabschluss      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarPlus, Check, Download, Pencil, Send, Trash2, Undo2 } from 'lucide-react';
import { ladeHerunter } from '../../core/datei';
import type { IsoDatum, Minuten } from '../../core/datum';
import { ABSENZ_LABEL } from '../../core/domain/absenz';
import { FUNKTION_LABEL, mitarbeiterName } from '../../core/domain/personal';
import { ABSCHLUSS_STATUS_LABEL, ZEIT_QUELLE_LABEL, ZEIT_WARNUNG_LABEL, eintraegeAusEinsatzplan, istAktiv } from '../../core/domain/zeit';
import type { ZeitEintrag } from '../../core/domain/zeit';
import { formatDatum, formatDatumKurz, formatDauer, formatSaldo, formatWochentag, formatZeit, formatZeitpunktKurz } from '../../core/format';
import { Button, IconButton } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { DossierAbschnitt, DossierKopf, Fakten } from '../../core/ui/ModulSeite';
import { Tabelle } from '../../core/ui/Tabelle';
import type { Spalte } from '../../core/ui/Tabelle';
import { Typenschild } from '../../core/ui/Typenschild';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import { cx } from '../../core/ui/cx';
import type { DispoAktionen } from '../dispo/store/useDispoAktionen';
import { PersonAvatar } from '../personal/PersonAvatar';
import { exportName, zeitkontoCsv } from '../personal/personal.model';
import type { TagMitPlan } from '../personal/personal.model';
import type { Rechte } from '../personal/rechte';
import { StempeluhrGross } from '../personal/Stempeluhr';
import personal from '../personal/Personal.module.css';
import { AbschlussDialog, EintragDialog, GrundDialog, KorrekturDialog } from './ZeitDialoge';
import { kannEinreichen, monatLabel, monatsabschlussEntwurf } from './zeiterfassung.model';
import type { ZeitZeile } from './zeiterfassung.model';
import styles from './Zeiterfassung.module.css';

// ── §1 · Spalten ─────────────────────────────────────────────────

const ABSCHLUSS_TON = { eingereicht: 'signal', genehmigt: 'ok', zurueckgewiesen: 'danger' } as const;

function saldoKlasse(minuten: Minuten): string | undefined {
  if (minuten > 0) return personal.plus;
  if (minuten < 0) return personal.minus;
  return undefined;
}

function warnungKurz(warnung: TagMitPlan['warnungen'][number]): string {
  if (warnung === 'ohne-stempel') return 'keine Zeiten';
  if (warnung === 'offen') return 'nicht ausgestempelt';
  if (warnung === 'pause-fehlt' || warnung === 'pause-zu-kurz') return 'Pause';
  return ZEIT_WARNUNG_LABEL[warnung];
}

const TAG_SPALTEN: readonly Spalte<TagMitPlan>[] = [
  {
    id: 'tag',
    label: 'Tag',
    render: (tag) => (
      <span className={cx(styles.tagZelle, (tag.grund === 'wochenende' || tag.grund === 'feiertag') && styles.tagFrei)}>
        <span className={personal.mono}>
          {formatWochentag(tag.datum, 'kurz')} {formatDatumKurz(tag.datum)}
        </span>
        {tag.feiertag && <span className={styles.tagMeta}>{tag.feiertag.label}</span>}
        {tag.absenz && <span className={styles.tagMeta}>{ABSENZ_LABEL[tag.absenz.art]}</span>}
      </span>
    ),
    sortWert: (tag) => tag.datum,
    breite: '150px',
  },
  { id: 'kommen', label: 'Kommen', render: (tag) => (tag.kommenMin === null ? <span className={personal.leerWert}>–</span> : formatZeit(tag.kommenMin)), mono: true },
  { id: 'pause', label: 'Pause', render: (tag) => (tag.pauseMin > 0 ? formatDauer(tag.pauseMin) : <span className={personal.leerWert}>–</span>), mono: true, nebensaechlich: true },
  { id: 'gehen', label: 'Gehen', render: (tag) => (tag.laeuft ? <Chip tone="ok">läuft</Chip> : tag.gehenMin === null ? <span className={personal.leerWert}>–</span> : formatZeit(tag.gehenMin)), mono: true },
  { id: 'ist', label: 'Ist', render: (tag) => (tag.arbeitMin > 0 ? formatDauer(tag.arbeitMin) : <span className={personal.leerWert}>–</span>), sortWert: (tag) => tag.arbeitMin, align: 'right', mono: true },
  { id: 'soll', label: 'Soll', render: (tag) => (tag.zukunft ? <span className={personal.leerWert}>–</span> : formatDauer(tag.sollMin)), align: 'right', mono: true, nebensaechlich: true },
  { id: 'saldo', label: 'Saldo', render: (tag) => (tag.zukunft ? <span className={personal.leerWert}>–</span> : <span className={saldoKlasse(tag.saldoMin)}>{formatSaldo(tag.saldoMin)}</span>), sortWert: (tag) => tag.saldoMin, align: 'right', mono: true },
  {
    id: 'plan',
    label: 'Einsatzplan',
    render: (tag) => (tag.plan ? `${formatDauer(tag.plan.fahrtMin)} Fahrt · ${formatDauer(tag.plan.arbeitMin)} Einsatz` : <span className={personal.leerWert}>–</span>),
    nebensaechlich: true,
  },
  {
    id: 'status',
    label: 'Hinweise',
    render: (tag) => (
      <span className={styles.chips}>
        {tag.manuell && <Chip tone="neutral">manuell</Chip>}
        {tag.warnungen.map((warnung) => (
          <Chip key={warnung} tone={warnung === 'ohne-stempel' ? 'mute' : 'danger'} icon={AlertTriangle} title={ZEIT_WARNUNG_LABEL[warnung]}>
            {warnungKurz(warnung)}
          </Chip>
        ))}
      </span>
    ),
  },
];

// ── §2 · Dossier ─────────────────────────────────────────────────

interface ZeitkontoDossierProps {
  zeile: ZeitZeile;
  eigene: boolean;
  rechte: Rechte;
  aktionen: DispoAktionen;
  alleEintraege: readonly ZeitEintrag[];
  heute: IsoDatum;
  jetztMin: Minuten;
  /** Tag, der beim Öffnen aufgeklappt ist – z. B. aus einem Chip der Wochenübersicht. */
  startTag?: IsoDatum | null;
}

const protokolliert = new Set<string>();

export function ZeitkontoDossier({ zeile, eigene, rechte, aktionen, alleEintraege, heute, jetztMin, startTag = null }: ZeitkontoDossierProps) {
  const { konto, person } = zeile;
  const { mitarbeiter } = person;
  const [gewaehlt, setGewaehlt] = useState<IsoDatum | null>(startTag);
  useEffect(() => {
    if (startTag) setGewaehlt(startTag);
  }, [startTag]);
  const [eintragOffen, setEintragOffen] = useState(false);
  const [korrektur, setKorrektur] = useState<ZeitEintrag | null>(null);
  const [loeschen, setLoeschen] = useState<ZeitEintrag | null>(null);
  const [abschlussOffen, setAbschlussOffen] = useState(false);
  const [zurueckweisen, setZurueckweisen] = useState(false);

  // jh› Einsicht in fremde Personendaten wird protokolliert (DSV Art. 4) – einmal je Person und Monat pro Sitzung.
  useEffect(() => {
    if (eigene) return;
    const schluessel = `${rechte.benutzer?.id ?? '?'}:${mitarbeiter.id}:${konto.monat}`;
    if (protokolliert.has(schluessel)) return;
    protokolliert.add(schluessel);
    aktionen.einsichtProtokollieren('zeit', mitarbeiter.id, `Zeitkonto ${mitarbeiterName(mitarbeiter)} angesehen (${monatLabel(konto.monat)})`);
  }, [eigene, mitarbeiter, konto.monat, aktionen, rechte.benutzer?.id]);

  const darfKorrigieren = !konto.gesperrt && rechte.hat('zeit:korrigieren') && (eigene || rechte.darfPerson('zeit', mitarbeiter.id));
  const darfErfassen = !konto.gesperrt && ((eigene && rechte.hat('zeit:erfassen')) || darfKorrigieren);
  const darfGenehmigen = !eigene && rechte.hat('zeit:genehmigen') && rechte.darfPerson('zeit', mitarbeiter.id);
  const darfExport = rechte.hat('zeit:exportieren') || (eigene && rechte.hat('datenschutz:exportieren'));
  const tag = useMemo(() => konto.tage.find((kandidat) => kandidat.datum === gewaehlt) ?? null, [konto.tage, gewaehlt]);
  const tagEintraege = useMemo(
    () => (tag ? alleEintraege.filter((eintrag) => eintrag.mitarbeiterId === mitarbeiter.id && eintrag.datum === tag.datum).sort((a, b) => a.vonMin - b.vonMin) : []),
    [alleEintraege, mitarbeiter.id, tag],
  );

  const exportieren = () => {
    ladeHerunter(exportName('zeitkonto', [mitarbeiter.kuerzel, konto.monat], 'csv'), zeitkontoCsv(konto), 'text/csv');
    aktionen.protokolliere({ bereich: 'zeit', art: 'export', text: `Zeitkonto ${mitarbeiterName(mitarbeiter)} ${monatLabel(konto.monat)} als CSV exportiert`, mitarbeiterId: mitarbeiter.id });
  };

  const ausPlanUebernehmen = (ziel: TagMitPlan) => {
    if (!ziel.plan) return;
    const vorschlag = eintraegeAusEinsatzplan(ziel.plan, { mitarbeiterId: mitarbeiter.id, datum: ziel.datum, erfasstAm: `${ziel.datum}T00:00`, erfasstVon: '', neueId: () => '' });
    aktionen.zeitEintraegeAnlegen(vorschlag.map((eintrag) => ({ mitarbeiterId: mitarbeiter.id, datum: ziel.datum, art: eintrag.art, vonMin: eintrag.vonMin, bisMin: eintrag.bisMin, quelle: 'einsatz' as const })));
  };

  const abschluss = konto.abschluss;

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
        untertitel={`${FUNKTION_LABEL[mitarbeiter.funktion]} · ${mitarbeiter.pensum} % · seit ${formatDatum(mitarbeiter.eintritt)}${mitarbeiter.austritt ? ` · Austritt ${formatDatum(mitarbeiter.austritt)}` : ''}`}
        chips={
          <>
            {zeile.lage.status !== 'draussen' && <Chip tone={zeile.lage.status === 'pause' ? 'neutral' : 'ok'}>{zeile.lage.status === 'pause' ? 'In der Pause' : 'Eingestempelt'}</Chip>}
            {abschluss && <Chip tone={ABSCHLUSS_TON[abschluss.status]}>{ABSCHLUSS_STATUS_LABEL[abschluss.status]}</Chip>}
            {konto.periode.tageMitWarnung > 0 && (
              <Chip tone="danger" icon={AlertTriangle}>
                {konto.periode.tageMitWarnung} Tage mit Warnung
              </Chip>
            )}
            {konto.periode.tageZuPruefen > 0 && <Chip tone="neutral">{konto.periode.tageZuPruefen} zu prüfen</Chip>}
          </>
        }
        aktionen={
          <>
            {darfExport && <IconButton icon={Download} label="Zeitkonto als CSV" size="sm" onClick={exportieren} />}
            {darfErfassen && (
              <Button variant="secondary" size="sm" icon={CalendarPlus} onClick={() => setEintragOffen(true)}>
                Eintrag
              </Button>
            )}
          </>
        }
      />

      {eigene && (
        <DossierAbschnitt titel="Stempeluhr">
          <StempeluhrGross geraet="leitstand" onNachtragen={darfErfassen ? () => setEintragOffen(true) : undefined} />
        </DossierAbschnitt>
      )}

      <DossierAbschnitt titel={monatLabel(konto.monat)} zusatz={<span className={styles.abschnittZusatz}>bis heute · Soll Monat {formatDauer(konto.sollGesamtMin)}</span>}>
        <Fakten
          eintraege={[
            { label: 'Soll', wert: formatDauer(konto.periode.sollMin), mono: true },
            { label: 'Ist', wert: formatDauer(konto.periode.arbeitMin), mono: true },
            { label: 'Saldo Monat', wert: <span className={saldoKlasse(konto.periode.saldoMin)}>{formatSaldo(konto.periode.saldoMin)}</span>, mono: true },
            { label: 'Saldo kumuliert', wert: <span className={saldoKlasse(konto.saldoKumuliertMin)}>{formatSaldo(konto.saldoKumuliertMin)}</span>, mono: true },
            { label: 'Pausen', wert: formatDauer(konto.periode.pauseMin), mono: true },
            { label: 'Arbeitstage', wert: String(konto.periode.arbeitstage), mono: true },
          ]}
        />
        {konto.ruhezeit.length > 0 && (
          <p className={personal.warnung}>
            <AlertTriangle size={16} strokeWidth={1.5} aria-hidden />
            Ruhezeit unter 11 Stunden (ArG 15a): {konto.ruhezeit.map((eintrag) => `${formatDatumKurz(eintrag.datum)} (${formatDauer(eintrag.ruheMin)})`).join(', ')}
          </p>
        )}
      </DossierAbschnitt>

      <DossierAbschnitt titel="Monatsabschluss">
        {abschluss ? (
          <Fakten
            eintraege={[
              { label: 'Status', wert: <Chip tone={ABSCHLUSS_TON[abschluss.status]}>{ABSCHLUSS_STATUS_LABEL[abschluss.status]}</Chip> },
              { label: 'Eingereicht', wert: `${formatZeitpunktKurz(abschluss.eingereichtAm)} · ${abschluss.eingereichtVon}`, mono: true },
              ...(abschluss.entschiedenAm ? [{ label: abschluss.status === 'genehmigt' ? 'Genehmigt' : 'Entschieden', wert: `${formatZeitpunktKurz(abschluss.entschiedenAm)} · ${abschluss.entschiedenVon ?? ''}`, mono: true }] : []),
              { label: 'Saldo per Abschluss', wert: formatSaldo(abschluss.saldoKumuliertMin), mono: true },
              ...(abschluss.bemerkung ? [{ label: 'Bemerkung', wert: abschluss.bemerkung, breit: true }] : []),
            ]}
          />
        ) : (
          <p className={styles.abschnittText}>{kannEinreichen(konto, heute) ? 'Noch nicht eingereicht.' : 'Der Monat hat noch nicht begonnen.'}</p>
        )}
        <div className={personal.aktionen}>
          {kannEinreichen(konto, heute) && (eigene || darfKorrigieren) && (
            <Button variant="primary" size="sm" icon={Send} onClick={() => setAbschlussOffen(true)}>
              {abschluss?.status === 'zurueckgewiesen' ? 'Erneut einreichen' : 'Monat einreichen'}
            </Button>
          )}
          {abschluss?.status === 'eingereicht' && darfGenehmigen && (
            <>
              <Button variant="primary" size="sm" icon={Check} onClick={() => aktionen.monatEntscheiden(abschluss.id, 'genehmigt')}>
                Genehmigen
              </Button>
              <Button variant="secondary" size="sm" icon={Undo2} onClick={() => setZurueckweisen(true)}>
                Zurückweisen
              </Button>
            </>
          )}
          {abschluss?.status === 'eingereicht' && eigene && <span className={personal.fussnote}>Vier-Augen-Prinzip: Den eigenen Monat genehmigen die Vorgesetzten.</span>}
        </div>
      </DossierAbschnitt>

      <DossierAbschnitt titel="Tage" zusatz={<span className={styles.abschnittZusatz}>Zeile anklicken für Einträge und Korrekturen</span>}>
        <Tabelle
          spalten={TAG_SPALTEN}
          zeilen={konto.tage}
          zeilenId={(eintrag) => eintrag.datum}
          label="Tage"
          aktivId={gewaehlt}
          onZeile={(eintrag) => setGewaehlt(eintrag.datum === gewaehlt ? null : eintrag.datum)}
          dicht
          zeilenKlasse={(eintrag) => (eintrag.zukunft ? styles.zukunft : undefined)}
        />
      </DossierAbschnitt>

      {tag && (
        <DossierAbschnitt
          titel={`${formatWochentag(tag.datum)}, ${formatDatum(tag.datum)}`}
          zusatz={
            tag.plan && (
              <span className={styles.abschnittZusatz}>
                Einsatzplan: {formatDauer(tag.plan.fahrtMin)} Fahrt · {formatDauer(tag.plan.arbeitMin)} Einsatz · {tag.plan.einsaetze} Einsätze
              </span>
            )
          }
        >
          {tagEintraege.length === 0 && <p className={styles.abschnittText}>Keine Einträge an diesem Tag.</p>}
          <ul className={personal.liste}>
            {tagEintraege.map((eintrag) => (
              <li key={eintrag.id} className={cx(personal.listenZeile, !istAktiv(eintrag) && styles.geloescht)}>
                <span className={personal.mono}>
                  {formatZeit(eintrag.vonMin)}–{eintrag.bisMin === null ? 'läuft' : formatZeit(eintrag.bisMin)}
                </span>
                <span className={personal.listenText}>
                  <span className={personal.listenHaupt}>{eintrag.art === 'arbeit' ? 'Arbeit' : 'Pause'}</span> · {ZEIT_QUELLE_LABEL[eintrag.quelle]}
                  {eintrag.geraet && ` (${eintrag.geraet === 'app' ? 'App' : 'Leitstand'})`}
                  {eintrag.bemerkung && ` · ${eintrag.bemerkung}`}
                  {eintrag.korrekturen.length > 0 && ` · ${eintrag.korrekturen.length}× korrigiert`}
                  {eintrag.geloescht && ` · gelöscht (${eintrag.geloescht.grund})`}
                </span>
                <span className={styles.zeilenAktionen}>
                  {darfKorrigieren && istAktiv(eintrag) && <IconButton icon={Pencil} label="Korrigieren" size="sm" onClick={() => setKorrektur(eintrag)} />}
                  {darfKorrigieren && istAktiv(eintrag) && <IconButton icon={Trash2} label="Löschen" size="sm" tone="danger" onClick={() => setLoeschen(eintrag)} />}
                </span>
              </li>
            ))}
          </ul>
          {tagEintraege.some((eintrag) => eintrag.korrekturen.length > 0) && (
            <ul className={styles.spur}>
              {tagEintraege.flatMap((eintrag) =>
                eintrag.korrekturen.map((korrektur, index) => (
                  <li key={`${eintrag.id}-${index}`}>
                    {formatZeitpunktKurz(korrektur.am)} · {korrektur.von}: {formatZeit(korrektur.vorher.vonMin)}–{korrektur.vorher.bisMin === null ? 'offen' : formatZeit(korrektur.vorher.bisMin)} → {formatZeit(eintrag.vonMin)}–
                    {eintrag.bisMin === null ? 'offen' : formatZeit(eintrag.bisMin)} · {korrektur.grund}
                  </li>
                )),
              )}
            </ul>
          )}
          {tag.warnungen.length > 0 && <p className={styles.abschnittText}>{tag.warnungen.map((warnung) => ZEIT_WARNUNG_LABEL[warnung]).join(' · ')}</p>}
          {tag.plan && tagEintraege.length === 0 && darfErfassen && (
            <div className={personal.aktionen}>
              <Button variant="secondary" size="sm" icon={CalendarPlus} onClick={() => ausPlanUebernehmen(tag)}>
                Aus Einsatzplan übernehmen
              </Button>
            </div>
          )}
          {tag.absenz && (
            <p className={personal.fussnote}>
              Absenz an diesem Tag: <Verweis zu={ZIEL.absenz(tag.absenz.id)} label="Absenz" wert={ABSENZ_LABEL[tag.absenz.art]} />
            </p>
          )}
        </DossierAbschnitt>
      )}

      <EintragDialog open={eintragOffen} mitarbeiter={mitarbeiter} datum={gewaehlt ?? heute} heute={heute} eintraege={alleEintraege} onClose={() => setEintragOffen(false)} onSpeichern={(entwurf) => aktionen.zeitEintraegeAnlegen([entwurf])} />
      <KorrekturDialog open={korrektur !== null} eintrag={korrektur} eintraege={alleEintraege} jetztMin={jetztMin} heute={heute} onClose={() => setKorrektur(null)} onSpeichern={(aenderung, grund) => korrektur && aktionen.zeitEintragKorrigieren(korrektur.id, aenderung, grund)} />
      <GrundDialog open={loeschen !== null} titel="Zeiteintrag löschen?" text="Der Eintrag wird als gelöscht markiert und bleibt mit Grund in der Spur sichtbar." bestaetigen="Löschen" gefaehrlich onClose={() => setLoeschen(null)} onBestaetigen={(grund) => loeschen && aktionen.zeitEintragLoeschen(loeschen.id, grund)} />
      <AbschlussDialog open={abschlussOffen} konto={konto} onClose={() => setAbschlussOffen(false)} onEinreichen={(bemerkung) => aktionen.monatEinreichen(monatsabschlussEntwurf(konto, bemerkung || undefined))} />
      <GrundDialog open={zurueckweisen} titel="Monat zurückweisen" text="Die Person erhält die Bemerkung und kann korrigieren und neu einreichen." bestaetigen="Zurückweisen" onClose={() => setZurueckweisen(false)} onBestaetigen={(grund) => abschluss && aktionen.monatEntscheiden(abschluss.id, 'zurueckgewiesen', grund)} />
    </div>
  );
}

/* ◆ jh · eof */
