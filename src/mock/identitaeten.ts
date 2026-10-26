/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  mock/identitaeten.ts                               │
   │  ◆ JH · 2026.10 · rev 05                                               │
   │  Mock-Identitätsanbieter: Konten im Mandanten, Gruppen, ein Fremder    │
   └────────────────────────────────────────────────────────────────────────┘ */

import type { IdentitaetsAnbieter, IdentitaetsClaims } from '../core/auth/identitaet';
import { emailFuer } from './personal';

// ── §1 · Konten je Anbieter ──────────────────────────────────────

// jh› Das Produkt holt diese Angaben aus dem ID-Token (sub, email, name, groups) – hier stehen sie als
//     Liste, damit der Dialog «Konto wählen» den echten Ablauf zeigen kann, inklusive Fremdkonto und neuem Konto.
export const MOCK_IDENTITAETEN: Readonly<Record<IdentitaetsAnbieter, readonly IdentitaetsClaims[]>> = {
  microsoft: [
    { anbieter: 'microsoft', sub: 'ms-jh', email: emailFuer('Joel', 'Hediger'), name: 'Joel Hediger', vorname: 'Joel', nachname: 'Hediger', gruppen: ['SG-Disposition'] },
    { anbieter: 'microsoft', sub: 'ms-rw', email: emailFuer('Regula', 'Wild'), name: 'Regula Wild', vorname: 'Regula', nachname: 'Wild', gruppen: ['SG-Buero'] },
    { anbieter: 'microsoft', sub: 'ms-mb', email: emailFuer('Marco', 'Brunner'), name: 'Marco Brunner', vorname: 'Marco', nachname: 'Brunner', gruppen: ['SG-Aussendienst'] },
    { anbieter: 'microsoft', sub: 'ms-ad', email: emailFuer('Andrea', 'Dietrich'), name: 'Andrea Dietrich', vorname: 'Andrea', nachname: 'Dietrich', gruppen: ['SG-Admin'] },
    { anbieter: 'microsoft', sub: 'ms-pm', email: emailFuer('Petra', 'Meier'), name: 'Petra Meier', vorname: 'Petra', nachname: 'Meier', gruppen: ['SG-Aussendienst'] },
    { anbieter: 'microsoft', sub: 'ms-te', email: emailFuer('Thomas', 'Ehrler'), name: 'Thomas Ehrler', vorname: 'Thomas', nachname: 'Ehrler', gruppen: [] },
    { anbieter: 'microsoft', sub: 'ms-gast', email: 'gast@fremd.example', name: 'Externer Gast', gruppen: [] },
  ],
  google: [
    { anbieter: 'google', sub: 'g-jh', email: emailFuer('Joel', 'Hediger'), name: 'Joel Hediger', vorname: 'Joel', nachname: 'Hediger', gruppen: ['disposition@sutt.example'] },
    { anbieter: 'google', sub: 'g-sk', email: emailFuer('Sandra', 'Keller'), name: 'Sandra Keller', vorname: 'Sandra', nachname: 'Keller', gruppen: ['aussendienst@sutt.example'] },
    { anbieter: 'google', sub: 'g-pm', email: emailFuer('Petra', 'Meier'), name: 'Petra Meier', vorname: 'Petra', nachname: 'Meier', gruppen: [] },
    { anbieter: 'google', sub: 'g-gast', email: 'jemand@gmail.example', name: 'Privates Google-Konto', gruppen: [] },
  ],
};

/* ◆ jh · eof */
