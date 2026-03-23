# 8-BIT INDUSTRY

> Start with nothing · Automate everything · Launch

A factory automation game for mobile. Built as a single HTML file PWA.

## Play
https://[your-username].github.io/[your-repo-name]/

## Files
| File | Purpose |
|---|---|
| `index.html` | Full game — all code in one file |
| `manifest.json` | PWA manifest — standalone install, icons, theme |
| `sw.js` | Service worker — offline support, auto-updates |
| `icon-192.png` | Android home screen icon |
| `icon-512.png` | Splash / store icon |
| `apple-touch-icon.png` | iOS home screen icon |

## Deploying updates
1. Upload changed files via GitHub's web UI (`Add file → Upload files`) or the `.` editor
2. **Always bump the cache version** in `sw.js` (`ebi-v26` → `ebi-v27`) on every update
3. GitHub Pages redeploys within 1–2 minutes
4. Players get the update automatically on their next session open

## Dev mode
Menu (☰) → 🔒 DEV → type `BIGBANG`

## Version
v1.0.0 — Zone 1: Ironfield
