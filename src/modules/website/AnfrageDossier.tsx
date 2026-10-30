/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/website/AnfrageDossier.tsx                 │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  Anfrage-Dossier: Anliegen, Kontakt, Kundenvorschlag, Erledigung       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { ClipboardPlus, Mail, UserCheck, XCircle } from 'lucide-react';
import { ANFRAGE_STATUS_LABEL, ANLIEGEN_KATEGORIE, ANLIEGEN_LABEL } from '../../core/domain/anfrage';
import { KATEGORIE_LABEL } from '../../core/domain/kategorie';
import { formatStrasse } from '../../core/domain/stammdaten';
import { formatZeitpunktKurz } from '../../core/format';
import { Button } from '../../core/ui/Button';
import { Chip } from '../../core/ui/Chip';
import { DossierAbschnitt, DossierKopf, Fakten } from '../../core/ui/ModulSeite';
import { Typenschild } from '../../core/ui/Typenschild';
import { Verweis, ZIEL } from '../../core/ui/Verweis';
import { kategorieKlasse } from '../../core/ui/farben';
import type { DispoStammdaten } from '../dispo/dispo.types';
import { TREFFER_LABEL, terminwunschText } from './website.model';
import type { AnfrageView } from './website.model';
import styles from './Website.module.css';

// ── §1 · Dossier ─────────────────────────────────────────────────

const STATUS_TON = { neu: 'signal', angenommen: 'ok', abgelehnt: 'mute' } as const;

interface AnfrageDossierProps {
  view: AnfrageView;
  stammdaten: DispoStammdaten;
  onAuftragErfassen: (view: AnfrageView) => void;
  onAntworten: (view: AnfrageView, ablehnung: boolean) => void;
}

export function AnfrageDossier({ view, stammdaten, onAuftragErfassen, onAntworten }: AnfrageDossierProps) {
  const { anfrage, treffer } = view;
  const auftrag = anfrage.auftragId ? stammdaten.auftraege.get(anfrage.auftragId) : undefined;
  const wunsch = terminwunschText(anfrage);

  return (
    <div>
      <DossierKopf
        kennung={<Typenschild label="Anfrage" wert={anfrage.nummer} size="md" />}
        titel={anfrage.kontakt.name}
        untertitel={`${ANLIEGEN_LABEL[anfrage.anliegen]} · ${anfrage.geraeteart}${anfrage.marke ? ` ${anfrage.marke}` : ''} · eingegangen ${formatZeitpunktKurz(anfrage.eingegangenAm)}`}
        chips={
          <>
            <Chip tone={STATUS_TON[anfrage.status]}>{ANFRAGE_STATUS_LABEL[anfrage.status]}</Chip>
            {anfrage.dringend && <Chip tone="danger">Dringend</Chip>}
            <Chip tone="tint" className={kategorieKlasse(ANLIEGEN_KATEGORIE[anfrage.anliegen])}>
              {KATEGORIE_LABEL[ANLIEGEN_KATEGORIE[anfrage.anliegen]]}
            </Chip>
            {wunsch && <Chip tone="neutral">Wunsch {wunsch}</Chip>}
            {anfrage.fotoName && <Chip tone="neutral">Foto</Chip>}
          </>
        }
        aktionen={
          anfrage.status === 'neu' ? (
            <>
              <Button variant="primary" size="sm" icon={ClipboardPlus} onClick={() => onAuftragErfassen(view)}>
                Auftrag erfassen
              </Button>
              <Button variant="secondary" size="sm" icon={Mail} onClick={() => onAntworten(view, false)}>
                Antworten
              </Button>
              <Button variant="ghost" size="sm" icon={XCircle} onClick={() => onAntworten(view, true)}>
                Ablehnen
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" icon={Mail} onClick={() => onAntworten(view, false)}>
              Nochmals antworten
            </Button>
          )
        }
      />

      <DossierAbschnitt titel="Anliegen">
        <Fakten
          eintraege={[
            { label: 'Anliegen', wert: ANLIEGEN_LABEL[anfrage.anliegen] },
            { label: 'Gerät', wert: `${anfrage.geraeteart}${anfrage.marke ? ` · ${anfrage.marke}` : ''}` },
            { label: 'Terminwunsch', wert: wunsch ?? 'keiner' },
            { label: 'Foto', wert: anfrage.fotoName ?? 'keines', mono: true },
          ]}
        />
        <p className={styles.fehlerbild}>{anfrage.fehlerbild}</p>
      </DossierAbschnitt>

      <DossierAbschnitt titel="Kontakt und Adresse">
        <Fakten
          eintraege={[
            { label: 'Name', wert: `${anfrage.kontakt.name} · ${anfrage.kontakt.rolle}` },
            { label: 'Telefon', wert: anfrage.kontakt.telefon || '–', mono: true },
            { label: 'E-Mail', wert: anfrage.kontakt.email || '–', mono: true },
            { label: 'Adresse', wert: `${anfrage.adresse.strasse}, ${anfrage.adresse.plz} ${anfrage.adresse.ort}${anfrage.adresse.wohnung ? ` · ${anfrage.adresse.wohnung}` : ''}` },
            ...(anfrage.kundennummer ? [{ label: 'Kundennummer', wert: anfrage.kundennummer, mono: true }] : []),
          ]}
        />
      </DossierAbschnitt>

      <DossierAbschnitt titel="Kunde">
        {treffer ? (
          <div className={styles.treffer}>
            <UserCheck size={16} strokeWidth={1.5} aria-hidden />
            <span className={styles.trefferText}>
              {TREFFER_LABEL[treffer.grund]}: <Verweis zu={ZIEL.kunde(treffer.kunde.id)} label="Kunde" wert={treffer.kunde.nummer} text={treffer.kunde.name} />
              {treffer.liegenschaft && (
                <>
                  {' · '}
                  <Verweis zu={ZIEL.liegenschaft(treffer.kunde.id, treffer.liegenschaft.id)} label="Liegenschaft" wert={treffer.liegenschaft.objektNummer ?? treffer.liegenschaft.id} text={`${formatStrasse(treffer.liegenschaft.adresse)}, ${treffer.liegenschaft.adresse.ort}`} />
                </>
              )}
            </span>
          </div>
        ) : (
          <p className={styles.fussnote}>Kein bekannter Kunde – «Auftrag erfassen» öffnet die Schnellerfassung mit den Angaben der Anfrage; der Kunde wird dort angelegt oder gewählt.</p>
        )}
      </DossierAbschnitt>

      {(auftrag || anfrage.antwort) && (
        <DossierAbschnitt titel="Erledigung">
          <Fakten
            eintraege={[
              ...(auftrag ? [{ label: 'Auftrag', wert: <Verweis zu={ZIEL.auftrag(auftrag.id)} label="Auftrag" wert={auftrag.nummer} text={auftrag.fehlerbild} /> }] : []),
              ...(anfrage.antwort ? [{ label: 'Antwort', wert: `${formatZeitpunktKurz(anfrage.antwort.am)} · ${anfrage.antwort.kanal === 'mail' ? 'E-Mail' : 'SMS'} · ${anfrage.antwort.von}` }] : []),
            ]}
          />
          {anfrage.antwort && <p className={styles.antwort}>{anfrage.antwort.text}</p>}
        </DossierAbschnitt>
      )}

      <DossierAbschnitt titel="Datenschutz">
        <p className={styles.fussnote}>
          Einwilligung zur Bearbeitung am {formatZeitpunktKurz(anfrage.datenschutzZugestimmtAm)} über das Formular der Website. Die Angaben dienen nur der Terminvereinbarung; ohne Auftrag werden sie nach
          der Frist für Aufträge gelöscht (Einstellungen → Datenschutz).
        </p>
      </DossierAbschnitt>
    </div>
  );
}

/* ◆ jh · eof */
