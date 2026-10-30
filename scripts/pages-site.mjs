/* ┌────────────────────────────────────────────────────────────────────────┐
   │  SUTT·LEITSTAND  ·  scripts/pages-site.mjs                             │
   │  ◆ JH · 2026.11 · rev 06                                               │
   │  GitHub Pages: Leitstand, App und Website → site/, 404 mit Umleitung   │
   └────────────────────────────────────────────────────────────────────────┘ */

// Aufruf:  SL_BASE=/<repo>/ npm run pages:build   → baut Leitstand und App und legt site/ an
//          node scripts/pages-site.mjs            → nur zusammenlegen (Builds müssen zur Basis passen)

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { basisPfad } from './basis.mjs';

// ── §1 · Prüfung ─────────────────────────────────────────────────

const basis = basisPfad();
const ZIEL = 'site';

function pruefeBuild(ordner, erwartet) {
  const index = join(ordner, 'index.html');
  if (!existsSync(index)) {
    console.error(`✕ ${index} fehlt – zuerst bauen: SL_BASE=${basis} npm run build && npm run build:app`);
    process.exit(1);
  }
  // jh! Ein Build mit anderer Basis lädt seine Skripte vom falschen Ort – lieber hier stoppen als auf Pages.
  if (!readFileSync(index, 'utf8').includes(`src="${erwartet}assets/`)) {
    console.error(`✕ ${index} wurde nicht für die Basis ${erwartet} gebaut – SL_BASE=${basis} setzen und neu bauen.`);
    process.exit(1);
  }
}

pruefeBuild('dist', basis);
pruefeBuild(join('app', 'dist'), `${basis}app/`);
pruefeBuild(join('webseite', 'dist'), `${basis}webseite/`);

// ── §2 · 404.html ────────────────────────────────────────────────

// jh› GitHub Pages liefert für unbekannte Pfade nur die 404.html der Site-Wurzel. Sie schickt den Pfad als
//     «?/pfad» an den richtigen Einstieg (Leitstand oder App); index.html schreibt ihn zurück in die URL.
function vierNullVier(basisPfadSite) {
  return `<!doctype html>
<!-- ◆ JH · SUTT·LEITSTAND · Umleitung für SPA-Routen auf GitHub Pages -->
<html lang="de-CH">
  <head>
    <meta charset="UTF-8" />
    <title>SUTT Leitstand</title>
    <script>
      (function () {
        var basis = ${JSON.stringify(basisPfadSite)};
        var pfad = location.pathname;
        if (pfad.indexOf(basis) !== 0) { location.replace(basis); return; }
        var rest = pfad.slice(basis.length);
        var ziel = basis;
        if (rest === 'webseite' || rest.indexOf('webseite/') === 0) { location.replace(basis + 'webseite/'); return; }
        if (rest === 'app' || rest.indexOf('app/') === 0) { ziel = basis + 'app/'; rest = rest.slice(4); }
        var suche = location.search ? '&' + location.search.slice(1) : '';
        location.replace(ziel + '?/' + rest + suche + location.hash);
      })();
    </script>
  </head>
  <body>Weiterleitung …</body>
</html>
`;
}

// ── §3 · Zusammenlegen ───────────────────────────────────────────

rmSync(ZIEL, { recursive: true, force: true });
mkdirSync(ZIEL, { recursive: true });
cpSync('dist', ZIEL, { recursive: true });
cpSync(join('app', 'dist'), join(ZIEL, 'app'), { recursive: true });
cpSync(join('webseite', 'dist'), join(ZIEL, 'webseite'), { recursive: true });
writeFileSync(join(ZIEL, '404.html'), vierNullVier(basis));
writeFileSync(join(ZIEL, '.nojekyll'), '');
console.log(`◆ pages-site · ${ZIEL}/ für Basis ${basis} (Leitstand), ${basis}app/ (App) und ${basis}webseite/ (Website)`);

/* ◆ jh · eof */
