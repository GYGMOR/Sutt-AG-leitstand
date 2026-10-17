/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/layout/KommandoPalette.tsx                    │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Kommandopalette Strg+K: suchen (Auftrag, Kunde, SN) und handeln       │
   └────────────────────────────────────────────────────────────────────────┘ */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownLeft, Lock, Search } from 'lucide-react';
import { KOMMANDO_GRUPPE_LABEL, useKommandoRegistry } from '../kommando';
import type { Kommando, KommandoGruppe } from '../kommando';
import { findTreffer, normalizeSuchtext } from '../suche';
import type { SuchEintrag } from '../suche';
import { Kbd } from '../ui/Kbd';
import { cx } from '../ui/cx';
import styles from './KommandoPalette.module.css';

// ── §1 · Typen ───────────────────────────────────────────────────

type Zeile =
  | { art: 'kommando'; schluessel: string; kommando: Kommando }
  | { art: 'treffer'; schluessel: string; quelleId: string; quelleLabel: string; eintrag: SuchEintrag };

interface Abschnitt {
  titel: string;
  zeilen: Zeile[];
}

const GRUPPEN_REIHENFOLGE: readonly KommandoGruppe[] = ['aktion', 'navigation', 'ansicht', 'modul', 'system'];
const MAX_TREFFER = 8;

// ── §2 · Aufbau der Liste ────────────────────────────────────────

function kommandoPasst(kommando: Kommando, begriffe: readonly string[]): boolean {
  const text = normalizeSuchtext(`${kommando.label} ${kommando.stichworte ?? ''} ${KOMMANDO_GRUPPE_LABEL[kommando.gruppe]}`);
  return begriffe.every((begriff) => text.includes(begriff));
}

function buildAbschnitte(
  anfrage: string,
  kommandos: readonly Kommando[],
  quellen: readonly { id: string; label: string; eintraege: readonly SuchEintrag[] }[],
): Abschnitt[] {
  const begriffe = normalizeSuchtext(anfrage).split(/\s+/).filter(Boolean);
  const abschnitte: Abschnitt[] = [];

  // jh› Mit Suchbegriff zuerst die Datentreffer (das sucht man am häufigsten), dann passende Befehle.
  if (begriffe.length > 0) {
    for (const quelle of quellen) {
      const treffer = findTreffer(quelle.eintraege, anfrage, MAX_TREFFER);
      if (treffer.length === 0) continue;
      abschnitte.push({
        titel: quelle.label,
        zeilen: treffer.map((eintrag) => ({ art: 'treffer', schluessel: `${quelle.id}:${eintrag.id}`, quelleId: quelle.id, quelleLabel: quelle.label, eintrag })),
      });
    }
  }

  for (const gruppe of GRUPPEN_REIHENFOLGE) {
    const passende = kommandos.filter((kommando) => kommando.gruppe === gruppe && (begriffe.length === 0 || kommandoPasst(kommando, begriffe)));
    if (passende.length === 0) continue;
    abschnitte.push({
      titel: KOMMANDO_GRUPPE_LABEL[gruppe],
      zeilen: passende.map((kommando) => ({ art: 'kommando', schluessel: kommando.id, kommando })),
    });
  }
  return abschnitte;
}

// ── §3 · Komponente ──────────────────────────────────────────────

interface KommandoPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function KommandoPalette({ open, onClose }: KommandoPaletteProps) {
  const registry = useKommandoRegistry();
  const [anfrage, setAnfrage] = useState('');
  const [markiert, setMarkiert] = useState(0);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const eingabeRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);

  const kommandos = useMemo(() => Object.values(registry.kommandos).flat(), [registry.kommandos]);
  const quellen = useMemo(() => Object.values(registry.quellen), [registry.quellen]);
  const abschnitte = useMemo(() => buildAbschnitte(anfrage, kommandos, quellen), [anfrage, kommandos, quellen]);
  const zeilen = useMemo(() => abschnitte.flatMap((abschnitt) => abschnitt.zeilen), [abschnitte]);

  useEffect(() => {
    if (!open) return;
    setAnfrage('');
    setMarkiert(0);
    setHinweis(null);
    window.setTimeout(() => eingabeRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    const aktiv = listeRef.current?.querySelector<HTMLElement>('[data-markiert="true"]');
    aktiv?.scrollIntoView({ block: 'nearest' });
  }, [markiert]);

  function ausfuehren(zeile: Zeile) {
    if (zeile.art === 'treffer') {
      registry.quellen[zeile.quelleId]?.onSelect(zeile.eintrag.id);
      onClose();
      return;
    }
    if (zeile.kommando.gesperrt) {
      setHinweis(zeile.kommando.gesperrt);
      return;
    }
    zeile.kommando.run();
    onClose();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMarkiert((index) => Math.min(index + 1, zeilen.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setMarkiert((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      const zeile = zeilen[markiert];
      if (zeile) ausfuehren(zeile);
    } else if (event.key === 'Escape') {
      onClose();
    }
  }

  if (!open) return null;

  let laufindex = -1;

  return createPortal(
    <div className={styles.schleier} onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={styles.palette} role="dialog" aria-label="Kommandopalette">
        <div className={styles.suchzeile}>
          <Search size={16} strokeWidth={1.5} aria-hidden className={styles.lupe} />
          <input
            ref={eingabeRef}
            type="text"
            role="combobox"
            aria-expanded
            aria-controls="sl-palette-liste"
            aria-autocomplete="list"
            className={styles.eingabe}
            placeholder="Auftrag, Kunde, Adresse, Seriennummer – oder ein Befehl …"
            value={anfrage}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => {
              setAnfrage(event.target.value);
              setMarkiert(0);
              setHinweis(null);
            }}
            onKeyDown={onKeyDown}
          />
          <Kbd keys={['Esc']} />
        </div>

        <div ref={listeRef} id="sl-palette-liste" role="listbox" className={styles.liste}>
          {abschnitte.map((abschnitt) => (
            <section key={abschnitt.titel} className={styles.abschnitt}>
              <h3 className={styles.abschnittTitel}>{abschnitt.titel}</h3>
              {abschnitt.zeilen.map((zeile) => {
                laufindex += 1;
                const index = laufindex;
                const istMarkiert = index === markiert;
                const gesperrt = zeile.art === 'kommando' && Boolean(zeile.kommando.gesperrt);
                const Icon = zeile.art === 'kommando' ? zeile.kommando.icon : undefined;
                return (
                  <div
                    key={zeile.schluessel}
                    role="option"
                    aria-selected={istMarkiert}
                    data-markiert={istMarkiert}
                    className={cx(styles.zeile, istMarkiert && styles.markiert, gesperrt && styles.gesperrt)}
                    onPointerEnter={() => setMarkiert(index)}
                    onClick={() => ausfuehren(zeile)}
                  >
                    {zeile.art === 'treffer' ? (
                      <>
                        <span className={styles.kennung}>{zeile.eintrag.kennung}</span>
                        <span className={styles.text}>
                          <span className={styles.titel}>{zeile.eintrag.titel}</span>
                          <span className={styles.untertitel}>{zeile.eintrag.untertitel}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.iconZelle}>
                          {gesperrt ? <Lock size={16} strokeWidth={1.5} aria-hidden /> : Icon && <Icon size={16} strokeWidth={1.5} aria-hidden />}
                        </span>
                        <span className={styles.text}>
                          <span className={styles.titel}>{zeile.kommando.label}</span>
                          {gesperrt && <span className={styles.untertitel}>{zeile.kommando.gesperrt}</span>}
                        </span>
                        {zeile.kommando.kuerzel && <Kbd keys={zeile.kommando.kuerzel.split(' ')} />}
                      </>
                    )}
                    {istMarkiert && !gesperrt && <CornerDownLeft size={16} strokeWidth={1.5} aria-hidden className={styles.enter} />}
                  </div>
                );
              })}
            </section>
          ))}
          {zeilen.length === 0 && <p className={styles.leer}>Keine Treffer für «{anfrage.trim()}»</p>}
        </div>

        <footer className={styles.fuss}>
          {hinweis ? (
            <span className={styles.hinweis}>
              <Lock size={12} strokeWidth={1.5} aria-hidden /> {hinweis}
            </span>
          ) : (
            <span>↑↓ wählen · ↵ ausführen · Esc schliessen</span>
          )}
          <span className={styles.fussRechts}>◆ Leitstand</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/* ◆ jh · eof */
