/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/bilder/BilderPage.tsx                      │
   │  ◆ JH · 2026.10 · rev 04                                               │
   │  Modul Bilder: Fotos nach Tag, Filterleiste, Lightbox mit Verweisen    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useMemo, useState } from 'react';
import { Images } from 'lucide-react';
import { useArbeitstag } from '../../core/arbeitstag';
import { FOTO_MOTIV_LABEL } from '../../core/domain/auftrag';
import type { FotoMotiv } from '../../core/domain/auftrag';
import { KATEGORIEN, KATEGORIE_LABEL } from '../../core/domain/kategorie';
import type { Kategorie } from '../../core/domain/kategorie';
import { KENNUNG_LABEL, MARKEN, fullName } from '../../core/domain/stammdaten';
import type { Marke } from '../../core/domain/stammdaten';
import { formatDatum, formatWochentag, formatZeitpunktKurz } from '../../core/format';
import { useRegisterKommandos } from '../../core/kommando';
import type { Kommando } from '../../core/kommando';
import { AppShell } from '../../core/layout/AppShell';
import { findModul } from '../../core/modules.config';
import { Auswahl } from '../../core/ui/Form';
import { FotoKachel } from '../../core/ui/FotoKachel';
import { FotoLightbox } from '../../core/ui/FotoLightbox';
import { Kacheln } from '../../core/ui/Kacheln';
import type { Kachel } from '../../core/ui/Kacheln';
import { Leer } from '../../core/ui/Leer';
import { ModulSeite, ModulWerkzeuge } from '../../core/ui/ModulSeite';
import { Suchfeld } from '../../core/ui/Suchfeld';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '../../mock';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { useDemoReset } from '../dispo/store/useDemoReset';
import { buildAuftragViews } from '../auftraege/auftraege.model';
import { useGlobaleSuchquellen } from '../suche/globaleSuche';
import { LEERER_BILDER_FILTER, ZEITRAUM_OPTIONEN, buildBildViews, filterBilder, gruppiereNachTag, zaehleBilder } from './bilder.model';
import type { BildView, BilderFilter, BilderZeitraum } from './bilder.model';
import styles from './BilderPage.module.css';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Sichten ─────────────────────────────────────────────────

type Sicht = 'alle' | 'heute' | 'woche' | 'garantie' | 'typenschild';

const MOTIVE: readonly FotoMotiv[] = ['typenschild', 'schaden', 'anschluss', 'einbau', 'uebersicht'];

function sichtAus(filter: BilderFilter): Sicht {
  if (filter.zeitraum === 'heute' && filter.kategorie === 'alle' && filter.motiv === 'alle') return 'heute';
  if (filter.zeitraum === 'woche' && filter.kategorie === 'alle' && filter.motiv === 'alle') return 'woche';
  if (filter.kategorie === 'garantie' && filter.zeitraum === 'alle' && filter.motiv === 'alle') return 'garantie';
  if (filter.motiv === 'typenschild' && filter.zeitraum === 'alle' && filter.kategorie === 'alle') return 'typenschild';
  return 'alle';
}

function filterAus(sicht: Sicht, bisher: BilderFilter): BilderFilter {
  const basis: BilderFilter = { ...LEERER_BILDER_FILTER, suche: bisher.suche, technikerKuerzel: bisher.technikerKuerzel, marke: bisher.marke };
  switch (sicht) {
    case 'alle':
      return basis;
    case 'heute':
      return { ...basis, zeitraum: 'heute' };
    case 'woche':
      return { ...basis, zeitraum: 'woche' };
    case 'garantie':
      return { ...basis, kategorie: 'garantie' };
    case 'typenschild':
      return { ...basis, motiv: 'typenschild' };
  }
}

// ── §2 · Seite ───────────────────────────────────────────────────

export function BilderPage() {
  const { heute } = useArbeitstag();
  const state = useDispoState();
  const { stammdaten, einsaetze, pendenzen, rapporte } = state;
  const [filter, setFilter] = useState<BilderFilter>(LEERER_BILDER_FILTER);
  const [offen, setOffen] = useState<number | null>(null);

  const auftragViews = useMemo(() => buildAuftragViews(stammdaten, einsaetze, pendenzen, rapporte, heute), [stammdaten, einsaetze, pendenzen, rapporte, heute]);
  const views = useMemo(() => buildBildViews(auftragViews, rapporte), [auftragViews, rapporte]);
  const zaehler = useMemo(() => zaehleBilder(views, heute), [views, heute]);
  const sichtbar = useMemo(() => filterBilder(views, filter, heute), [views, filter, heute]);
  const tage = useMemo(() => gruppiereNachTag(sichtbar), [sichtbar]);
  const technikerKuerzel = useMemo(() => stammdaten.techniker.map((person) => ({ kuerzel: person.kuerzel, name: fullName(person) })), [stammdaten.techniker]);
  const technikerByKuerzel = useMemo(() => new Map(stammdaten.techniker.map((person) => [person.kuerzel, person])), [stammdaten.techniker]);

  useGlobaleSuchquellen();

  const sicht = sichtAus(filter);
  const kacheln: Kachel[] = [
    { id: 'alle', label: 'Alle Bilder', zahl: zaehler.alle },
    { id: 'heute', label: 'Heute', zahl: zaehler.heute, ton: zaehler.heute > 0 ? 'ok' : 'mute' },
    { id: 'woche', label: 'Diese Woche', zahl: zaehler.woche },
    { id: 'garantie', label: 'Garantiefälle', zahl: zaehler.garantie },
    { id: 'typenschild', label: 'Typenschilder', zahl: zaehler.typenschild },
  ];

  const demoReset = useDemoReset();
  const kommandos = useMemo<Kommando[]>(
    () => [demoReset.kommando, ...kacheln.map<Kommando>((kachel) => ({ id: `bilder:${kachel.id}`, label: `Bilder: ${kachel.label}`, gruppe: 'ansicht', icon: Images, run: () => setFilter((aktuell) => filterAus(kachel.id as Sicht, aktuell)) }))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demoReset.kommando],
  );
  useRegisterKommandos('bilder', kommandos);

  const setzeFilter = (teil: Partial<BilderFilter>) => setFilter((aktuell) => ({ ...aktuell, ...teil }));
  const indexVon = (view: BildView) => sichtbar.findIndex((kandidat) => kandidat.foto.id === view.foto.id);

  return (
    <AppShell modul={findModul('bilder')} menueEintraege={demoReset.menueEintraege}>
      {demoReset.dialog}
      <ModulSeite
        label="Bilder"
        detailOffen={false}
        detail={null}
        liste={
          <>
            <Kacheln kacheln={kacheln} aktiv={sicht} onWahl={(id) => setFilter((aktuell) => filterAus(id as Sicht, aktuell))} label="Sicht" />
            <ModulWerkzeuge anzahl={`${sichtbar.length} von ${views.length}`}>
              <Suchfeld wert={filter.suche} onChange={(suche) => setzeFilter({ suche })} placeholder="Auftrag, Kunde, Gerät, Techniker …" label="Bilder durchsuchen" />
              <Auswahl value={filter.motiv} aria-label="Motiv" onChange={(event) => setzeFilter({ motiv: event.target.value as FotoMotiv | 'alle' })}>
                <option value="alle">Alle Motive</option>
                {MOTIVE.map((motiv) => (
                  <option key={motiv} value={motiv}>
                    {FOTO_MOTIV_LABEL[motiv]}
                  </option>
                ))}
              </Auswahl>
              <Auswahl value={filter.technikerKuerzel} aria-label="Techniker" onChange={(event) => setzeFilter({ technikerKuerzel: event.target.value })}>
                <option value="alle">Alle Techniker</option>
                {technikerKuerzel.map((person) => (
                  <option key={person.kuerzel} value={person.kuerzel}>
                    {person.kuerzel} · {person.name}
                  </option>
                ))}
              </Auswahl>
              <Auswahl value={filter.marke} aria-label="Marke" onChange={(event) => setzeFilter({ marke: event.target.value as Marke | 'alle' })}>
                <option value="alle">Alle Marken</option>
                {MARKEN.map((marke) => (
                  <option key={marke} value={marke}>
                    {marke}
                  </option>
                ))}
              </Auswahl>
              <Auswahl value={filter.kategorie} aria-label="Kategorie" onChange={(event) => setzeFilter({ kategorie: event.target.value as Kategorie | 'alle' })}>
                <option value="alle">Alle Kategorien</option>
                {KATEGORIEN.map((meta) => (
                  <option key={meta.id} value={meta.id}>
                    {meta.label}
                  </option>
                ))}
              </Auswahl>
              <Auswahl value={filter.zeitraum} aria-label="Zeitraum" onChange={(event) => setzeFilter({ zeitraum: event.target.value as BilderZeitraum })}>
                {ZEITRAUM_OPTIONEN.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Auswahl>
            </ModulWerkzeuge>
            <div className={styles.galerie}>
              {tage.length === 0 && <Leer icon={Images} titel="Keine Bilder in dieser Sicht" text="Fotos entstehen in der Techniker-App beim Rapport – Typenschild, Schadenbild, Anschluss, Einbau." fuellend />}
              {tage.map((tag) => (
                <section key={tag.datum} className={styles.tag} aria-label={formatDatum(tag.datum)}>
                  <header className={styles.tagKopf}>
                    <span className={styles.tagDatum}>
                      {formatWochentag(tag.datum)} <span className={styles.mono}>{formatDatum(tag.datum)}</span>
                    </span>
                    <span className={styles.tagAnzahl}>
                      {tag.bilder.length} Bild{tag.bilder.length === 1 ? '' : 'er'}
                    </span>
                  </header>
                  <ul className={styles.raster}>
                    {tag.bilder.map((view) => (
                      <li key={view.foto.id}>
                        <button type="button" className={styles.bild} onClick={() => setOffen(indexVon(view))} title={`${FOTO_MOTIV_LABEL[view.foto.motiv]} · ${view.auftrag.auftrag.nummer} · ${view.auftrag.kunde.name}`}>
                          <FotoKachel foto={view.foto} />
                          <span className={styles.bildText}>
                            <span className={styles.bildMotiv}>{FOTO_MOTIV_LABEL[view.foto.motiv]}</span>
                            <span className={styles.bildMeta}>
                              {view.auftrag.auftrag.nummer} · {view.auftrag.kunde.kurzname}
                            </span>
                            <span className={styles.bildMeta}>
                              {view.auftrag.geraet.marke} {view.auftrag.geraet.art} · {formatZeitpunktKurz(view.foto.aufgenommenAm)} · {view.foto.technikerKuerzel}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        }
      />
      <FotoLightbox
        fotos={sichtbar.map((view) => view.foto)}
        offen={offen}
        onWechsel={setOffen}
        onClose={() => setOffen(null)}
        kontext={(foto) => {
          const view = sichtbar.find((kandidat) => kandidat.foto.id === foto.id);
          if (!view) return null;
          const person = technikerByKuerzel.get(foto.technikerKuerzel);
          return (
            <>
              <Verweis zu={ZIEL.auftrag(view.auftrag.auftrag.id)} label="Auftrag" wert={view.auftrag.auftrag.nummer} text={view.auftrag.auftrag.fehlerbild} />
              <Verweis zu={ZIEL.kunde(view.auftrag.kunde.id)} label="Kunde" wert={view.auftrag.kunde.nummer} text={view.auftrag.kunde.name} />
              <Verweis zu={ZIEL.geraet(view.auftrag.geraet.id)} label={KENNUNG_LABEL[view.auftrag.geraet.marke]} wert={view.auftrag.geraet.seriennummer} text={`${view.auftrag.geraet.marke} ${view.auftrag.geraet.modell}`} />
              {view.rapport && <Verweis zu={ZIEL.rapport(view.rapport.id)} label="Rapport" wert={view.rapport.nummer} />}
              <span>
                {KATEGORIE_LABEL[view.auftrag.auftrag.kategorie]} · {person ? fullName(person) : foto.technikerKuerzel}
              </span>
            </>
          );
        }}
      />
    </AppShell>
  );
}

/* ◆ jh · eof */
