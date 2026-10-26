/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/KameraSeite.tsx                         │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Kamera: Foto zum Einsatz mit Motiv, Typenschild lesen, Akte-Fotos     │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, Check, ScanText, X } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { nowZeitpunkt } from '@sl/core/datum';
import { FOTO_MOTIV_LABEL } from '@sl/core/domain/auftrag';
import type { FotoMotiv } from '@sl/core/domain/auftrag';
import { formatZeit } from '@sl/core/format';
import { Button } from '@sl/core/ui/Button';
import { CapsLabel } from '@sl/core/ui/CapsLabel';
import { Auswahl, Feld } from '@sl/core/ui/Form';
import { cx } from '@sl/core/ui/cx';
import { aktiverEinsatz, sortiert, tagesZeileFuer } from '@sl/modules/app/app.model';
import { AkteFotos } from '@sl/modules/dispo/akte/AkteFotos';
import { geraetUnvollstaendig, neuesFoto, typenschildVorschlag } from '@sl/modules/rapport/rapport.model';
import type { GeraeteVorschlag } from '@sl/modules/rapport/rapport.model';
import styles from '../bausteine/Seiten.module.css';
import { useApp } from '../rahmen/AppKontext';
import werkzeuge from './Werkzeuge.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

interface Aufnahme {
  id: string;
  url: string;
  motiv: FotoMotiv;
}

const MOTIVE = Object.keys(FOTO_MOTIV_LABEL) as FotoMotiv[];

function istMotiv(wert: string | null): wert is FotoMotiv {
  return wert !== null && MOTIVE.includes(wert as FotoMotiv);
}

// jh› Fotos gehören zum Einsatz, nicht in die Galerie des Handys: Einsatz wählen, Motiv antippen,
//     auslösen, speichern – der Leitstand sieht sie in Akte, Gerät und Modul Bilder. Das Bild selbst
//     bleibt im Fenster (To-do 012 im Leitstand), gespeichert wird der Foto-Datensatz.
export function KameraSeite() {
  const { techniker, heute, jetztMin, state, aktionen, kuerzel } = useApp();
  const [params] = useSearchParams();
  const technikerId = techniker?.id ?? null;
  const eingabeRef = useRef<HTMLInputElement>(null);

  const views = useMemo(() => {
    const zeile = technikerId ? tagesZeileFuer(state.stammdaten, state.einsaetze, technikerId, heute, jetztMin) : null;
    return zeile ? sortiert(zeile.einsaetze) : [];
  }, [state.stammdaten, state.einsaetze, technikerId, heute, jetztMin]);
  const vorgabeEinsatz = params.get('einsatz');
  const [einsatzId, setEinsatzId] = useState<string>(() => vorgabeEinsatz ?? aktiverEinsatz(views)?.einsatz.id ?? views[0]?.einsatz.id ?? '');
  const [motiv, setMotiv] = useState<FotoMotiv>(() => (istMotiv(params.get('motiv')) ? (params.get('motiv') as FotoMotiv) : 'schaden'));
  const [aufnahmen, setAufnahmen] = useState<Aufnahme[]>([]);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [vorschlag, setVorschlag] = useState<GeraeteVorschlag | null>(null);

  useEffect(() => {
    if (!einsatzId && views[0]) setEinsatzId(aktiverEinsatz(views)?.einsatz.id ?? views[0].einsatz.id);
  }, [views, einsatzId]);

  useEffect(() => () => aufnahmen.forEach((aufnahme) => URL.revokeObjectURL(aufnahme.url)), [aufnahmen]);

  const view = views.find((kandidat) => kandidat.einsatz.id === einsatzId) ?? null;

  const aufDatei = (event: ChangeEvent<HTMLInputElement>) => {
    const dateien = Array.from(event.target.files ?? []);
    if (dateien.length === 0) return;
    setAufnahmen((alt) => [...alt, ...dateien.map((datei, index) => ({ id: `${Date.now()}-${index}`, url: URL.createObjectURL(datei), motiv }))]);
    setMeldung(null);
    event.target.value = '';
  };

  const entfernen = (id: string) => {
    setAufnahmen((alt) => {
      const weg = alt.find((aufnahme) => aufnahme.id === id);
      if (weg) URL.revokeObjectURL(weg.url);
      return alt.filter((aufnahme) => aufnahme.id !== id);
    });
  };

  const speichern = () => {
    if (!view || aufnahmen.length === 0) return;
    const jetzt = nowZeitpunkt();
    const neue = aufnahmen.map((aufnahme) => neuesFoto(view.einsatz.id, aufnahme.motiv, kuerzel, jetzt));
    aktionen.updateAuftrag({ ...view.auftrag, fotos: [...view.auftrag.fotos, ...neue] });
    aufnahmen.forEach((aufnahme) => URL.revokeObjectURL(aufnahme.url));
    setAufnahmen([]);
    setMeldung(`${neue.length} ${neue.length === 1 ? 'Foto' : 'Fotos'} zu ${view.auftrag.nummer} gespeichert · ${formatZeit(jetztMin)}`);
  };

  const typenschildLesen = () => {
    if (!view) return;
    setVorschlag(typenschildVorschlag(view.geraet));
  };

  const uebernehmen = () => {
    if (!view || !vorschlag) return;
    aktionen.updateGeraet({ ...view.geraet, ...vorschlag }, 'Typenschild erkannt (App)');
    setVorschlag(null);
    setMeldung('Gerätedaten übernommen – Gerät und Akte im Leitstand sind nachgetragen.');
  };

  if (!techniker) return <p className={styles.leer}>Kein Techniker verknüpft – Fotos gehören zu Einsätzen eines Technikers.</p>;

  return (
    <div className={styles.seite}>
      <header className={styles.seitentitel}>
        <h1>Kamera</h1>
        <span>Fotos zum Einsatz</span>
      </header>

      <div className={styles.zweispaltig}>
        <div className={styles.spalte}>
          <section className={styles.abschnitt}>
            <Feld
              label="Einsatz"
              render={(id) => (
                <Auswahl id={id} value={einsatzId} onChange={(event) => setEinsatzId(event.target.value)}>
                  {views.length === 0 && <option value="">Heute kein Einsatz</option>}
                  {views.map((kandidat) => (
                    <option key={kandidat.einsatz.id} value={kandidat.einsatz.id}>
                      {formatZeit(kandidat.einsatz.startMin)} · {kandidat.kunde.kurzname} · {kandidat.geraet.marke} {kandidat.geraet.art}
                    </option>
                  ))}
                </Auswahl>
              )}
            />
            <CapsLabel as="h3">Motiv</CapsLabel>
            <div className={werkzeuge.motive} role="radiogroup" aria-label="Motiv">
              {MOTIVE.map((kandidat) => (
                <button key={kandidat} type="button" role="radio" aria-checked={motiv === kandidat} className={cx(werkzeuge.motiv, motiv === kandidat && werkzeuge.motivAktiv)} onClick={() => setMotiv(kandidat)}>
                  {FOTO_MOTIV_LABEL[kandidat]}
                </button>
              ))}
            </div>
            <label className={werkzeuge.ausloeser}>
              <Camera size={24} strokeWidth={1.5} aria-hidden /> Foto aufnehmen
              <input ref={eingabeRef} type="file" accept="image/*" capture="environment" multiple disabled={!view} onChange={aufDatei} />
            </label>
            {motiv === 'typenschild' && view && (
              <div className={styles.aktionen}>
                <Button variant="secondary" size="md" icon={ScanText} onClick={typenschildLesen}>
                  Typenschild lesen{geraetUnvollstaendig(view.geraet) ? ' – Gerät unvollständig' : ''}
                </Button>
              </div>
            )}
            {vorschlag && view && (
              <div className={werkzeuge.vorschlag}>
                <strong>Erkannt (Mock-OCR)</strong>
                <dl>
                  {Object.entries(vorschlag).map(([schluessel, wert]) => (
                    <div key={schluessel} style={{ display: 'contents' }}>
                      <dt>{schluessel}</dt>
                      <dd>{String(wert)}</dd>
                    </div>
                  ))}
                </dl>
                <div className={styles.aktionen}>
                  <Button variant="primary" size="sm" icon={Check} onClick={uebernehmen}>
                    Übernehmen
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setVorschlag(null)}>
                    Verwerfen
                  </Button>
                </div>
              </div>
            )}
          </section>

          {aufnahmen.length > 0 && (
            <section className={styles.abschnitt}>
              <div className={styles.abschnittKopf}>
                <CapsLabel as="h3">Neue Aufnahmen · {aufnahmen.length}</CapsLabel>
                <Button variant="primary" size="sm" icon={Check} disabled={!view} onClick={speichern}>
                  Speichern
                </Button>
              </div>
              <ul className={werkzeuge.aufnahmen}>
                {aufnahmen.map((aufnahme) => (
                  <li key={aufnahme.id} className={werkzeuge.aufnahme}>
                    <img src={aufnahme.url} alt={FOTO_MOTIV_LABEL[aufnahme.motiv]} />
                    <span className={werkzeuge.aufnahmeMotiv}>{FOTO_MOTIV_LABEL[aufnahme.motiv]}</span>
                    <button type="button" className={werkzeuge.aufnahmeWeg} aria-label="Aufnahme verwerfen" onClick={() => entfernen(aufnahme.id)}>
                      <X size={16} strokeWidth={1.5} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {meldung && (
            <p className={styles.bestaetigung} role="status">
              <Check size={16} strokeWidth={1.5} aria-hidden /> {meldung}
            </p>
          )}
        </div>

        <div className={styles.spalte}>
          {view && (
            <section className={styles.abschnitt}>
              <CapsLabel as="h3">
                Fotos zu {view.auftrag.nummer} · {view.kunde.kurzname}
              </CapsLabel>
              <AkteFotos fotos={view.auftrag.fotos} />
            </section>
          )}
          {!view && views.length === 0 && <p className={styles.leer}>Heute kein Einsatz – Fotos lassen sich nur zu Einsätzen ablegen.</p>}
        </div>
      </div>
    </div>
  );
}

/* ◆ jh · eof */
