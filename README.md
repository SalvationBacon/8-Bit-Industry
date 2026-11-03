# 8-BIT INDUSTRY

> Start with nothing · Automate everything · Launch

A factory automation game for phones, tablets and computers. Built as a single HTML file PWA.

On a computer: R rotates, Enter places, Esc cancels or closes, Ctrl+Z undoes, 1 to 5 pick the tabs, WASD or the arrow keys move the map, + and - (or the mouse wheel) zoom, Q selects and M opens the menu.

## Play
https://salvationbacon.github.io/8-Bit-Industry/

## Files
| File | Purpose |
|---|---|
| `index.html` | Full game: all code in one file |
| `manifest.json` | PWA manifest: standalone install, icons, theme |
| `sw.js` | Service worker: offline support, auto-updates |
| `icon-192.png` | Android home screen icon |
| `icon-512.png` | Splash / store icon |
| `apple-touch-icon.png` | iOS home screen icon |
| `icon-maskable-512.png` | Android adaptive icon (art inset for round masks) |
| `CLAUDE.md` | Project instructions: design, systems, roadmap, conventions |
| `docs/GDD.md` | Original Game Design Document (long-term vision) |
| `docs/ZONE3_DESIGN.md` | Zone 3: The Deep: design (implemented) |
| `tools/check.js` | Headless test: `node tools/check.js` (needs Playwright) |
| `tools/make-icons.js` | Regenerates the pixel-art app icons |

## Deploying updates
1. Upload changed files via GitHub's web UI (`Add file → Upload files`) or the `.` editor
2. **Always bump the cache version** in `sw.js` (e.g. `ebi-v171` → `ebi-v172`) on every update
3. **Always bump `VER`** in `index.html` and the `v-num` line on the title screen
4. GitHub Pages redeploys within 1–2 minutes
5. Players get the update automatically on their next session open

> Keep the icon filenames hyphenated (`icon-192.png`, not `icon192.png`): the manifest and service worker reference them by exact name.

## Dev mode
☰ menu → 🔒 DEV tile → type `BIGBANG`, then tap ⏩ in the top bar to speed up (up to ×50)

## Music
Every zone has its own playlist (3 or 4 tracks, plus a title theme), composed in the browser as it plays: each track keeps its main tune but the rest changes on every play. ☰ menu → Settings shows what's playing, with NEXT to skip.

## Stardust
Each Big Bang earns Stardust for permanent upgrades: levelled boosts (yield, speed, power, labs, belts, inserters, hazards), starting kits, carrying cargo between zones, skipping research (Echoes) and Stardust-only buildings (Quantum Extractor, Quantum Storage). Every Big Bang also starts a harder universe: the next Singularity needs 25% more components and pays 25% more Stardust.

## Blueprints
Blueprints are shared by every save, zone and universe on a device, and travel in backup codes. The Blueprints panel can export them all, or share one, as a code or file, and import codes from anyone.

## Sandbox
After your first Big Bang, SANDBOX on the title screen opens a creative mode: pick any zone, with every tech researched, building and crafting free and the Stardust buildings available. It keeps its own save, never touches your real game, and earns no achievements or Stardust. Switch zone from ☰ → SANDBOX.

## Recipe Book
☰ menu → Recipes lists every recipe and resource in your zone, with a search box. Tap any item icon in a menu to see how it is made and what uses it.

## Backups
☰ menu → 🛟 Backup (or BACKUP on the title screen): export a code or file holding your game, save slots and Stardust, and import it on any device.

## Statistics
☰ menu → Stats graphs what your machines make per minute for each item over the last 10 minutes or the last hour, and power made against power used. Tap or drag on a graph to read one moment, and tap an item to hide its line.

## Run timer
☰ menu → Settings → TIMER (off by default) shows a clock for each zone in the top bar, with a table of this run's times and your best times in the GOAL tab. A launch freezes the zone's time and shows it against your best; the Big Bang shows the full run. It counts game time only, and a zone played with dev tools or in a sandbox never sets a best.

## Accessibility
☰ menu → Settings → COLOURS turns on colour-blind mode: blue for good, pink for bad, light cyan for safe, and a cross on spots you can't build on. The colours stay distinct for red-green and blue-yellow colour blindness.

## Battery
☰ menu → Settings (or SETTINGS on the title screen), shared by every save on the device: sound effects, music and volume, FPS (30/60), resolution (100% down to 10%) and a one-tap 🔋 Battery Saver (30 FPS + 50%). The factory runs at the same speed whatever you pick.

## Version
v2.0.34: all five zones: Ironfield · The Scar · The Deep · The Bloom · The Singularity, plus the Big Bang and Stardust prestige
