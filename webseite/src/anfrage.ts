/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  webseite/anfrage.ts                                │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Anfrageformular: Listen füllen, prüfen, ablegen, Nummer bestätigen    │
   └────────────────────────────────────────────────────────────────────────┘ */

import { nowZeitpunkt, todayIso } from '@sl/core/datum';
import type { IsoDatum } from '@sl/core/datum';
import { ANFRAGE_ANLIEGEN, ANFRAGE_ROLLEN, ladeAnfragen, naechsteLaufnummer, neueAnfrage, pruefeAnfrage, speichereAnfragen } from '@sl/core/domain/anfrage';
import type { AnfrageAnliegen, AnfrageEntwurf, AnfrageFehler, AnfrageRolle, Zeitfenster } from '@sl/core/domain/anfrage';
import { GERAETEARTEN, MARKEN } from '@sl/core/domain/stammdaten';

// ── §1 · Elemente ────────────────────────────────────────────────

const formular = document.getElementById('anfrage-formular');
const erfolg = document.getElementById('erfolg');
const fehlerliste = document.getElementById('fehlerliste');

function fuelleDatalist(id: string, werte: readonly string[]): void {
  const liste = document.getElementById(id);
  if (!liste) return;
  liste.replaceChildren(...werte.map((wert) => Object.assign(document.createElement('option'), { value: wert })));
}

function fuelleSelect(id: string, werte: readonly string[]): void {
  const select = document.getElementById(id);
  if (!(select instanceof HTMLSelectElement)) return;
  select.replaceChildren(...werte.map((wert) => new Option(wert, wert)));
}

// jh› Eine Quelle für Gerätearten, Marken und Rollen: dieselben Konstanten wie im Leitstand (@sl).
fuelleDatalist('geraetearten', GERAETEARTEN);
fuelleDatalist('marken', MARKEN);
fuelleSelect('rolle', ANFRAGE_ROLLEN);

const anliegenAusAdresse = new URLSearchParams(window.location.search).get('anliegen');
if (anliegenAusAdresse && (ANFRAGE_ANLIEGEN as readonly string[]).includes(anliegenAusAdresse)) {
  const radio = document.querySelector<HTMLInputElement>(`input[name="anliegen"][value="${anliegenAusAdresse}"]`);
  if (radio) radio.checked = true;
}

// ── §2 · Lesen und prüfen ────────────────────────────────────────

function wert(daten: FormData, name: string): string {
  const roh = daten.get(name);
  return typeof roh === 'string' ? roh.trim() : '';
}

function istAnliegen(roh: string): roh is AnfrageAnliegen {
  return (ANFRAGE_ANLIEGEN as readonly string[]).includes(roh);
}

function istRolle(roh: string): roh is AnfrageRolle {
  return (ANFRAGE_ROLLEN as readonly string[]).includes(roh);
}

function istZeitfenster(roh: string): roh is Zeitfenster {
  return roh === 'vormittag' || roh === 'nachmittag' || roh === 'egal';
}

function entwurfAus(daten: FormData): AnfrageEntwurf {
  const anliegen = wert(daten, 'anliegen');
  const rolle = wert(daten, 'rolle');
  const zeitfenster = wert(daten, 'zeitfenster');
  const terminDatum = wert(daten, 'terminDatum');
  const foto = daten.get('foto');
  const fotoName = foto instanceof File && foto.name !== '' ? foto.name : undefined;
  const kundennummer = wert(daten, 'kundennummer');
  const wohnung = wert(daten, 'wohnung');
  return {
    anliegen: istAnliegen(anliegen) ? anliegen : 'reparatur',
    dringend: daten.get('dringend') === 'on',
    geraeteart: wert(daten, 'geraeteart'),
    marke: wert(daten, 'marke'),
    fehlerbild: wert(daten, 'fehlerbild'),
    adresse: { strasse: wert(daten, 'strasse'), plz: wert(daten, 'plz'), ort: wert(daten, 'ort'), ...(wohnung ? { wohnung } : {}) },
    ...(terminDatum ? { terminwunsch: { datum: terminDatum as IsoDatum, zeitfenster: istZeitfenster(zeitfenster) ? zeitfenster : 'egal' } } : {}),
    kontakt: { name: wert(daten, 'name'), telefon: wert(daten, 'telefon'), email: wert(daten, 'email'), rolle: istRolle(rolle) ? rolle : 'Mieter' },
    ...(kundennummer ? { kundennummer } : {}),
    ...(fotoName ? { fotoName } : {}),
  };
}

const FELD_ZIEL: Readonly<Record<string, string>> = {
  anliegen: 'anliegen',
  geraeteart: 'geraeteart',
  fehlerbild: 'fehlerbild',
  strasse: 'strasse',
  plz: 'plz',
  ort: 'ort',
  name: 'name',
  kontakt: 'telefon',
  email: 'email',
  terminwunsch: 'termin-datum',
  datenschutz: 'datenschutz',
};

function fehlerZeigen(fehler: readonly AnfrageFehler[]): void {
  for (const element of document.querySelectorAll<HTMLElement>('[data-fehler]')) {
    element.hidden = true;
    element.textContent = '';
  }
  for (const eingabe of document.querySelectorAll<HTMLElement>('[aria-invalid]')) eingabe.removeAttribute('aria-invalid');
  if (!fehlerliste) return;
  const liste = fehlerliste.querySelector('ul');
  if (fehler.length === 0 || !liste) {
    fehlerliste.hidden = true;
    return;
  }
  liste.replaceChildren(
    ...fehler.map((eintrag) => {
      const punkt = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${FELD_ZIEL[eintrag.feld] ?? eintrag.feld}`;
      link.textContent = eintrag.text;
      punkt.append(link);
      return punkt;
    }),
  );
  for (const eintrag of fehler) {
    const meldung = document.querySelector<HTMLElement>(`[data-fehler="${eintrag.feld}"]`);
    if (meldung) {
      meldung.textContent = eintrag.text;
      meldung.hidden = false;
    }
    const eingabe = document.getElementById(FELD_ZIEL[eintrag.feld] ?? eintrag.feld);
    if (eingabe) {
      eingabe.setAttribute('aria-invalid', 'true');
      if (meldung?.id) eingabe.setAttribute('aria-describedby', meldung.id);
    }
  }
  fehlerliste.hidden = false;
  fehlerliste.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── §3 · Absenden ────────────────────────────────────────────────

function bestaetigen(nummer: string, entwurf: AnfrageEntwurf): void {
  if (!formular || !erfolg) return;
  const kanal = entwurf.kontakt.email !== '' ? `per E-Mail an ${entwurf.kontakt.email}` : `per Telefon unter ${entwurf.kontakt.telefon}`;
  const wunsch = entwurf.terminwunsch ? ` Ihren Wunsch (ab ${entwurf.terminwunsch.datum.split('-').reverse().join('.')}) haben wir notiert.` : '';
  for (const feld of erfolg.querySelectorAll<HTMLElement>('[data-erfolg]')) {
    const schluessel = feld.dataset.erfolg;
    if (schluessel === 'name') feld.textContent = entwurf.kontakt.name;
    if (schluessel === 'nummer') feld.textContent = nummer;
    if (schluessel === 'text') feld.textContent = `Die Disposition meldet sich ${kanal} mit einem Terminvorschlag – in der Regel am nächsten Arbeitstag.${wunsch} Bitte halten Sie die Nummer bereit, wenn Sie nachfragen.`;
  }
  formular.hidden = true;
  erfolg.hidden = false;
  erfolg.querySelector('h2')?.setAttribute('tabindex', '-1');
  erfolg.querySelector<HTMLElement>('h2')?.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// jh› Mockup: Die Anfrage landet im Browser-Speicher, den der Leitstand (gleiche Origin) sofort liest.
//     Mit der API wird aus «speichereAnfragen» ein POST – Prüfung und Form der Anfrage bleiben dieselben.
formular?.addEventListener('submit', (ereignis) => {
  ereignis.preventDefault();
  if (!(formular instanceof HTMLFormElement)) return;
  const daten = new FormData(formular);
  if (wert(daten, 'firmaWeb') !== '') return;
  const entwurf = entwurfAus(daten);
  const fehler = pruefeAnfrage(entwurf, todayIso());
  if (daten.get('datenschutz') !== 'on') fehler.push({ feld: 'datenschutz', text: 'Bitte der Bearbeitung Ihrer Angaben zustimmen.' });
  fehlerZeigen(fehler);
  if (fehler.length > 0) return;

  const jetzt = nowZeitpunkt();
  const bestehende = ladeAnfragen(window.localStorage);
  const zufall = Math.random().toString(36).slice(2, 6);
  const anfrage = neueAnfrage(entwurf, naechsteLaufnummer(bestehende, Number(jetzt.slice(0, 4))), jetzt, `W-${jetzt.slice(2, 16).replace(/[-:]/g, '')}-${zufall}`);
  if (!speichereAnfragen(window.localStorage, [...bestehende, anfrage])) {
    fehlerZeigen([{ feld: 'kontakt', text: 'Die Anfrage konnte nicht gespeichert werden (Browser-Speicher gesperrt). Bitte rufen Sie uns an: 044 809 12 00.' }]);
    return;
  }
  bestaetigen(anfrage.nummer, entwurf);
});

document.getElementById('nochmals')?.addEventListener('click', () => {
  if (!(formular instanceof HTMLFormElement) || !erfolg) return;
  formular.reset();
  fehlerZeigen([]);
  erfolg.hidden = true;
  formular.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ◆ jh · eof */
