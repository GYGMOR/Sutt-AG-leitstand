/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  core/theme.ts                                      │
   │  ◆ JH · 2026.10 · rev 02                                               │
   │  Hell/Dunkel: data-theme am <html>, persistiert, Store-basiert         │
   └────────────────────────────────────────────────────────────────────────┘ */

import { createStore, readPersisted, useStore, writePersisted } from './store';

// ── §1 · Typen ───────────────────────────────────────────────────

export type Theme = 'light' | 'dark';

type ThemeAction = { kind: 'set'; theme: Theme } | { kind: 'toggle' };

const SPEICHER_KEY = 'sl.theme';

function isTheme(wert: unknown): wert is Theme {
  return wert === 'light' || wert === 'dark';
}

// ── §2 · Store ───────────────────────────────────────────────────

function themeReducer(state: Theme, action: ThemeAction): Theme {
  if (action.kind === 'set') return action.theme;
  return state === 'light' ? 'dark' : 'light';
}

// jh› Light zuerst (Büro). Kein prefers-color-scheme-Automatismus: der
//     Leitstand soll am Morgen gleich aussehen wie am Abend, ausser man
//     stellt ihn bewusst um.
export const themeStore = createStore(themeReducer, readPersisted<Theme>(SPEICHER_KEY, 'light', isTheme));

function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme;
  writePersisted(SPEICHER_KEY, theme);
}

applyTheme(themeStore.getState());
themeStore.subscribe(() => applyTheme(themeStore.getState()));

// ── §3 · Hook ────────────────────────────────────────────────────

export function useTheme(): { theme: Theme; toggleTheme: () => void; setTheme: (theme: Theme) => void } {
  const theme = useStore(themeStore, (state) => state);
  return {
    theme,
    toggleTheme: () => themeStore.dispatch({ kind: 'toggle' }),
    setTheme: (neu) => themeStore.dispatch({ kind: 'set', theme: neu }),
  };
}

/* ◆ jh · eof */
