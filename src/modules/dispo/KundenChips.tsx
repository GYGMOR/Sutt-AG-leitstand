/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  modules/dispo/KundenChips.tsx                      │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Kunden-Info-Chips: Rechnung offen, Stammkunde, Schlüssel, Hund …      │
   └────────────────────────────────────────────────────────────────────────┘ */

import { CircleParking, Dog, KeyRound, Receipt, Star, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useHeute } from '../../core/arbeitstag';
import type { HinweisArt, Kunde, KundenHinweis, Liegenschaft } from '../../core/domain/stammdaten';
import { formatSeit } from '../../core/format';
import { Chip } from '../../core/ui/Chip';
import type { ChipTone } from '../../core/ui/Chip';
import styles from './KundenChips.module.css';

// ── §1 · Zuordnung ───────────────────────────────────────────────

const ICON: Readonly<Record<HinweisArt, LucideIcon>> = {
  'rechnung-offen': Receipt,
  stammkunde: Star,
  'schluessel-verwaltung': KeyRound,
  hund: Dog,
  vorsicht: TriangleAlert,
  parkplatz: CircleParking,
};

const KURZ: Readonly<Record<HinweisArt, string>> = {
  'rechnung-offen': 'Rechnung offen',
  stammkunde: 'Stammkunde',
  'schluessel-verwaltung': 'Schlüssel bei Verwaltung',
  hund: 'Hund im Haus',
  vorsicht: 'Vorsicht',
  parkplatz: 'Parkieren',
};

const TON: Readonly<Record<HinweisArt, ChipTone>> = {
  'rechnung-offen': 'danger',
  stammkunde: 'ok',
  'schluessel-verwaltung': 'neutral',
  hund: 'neutral',
  vorsicht: 'signal',
  parkplatz: 'neutral',
};

// ── §2 · Komponente ──────────────────────────────────────────────

interface KundenChipsProps {
  kunde: Kunde;
  liegenschaft: Liegenschaft;
  /** Nur Icons mit Tooltip (Karten im Eingang, Hovercard). */
  kompakt?: boolean;
}

// jh› Kleine Hinweise, die der Techniker vor Ort braucht – Kunde und
//     Liegenschaft zusammen, Rechnungsstand aus dem Datum gerechnet.
export function KundenChips({ kunde, liegenschaft, kompakt = false }: KundenChipsProps) {
  const heute = useHeute();
  const hinweise: KundenHinweis[] = [...kunde.hinweise, ...liegenschaft.hinweise];
  if (kunde.rechnungOffenSeit && !hinweise.some((hinweis) => hinweis.art === 'rechnung-offen')) {
    hinweise.unshift({ art: 'rechnung-offen', text: `Rechnung offen ${formatSeit(kunde.rechnungOffenSeit, heute)}` });
  }
  if (hinweise.length === 0) return null;

  return (
    <div className={styles.chips}>
      {hinweise.map((hinweis, index) => {
        const Icon = ICON[hinweis.art];
        const label = hinweis.art === 'rechnung-offen' && kunde.rechnungOffenSeit ? `Rechnung offen ${formatSeit(kunde.rechnungOffenSeit, heute)}` : KURZ[hinweis.art];
        if (kompakt) {
          return (
            <span key={`${hinweis.art}-${index}`} className={styles.icon} title={`${label} – ${hinweis.text}`}>
              <Icon size={16} strokeWidth={1.5} aria-label={label} />
            </span>
          );
        }
        return (
          <Chip key={`${hinweis.art}-${index}`} icon={Icon} tone={TON[hinweis.art]} size="md" title={hinweis.text}>
            {label}
          </Chip>
        );
      })}
    </div>
  );
}

/* ◆ jh · eof */
