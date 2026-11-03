// Builds the Play Store app's web files into www/ (Capacitor's webDir). Usage: node tools/build-app.js
// (npm run sync also runs `npx cap sync android`, which copies www/ into the Android project).
//
// It copies index.html with STORE_BUILD switched on (no dev menu outside a sandbox, no service worker or install
// button, Android back button, background pause, Supporter Pack), swaps the Google Fonts link for the bundled
// Press Start 2P (the app must work offline from the first launch), and copies the icons the page uses.
// The web game (index.html in the repo root, served by GitHub Pages) is never changed.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');

fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(path.join(out, 'fonts'), {recursive: true});

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function swap(from, to) {
  if (!html.includes(from)) throw new Error('build-app: index.html no longer contains ' + JSON.stringify(from));
  html = html.replace(from, to);
}
swap('const STORE_BUILD=false;', 'const STORE_BUILD=true;');
swap('<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">',
  `<style>
@font-face{font-family:'Press Start 2P';font-style:normal;font-weight:400;font-display:swap;src:url(fonts/press-start-2p-latin-400-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Press Start 2P';font-style:normal;font-weight:400;font-display:swap;src:url(fonts/press-start-2p-latin-ext-400-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
</style>`);
swap('<link rel="manifest" href="manifest.json">\n', ''); // a PWA manifest means nothing inside the app
if (/fonts\.googleapis|fonts\.gstatic/.test(html)) throw new Error('build-app: index.html still loads a web font');
if (!html.startsWith('<!DOCTYPE html>')) throw new Error('build-app: index.html must start with <!DOCTYPE html>');
fs.writeFileSync(path.join(out, 'index.html'), html);

const font = path.join(root, 'node_modules/@fontsource/press-start-2p');
if (!fs.existsSync(font)) throw new Error('build-app: run npm install first (needs @fontsource/press-start-2p)');
for (const f of ['press-start-2p-latin-400-normal.woff2', 'press-start-2p-latin-ext-400-normal.woff2'])
  fs.copyFileSync(path.join(font, 'files', f), path.join(out, 'fonts', f));
fs.copyFileSync(path.join(font, 'LICENSE'), path.join(out, 'fonts', 'OFL.txt')); // SIL Open Font License travels with the font

for (const f of ['icon-192.png', 'apple-touch-icon.png']) fs.copyFileSync(path.join(root, f), path.join(out, f));

const ver = (html.match(/const VER\s*=\s*'([^']+)'/) || [])[1];
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
if (ver !== pkg) throw new Error(`build-app: package.json version ${pkg} must match VER ${ver} (Android takes its version from package.json)`);
console.log(`www/ ready: 8-Bit Industry ${ver} (store build)`);
