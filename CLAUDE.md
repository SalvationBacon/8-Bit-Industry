# 8-BIT INDUSTRY — Project Instructions
### Working document for Claude sessions

---

## Overview

**Genre:** Factory automation / idle-adjacent
**Platform:** Mobile PWA (single HTML file)
**Aesthetic:** Dark pixel art, Press Start 2P font, amber/teal accent palette
**Tagline:** Start with nothing · Automate everything · Launch
**Current build:** v1.1.8 — Zone 1: Ironfield / Zone 2: The Scar
**Working file:** `index.html` — ~5,300 lines, single file, never split
**Live URL:** https://salvationbacon.github.io/8-Bit-Industry/

---

## Deployment Files

| File | Purpose |
|---|---|
| `index.html` | Full game + PWA meta tags + service worker registration |
| `manifest.json` | App name, icons, theme #0d0d0d, standalone, orientation: any |
| `sw.js` | Service worker — network-first HTML, cache-first assets. Current: `ebi-v116` |
| `icon-192.png` | Android home screen icon |
| `icon-512.png` | Splash / store icon |
| `apple-touch-icon.png` | iOS home screen icon |
| `README.md` | GitHub repo readme |
| `CLAUDE.md` | This file |

**Updating GitHub:** Upload via Add file → Upload files, or `.` web editor
**Always bump cache version** in `sw.js` on every update
**Always bump `VER` constant and `v-num` on title screen** on every delivery
**Icon filenames must keep their hyphens.** GitHub's uploader stripped them once (v0.95 → `icon192.png`), which broke the manifest icons and the service worker pre-cache. Fixed in v1.1.8.
GitHub Pages auto-redeploys within 1–2 minutes
SW uses network-first for HTML — players automatically get updates on next open

---

## Dev Mode

**Unlock:** Menu (☰) → 🔒 DEV → type `BIGBANG`
**Disable:** Same, type `BIGBANGOFF`
Persists in save as `G.devMode`; adds a 🛠 DEV section to the ☰ menu

**Dev panel features:**
- Sim speed: ×1 / ×4 / ×10 / ×20
- Free crafting / free building toggles
- Unlock all techs instantly
- Give resources (per item) + Give All ×500
- Give rocket components (`devCompleteRocket()` — also unlocks Rocket Science)
- Give Zone 2 repair components (`devCompleteZ2()` — Zone 2 only, unlocks Z2 techs + 20 refined fuel)
- Reset save (confirmed, reloads page)

---

## Save System

**Auto-save key:** `ebi_save` (`SAVE_KEY`)
**Manual save slots:** `ebi_save_slot1`, `ebi_save_slot2`, `ebi_save_slot3`
**Autosave:** every 120 ticks (30s); also on place/remove, research, launch, perk purchase
**Load paths:** `continueGame()` (autosave) and `loadFromSlot(s)` both backfill missing keys — add any new top-level key's default to **both**.

**State keys in `G`** (all declared in `defaultState()`):

```js
ver, tick, sfx, music, musicVol, _savedAt
zone         // 1 | 2 — current zone
smog         // 0–100, Zone 2 only
inv          // { itemId: count }
crafted      // { machineId: count } — built but unplaced machines
map          // MAP_W×MAP_H tile array — buildMap() (Z1) / buildMapZ2() (Z2)
machines     // { id: machineState }
nextId
power        // { out: kW, in: kW } — recomputed every tick
research     // { done: [techId] } — carried across zones
cam          // { x, y, zoom }
stats        // { placed, taps, mined, launched } — mined = miner/oil pump output (achievements)
blueprints   // [{ name, data[] }]
craftState   // { recipeId, clicks }
achievements // [achievementId]
tutorial     // { step } — Zone 1 tutorial (-1 = complete/skipped)
tutorialZ2   // index into Z2_TUTORIAL (-1 = done, undefined = not started)
devMode, devFreeCraft, devFreeBuild, devTickSpeed
perks        // { points, spent:{perkId:true}, awarded:{zone:true} } — carried across zones
```

**Machine state keys (per machine in `G.machines`):**
```js
id, type, x, y, dir, recipe, prog, active
inBuf, outBuf, chestInv, mineRes, produced
lastTransfer, lastTransferMs
tier          // 1|2|3
splitSide     // splitter: 0|1 alternating
tunnelId      // tunnel partner id (null if unlinked)
modules       // [] installed module ids, max slots = tier-1
_pending, _times, arm   // transient, initialised lazily
```

---

## Zone Transitions

`transitionToZone2()` replaces `G` with `defaultState()` and keeps only: **research, perks, audio settings, devMode**. Inventory, machines, blueprints, achievements and stats reset. It then applies the Quick Start perk, builds the Zone 2 map, starts the Z2 mini-tutorial and shows the CRASH LANDING modal.

After a Zone 1 launch, the player is offered ⭐ PERKS / CONTINUE →. If they leave without continuing, the ☰ menu's Rocket section, the Rocket panel and the Perks panel all show **CONTINUE TO ZONE 2 →** (`continueToZone2()`), and relaunching is disabled.

Zone 2 launch currently ends with "Zone 3 coming soon...".

---

## Design System

### CSS Variables

```css
--bg:#0d0d0d  --bg2:#111  --bg3:#1a1a1a  --panel:#0f0f0f
--border:#222  --border2:#333
--amber:#f5a623 (primary)  --amberDim:#7a5010
--teal:#26c6a0 (secondary) --tealDim:#0d4a3a
--green:#4caf50  --red:#e53935  --blue:#42a5f5  --purple:#ab47bc (dev)
--text:#e8e8e8  --text2:#999  --text3:#555
--font:'Press Start 2P', monospace
```

### Font Sizes (Press Start 2P)
- 4–5px: tiny labels, menu sub-text
- 6px: category headers, panel body
- 7px: body UI text, values
- 8px: panel titles, HUD
- Mobile (≤600px): `.pbody` zoom 1.5, `.mb` zoom 1.4

### Game Constants
```js
TILE=48  MAP_W=96  MAP_H=64  TICK_MS=250 (4 ticks/sec)
MINE_TAPS=4                 // taps on the resource popup per ore
INS_GRAB_MS=800  INS_DEPOSIT_MS=80  INS_RETURN_MS=800
D_RIGHT=0, D_DOWN=1, D_LEFT=2, D_UP=3
```

---

## Layout

```
┌─────────────────────────────────────────────────┐
│  HUD: 8BI | Z1–Z5 tabs | resources | 🚀 ☰         │
├─────────────────────────────────────────────────┤
│  CANVAS (#wrap)                                  │
│   grid · machines · belts · items · smog overlay │
│   resource popup (TAP TO MINE)                   │
├─────────────────────────────────────────────────┤
│  buildHUD   (fixed, bottom:58px) ↻ / ✓ PLACE / ✕ │
│  multiselBar (fixed, top:0)                      │
│  ghostBar   (fixed, bottom:70px)                 │
│  tutHint    (flex child of #sGame)               │
│  tabDrawer  (slides up: categories + items)      │
│  tabBar: 🛠️ TOOLS | 🏗️ BUILD | 🔨 CRAFT | 🔬 RESEARCH │
└─────────────────────────────────────────────────┘
```

**Critical layout notes:**
- `tutHint`, `multiselBar`, `ghostBar` and `buildHUD` all live **outside `#wrap`** — inside it, canvas touch handling eats their taps on mobile.
- HUD only has 🚀 (`openBigMenu('rocket')`, shown once rocket research is done) and ☰ (`openBigMenu()`).
- Side panels (`pCraft pInv pResearch pRocket pMachine pDev pPerks pStats pAchieve pRecipes pBlueprint`) slide in from the right via `togglePanel(id)`; one open at a time.

### ☰ Menu (`openBigMenu(section)`)
Collapsible sections: 📦 Inventory · 🚀 Rocket · ⭐ Perks · 📊 Statistics · 🏆 Achievements · ⚙️ Settings & Audio · 💾 Save Slots · 🛠 Dev (dev mode only). Passing `section` opens that one.

### Bottom tab bar + drawer (`DRAWER_DEFS`, `switchTab`, `buildDrawer`)
- **TOOLS:** Select, Multi-Sel, Demolish, Rotate, Move, Blueprint
- **BUILD:** Logistics (Belt, Splitter, Tunnel, Inserter, Long Ins., Chest) · Extract (Miner, Burner, Generator) · Processing (Furnace, Blast Furn., Elec. Smelt., Assembler, Lab) · Oil (Oil Pump, Cracker, Refinery, Comb. Gen., Scrubber)
- **CRAFT:** hand-craft panel
- **RESEARCH:** tech tree panel

### Building
Selecting a machine shows a ghost. Tapping the map **moves the ghost only**; placement needs **✓ PLACE** (`confirmPlace()`) in `buildHUD`. The machine panel has MOVE (`moveSingleMachine` → multisel move), ROTATE (belt, inserters, tunnel, splitter) and DEMOLISH.

---

## Core Game Loop

```
Tap ore tile → TAP TO MINE (4 taps = 1 ore)
  → hand-craft plates/gears → Burner Generator + coal → power
  → Miners on deposits → furnaces/assemblers fed by inserters and belts
  → labs make science → research
  → upgrade (T1→T3), modules, splitters, tunnels
  → rocket components → LAUNCH → perk points → next zone
```

**Key simulation rules:**
- Machines only receive inputs from inserters — belts cannot feed machines directly
- Output goes to `outBuf`; machine stalls when `outBuf` total ≥ 50
- `inBuf` capped at 50 **per item type**
- Generators (burner, generator, combustion_gen) run in **pass 1** of `gameTick`, consumers in pass 2
- Generators only burn fuel when powered consumers exist
- **Hard power cutoff** — `powerRatio()` is 0 or 1
- Stone furnace and blast furnace are power-immune
- Chest hard cap: 200 items
- Zone 2: smog multiplies speed of miners and powered machines by `max(0.1, (100-smog)/100)`

---

## Machines

| ID | Name | Icon | Size | Power | Unlock | Notes |
|---|---|---|---|---|---|---|
| `miner` | Miner | ⛏️ | 1×1 | 3 | — | Mines deposit below. T1–T3 |
| `stone_furnace` | Stone Furnace | ⚱️ | 1×1 | 0 | — | Power-immune, needs coal |
| `blast_furnace` | Blast Furnace | 🔥 | 2×2 | 0 | automation | Power-immune, 2× speed |
| `electric_smelter` | Electric Smelter | 🌩️ | 2×2 | 20 | steel | 3× speed, no coal |
| `assembler` | Assembler | 🏗️ | 2×2 | 12 | automation | Parts, rocket + repair parts |
| `lab` | Research Lab | 🔬 | 2×2 | 6 | automation | Science packs |
| `burner` | Burner Generator | 🪵 | 1×1 | −15 | — | Coal |
| `generator` | Generator | ⚡ | 2×2 | −60 | logistics | Coal |
| `belt` | Belt | ➡️ | 1×1 | 0 | — | |
| `splitter` | Splitter | ⑂ | 1×2 | 0 | logistics | Alternates A/B; rotation supported (blocked if no room) |
| `tunnel` | Belt Tunnel | ⏬ | 1×1 | 0 | logistics | Auto-links within 5 tiles, same direction |
| `inserter` | Inserter | 🦾 | 1×1 | 1 | — | |
| `long_inserter` | Long Inserter | 🦿 | 1×1 | 2 | logistics | 2-tile reach |
| `chest` | Chest | 📦 | 1×1 | 0 | — | 200 cap |
| `oil_pump` | Oil Pump | 🛢️ | 2×2 | 8 | oil_extraction | Crude oil from oil deposits; +0.5 smog per output |
| `cracker` | Cracker | ⚗️ | 2×2 | 16 | oil_extraction | Crude → raw fuel + plastic |
| `refinery` | Refinery | 🏭 | 2×2 | 12 | oil_extraction | Raw fuel → refined fuel |
| `combustion_gen` | Combustion Gen. | 🔆 | 2×2 | −80 | smog_control | Burns refined fuel (1 per 8s) |
| `scrubber` | Scrubber | 🌿 | 1×2 | 6 | smog_control | Burns refined fuel to remove smog — **see Known Issues** |

---

## Items

**Zone 1** — Raw: Iron Ore 🪨, Copper Ore 🟫, Coal ⬛, Stone 🔲 · Smelted: Iron Plate 🔘, Copper Plate 🟠, Steel Plate ⬜, Stone Brick 🧱 · Parts: Iron Gear ⚙️, Copper Wire 〰️, Iron Rod ➖, Circuit 📟, Engine Block 🔧 · Modules: Speed 🔵, Prod 🟢, Eff 🔴 · Science: Field Notes 🗒️ (`sci_red`), Circuit Diagrams 📋 (`sci_green`), Adv. Schematics 📘 (`sci_blue`) · Rocket: Chassis 🗜️, Flight Computer 💾, Struct. Frame 🔩, Coal Propellant ⛽

**Zone 2** — Crude Oil 🛢️, Raw Fuel 🔶, Plastic 🟫, Refined Fuel 🔥, Polymer Sheet 🟪 · Science: Scar Notes 📓 (`sci_scar`), Smog Data 🌫️ (`sci_smog`), Repair Data 🔧 (`sci_repair`) · Repair (`cat:'rocket2'`): Hull Patch 🛡️, Engine Fix ⚙️, Nav Computer 🖥️, Fuel Tank 🗄️, Thruster 🔩, Power Cell 🔋

---

## Recipes

### Zone 1
- **Stone Furnace:** `fn_iron`, `fn_copper` — 2 ore + 1 coal → 1 plate (16s)
- **Blast Furnace:** `bf_iron/copper` (8s), `bf_steel` 5 plate + 2 coal (16s), `bf_prop` 10 coal + 5 stone → propellant (rocket_tech)
- **Electric Smelter:** `es_iron/copper` (6s), `es_steel` (10s), `es_prop` (rocket_tech)
- **Assembler:** `mk_gear/wire/rod/circuit` (automation), `mk_engine` (steel), `mk_speed_mod/prod_mod/eff_mod` (electronics), `mk_chassis/computer/frame` (rocket_tech)
- **Lab:** `sci_r` gear + 2 wire; `sci_g` circuit + 2 rod (logistics); `sci_b` 2 circuit + steel + 3 wire (electronics)

### Zone 2
- **Cracker:** `z2_crack` 3 crude → 2 raw fuel + 1 plastic (10s)
- **Refinery:** `z2_refine` 2 raw fuel → 1 refined fuel (8s)
- **Assembler:** `z2_polymer` 2 plastic + iron plate → polymer sheet
- **Lab:** `z2_sci_scar` raw fuel + gear (always); `z2_sci_smog` 2 plastic + 2 wire (oil_extraction); `z2_sci_rep` refined fuel + 2 circuit (smog_control)
- **Assembler (repair_tech):** `z2_hull` 4 steel + 3 plastic · `z2_engine` 2 refined fuel + engine · `z2_nav` 4 circuit + 2 plastic · `z2_tank` 3 steel + 3 refined fuel · `z2_thrust` engine + 3 plastic · `z2_cell` 3 circuit + 2 refined fuel

### Rocket requirements
- **Zone 1 (`ROCKET_PARTS`):** Chassis ×1, Flight Computer ×1, Struct. Frame ×1, Coal Propellant ×2
- **Zone 2 (`ROCKET_PARTS_Z2`):** Hull Patch ×4, Engine Fix ×1, Nav Computer ×1, Fuel Tank ×2, Thruster ×2, Power Cell ×1 **+ 20 Refined Fuel** consumed at launch

---

## Research Tech Tree

| Tech | Zone/Era | Cost | Requires | Unlocks |
|---|---|---|---|---|
| Basic Automation | Z1 Era 1 | 5 🗒️ | — | Blast Furnace, Assembler, Lab |
| Advanced Logistics | Z1 Era 1 | 50 🗒️ | automation | Generator, Splitter, Tunnel, Long Inserter, +50% belt, Circuit Diagrams |
| Steel Processing | Z1 Era 2 | 75 🗒️ + 50 📋 | automation + logistics | Steel, Electric Smelter |
| Electronics | Z1 Era 2 | 100 🗒️ + 75 📋 | automation + logistics | Modules, Adv. Schematics |
| Rocket Science | Z1 Era 3 | 125 🗒️ + 125 📋 + 50 📘 | steel + electronics | Rocket components |
| Oil Extraction | Z2 Era 1 | 10 📓 | — | Oil Pump, Cracker, Refinery, Polymer, Smog Data |
| Smog Control | Z2 Era 2 | 30 📓 + 20 🌫️ | oil_extraction | Scrubber, Combustion Gen., Repair Data |
| Rocket Repair | Z2 Era 3 | 50 📓 + 50 🌫️ + 20 🔧 | oil_extraction + smog_control | All 6 repair components |

Zone 2 techs carry `zone:2`; the research panel hides techs from the other zone.

---

## Zone 2 — The Scar

- Crash-landed: everything but research and perks is gone
- Map (`buildMapZ2()`): oil-heavy, with some iron/coal/stone for bootstrapping
- **Smog** (`G.smog`, 0–100): +0.5 per oil pump output, −0.1 per tick natural decay, Scrubbers meant to remove it. Shown as HUD meter, canvas overlay and in the Rocket section
- 3-step mini-tutorial (`Z2_TUTORIAL`): place oil pump → research Oil Extraction → build a Scrubber

---

## Perks

Earned on each zone's **first** launch (`LAUNCH_PERK_POINTS = {1:3, 2:3}`; guarded by `G.perks.awarded[zone]`). Saves from before v1.1.8 are backfilled on load (`backfillLaunchPerks()`). Perks carry across zones. Reached via ☰ → ⭐ PERKS or the ⭐ PERKS button on the launch modal.

| ID | Effect | Cost | Req |
|---|---|---|---|
| yield1 | +10% miner yield | 1 | — |
| yield2 | +25% yield (replaces yield1's bonus) | 2 | yield1 |
| speed1 | +10% machine speed | 1 | — |
| speed2 | +20% machine speed | 2 | speed1 |
| power1 | −15% power draw | 1 | — |
| start1 | Quick Start: +50 iron ore, copper ore, coal, stone on arrival in a new zone (`applyQuickStart()`) | 2 | — |
| belt1 | +20% belt speed | 1 | — |

Total cost is 10 points; 3 per zone means everything is affordable by the end of Zone 4.

---

## Other Systems (unchanged from earlier builds)

- **Splitter (1×2):** input from back face; outputs A (top cell front) and B (bottom cell front); alternates via `m.splitSide`, falls back to the other side if full. Only origin tile routes. `splitterArrow()` is defined outside the machine draw loop.
- **Tunnels:** `distForward > 0` = entrance, `< 0` = exit; unlinked tunnels stall; rotating re-links. Inserters treat tunnel tiles like belts.
- **Inserters:** destination-first check; state machine (`arm.state`: idle → grabbing → depositing → return) on real ms timings; hold item and retry if destination full; need power.
- **Multi-select:** select area → MOVE / ROTATE / COPY (auto-enters paste) / DEMO / CLEAR. `multiselState = {mode, x1,y1,x2,y2, ids[], clipboard[], pasteAnchor}`.
- **Blueprints:** up to 8; paste via ghost + ✓ PLACE (`ghostConfirm()`/`ghostCancel()`).
- **Tutorial (Zone 1):** 13 steps in `TUTORIAL_STEPS`; final step has inline "THE FACTORY MUST GROW" button → `completeTutorial()`.
- **Achievements:** 33, checked every 4 ticks. Mining ones count `G.stats.mined`, not taps.
- **Audio:** Web Audio SFX (`sfx(type)`) and procedural music (`musicStart/Stop`, `setMusicVol`). Pauses on tab hide.
- **Statistics:** bottleneck detector, Pause All / Resume All.

---

## Roadmap

### Done ✅
- Everything in Zone 1 (loop, 14 machine types, research eras, rocket)
- Inserter animation rework (state machine)
- Splitter rotation
- Long inserters
- Mobile build flow (✓ PLACE, move/demolish from machine panel, bottom tab bar + drawer)
- Zone 2: The Scar (oil chain, smog, repair rocket, mini-tutorial)
- Perk points on launch, perks carried across zones, Quick Start (v1.1.8)

### Known Issues
- **Scrubbers never remove smog.** In `runMachine`, `if(G.zone!==2||!G.tick%4===0)return;` parses as `(!G.tick)%4===0`, which is true on every tick after the first, so the scrubber always returns early. Intended: `G.tick%4!==0`. Fixing it as written would remove 3 smog every 4 ticks (12/sec) against +0.5 per pump output, so tune the numbers when fixing.
- **Achievements reset on zone transition** (part of the `defaultState()` wipe). Decide whether they should carry over like research.
- **Yield II** description says "stacks" but `perkMult()` gives a flat 1.25.

### Mid Term
- Belt corner visuals (smooth direction-change rendering)

### Long Term
- Zone 3: The Deep (crystals, pressure mechanic) — needs a design pass before code
- Zone 4: The Bloom (biological machines, decay)
- Zone 5: The Singularity + Big Bang prestige (Z5 tab already in HUD)

---

## Coding Conventions

- Single `index.html` — never split
- Vanilla JS only — no frameworks, no libraries
- All state in `G` declared once in `defaultState()`; backfill new keys in `continueGame()` and `loadFromSlot()`
- Mobile-first

**Every delivery checklist:**
1. Bump `sw.js` cache version (`ebi-vN`)
2. Bump `VER` constant in JS
3. Bump `v-num` on title screen HTML
4. Run JS syntax check (`new Function()` on each inline script block)
5. Verify file starts with `<!DOCTYPE html>`

Headless Chromium + Playwright are available in cloud sessions for smoke tests (load `index.html` via `file://`, call `newGame()`, dev helpers like `devCompleteRocket()` / `devCompleteZ2()`, and watch for `pageerror`).

### File Safety Rules
- Check replacement target strings are unique before replacing
- After edits near function declarations, verify the function still exists inside `<script>`
- Never let JS leak before `<!DOCTYPE html>`
- Keep `tutHint`, `multiselBar`, `ghostBar`, `buildHUD` outside `#wrap`

### Known Gotchas
- Touch events fire synthetic mouse events — handled by `lastTouch` debounce in `setupInput`
- `perkMult()` returns multipliers (1.10 = +10%); `power` is a multiplier on draw (0.85)
- `recordOutput(m,n)` uses `Date.now()`, not `G.tick`; it also increments `G.stats.mined` for miners/oil pumps
- `outBuf` stall is per-machine total; `inBuf` cap is per item type
- `machSize(typeOrM, dir)` is the canonical size helper — use it instead of `def.size`
- Splitter secondary tile `(m.x, m.y+1)` must stay registered in the map
- Assembler recipes check `rec.unlock` each tick — locked recipes auto-clear
- `completePlacement()` duplicates `tryPlace()` minus the power check — keep in sync
- `buildToolbar()` now just calls `buildDrawer()`
- `buildTitleSlots()` must be called after `quitToTitle()` and on `DOMContentLoaded`
