# 8-BIT INDUSTRY

> Start with nothing · Automate everything · Launch

A factory automation game for mobile. Built as a single HTML file PWA.

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
| `CLAUDE.md` | Project instructions: design, systems, roadmap, conventions |
| `docs/GDD.md` | Original Game Design Document (long-term vision) |
| `docs/ZONE3_DESIGN.md` | Zone 3: The Deep: design (implemented) |
| `tools/check.js` | Headless test: `node tools/check.js` (needs Playwright) |

## Deploying updates
1. Upload changed files via GitHub's web UI (`Add file → Upload files`) or the `.` editor
2. **Always bump the cache version** in `sw.js` (e.g. `ebi-v122` → `ebi-v123`) on every update
3. **Always bump `VER`** in `index.html` and the `v-num` line on the title screen
4. GitHub Pages redeploys within 1–2 minutes
5. Players get the update automatically on their next session open

> Keep the icon filenames hyphenated (`icon-192.png`, not `icon192.png`): the manifest and service worker reference them by exact name.

## Dev mode
☰ menu → 🔒 DEV tile → type `BIGBANG`, then tap ⏩ in the top bar to speed up (up to ×50)

## Version
v1.4.2: all five zones: Ironfield · The Scar · The Deep · The Bloom · The Singularity, plus the Big Bang and Stardust prestige
