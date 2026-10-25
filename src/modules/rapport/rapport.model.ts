/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/rapport/rapport.model.ts                   │
   │  ◆ JH · 2026.10 · rev 03                                               │
   │  Rapport-Entwurf aus Auftrag, Gerät und Verlauf; OCR-Vorschlag (Mock)  │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { Minuten } from '../../core/datum';
import type { Auftrag, Foto } from '../../core/domain/auftrag';
import type { Einsatz } from '../../core/domain/einsatz';
import { arbeitenFor, diagnoseCodeOf, zeitenAusVerlauf } from '../../core/domain/rapport';
import type { Rapport, RapportTeil } from '../../core/domain/rapport';
import type { Geraet, Techniker } from '../../core/domain/stammdaten';
import type { RapportEntwurf } from '../dispo/store/useDispoAktionen';

// ── §1 · Entwurf ─────────────────────────────────────────────────

function teileAusAuftrag(auftrag: Auftrag): RapportTeil[] {
  return auftrag.ersatzteile.map((teil) => ({
    artikelNummer: teil.artikelNummer,
    bezeichnung: teil.bezeichnung,
    menge: teil.menge,
    verwendung: teil.status === 'ab-lager' ? 'fahrzeuglager' : teil.status === 'eingetroffen' ? 'eingebaut' : 'bestellen',
  }));
}

// jh› «Rapport in 90 Sekunden»: alles, was Auftrag, Gerät und Verlauf wissen, steht schon drin –
//     der Techniker bestätigt, korrigiert, unterschreibt.
export function neuerRapportEntwurf(auftrag: Auftrag, geraet: Geraet, einsatz: Einsatz, techniker: Techniker, jetztMin: Minuten): RapportEntwurf {
  const diagnoseCode = diagnoseCodeOf(auftrag.fehlerbild);
  return {
    auftragId: auftrag.id,
    einsatzId: einsatz.id,
    technikerId: techniker.id,
    zeiten: zeitenAusVerlauf(einsatz, jetztMin),
    arbeiten: arbeitenFor(geraet.art),
    ...(diagnoseCode ? { diagnoseCode } : {}),
    bemerkung: '',
    teile: teileAusAuftrag(auftrag),
    fotos: [],
    abschluss: 'erledigt',
  };
}

/** Bestehenden Rapport als Entwurf öffnen (Bearbeiten). */
export function entwurfAus(rapport: Rapport): RapportEntwurf {
  return { ...rapport };
}

// ── §2 · Fotos ───────────────────────────────────────────────────

let fotoLauf = 0;

export function neuesFoto(einsatzId: string, motiv: Foto['motiv'], kuerzel: string, aufgenommenAm: Foto['aufgenommenAm']): Foto {
  fotoLauf += 1;
  return { id: `F-${einsatzId}-N${fotoLauf}`, motiv, aufgenommenAm, technikerKuerzel: kuerzel };
}

// ── §3 · Typenschild-Vorschlag (Mock-OCR) ────────────────────────

export interface GeraeteVorschlag {
  modell: string;
  typNummer: string;
  seriennummer: string;
}

/** Noch nicht erfasste Geräte aus der Schnellerfassung erkennt man am Typ. */
export function geraetUnvollstaendig(geraet: Geraet): boolean {
  return geraet.typNummer === 'noch nicht erfasst' || geraet.seriennummer === 'offen';
}

// jh› Kein echtes OCR im Mock: der Vorschlag ist plausibel für Marke und Art und
//     deterministisch pro Gerät – im Produkt liefert ihn die Typenschild-Erkennung.
// jh# 014 Typenschild-Vorschlag ist Mock-OCR – echte Erkennung über Kamera-API oder Modul Geräte.
const MODELLE: Readonly<Record<string, string>> = {
  'Miele·Waschmaschine': 'W1 WWD 120 WCS',
  'Miele·Wärmepumpentrockner': 'T1 TWD 360 WP',
  'Miele·Geschirrspüler': 'G 7310 SCi',
  'V-ZUG·Waschmaschine': 'AdoraWaschen V4000',
  'V-ZUG·Geschirrspüler': 'AdoraSpülen V2000',
  'Electrolux·Waschmaschine': 'WASL4T300',
  'Siemens·Geschirrspüler': 'SN65ZX49CE',
  'Liebherr·Kühlschrank': 'IRBd 5150 Peak',
  'Asko·Wärmepumpentrockner': 'T208H.W/2',
};

export function typenschildVorschlag(geraet: Geraet): GeraeteVorschlag {
  const modell = MODELLE[`${geraet.marke}·${geraet.art}`] ?? `${geraet.marke} ${geraet.art} ${2020 + (geraet.id.length % 5)}`;
  const saat = [...geraet.id].reduce((summe, zeichen) => summe + zeichen.charCodeAt(0), 0);
  const seriennummer = `${String(1000 + (saat % 9000)).padStart(4, '0')}-${String(1000 + ((saat * 7) % 9000)).padStart(4, '0')}`;
  return { modell, typNummer: modell.replace(/\s+/g, '').slice(0, 10).toUpperCase(), seriennummer };
}

/* ◆ jh · eof */
