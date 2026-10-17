/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/druck/TechnikerDruck.tsx             │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Tagesplan pro Techniker als A4 mit QR-Code zur Google-Maps-Route      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useArbeitstag } from '../../../core/arbeitstag';
import { KATEGORIE_LABEL } from '../../../core/domain/kategorie';
import { formatAdresse, fullName } from '../../../core/domain/stammdaten';
import { formatDatumLang, formatDauer, formatKm, formatZeit, formatZeitspanne } from '../../../core/format';
import { googleTourUrl } from '../../../core/geo';
import { Button } from '../../../core/ui/Button';
import { mockBestand, mockStammdaten } from '../../../mock';
import { LEERER_FILTER } from '../dispo.types';
import { buildTagesZeilen } from '../store/dispo.selectors';
import { initDispoStore, useDispoState } from '../store/dispoStore';
import styles from './TechnikerDruck.module.css';

initDispoStore(mockStammdaten, mockBestand);

// ── §1 · QR-Code ─────────────────────────────────────────────────

function useQrSvg(text: string): string | null {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let aktiv = true;
    // jh› qrcode lädt lazy – nur die Druckseite braucht es.
    void import('qrcode').then((modul) => modul.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' })).then((ergebnis) => {
      if (aktiv) setSvg(ergebnis);
    });
    return () => {
      aktiv = false;
    };
  }, [text]);
  return svg;
}

// ── §2 · Komponente ──────────────────────────────────────────────

export function TechnikerDruck() {
  const { technikerId } = useParams();
  const navigate = useNavigate();
  const { datum } = useArbeitstag();
  const state = useDispoState();
  const techniker = state.stammdaten.techniker.find((kandidat) => kandidat.id === technikerId);

  const zeile = useMemo(() => {
    if (!techniker) return null;
    return buildTagesZeilen(state.stammdaten, state.einsaetze, datum, { ...LEERER_FILTER, technikerIds: [techniker.id] }, null)[0] ?? null;
  }, [state.stammdaten, state.einsaetze, datum, techniker]);

  const stationen = useMemo(() => (zeile ? [...zeile.einsaetze].sort((a, b) => a.einsatz.startMin - b.einsatz.startMin) : []), [zeile]);
  const tourUrl = googleTourUrl(stationen.map((station) => station.koordinaten));
  const qr = useQrSvg(tourUrl);

  if (!techniker || !zeile) return <Navigate to="/dispo/plantafel" replace />;

  const gesamtKm = stationen.reduce((summe, station) => summe + station.anfahrtKm, 0);

  return (
    <div className={styles.seite}>
      <div className={styles.steuerung}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(`/dispo/plantafel?d=${datum}`)}>
          Zur Plantafel
        </Button>
        <span className={styles.steuerungText}>A4 hoch · Browser-Druck (Strg P) · Kopf- und Fusszeilen ausschalten</span>
        <Button variant="primary" icon={Printer} onClick={() => window.print()}>
          Drucken
        </Button>
      </div>

      <article className={styles.blatt}>
        <header className={styles.kopf}>
          <div className={styles.wortmarke}>
            <span className={styles.raute} aria-hidden />
            <span className={styles.firma}>SUTT AG</span>
            <span className={styles.produkt}>/ Leitstand</span>
          </div>
          <div className={styles.kopfRechts}>
            <span className={styles.titel}>Tagesplan</span>
            <span className={styles.datum}>{formatDatumLang(datum)}</span>
          </div>
        </header>

        <section className={styles.techniker}>
          <dl className={styles.technikerDaten}>
            <div>
              <dt>Techniker</dt>
              <dd>
                <strong>{fullName(techniker)}</strong> ({techniker.kuerzel})
              </dd>
            </div>
            <div>
              <dt>Fahrzeug</dt>
              <dd className={styles.mono}>{techniker.fahrzeug}</dd>
            </div>
            <div>
              <dt>Telefon</dt>
              <dd className={styles.mono}>{techniker.telefon}</dd>
            </div>
            <div>
              <dt>Einsätze</dt>
              <dd className={styles.mono}>
                {stationen.length} · {formatDauer(zeile.geplantMin)} · {formatDauer(zeile.fahrzeitMin)} Fahrt · {formatKm(gesamtKm)}
              </dd>
            </div>
          </dl>
          <div className={styles.qr}>
            {qr ? <div className={styles.qrBild} dangerouslySetInnerHTML={{ __html: qr }} /> : <div className={styles.qrPlatzhalter} />}
            <span className={styles.qrText}>Route in Google Maps</span>
          </div>
        </section>

        <table className={styles.tabelle}>
          <thead>
            <tr>
              <th scope="col">Nr.</th>
              <th scope="col">Zeit</th>
              <th scope="col">Kunde / Einsatzort</th>
              <th scope="col">Kontakt</th>
              <th scope="col">Gerät / Fehlerbild</th>
              <th scope="col">Hinweise</th>
            </tr>
          </thead>
          <tbody>
            {stationen.map((station, index) => (
              <tr key={station.einsatz.id}>
                <td className={styles.mono}>{index + 1}</td>
                <td className={styles.mono}>
                  {formatZeitspanne(station.einsatz.startMin, station.einsatz.dauerMin)}
                  <span className={styles.klein}>Anfahrt {station.anfahrtMin} min</span>
                </td>
                <td>
                  <strong>{station.kunde.name}</strong>
                  <br />
                  {formatAdresse(station.liegenschaft.adresse)}
                  {station.auftrag.wohnung && (
                    <>
                      <br />
                      <span className={styles.mono}>{station.auftrag.wohnung.nummer}</span> · {station.auftrag.wohnung.lage}
                    </>
                  )}
                </td>
                <td>
                  {station.auftrag.kontaktVorOrt.rolle}: {station.auftrag.kontaktVorOrt.name}
                  <br />
                  <span className={styles.mono}>{station.auftrag.kontaktVorOrt.telefon}</span>
                  {station.liegenschaft.hauswart && (
                    <>
                      <br />
                      Hauswart: {station.liegenschaft.hauswart.name} <span className={styles.mono}>{station.liegenschaft.hauswart.telefon}</span>
                    </>
                  )}
                </td>
                <td>
                  <span className={styles.mono}>{station.auftrag.nummer}</span> · {KATEGORIE_LABEL[station.auftrag.kategorie]}
                  <br />
                  {station.geraet.marke} {station.geraet.modell} · SN {station.geraet.seriennummer}
                  <br />
                  {station.auftrag.fehlerbild}
                </td>
                <td>
                  {[station.liegenschaft.zugang, ...station.liegenschaft.hinweise.map((hinweis) => hinweis.text), ...station.kunde.hinweise.map((hinweis) => hinweis.text), station.auftrag.notiz]
                    .filter(Boolean)
                    .map((text) => (
                      <span key={text} className={styles.hinweis}>
                        {text}
                      </span>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className={styles.fuss}>
          <span>Sutt AG · Industriestrasse 24 · 8152 Glattbrugg</span>
          <span className={styles.mono}>
            gedruckt {formatDatumLang(datum)} {formatZeit(new Date().getHours() * 60 + new Date().getMinutes())} · ◆ JH
          </span>
        </footer>
      </article>
    </div>
  );
}

/* ◆ jh · eof */
