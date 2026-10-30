/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/website/website.model.ts                   │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Website-Anfragen: Sichten, Kundenvorschlag, Vorbelegung, Antwort      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { addDays } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import { ANLIEGEN_KATEGORIE, ANLIEGEN_LABEL, ZEITFENSTER_LABEL, nurZiffern } from '../../core/domain/anfrage';
import type { Anfrage, AnfrageStatus } from '../../core/domain/anfrage';
import { fuelleVorlage, standardVorlage } from '../../core/domain/nachricht';
import type { NachrichtArt } from '../../core/domain/nachricht';
import { GERAETEARTEN, MARKEN, formatStrasse } from '../../core/domain/stammdaten';
import type { Geraeteart, Kunde, Liegenschaft, Marke } from '../../core/domain/stammdaten';
import { formatDatumKurz } from '../../core/format';
import { normalizeSuchtext } from '../../core/suche';
import type { DispoStammdaten } from '../dispo/dispo.types';
import type { Vorbelegung } from '../dispo/Schnellerfassung';

// ── §1 · Sichten ─────────────────────────────────────────────────

export type AnfrageSicht = 'alle' | AnfrageStatus;

export const ANFRAGE_SICHTEN: readonly { id: AnfrageSicht; label: string }[] = [
  { id: 'neu', label: 'Neu' },
  { id: 'angenommen', label: 'Angenommen' },
  { id: 'abgelehnt', label: 'Abgelehnt' },
  { id: 'alle', label: 'Alle' },
];

export type TrefferGrund = 'telefon' | 'email' | 'kundennummer' | 'adresse';

export const TREFFER_LABEL: Readonly<Record<TrefferGrund, string>> = {
  telefon: 'Telefonnummer bekannt',
  email: 'E-Mail bekannt',
  kundennummer: 'Kundennummer',
  adresse: 'Adresse bekannt',
};

export interface KundenTreffer {
  kunde: Kunde;
  liegenschaft: Liegenschaft | undefined;
  grund: TrefferGrund;
}

export interface AnfrageView {
  anfrage: Anfrage;
  treffer: KundenTreffer | null;
  suchtext: string;
}

function telefonSchluessel(telefon: string): string {
  return nurZiffern(telefon).slice(-7);
}

function adresseSchluessel(strasse: string, ort: string): string {
  return normalizeSuchtext(`${strasse} ${ort}`).replace(/\s+/g, ' ');
}

// jh› Reihenfolge der Erkennung: Kundennummer (eindeutig) → Telefon (Hauswart, Kontakt, frühere Aufträge)
//     → E-Mail → Adresse der Liegenschaft. Ein Treffer ist ein Vorschlag fürs Büro, kein Automatismus.
export function kundenTreffer(anfrage: Anfrage, stammdaten: DispoStammdaten): KundenTreffer | null {
  const kunden = [...stammdaten.kunden.values()];
  const liegenschaften = [...stammdaten.liegenschaften.values()];
  if (anfrage.kundennummer) {
    const kunde = kunden.find((kandidat) => kandidat.nummer === anfrage.kundennummer?.trim());
    if (kunde) return { kunde, liegenschaft: undefined, grund: 'kundennummer' };
  }
  const adresse = adresseSchluessel(anfrage.adresse.strasse, anfrage.adresse.ort);
  const passtZurAdresse = (kandidat: Liegenschaft) => adresseSchluessel(formatStrasse(kandidat.adresse), kandidat.adresse.ort) === adresse;
  const telefon = telefonSchluessel(anfrage.kontakt.telefon);
  if (telefon.length === 7) {
    // jh› Ein Hauswart betreut oft mehrere Häuser derselben Verwaltung – die Liegenschaft, deren Adresse die
    //     Anfrage nennt, geht vor (auch wenn dort ein anderer Hauswart eingetragen ist), sonst sein erstes Haus.
    const desHauswarts = liegenschaften.filter((kandidat) => kandidat.hauswart && telefonSchluessel(kandidat.hauswart.telefon) === telefon);
    const liegenschaft = desHauswarts.find(passtZurAdresse) ?? liegenschaften.find((kandidat) => passtZurAdresse(kandidat) && desHauswarts.some((haus) => haus.kundeId === kandidat.kundeId)) ?? desHauswarts[0];
    const kundeDerLiegenschaft = liegenschaft ? stammdaten.kunden.get(liegenschaft.kundeId) : undefined;
    if (liegenschaft && kundeDerLiegenschaft) return { kunde: kundeDerLiegenschaft, liegenschaft, grund: 'telefon' };
    const kunde = kunden.find((kandidat) => telefonSchluessel(kandidat.kontakt.telefon) === telefon);
    if (kunde) return { kunde, liegenschaft: undefined, grund: 'telefon' };
    const auftrag = [...stammdaten.auftraege.values()].find((kandidat) => telefonSchluessel(kandidat.kontaktVorOrt.telefon) === telefon);
    const kundeDesAuftrags = auftrag ? stammdaten.kunden.get(auftrag.kundeId) : undefined;
    if (auftrag && kundeDesAuftrags) return { kunde: kundeDesAuftrags, liegenschaft: stammdaten.liegenschaften.get(auftrag.liegenschaftId), grund: 'telefon' };
  }
  const email = anfrage.kontakt.email.trim().toLowerCase();
  if (email !== '') {
    const kunde = kunden.find((kandidat) => kandidat.kontakt.email?.toLowerCase() === email);
    if (kunde) return { kunde, liegenschaft: undefined, grund: 'email' };
  }
  const liegenschaft = liegenschaften.find(passtZurAdresse);
  const kundeDerAdresse = liegenschaft ? stammdaten.kunden.get(liegenschaft.kundeId) : undefined;
  if (liegenschaft && kundeDerAdresse) return { kunde: kundeDerAdresse, liegenschaft, grund: 'adresse' };
  return null;
}

export function buildAnfrageViews(anfragen: readonly Anfrage[], stammdaten: DispoStammdaten): AnfrageView[] {
  return [...anfragen]
    .sort((a, b) => b.eingegangenAm.localeCompare(a.eingegangenAm))
    .map((anfrage) => ({
      anfrage,
      treffer: kundenTreffer(anfrage, stammdaten),
      suchtext: normalizeSuchtext(`${anfrage.nummer} ${anfrage.kontakt.name} ${anfrage.kontakt.telefon} ${anfrage.kontakt.email} ${anfrage.adresse.strasse} ${anfrage.adresse.ort} ${anfrage.geraeteart} ${anfrage.marke} ${anfrage.fehlerbild} ${ANLIEGEN_LABEL[anfrage.anliegen]}`),
    }));
}

export function zaehleAnfragen(views: readonly AnfrageView[]): Readonly<Record<AnfrageSicht, number>> {
  const zaehler: Record<AnfrageSicht, number> = { alle: views.length, neu: 0, angenommen: 0, abgelehnt: 0 };
  for (const view of views) zaehler[view.anfrage.status] += 1;
  return zaehler;
}

export function filterAnfragen(views: readonly AnfrageView[], sicht: AnfrageSicht, suche: string): AnfrageView[] {
  const begriff = normalizeSuchtext(suche);
  return views.filter((view) => (sicht === 'alle' || view.anfrage.status === sicht) && (begriff === '' || view.suchtext.includes(begriff)));
}

// ── §2 · Übergabe an die Schnellerfassung ────────────────────────

function istGeraeteart(wert: string): wert is Geraeteart {
  return (GERAETEARTEN as readonly string[]).includes(wert);
}

function istMarke(wert: string): wert is Marke {
  return (MARKEN as readonly string[]).includes(wert);
}

export function terminwunschText(anfrage: Anfrage): string | null {
  if (!anfrage.terminwunsch) return null;
  return `${formatDatumKurz(anfrage.terminwunsch.datum)} ${ZEITFENSTER_LABEL[anfrage.terminwunsch.zeitfenster]}`;
}

/** Alles, was die Anfrage schon weiss, steht im Formular – das Büro prüft und ergänzt nur noch. */
export function vorbelegungAus(view: AnfrageView): Vorbelegung {
  const { anfrage, treffer } = view;
  const wunsch = terminwunschText(anfrage);
  return {
    ...(treffer ? { kundeId: treffer.kunde.id } : {}),
    ...(treffer?.liegenschaft ? { liegenschaftId: treffer.liegenschaft.id } : {}),
    ...(anfrage.adresse.wohnung ? { wohnungNummer: anfrage.adresse.wohnung } : {}),
    ...(anfrage.kontakt.telefon.trim() ? { telefon: anfrage.kontakt.telefon.trim() } : {}),
    anrufer: anfrage.kontakt.name,
    fehlerbild: anfrage.fehlerbild,
    kategorie: ANLIEGEN_KATEGORIE[anfrage.anliegen],
    dringlichkeit: anfrage.dringend ? 'hoch' : 'normal',
    ...(istGeraeteart(anfrage.geraeteart) ? { geraeteart: anfrage.geraeteart } : {}),
    ...(istMarke(anfrage.marke) ? { marke: anfrage.marke } : {}),
    kanal: 'Website',
    hinweis: `Website-Anfrage ${anfrage.nummer}${wunsch ? ` · Wunsch ${wunsch}` : ''}`,
  };
}

// ── §3 · Antwort ─────────────────────────────────────────────────

export function antwortVorlage(anfrage: Anfrage, heute: IsoDatum, vorlagen: Readonly<Partial<Record<NachrichtArt, string>>>, ablehnung = false): string {
  if (ablehnung) {
    return `Guten Tag ${anfrage.kontakt.name}\n\nVielen Dank für Ihre Anfrage ${anfrage.nummer}. Leider können wir Ihnen in diesem Fall nicht weiterhelfen: …\n\nFreundliche Grüsse\nSutt AG`;
  }
  return fuelleVorlage(vorlagen['anfrage-antwort'] ?? standardVorlage('anfrage-antwort'), {
    technikerName: '',
    kontaktName: anfrage.kontakt.name,
    datum: formatDatumKurz(addDays(heute, 1)),
    zeit: '',
    anfrageNummer: anfrage.nummer,
  });
}

/* ◆ jh · eof */
