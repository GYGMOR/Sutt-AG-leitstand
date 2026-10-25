/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/rapport/RapportDruck.tsx                   │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Servicerapport als A4: Kopf, Zeiten, Arbeiten, Teile, Signatur        │
   └────────────────────────────────────────────────────────────────────────┘ */

import { ArrowLeft, Printer } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { FOTO_MOTIV_LABEL, RAPPORT_LABEL } from '../../core/domain/auftrag';
import { ABSCHLUSS_LABEL, TEIL_VERWENDUNG_LABEL, verrechenbareMinuten } from '../../core/domain/rapport';
import { KENNUNG_LABEL, formatAdresse, fullName } from '../../core/domain/stammdaten';
import { formatDatum, formatDatumLang, formatDauer, formatZeit, formatZeitpunktKurz, formatZeitspanne } from '../../core/format';
import { useQrSvg } from '../../core/hooks/useQrSvg';
import { Button } from '../../core/ui/Button';
import { FotoKachel } from '../../core/ui/FotoKachel';
import { MOCK_HEUTE, mockBestand, mockStammdaten } from '../../mock';
import { resolveAuftrag, technikerOf } from '../dispo/store/dispo.selectors';
import { initDispoStore, useDispoState } from '../dispo/store/dispoStore';
import { UnterschriftBild } from './UnterschriftFeld';
import styles from './RapportDruck.module.css';

initDispoStore(mockStammdaten, mockBestand, MOCK_HEUTE);

// ── §1 · Komponente ──────────────────────────────────────────────

export function RapportDruck() {
  const { rapportId } = useParams();
  const navigate = useNavigate();
  const state = useDispoState();
  const rapport = state.rapporte.find((kandidat) => kandidat.id === rapportId);
  const qr = useQrSvg(`${window.location.origin}/rapporte/${rapportId ?? ''}`);

  if (!rapport || !state.stammdaten.auftraege.has(rapport.auftragId)) return <Navigate to="/rapporte" replace />;
  const { auftrag, kunde, liegenschaft, geraet } = resolveAuftrag(state.stammdaten, rapport.auftragId);
  const techniker = technikerOf(state.stammdaten, rapport.technikerId);
  const einsatz = state.einsaetze.find((kandidat) => kandidat.id === rapport.einsatzId);

  return (
    <div className={styles.seite}>
      <div className={styles.steuerung}>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(`/rapporte/${rapport.id}`)}>
          Zum Rapport
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
            <span className={styles.produkt}>/ Servicerapport</span>
          </div>
          <div className={styles.kopfRechts}>
            <span className={styles.titel}>{rapport.nummer}</span>
            <span className={styles.datum}>{einsatz ? formatDatumLang(einsatz.datum) : formatDatum(rapport.erstelltAm.slice(0, 10) as typeof MOCK_HEUTE)}</span>
          </div>
        </header>

        <section className={styles.parteien}>
          <dl className={styles.daten}>
            <div>
              <dt>Kunde</dt>
              <dd>
                <strong>{kunde.name}</strong>
                <br />
                {formatAdresse(liegenschaft.adresse)}
                {auftrag.wohnung && (
                  <>
                    <br />
                    <span className={styles.mono}>{auftrag.wohnung.nummer}</span> · {auftrag.wohnung.lage}
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Kontakt vor Ort</dt>
              <dd>
                {auftrag.kontaktVorOrt.rolle}: {auftrag.kontaktVorOrt.name}
                <br />
                <span className={styles.mono}>{auftrag.kontaktVorOrt.telefon}</span>
              </dd>
            </div>
            <div>
              <dt>Auftrag</dt>
              <dd>
                <span className={styles.mono}>{auftrag.nummer}</span> · {auftrag.art}
                <br />
                {auftrag.fehlerbild}
              </dd>
            </div>
            <div>
              <dt>Gerät</dt>
              <dd>
                {geraet.marke} {geraet.art} {geraet.modell}
                <br />
                <span className={styles.mono}>
                  Typ {geraet.typNummer} · {KENNUNG_LABEL[geraet.marke]} {geraet.seriennummer}
                </span>
              </dd>
            </div>
            <div>
              <dt>Einsatz</dt>
              <dd className={styles.mono}>
                {einsatz ? `${formatDatum(einsatz.datum)} · ${formatZeitspanne(einsatz.startMin, einsatz.dauerMin)}` : '—'}
                <br />
                {fullName(techniker)} ({techniker.kuerzel})
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                {RAPPORT_LABEL[rapport.status]}
                <br />
                Abschluss: {ABSCHLUSS_LABEL[rapport.abschluss]}
                {rapport.abschlussGrund && ` – ${rapport.abschlussGrund}`}
              </dd>
            </div>
          </dl>
          <div className={styles.qr}>
            {qr ? <div className={styles.qrBild} dangerouslySetInnerHTML={{ __html: qr }} /> : <div className={styles.qrPlatzhalter} />}
            <span className={styles.qrText}>Rapport im Leitstand</span>
          </div>
        </section>

        <section className={styles.block}>
          <h2 className={styles.blockTitel}>Zeiten</h2>
          <table className={styles.tabelle}>
            <tbody>
              <tr>
                <th scope="row">Anfahrt</th>
                <td className={styles.mono}>{formatDauer(rapport.zeiten.anfahrtMin)}</td>
                <th scope="row">Arbeit</th>
                <td className={styles.mono}>{formatDauer(rapport.zeiten.arbeitMin)}</td>
                <th scope="row">Pause</th>
                <td className={styles.mono}>{formatDauer(rapport.zeiten.pauseMin)}</td>
                <th scope="row">Verrechenbar</th>
                <td className={styles.mono}>
                  <strong>{formatDauer(verrechenbareMinuten(rapport.zeiten))}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className={styles.block}>
          <h2 className={styles.blockTitel}>Arbeiten</h2>
          <ul className={styles.liste}>
            {rapport.arbeiten.map((schritt) => (
              <li key={schritt.id} className={schritt.erledigt ? styles.erledigt : styles.offen}>
                <span className={styles.kaestchen} aria-hidden>
                  {schritt.erledigt ? '☑' : '☐'}
                </span>
                {schritt.text}
              </li>
            ))}
          </ul>
          {rapport.diagnoseCode && (
            <p className={styles.klein}>
              Diagnosecode <span className={styles.mono}>{rapport.diagnoseCode}</span>
            </p>
          )}
          {rapport.bemerkung && <p className={styles.bemerkung}>{rapport.bemerkung}</p>}
        </section>

        {rapport.teile.length > 0 && (
          <section className={styles.block}>
            <h2 className={styles.blockTitel}>Ersatzteile</h2>
            <table className={styles.tabelle}>
              <thead>
                <tr>
                  <th scope="col">Menge</th>
                  <th scope="col">Bezeichnung</th>
                  <th scope="col">Artikel-Nr.</th>
                  <th scope="col">Verwendung</th>
                </tr>
              </thead>
              <tbody>
                {rapport.teile.map((teil) => (
                  <tr key={teil.artikelNummer}>
                    <td className={styles.mono}>{teil.menge}</td>
                    <td>{teil.bezeichnung}</td>
                    <td className={styles.mono}>{teil.artikelNummer}</td>
                    <td>{TEIL_VERWENDUNG_LABEL[teil.verwendung]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {rapport.fotos.length > 0 && (
          <section className={styles.block}>
            <h2 className={styles.blockTitel}>Fotos</h2>
            <ul className={styles.fotos}>
              {rapport.fotos.map((foto) => (
                <li key={foto.id}>
                  <FotoKachel foto={foto} />
                  <span className={styles.klein}>
                    {FOTO_MOTIV_LABEL[foto.motiv]} · {formatZeitpunktKurz(foto.aufgenommenAm)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.signaturen}>
          <div>
            <h2 className={styles.blockTitel}>Kunde / Mieter</h2>
            {rapport.unterschrift ? (
              <>
                <UnterschriftBild pfad={rapport.unterschrift.pfad} className={styles.signatur} />
                <p className={styles.klein}>
                  {rapport.unterschrift.name} · {formatZeitpunktKurz(rapport.unterschrift.zeitpunkt)}
                </p>
              </>
            ) : (
              <p className={styles.klein}>Ohne Unterschrift abgeschlossen.</p>
            )}
          </div>
          <div>
            <h2 className={styles.blockTitel}>Techniker</h2>
            <p className={styles.technikerName}>{fullName(techniker)}</p>
            <p className={styles.klein}>
              Sutt AG · {techniker.fahrzeug} · <span className={styles.mono}>{techniker.telefon}</span>
            </p>
          </div>
        </section>

        <footer className={styles.fuss}>
          <span>Sutt AG · Industriestrasse 24 · 8152 Glattbrugg</span>
          <span className={styles.mono}>
            gedruckt {formatDatumLang(MOCK_HEUTE)} {formatZeit(new Date().getHours() * 60 + new Date().getMinutes())} · ◆ JH
          </span>
        </footer>
      </article>
    </div>
  );
}

/* ◆ jh · eof */
