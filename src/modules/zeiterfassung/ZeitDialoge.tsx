/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/zeiterfassung/ZeitDialoge.tsx              │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Dialoge: Eintrag erfassen, korrigieren, Grund erfragen, Monat senden  │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, Send } from 'lucide-react';
import { parseIsoInput } from '../../core/datum';
import type { IsoDatum } from '../../core/datum';
import type { Mitarbeiter } from '../../core/domain/personal';
import { ueberlappt } from '../../core/domain/zeit';
import type { ZeitArt, ZeitEintrag } from '../../core/domain/zeit';
import { formatDatum, formatDauer, formatSaldo, formatZeit } from '../../core/format';
import { Button } from '../../core/ui/Button';
import { Dialog } from '../../core/ui/Dialog';
import { Auswahl, Eingabe, Feld, Textbereich } from '../../core/ui/Form';
import type { ZeitEintragEntwurf } from '../dispo/store/useDispoAktionen';
import type { ZeitkontoMonat } from '../personal/personal.model';
import styles from '../personal/Personal.module.css';
import { minutenAus, monatLabel } from './zeiterfassung.model';

// ── §1 · Eintrag erfassen ────────────────────────────────────────

interface EintragDialogProps {
  open: boolean;
  mitarbeiter: Mitarbeiter;
  datum: IsoDatum;
  heute: IsoDatum;
  eintraege: readonly ZeitEintrag[];
  onClose: () => void;
  onSpeichern: (entwurf: ZeitEintragEntwurf) => void;
}

// jh› Nachtragen ist erlaubt, aber sichtbar: Der Eintrag trägt «manuell» und erscheint bei Vorgesetzten unter «Zu prüfen».
export function EintragDialog({ open, mitarbeiter, datum, heute, eintraege, onClose, onSpeichern }: EintragDialogProps) {
  const [tag, setTag] = useState<string>(datum);
  const [art, setArt] = useState<ZeitArt>('arbeit');
  const [von, setVon] = useState('08:00');
  const [bis, setBis] = useState('12:00');
  const [bemerkung, setBemerkung] = useState('');

  useEffect(() => {
    if (!open) return;
    setTag(datum);
    setArt('arbeit');
    setVon('08:00');
    setBis('12:00');
    setBemerkung('');
  }, [open, datum]);

  const fehler = useMemo(() => {
    const iso = parseIsoInput(tag);
    const vonMin = minutenAus(von);
    const bisMin = minutenAus(bis);
    if (!iso) return 'Datum fehlt.';
    if (iso > heute) return 'Zeiten lassen sich nur bis heute erfassen.';
    if (vonMin === null || bisMin === null) return 'Von und Bis als Uhrzeit (hh:mm) eingeben.';
    if (bisMin <= vonMin) return 'Bis muss nach Von liegen.';
    const kollision = ueberlappt(eintraege, { mitarbeiterId: mitarbeiter.id, datum: iso, vonMin, bisMin });
    if (kollision) return `Überschneidet sich mit ${formatZeit(kollision.vonMin)}–${kollision.bisMin === null ? 'offen' : formatZeit(kollision.bisMin)} (${kollision.art}).`;
    return null;
  }, [tag, von, bis, heute, eintraege, mitarbeiter.id]);

  const speichern = () => {
    const iso = parseIsoInput(tag);
    const vonMin = minutenAus(von);
    const bisMin = minutenAus(bis);
    if (!iso || vonMin === null || bisMin === null || fehler) return;
    onSpeichern({ mitarbeiterId: mitarbeiter.id, datum: iso, art, vonMin, bisMin, quelle: 'manuell', ...(bemerkung.trim() ? { bemerkung: bemerkung.trim() } : {}) });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel="Zeiteintrag erfassen"
      untertitel={`${mitarbeiter.vorname} ${mitarbeiter.nachname} · manuell nachgetragen, für Vorgesetzte sichtbar`}
      breite="sm"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" icon={Plus} disabled={fehler !== null} onClick={speichern}>
            Erfassen
          </Button>
        </>
      }
    >
      <div className={styles.formular}>
        <div className={styles.formularZeile}>
          <Feld label="Datum" render={(id) => <Eingabe id={id} type="date" value={tag} max={heute} mono onChange={(event) => setTag(event.target.value)} />} />
          <Feld
            label="Art"
            render={(id) => (
              <Auswahl id={id} value={art} onChange={(event) => setArt(event.target.value as ZeitArt)}>
                <option value="arbeit">Arbeit</option>
                <option value="pause">Pause</option>
              </Auswahl>
            )}
          />
        </div>
        <div className={styles.formularZeile}>
          <Feld label="Von" render={(id) => <Eingabe id={id} type="time" value={von} mono onChange={(event) => setVon(event.target.value)} />} />
          <Feld label="Bis" render={(id) => <Eingabe id={id} type="time" value={bis} mono onChange={(event) => setBis(event.target.value)} />} />
        </div>
        <Feld label="Bemerkung" hinweis="Warum nachgetragen? Z. B. «Handy im Fahrzeug vergessen»" render={(id) => <Textbereich id={id} rows={2} value={bemerkung} onChange={(event) => setBemerkung(event.target.value)} />} />
        {fehler && <p className={styles.formularFehler}>{fehler}</p>}
      </div>
    </Dialog>
  );
}

// ── §2 · Korrigieren ─────────────────────────────────────────────

interface KorrekturDialogProps {
  open: boolean;
  eintrag: ZeitEintrag | null;
  eintraege: readonly ZeitEintrag[];
  jetztMin: number;
  heute: IsoDatum;
  onClose: () => void;
  onSpeichern: (aenderung: { art: ZeitArt; vonMin: number; bisMin: number | null }, grund: string) => void;
}

export function KorrekturDialog({ open, eintrag, eintraege, jetztMin, heute, onClose, onSpeichern }: KorrekturDialogProps) {
  const [art, setArt] = useState<ZeitArt>('arbeit');
  const [von, setVon] = useState('08:00');
  const [bis, setBis] = useState('');
  const [grund, setGrund] = useState('');

  useEffect(() => {
    if (!open || !eintrag) return;
    setArt(eintrag.art);
    setVon(formatZeit(eintrag.vonMin));
    setBis(eintrag.bisMin === null ? '' : formatZeit(eintrag.bisMin));
    setGrund('');
  }, [open, eintrag]);

  const fehler = useMemo(() => {
    if (!eintrag) return 'Kein Eintrag.';
    const vonMin = minutenAus(von);
    const bisMin = bis.trim() === '' ? null : minutenAus(bis);
    if (vonMin === null) return 'Von als Uhrzeit (hh:mm) eingeben.';
    if (bis.trim() !== '' && bisMin === null) return 'Bis als Uhrzeit (hh:mm) eingeben oder leer lassen (läuft).';
    if (bisMin === null && eintrag.datum !== heute) return 'Ein vergangener Tag braucht eine Bis-Zeit.';
    if (bisMin === null && vonMin > jetztMin) return 'Von liegt in der Zukunft.';
    if (bisMin !== null && bisMin <= vonMin) return 'Bis muss nach Von liegen.';
    if (grund.trim().length < 3) return 'Ein Grund ist Pflicht – er bleibt in der Korrekturspur.';
    const kollision = ueberlappt(eintraege, { mitarbeiterId: eintrag.mitarbeiterId, datum: eintrag.datum, vonMin, bisMin }, eintrag.id);
    if (kollision) return `Überschneidet sich mit ${formatZeit(kollision.vonMin)}–${kollision.bisMin === null ? 'offen' : formatZeit(kollision.bisMin)}.`;
    return null;
  }, [eintrag, von, bis, grund, eintraege, heute, jetztMin]);

  const speichern = () => {
    const vonMin = minutenAus(von);
    if (!eintrag || vonMin === null || fehler) return;
    onSpeichern({ art, vonMin, bisMin: bis.trim() === '' ? null : minutenAus(bis) }, grund.trim());
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel="Zeit korrigieren"
      untertitel={eintrag ? `${formatDatum(eintrag.datum)} · bisher ${formatZeit(eintrag.vonMin)}–${eintrag.bisMin === null ? 'offen' : formatZeit(eintrag.bisMin)} (${eintrag.art})` : undefined}
      breite="sm"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" icon={Pencil} disabled={fehler !== null} onClick={speichern}>
            Korrigieren
          </Button>
        </>
      }
    >
      <div className={styles.formular}>
        <div className={styles.formularZeile}>
          <Feld label="Von" render={(id) => <Eingabe id={id} type="time" value={von} mono onChange={(event) => setVon(event.target.value)} />} />
          <Feld label="Bis" hinweis="Leer = läuft noch (nur heute)" render={(id) => <Eingabe id={id} type="time" value={bis} mono onChange={(event) => setBis(event.target.value)} />} />
        </div>
        <Feld
          label="Art"
          render={(id) => (
            <Auswahl id={id} value={art} onChange={(event) => setArt(event.target.value as ZeitArt)}>
              <option value="arbeit">Arbeit</option>
              <option value="pause">Pause</option>
            </Auswahl>
          )}
        />
        <Feld label="Grund (Pflicht)" render={(id) => <Eingabe id={id} value={grund} placeholder="z. B. Stempel vergessen, Pause nachgetragen" onChange={(event) => setGrund(event.target.value)} />} />
        <p className={styles.formularHinweis}>Der bisherige Wert bleibt in der Korrekturspur erhalten (ArGV 1 Art. 73): wer, wann, warum.</p>
        {fehler && grund.trim().length >= 3 && <p className={styles.formularFehler}>{fehler}</p>}
      </div>
    </Dialog>
  );
}

// ── §3 · Grund erfragen ──────────────────────────────────────────

interface GrundDialogProps {
  open: boolean;
  titel: string;
  text: string;
  bestaetigen: string;
  gefaehrlich?: boolean;
  /** Grund optional – sonst Pflicht ab drei Zeichen. */
  optional?: boolean;
  onClose: () => void;
  onBestaetigen: (grund: string) => void;
}

export function GrundDialog({ open, titel, text, bestaetigen, gefaehrlich = false, optional = false, onClose, onBestaetigen }: GrundDialogProps) {
  const [grund, setGrund] = useState('');
  useEffect(() => {
    if (open) setGrund('');
  }, [open]);
  const bereit = optional || grund.trim().length >= 3;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={titel}
      breite="sm"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant={gefaehrlich ? 'danger' : 'primary'}
            icon={Check}
            disabled={!bereit}
            onClick={() => {
              onBestaetigen(grund.trim());
              onClose();
            }}
          >
            {bestaetigen}
          </Button>
        </>
      }
    >
      <div className={styles.formular}>
        <p className={styles.formularHinweis}>{text}</p>
        <Feld label={optional ? 'Bemerkung' : 'Grund (Pflicht)'} render={(id) => <Textbereich id={id} rows={3} value={grund} onChange={(event) => setGrund(event.target.value)} />} />
      </div>
    </Dialog>
  );
}

// ── §4 · Monat einreichen ────────────────────────────────────────

interface AbschlussDialogProps {
  open: boolean;
  konto: ZeitkontoMonat | null;
  onClose: () => void;
  onEinreichen: (bemerkung: string) => void;
}

export function AbschlussDialog({ open, konto, onClose, onEinreichen }: AbschlussDialogProps) {
  const [bemerkung, setBemerkung] = useState('');
  useEffect(() => {
    if (open) setBemerkung('');
  }, [open]);
  if (!konto) return null;
  const offen = konto.tage.filter((tag) => tag.warnungen.includes('offen')).length;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titel={`Monat ${monatLabel(konto.monat)} einreichen`}
      untertitel={`${konto.mitarbeiter.vorname} ${konto.mitarbeiter.nachname}`}
      breite="sm"
      aktionen={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            icon={Send}
            disabled={offen > 0}
            onClick={() => {
              onEinreichen(bemerkung.trim());
              onClose();
            }}
          >
            Einreichen
          </Button>
        </>
      }
    >
      <div className={styles.formular}>
        <p className={styles.formularHinweis}>
          Soll {formatDauer(konto.periode.sollMin)} · Ist {formatDauer(konto.periode.arbeitMin)} · Saldo {formatSaldo(konto.periode.saldoMin)} · kumuliert {formatSaldo(konto.saldoKumuliertMin)}
          {konto.periode.tageMitWarnung > 0 && ` · ${konto.periode.tageMitWarnung} Tage mit Warnung`}
        </p>
        {offen > 0 && <p className={styles.formularFehler}>{offen} Tag(e) sind nicht ausgestempelt – zuerst korrigieren.</p>}
        <Feld label="Bemerkung an die Vorgesetzten" render={(id) => <Textbereich id={id} rows={3} value={bemerkung} onChange={(event) => setBemerkung(event.target.value)} />} />
        <p className={styles.formularHinweis}>Nach der Genehmigung sind die Zeiten dieses Monats gesperrt. Zurückgewiesene Monate lassen sich korrigieren und neu einreichen.</p>
      </div>
    </Dialog>
  );
}

/* ◆ jh · eof */
