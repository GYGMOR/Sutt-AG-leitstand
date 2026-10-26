/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  app/seiten/ScannenSeite.tsx                        │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Scannen: Kamera oder Eingabe → Artikel, Auftrag, Rapport, Gerät       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Camera, ExternalLink, FileText, MinusCircle, PackagePlus, RefreshCw, Search, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router';
import { RAPPORT_LABEL } from '@sl/core/domain/auftrag';
import { fahrzeugOrt } from '@sl/core/domain/lager';
import { formatDatumKurz, formatZeit } from '@sl/core/format';
import { Button } from '@sl/core/ui/Button';
import { CapsLabel } from '@sl/core/ui/CapsLabel';
import { Eingabe, Feld } from '@sl/core/ui/Form';
import { resolveAuftrag } from '@sl/modules/dispo/store/dispo.selectors';
import { Scanner } from '../bausteine/Scanner';
import styles from '../bausteine/Seiten.module.css';
import { interpretiereScan, scanBeispiele } from '../model/scan.model';
import type { ScanErgebnis } from '../model/scan.model';
import { useApp } from '../rahmen/AppKontext';
import werkzeuge from './Werkzeuge.module.css';

// ── §1 · Komponente ──────────────────────────────────────────────

const ART_LABEL: Readonly<Record<ScanErgebnis['art'], string>> = { artikel: 'Artikel', auftrag: 'Auftrag', rapport: 'Servicerapport', geraet: 'Gerät', link: 'Link', unbekannt: 'Kein Treffer' };

export function ScannenSeite() {
  const { techniker, heute, state, aktionen, pfad } = useApp();
  const navigate = useNavigate();
  const technikerId = techniker?.id ?? null;
  const [eingabe, setEingabe] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [verlauf, setVerlauf] = useState<{ code: string; zeitMin: number }[]>([]);
  const [meldung, setMeldung] = useState<string | null>(null);
  const beispiele = useMemo(() => scanBeispiele(state, technikerId, heute), [state, technikerId, heute]);
  // jh› Gemerkt wird nur der Code; die Deutung kommt aus dem aktuellen Stand – nach «Verbrauch melden»
  //     stimmt «An Bord» sofort, auch wenn das Büro inzwischen umgebucht hat.
  const ergebnis: ScanErgebnis | null = useMemo(() => (code === null ? null : interpretiereScan(code, state, technikerId)), [code, state, technikerId]);

  const deuten = useCallback((roh: string) => {
    setCode(roh);
    setMeldung(null);
    setVerlauf((alt) => [{ code: roh.trim(), zeitMin: new Date().getHours() * 60 + new Date().getMinutes() }, ...alt.filter((eintrag) => eintrag.code !== roh.trim())].slice(0, 6));
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (eingabe.trim() !== '') deuten(eingabe);
  };

  const kontext = ergebnis?.art === 'auftrag' && state.stammdaten.auftraege.has(ergebnis.auftrag.id) ? resolveAuftrag(state.stammdaten, ergebnis.auftrag.id) : null;

  return (
    <div className={styles.seite}>
      <header className={styles.seitentitel}>
        <h1>Scannen</h1>
        <span>QR, Barcode, Seriennummer</span>
      </header>

      <div className={styles.zweispaltig}>
        <div className={styles.spalte}>
          <Scanner aktiv={code === null} onErgebnis={deuten} />
          {code !== null && (
            <Button variant="secondary" size="md" icon={RefreshCw} onClick={() => setCode(null)}>
              Nochmals scannen
            </Button>
          )}
          <form className={werkzeuge.eingabeZeile} onSubmit={onSubmit}>
            <Feld label="Code eintippen" render={(id) => <Eingabe id={id} value={eingabe} placeholder="Artikel, Auftrag, Seriennummer …" mono autoCapitalize="characters" spellCheck={false} onChange={(event) => setEingabe(event.target.value)} />} />
            <Button type="submit" variant="primary" size="md" icon={Search}>
              Suchen
            </Button>
          </form>
          {beispiele.length > 0 && (
            <div className={werkzeuge.beispiele} aria-label="Beispiele">
              {beispiele.map((beispiel) => (
                <button key={beispiel.code} type="button" className={werkzeuge.beispiel} onClick={() => deuten(beispiel.code)}>
                  {beispiel.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.spalte}>
          {ergebnis && (
            <section className={werkzeuge.ergebnis} aria-live="polite">
              <span className={werkzeuge.ergebnisArt}>{ART_LABEL[ergebnis.art]}</span>

              {ergebnis.art === 'artikel' && (
                <>
                  <span className={werkzeuge.ergebnisTitel}>{ergebnis.artikel.bezeichnung}</span>
                  <span className={werkzeuge.ergebnisText}>
                    <span className={styles.mono}>{ergebnis.artikel.artikelNummer}</span>
                    {ergebnis.artikel.marke && ` · ${ergebnis.artikel.marke}`}
                    {ergebnis.artikel.passtZu && ` · ${ergebnis.artikel.passtZu}`}
                  </span>
                  <dl className={werkzeuge.zahlen}>
                    <div>
                      <dt>An Bord</dt>
                      <dd>{ergebnis.anBord}</dd>
                    </div>
                    <div>
                      <dt>Glattbrugg</dt>
                      <dd>{ergebnis.glattbrugg}</dd>
                    </div>
                    <div>
                      <dt>Mindest</dt>
                      <dd>{ergebnis.artikel.mindestbestand}</dd>
                    </div>
                  </dl>
                  <div className={styles.aktionen}>
                    {technikerId && ergebnis.anBord > 0 && (
                      <Button
                        variant="primary"
                        size="md"
                        icon={MinusCircle}
                        onClick={() => {
                          aktionen.verbrauchMelden(ergebnis.artikel.artikelNummer, fahrzeugOrt(technikerId), 1, 'Verbrauch gemeldet (Scan in der App)');
                          setMeldung(`1× ${ergebnis.artikel.bezeichnung} vom Fahrzeug abgebucht`);
                        }}
                      >
                        Verbrauch melden (−1)
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="md"
                      icon={PackagePlus}
                      onClick={() => {
                        const bestellung = aktionen.bestellen({ artikelNummer: ergebnis.artikel.artikelNummer, menge: 1 });
                        setMeldung(bestellung ? `Nachschub bestellt: ${bestellung.nummer}, Liefertermin ${formatDatumKurz(bestellung.liefertermin)}` : 'Bestellung nicht möglich');
                      }}
                    >
                      Nachschub anfordern
                    </Button>
                  </div>
                </>
              )}

              {ergebnis.art === 'auftrag' && (
                <>
                  <span className={werkzeuge.ergebnisTitel}>
                    {ergebnis.auftrag.nummer} · {kontext?.kunde.kurzname ?? ''}
                  </span>
                  <span className={werkzeuge.ergebnisText}>
                    {kontext ? `${kontext.geraet.marke} ${kontext.geraet.art} – ` : ''}
                    {ergebnis.auftrag.fehlerbild}
                  </span>
                  {ergebnis.einsatz ? (
                    <div className={styles.aktionen}>
                      <Button variant="primary" size="md" icon={Wrench} onClick={() => navigate(pfad(`/einsatz/${ergebnis.einsatz?.id ?? ''}`))}>
                        Einsatz {formatDatumKurz(ergebnis.einsatz.datum)} {formatZeit(ergebnis.einsatz.startMin)} öffnen
                      </Button>
                    </div>
                  ) : (
                    <span className={werkzeuge.ergebnisText}>Kein Einsatz dieses Auftrags in deinem Plan.</span>
                  )}
                </>
              )}

              {ergebnis.art === 'rapport' && (
                <>
                  <span className={werkzeuge.ergebnisTitel}>{ergebnis.rapport.nummer}</span>
                  <span className={werkzeuge.ergebnisText}>{RAPPORT_LABEL[ergebnis.rapport.status]}</span>
                  <div className={styles.aktionen}>
                    <Button variant="primary" size="md" icon={FileText} onClick={() => navigate(pfad(`/rapport/${ergebnis.rapport.einsatzId}`))}>
                      Rapport öffnen
                    </Button>
                  </div>
                </>
              )}

              {ergebnis.art === 'geraet' && (
                <>
                  <span className={werkzeuge.ergebnisTitel}>
                    {ergebnis.geraet.marke} {ergebnis.geraet.modell}
                  </span>
                  <span className={werkzeuge.ergebnisText}>
                    {ergebnis.geraet.art} · SN <span className={styles.mono}>{ergebnis.geraet.seriennummer}</span> · Baujahr {ergebnis.geraet.baujahr}
                  </span>
                  <div className={styles.aktionen}>
                    <Button variant="secondary" size="md" icon={Camera} onClick={() => navigate(pfad('/kamera?motiv=typenschild'))}>
                      Typenschild fotografieren
                    </Button>
                  </div>
                </>
              )}

              {ergebnis.art === 'link' && (
                <>
                  <span className={werkzeuge.ergebnisText}>{ergebnis.url}</span>
                  <div className={styles.aktionen}>
                    <Button variant="secondary" size="md" icon={ExternalLink} onClick={() => window.open(ergebnis.url, '_blank', 'noopener')}>
                      Link öffnen
                    </Button>
                  </div>
                </>
              )}

              {ergebnis.art === 'unbekannt' && <span className={werkzeuge.ergebnisText}>«{ergebnis.text}» passt zu keinem Artikel, Auftrag, Rapport oder Gerät.</span>}

              {meldung && <p className={styles.bestaetigung}>{meldung}</p>}
            </section>
          )}

          {verlauf.length > 0 && (
            <section className={styles.abschnitt}>
              <CapsLabel as="h3">Zuletzt gescannt</CapsLabel>
              <ul className={werkzeuge.verlauf}>
                {verlauf.map((eintrag) => (
                  <li key={eintrag.code}>
                    <span className={styles.mono}>{formatZeit(eintrag.zeitMin)}</span>
                    <button type="button" className={werkzeuge.beispiel} onClick={() => deuten(eintrag.code)}>
                      {eintrag.code.length > 40 ? `${eintrag.code.slice(0, 40)}…` : eintrag.code}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ◆ jh · eof */
